import { vec3length, vec3mul, vec3normalize, vec3add, vec3sub, vec3cross } from "./math";

export class Camera {
  constructor(lookFrom, lookAt, vup, fov, screenWidth, screenHeight) {
    this.lookFrom = lookFrom;
    this.lookAt = lookAt;
    this.vup = vup;
    this.fov = fov * Math.PI / 180.0;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.aspect = screenWidth / screenHeight;
  }

  calculateVectors() {
    const w = vec3normalize(vec3sub(this.lookFrom, this.lookAt))
    const u = vec3normalize(vec3cross(this.vup, w))
    const v = vec3cross(w, u)

    const focalLength = vec3length(vec3sub(this.lookFrom, this.lookAt))
    const viewportHeight = 2 * Math.tan(this.fov / 2.0) * focalLength
    const viewportWidth = viewportHeight * this.aspect

    const viewportU = vec3mul(u, viewportWidth)
    const viewportV = vec3mul(v, -viewportHeight)

    this.pixelDeltaU = vec3mul(viewportU, 1 / this.screenWidth)
    this.pixelDeltaV = vec3mul(viewportV, 1 / this.screenHeight)

    let viewportUpperLeft = vec3sub(
      this.lookFrom,
      vec3mul(w, focalLength)
    )
    viewportUpperLeft = vec3sub(
      viewportUpperLeft,
      vec3mul(viewportU, 0.5)
    )
    viewportUpperLeft = vec3sub(
      viewportUpperLeft,
      vec3mul(viewportV, 0.5)
    )

    const pixel00Location = vec3add(
      viewportUpperLeft,
      vec3mul(this.pixelDeltaU, 0.5)
    )

    this.pixel00Location = vec3add(
      pixel00Location,
      vec3mul(this.pixelDeltaV, 0.5)
    )
  }

  getBuffer() {
    return new Float32Array([
      ...this.lookFrom, 0,
      ...this.lookAt, 0,
      ...this.pixelDeltaU, 0,
      ...this.pixelDeltaV, 0,
      ...this.pixel00Location, 0,
      this.screenWidth,
      this.screenHeight,
      0, 0,
    ]);
  }
}
