struct Vertex {
  @builtin(vertex_index) vertex_index: u32,
}

struct Triangle {
  p0: vec3f,
  _0: f32,
  p0uv: vec2f,
  _1: vec2f,
  p1: vec3f,
  _2: f32,
  p1uv: vec2f,
  _3: vec2f,
  p2: vec3f,
  _4: f32,
  p2uv: vec2f,
  _5: vec2f,
}

struct AABBNode {
  min: vec3f,
  _1: f32,
  max: vec3f,
  _2: f32,
  isLeaf: f32,
  leftOrTriangleIndex: f32,
  right: f32,
  _3: f32,
}

struct Node {
  offset: f32,
  count: f32,
  _1: f32,
  _2: f32,
  color: vec3f,
  _3: f32,
}

struct Ray {
  origin: vec3f,
  direction: vec3f,
}

struct HitRecord {
  t: f32,
  p: vec3f,
  u: f32,
  v: f32,
  normal: vec3f,
  frontFace: bool,
  material: vec3f,
  trangleIndex: f32,
}

struct Interval {
  min: f32,
  max: f32,
}
