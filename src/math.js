export function vec3sub(a, b) {
  return [
    a[0] - b[0],
    a[1] - b[1],
    a[2] - b[2]
  ]
}

export function vec3cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ]
}

export function vec3dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function vec3mul(a, scalar) {
  return [
    a[0] * scalar,
    a[1] * scalar,
    a[2] * scalar
  ]
}

export function vec3length(v) {
  return Math.sqrt(vec3dot(v, v))
}

export function vec3normalize(v) {
  const length = vec3length(v);
  return [
    v[0] / length,
    v[1] / length,
    v[2] / length
  ]
}

export function vec3add(a, b) {
  return [
    a[0] + b[0],
    a[1] + b[1],
    a[2] + b[2],
  ]
}