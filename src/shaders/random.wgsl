fn xorshift32(seed: ptr<function, u32>) -> u32
{
  *seed ^= *seed << 13;
  *seed ^= *seed >> 17;
  *seed ^= *seed << 5;
  return * seed;
}

fn random_float(seed: ptr<function, u32>) -> f32
{
  return (f32(xorshift32(seed)) / 4294967295.0);
}

fn random_float_min_max(min: f32, max: f32, seed: ptr<function, u32>) -> f32
{
  return min + (max - min) * random_float(seed);
}

fn random_unit_vector(seed: ptr<function, u32>) -> vec3f
{
  while (true) {
    var x = random_float_min_max(- 1.0, 1.0, seed);
    var y = random_float_min_max(- 1.0, 1.0, seed);
    var z = random_float_min_max(- 1.0, 1.0, seed);

    var p = vec3f(x, y, z);
    var lenghtSq = length(p) * length(p);

    if (lenghtSq > 1e-160 && lenghtSq < 1.0) {
      return p / sqrt(lenghtSq);
    }
  }

  return vec3f(0.0, 0.0, 0.0);
}

fn random_on_hemisphere(normal: vec3f, seed: ptr<function, u32>) -> vec3f
{
  var inUnitSphere = random_unit_vector(seed);
  if (dot(inUnitSphere, normal) < 0.0) {
    return - inUnitSphere;
  }
  return inUnitSphere;
}
