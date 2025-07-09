export function createCube(center, radius = 0.5) {
  return [
    // Front face
    center[0] + radius, center[1] - radius, center[2] + radius, 0, 1, 0, 0, 0,
    center[0] + radius, center[1] + radius, center[2] + radius, 0, 1, 1, 0, 0,
    center[0] - radius, center[1] - radius, center[2] + radius, 0, 0, 0, 0, 0,

    center[0] - radius, center[1] + radius, center[2] + radius, 0, 0, 1, 0, 0,
    center[0] - radius, center[1] - radius, center[2] + radius, 0, 0, 0, 0, 0,
    center[0] + radius, center[1] + radius, center[2] + radius, 0, 1, 1, 0, 0,

    // Back face
    center[0] - radius, center[1] - radius, center[2] - radius, 0, 1, 0, 0, 0,
    center[0] - radius, center[1] + radius, center[2] - radius, 0, 1, 1, 0, 0,
    center[0] + radius, center[1] - radius, center[2] - radius, 0, 0, 0, 0, 0,

    center[0] + radius, center[1] + radius, center[2] - radius, 0, 0, 1, 0, 0,
    center[0] + radius, center[1] - radius, center[2] - radius, 0, 0, 0, 0, 0,
    center[0] - radius, center[1] + radius, center[2] - radius, 0, 1, 1, 0, 0,

    // Top face
    center[0] + radius, center[1] + radius, center[2] + radius, 0, 1, 0, 0, 0,
    center[0] + radius, center[1] + radius, center[2] - radius, 0, 1, 1, 0, 0,
    center[0] - radius, center[1] + radius, center[2] + radius, 0, 0, 0, 0, 0,

    center[0] - radius, center[1] + radius, center[2] - radius, 0, 0, 1, 0, 0,
    center[0] - radius, center[1] + radius, center[2] + radius, 0, 0, 0, 0, 0,
    center[0] + radius, center[1] + radius, center[2] - radius, 0, 1, 1, 0, 0,

    // Bottom face
    center[0] + radius, center[1] - radius, center[2] + radius, 0, 0, 0, 0, 0,
    center[0] - radius, center[1] - radius, center[2] + radius, 0, 1, 0, 0, 0,
    center[0] + radius, center[1] - radius, center[2] - radius, 0, 0, 1, 0, 0,

    center[0] - radius, center[1] - radius, center[2] - radius, 0, 1, 1, 0, 0,
    center[0] + radius, center[1] - radius, center[2] - radius, 0, 0, 1, 0, 0,
    center[0] - radius, center[1] - radius, center[2] + radius, 0, 1, 0, 0, 0,

    // Left face
    center[0] - radius, center[1] - radius, center[2] + radius, 0, 1, 0, 0, 0,
    center[0] - radius, center[1] + radius, center[2] + radius, 0, 1, 1, 0, 0,
    center[0] - radius, center[1] - radius, center[2] - radius, 0, 0, 0, 0, 0,

    center[0] - radius, center[1] + radius, center[2] - radius, 0, 0, 1, 0, 0,
    center[0] - radius, center[1] - radius, center[2] - radius, 0, 0, 0, 0, 0,
    center[0] - radius, center[1] + radius, center[2] + radius, 0, 1, 1, 0, 0,

    // Right face
    center[0] + radius, center[1] - radius, center[2] - radius, 0, 1, 0, 0, 0,
    center[0] + radius, center[1] + radius, center[2] - radius, 0, 1, 1, 0, 0,
    center[0] + radius, center[1] - radius, center[2] + radius, 0, 0, 0, 0, 0,

    center[0] + radius, center[1] + radius, center[2] + radius, 0, 0, 1, 0, 0,
    center[0] + radius, center[1] - radius, center[2] + radius, 0, 0, 0, 0, 0,
    center[0] + radius, center[1] + radius, center[2] - radius, 0, 1, 1, 0, 0,
  ]
}