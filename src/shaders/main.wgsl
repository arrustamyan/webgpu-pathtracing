@group(0) @binding(0) var linearSampler: sampler;
@group(0) @binding(1) var blueNoiseTexture: texture_2d<f32>;
@group(0) @binding(2) var<storage, read> triangles: array<Triangle>;
@group(0) @binding(3) var<storage, read> nodes: array<Node>;

fn get_ray(screenCoord: vec2f, seed: ptr<function, u32>) -> Ray
{
  var ray: Ray;
  var offset = vec2f(random_float(seed) - 0.5, random_float(seed) - 0.5);
  var pixel = pixel00Location + pixelDeltaU * (screenCoord.x + offset.x) + pixelDeltaV * (screenCoord.y + offset.y);
  ray.origin = lookFrom;
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
      return node.color;
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

    if (intersect_triangle(rayOrigin, rayDirection, p0, p1, p2, & tempRecord)) {
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

fn hit(ray: Ray, rec: ptr<function, HitRecord>, interval: Interval) -> bool
{
  var tempRec: HitRecord;
  var hitSomething = false;
  var int = interval;

  if (hit_scene(ray.origin, ray.direction, & tempRec)) {
    hitSomething = true;
    if (tempRec.t < int.max) {
      int.max = tempRec.t;
      * rec = tempRec;
    }
  }

  return hitSomething;
}

fn render_pixel(i: f32, j: f32, s: f32) -> vec4f
{
  var uv = vec2f(i / screenWidth, j / screenHeight);
  var sample = textureSample(blueNoiseTexture, linearSampler, uv);
  var seed: u32 = u32((sample.x + s) * 1000.0) * 1000000000u;

  var rec: HitRecord;
  var interval = Interval(0.001, 1e8);

  var color = vec3f(0.0, 0.0, 0.0);

  var screenCoord = vec2f(i, j);
  var ray = get_ray(screenCoord, & seed);
  var hitSomething = false;
  var hitSky = false;

  var coefficient = 1.0;
  var sampleColor = sky_color(ray);

  for (var k = 0.0; k < maxDepth; k += 1.0) {
    if (hit(ray, &rec, interval)) {
      // sampleColor *= surface_color(ray, rec);
      sampleColor = surface_color(ray, rec);
      hitSomething = true;
      ray.origin = rec.p;
      // ray.direction = random_on_hemisphere(rec.normal, & seed);
    }
    else {
      hitSky = true;
      break;
    }
  }

  if (hitSomething && hitSky) {
    // sampleColor *= sqrt(1 - pow(dot(lightDirection, ray.direction), 2));
    sampleColor *= abs(dot(lightDirection, ray.direction));
  }

  color += sampleColor;

  return vec4f(color / samplesPerPixel, 1.0);
}

@vertex
fn vs(vert: Vertex) -> @builtin(position) vec4f
{
  return vec4f(pos[vert.vertex_index], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f
{
  var count = 0.0;
  var i = position.x;
  var j = position.y;
  let pixelCoord = vec2<i32>(i32(i), i32(j));

  let sample = render_pixel(i, j, count).rgb;

  return vec4f(sample, 1.0);
}
