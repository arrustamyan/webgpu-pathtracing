import { vec3cross, vec3dot, vec3sub } from "./math";

const MAX_TRIANGLES_PER_NODE = 1; // Better leaf size

class AABB {
  constructor() {
    this.min = [Infinity, Infinity, Infinity];
    this.max = [-Infinity, -Infinity, -Infinity];
  }

  expandByPoint(p) {
    for (let i = 0; i < 3; i++) {
      this.min[i] = Math.min(this.min[i], p[i]);
      this.max[i] = Math.max(this.max[i], p[i]);
    }
  }

  expandByBox(box) {
    this.expandByPoint(box.min);
    this.expandByPoint(box.max);
  }

  extent() {
    return this.max.map((v, i) => v - this.min[i]);
  }

  largestExtentAxis() {
    const ext = this.extent();
    return ext.indexOf(Math.max(...ext));
  }

  surfaceArea() {
    const ext = this.extent();
    return 2 * (ext[0] * ext[1] + ext[1] * ext[2] + ext[2] * ext[0]);
  }

  clone() {
    const box = new AABB();
    box.min = [...this.min];
    box.max = [...this.max];
    return box;
  }
}

function computeTriangleBounds(triangle) {
  const box = new AABB();

  for (const v of triangle) {
    box.expandByPoint(v);
  }

  return box;
}

function computeCentroid(triangle) {
  return [0, 1, 2].map(i => (
    (triangle[0][i] + triangle[1][i] + triangle[2][i]) / 3
  ));
}

const lookFrom = [0.0, 3.5, 7.0];
const lookAt = [0, 0, 0];
const cameraDirection = vec3sub(lookAt, lookFrom);

export function constructAABB(geometries, indices) {
  const node = {}
  const nodeAABB = new AABB()
  const triangleData = []

  // Precompute triangle data
  for (let i of indices) {
    const k = i * 24
    const p0 = [geometries[k], geometries[k + 1], geometries[k + 2]]
    const p1 = [geometries[k + 8], geometries[k + 9], geometries[k + 10]]
    const p2 = [geometries[k + 16], geometries[k + 17], geometries[k + 18]]

    const normal = vec3cross(vec3sub(p1, p0), vec3sub(p2, p0));
    const dot = vec3dot(normal, cameraDirection);

    if (dot > 0) {
      continue;
    }

    // console.log(`Triangle ${i}: normal = [${normal}], dot = ${dot}`);

    const triangle = [p0, p1, p2]
    const box = computeTriangleBounds(triangle)
    const centroid = computeCentroid(triangle)

    nodeAABB.expandByBox(box)
    triangleData.push({ index: i, bounds: box, centroid })
  }

  node.bounds = nodeAABB

  if (indices.length <= MAX_TRIANGLES_PER_NODE) {
    node.leaf = true
    node.triangleIndex = indices[0] // Store first triangle for now
    return node
  }

  // Use Surface Area Heuristic for better splits
  let bestCost = Infinity
  let bestAxis = -1
  let bestSplit = -1

  for (let axis = 0; axis < 3; axis++) {
    // Sort triangles by centroid on this axis
    triangleData.sort((a, b) => a.centroid[axis] - b.centroid[axis])

    // Try different split positions
    for (let split = 1; split < triangleData.length; split++) {
      const leftBounds = new AABB()
      const rightBounds = new AABB()

      // Compute bounds for left and right partitions
      for (let i = 0; i < split; i++) {
        leftBounds.expandByBox(triangleData[i].bounds)
      }
      for (let i = split; i < triangleData.length; i++) {
        rightBounds.expandByBox(triangleData[i].bounds)
      }

      // SAH cost calculation
      const leftArea = leftBounds.surfaceArea()
      const rightArea = rightBounds.surfaceArea()
      const totalArea = nodeAABB.surfaceArea()

      const cost = (leftArea / totalArea) * split + (rightArea / totalArea) * (triangleData.length - split)

      if (cost < bestCost) {
        bestCost = cost
        bestAxis = axis
        bestSplit = split
      }
    }
  }

  // If no good split found, create a leaf
  if (bestAxis === -1) {
    node.leaf = true
    node.triangleIndex = indices[0]
    return node
  }

  // Apply best split
  triangleData.sort((a, b) => a.centroid[bestAxis] - b.centroid[bestAxis])
  const leftIndices = triangleData.slice(0, bestSplit).map(t => t.index)
  const rightIndices = triangleData.slice(bestSplit).map(t => t.index)

  node.leaf = false
  node.left = constructAABB(geometries, leftIndices)
  node.right = constructAABB(geometries, rightIndices)

  return node
}

export function convertAABBTreeToArray(node, array = [], currentIndex = { value: 0 }) {
  if (node.leaf) {
    array.push(
      ...node.bounds.min, 0,
      ...node.bounds.max, 0,
      1.0,
      node.triangleIndex,
      0,
      0,
    );
  } else {
    const leftChildIndex = array.length / 12 + 1;  // Next position after this node
    const rightChildIndex = leftChildIndex + countNodes(node.left);  // After left subtree

    array.push(
      ...node.bounds.min, 0,
      ...node.bounds.max, 0,
      0.0,
      leftChildIndex,
      rightChildIndex,
      0,
    );
    convertAABBTreeToArray(node.left, array, currentIndex);
    convertAABBTreeToArray(node.right, array, currentIndex);
  }

  return array;
}

function countNodes(node) {
  if (!node) return 0;
  if (node.leaf) return 1;
  return 1 + countNodes(node.left) + countNodes(node.right);
}
