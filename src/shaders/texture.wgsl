// Using texture arrays - much more efficient and overcomes binding limits
fn sample_texture(textureIndex: i32, uv: vec2f, sampler: sampler) -> vec4f {
  // For texture arrays, we can use textureNumLayers() to get the layer count
  let numLayers = i32(textureNumLayers(textureArray));
  let clampedIndex = clamp(textureIndex, 0, numLayers - 1);
  return textureSampleLevel(textureArray, sampler, uv, clampedIndex, 0.0);
}
