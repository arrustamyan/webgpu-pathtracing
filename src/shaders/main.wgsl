@group(0) @binding(0) var linearSampler: sampler;
@group(0) @binding(1) var blueNoiseTexture: texture_2d<f32>;
@group(0) @binding(2) var accumulationTextureWrite: texture_storage_2d<rgba32float, write>;
@group(0) @binding(3) var accumulationTextureRead: texture_2d<f32>;
@group(0) @binding(4) var<uniform> camera: Camera;
@group(0) @binding(6) var<uniform> sampleCount: u32;
@group(0) @binding(7) var<storage, read> triangles: array<Triangle>;
@group(0) @binding(8) var<storage, read> aabb: array<AABBNode>;
@group(0) @binding(9) var<storage, read> nodes: array<Node>;

// Using texture array instead of individual texture bindings
// This reduces 18 bindings to just 1 binding!
@group(1) @binding(0) var textureArray: texture_2d_array<f32>;

fn get_ray(screenCoord: vec2f, seed: ptr<function, u32>) -> Ray
{
  var ray: Ray;
  var offset = vec2f(random_float(seed) - 0.5, random_float(seed) - 0.5);
  var pixel = camera.pixel00Location
              + camera.pixelDeltaU * (screenCoord.x + offset.x)
              + camera.pixelDeltaV * (screenCoord.y + offset.y);
  ray.origin = camera.lookFrom;
  ray.direction = normalize(pixel - ray.origin);

  return ray;
}

fn sky_color(ray: Ray) -> vec3f
{
  var a = 0.5 * (ray.direction.y + 1.0);
  return (1.0 - a) * vec3f(1.0, 1.0, 1.0) + a * vec3f(0.5, 0.7, 1.0);
}

fn surface_color(ray: Ray, rec: HitRecord) -> vec3f
{
  // Find the node that contains this triangle
  for (var i: u32 = 0; i < arrayLength(&nodes); i += 1) {
    var node = nodes[i];
    // Check if the triangle index falls within this node's range
    if (rec.trangleIndex >= node.offset && rec.trangleIndex < node.offset + node.count) {
      var trangleIndex = rec.trangleIndex;
      var triangle = triangles[u32(trangleIndex)];
      var p0uv = triangle.p0uv;
      var p1uv = triangle.p1uv;
      var p2uv = triangle.p2uv;

      var alpha = rec.u;
      var beta = rec.v;
      var gamma = 1 - alpha - beta;

      var localU = gamma * p0uv.x + alpha * p1uv.x + beta * p2uv.x;
      var localV = gamma * p0uv.y + alpha * p1uv.y + beta * p2uv.y;

      if (node.textureIndex == -1) {
        // If textureIndex is 0, return the color directly
        return node.color;
      }

      return sample_texture(node.textureIndex, vec2f(localU, localV), linearSampler).rgb;
    }
  }

  // Fallback color if no node is found
  return vec3f(0.5, 0.5, 0.5);
}

fn intersect_triangle(rayOrigin: vec3f, rayDirection: vec3f, p0: vec3f, p1: vec3f, p2: vec3f, rec: ptr<function, HitRecord>) -> bool
{
  var edge1 = p1 - p0;
  var edge2 = p2 - p0;
  var h = cross(rayDirection, edge2);
  var a = dot(edge1, h);

  if (a > - 1e-8 && a < 1e-8) {
      return false;
  }

  var f = 1.0 / a;
  var s = rayOrigin - p0;
  var u = f * dot(s, h);
  if (u <= 0.0 || u > 1.0) {
      return false;
  }

  var q = cross(s, edge1);
  var v = f * dot(rayDirection, q);
  if (v <= 0.0 || u + v > 1.0) {
      return false;
  }

  var t = f * dot(edge2, q);
  if (t < 0.001) {
      return false;
  }

  (*rec).t = t;
  (*rec).u = u;
  (*rec).v = v;

  return true;
}

fn hit_scene(rayOrigin: vec3f, rayDirection: vec3f, record: ptr<function, HitRecord>) -> bool
{
  var tempRecord: HitRecord;
  var closestSoFar = 1e8;
  var hitSomething = false;

  for (var k: u32 = 0; k < arrayLength(&triangles); k += 1) {
    var triangle = triangles[k];

    var p0 = triangle.p0;
    var p1 = triangle.p1;
    var p2 = triangle.p2;

    if (intersect_triangle(rayOrigin, rayDirection, p0, p1, p2, &tempRecord)) {
      hitSomething = true;

      if (tempRecord.t < closestSoFar && tempRecord.t > 0.001) {
        var normal = cross(p1 - p0, p2 - p0);

        closestSoFar = tempRecord.t;

        (*record).t = tempRecord.t;
        (*record).p = rayOrigin + rayDirection * tempRecord.t;
        (*record).u = tempRecord.u;
        (*record).v = tempRecord.v;
        (*record).material = vec3f(0.8, 0.8, 0.0);
        (*record).normal = normalize(normal);
        (*record).trangleIndex = f32(k);
      }
    }
  }

  return hitSomething;
}

fn intersect_aabb(rayOrigin: vec3f, rayDirection: vec3f, aabb: AABBNode) -> bool
{
  var tMin = 0.001;
  var tMax = 1e8;

  for (var i: u32 = 0; i < 3; i += 1) {
    // Handle case where ray direction component is very close to zero
    if (abs(rayDirection[i]) < 1e-8) {
      // Ray is parallel to the slab - check if origin is within bounds
      if (rayOrigin[i] < aabb.min[i] || rayOrigin[i] > aabb.max[i]) {
        return false;
      }
      continue;
    }

    var invD = 1.0 / rayDirection[i];
    var t0 = (aabb.min[i] - rayOrigin[i]) * invD;
    var t1 = (aabb.max[i] - rayOrigin[i]) * invD;

    // Ensure t0 is the near intersection and t1 is the far intersection
    if (t0 > t1) {
      var temp = t0;
      t0 = t1;
      t1 = temp;
    }

    // Update the intersection interval
    tMin = max(tMin, t0);
    tMax = min(tMax, t1);

    // Early exit if interval becomes invalid
    if (tMin > tMax) {
      return false;
    }
  }

  // Check if the intersection interval is valid and in front of the ray
  return tMax >= 0.0 && tMin <= tMax;
}

fn hit_aabb(rayOrigin: vec3f, rayDirection: vec3f, record: ptr<function, HitRecord>) -> bool
{
  var tempRecord: HitRecord;
  var closestSoFar = 1e8;
  var hitSomething = false;
  var stack = array<u32, 64>(); // Proper stack size
  stack[0] = 0u; // Start with root node (index 0)
  var stackPtr = 1u;

  while (stackPtr > 0) {
    stackPtr -= 1u;
    var nodeIndex = stack[stackPtr];
    var node = aabb[nodeIndex];

    if (node.isLeaf == 1.0)
    {
      var triangleIndex = node.leftOrTriangleIndex;
      var triangle = triangles[u32(triangleIndex)];
      var p0 = triangle.p0;
      var p1 = triangle.p1;
      var p2 = triangle.p2;

      if (intersect_triangle(rayOrigin, rayDirection, p0, p1, p2, &tempRecord))
      {
        hitSomething = true;

        if (tempRecord.t < closestSoFar && tempRecord.t > 0.001) {
          var normal = cross(p1 - p0, p2 - p0);

          (*record).t = tempRecord.t;
          (*record).p = rayOrigin + rayDirection * tempRecord.t;
          (*record).u = tempRecord.u;
          (*record).v = tempRecord.v;
          (*record).material = vec3f(0.8, 0.8, 0.0);
          (*record).normal = normalize(normal);
          (*record).trangleIndex = triangleIndex;

          closestSoFar = tempRecord.t;
        }
      }
    }
    else
    {
      if (intersect_aabb(rayOrigin, rayDirection, node))
      {
        // Push children onto the stack with better bounds checking
        if (stackPtr < 62u) { // Leave room for both children (64 - 2)
          stack[stackPtr] = u32(node.leftOrTriangleIndex);
          stackPtr += 1u;
          stack[stackPtr] = u32(node.right);
          stackPtr += 1u;
        }
      }
    }
  }
  return hitSomething;
}

fn hit(ray: Ray, rec: ptr<function, HitRecord>, interval: Interval) -> bool
{
  var tempRec: HitRecord;
  var hitSomething = false;
  var int = interval;

  var hitResult: bool = false;

  if (useAABB) {
    hitResult = hit_aabb(ray.origin, ray.direction, & tempRec);
  } else {
    hitResult = hit_scene(ray.origin, ray.direction, & tempRec);
  }

  if (hitResult) {
    hitSomething = true;
    if (tempRec.t < int.max) {
      // int.max = tempRec.t;
      * rec = tempRec;
    }
  }

  return hitSomething;
}

fn render_pixel(i: f32, j: f32, s: f32) -> vec4f
{
  var uv = vec2f(i / camera.screenWidth, j / camera.screenHeight);
  var sample = textureSample(blueNoiseTexture, linearSampler, uv);
  var seed: u32 = u32((sample.x + s) * 1000.0) * 1000000000u;

  var rec: HitRecord;
  var interval = Interval(0.001, 1e8);

  var screenCoord = vec2f(i, j);
  var ray = get_ray(screenCoord, & seed);
  var hitSomething = false;
  var hitSky = false;

  var coefficient = 1.0;
  var sampleColor = sky_color(ray);

  for (var k = 0.0; k < maxDepth; k += 1.0) {
    if (hit(ray, &rec, interval)) {
      // sampleColor *= surface_color(ray, rec);
      sampleColor *= surface_color(ray, rec);
      hitSomething = true;
      ray.origin = rec.p;
      ray.direction = random_on_hemisphere(rec.normal, &seed);
    }
    else {
      hitSky = true;
      break;
    }
  }

  if (hitSomething && hitSky) {
    var lightDir = normalize(lightDirection);
    var lightWeight = 0.8 + max(0.0, dot(lightDir, rec.normal));
    sampleColor *= lightWeight;
  }

  return vec4f(sampleColor, 1.0);
}

@vertex
fn vs(vert: Vertex) -> @builtin(position) vec4f
{
  return vec4f(pos[vert.vertex_index], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f
{
  var i = position.x;
  var j = position.y;
  let pixelCoord = vec2<i32>(i32(i), i32(j));

  let sample = render_pixel(i, j, f32(sampleCount)).rgb;

  let prevSample = textureLoad(accumulationTextureRead, pixelCoord, 0).rgb;
  let accumColor = (prevSample + sample);

  textureStore(accumulationTextureWrite, pixelCoord, vec4f(accumColor, 1.0));

  return vec4f(accumColor, 1.0) / f32(sampleCount);
}
