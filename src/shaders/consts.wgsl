const pi = 3.1415926;
const screenWidth = 858.0;
const screenHeight = 858.0;
const aspect = screenWidth / screenHeight;
const fov = 65.0 * pi / 180.0;
const lookFrom = vec3f(0.0, 3.5, 1.0);
const lookAt = vec3f(0.0, 0.0, 0.0);
const vup = vec3f(0.0, 1.0, 0.0);
const w = normalize(lookFrom - lookAt);
const u = normalize(cross(vup, w));
const v = cross(w, u);
const focalLength = length(lookFrom - lookAt);
const h = tan(fov / 2.0);
const viewportHeight = 2.0 * h * focalLength;
const viewportWidth = viewportHeight * (screenWidth / screenHeight);
const viewportU = u * viewportWidth;
const viewportV = v * - viewportHeight;
const pixelDeltaU = viewportU / screenWidth;
const pixelDeltaV = viewportV / screenHeight;
const viewportUpperLeft = lookFrom - w * focalLength - viewportU / 2.0 - viewportV / 2.0;
const pixel00Location = viewportUpperLeft + pixelDeltaU / 2.0 + pixelDeltaV / 2.0;
const samplesPerPixel = 1.0;
const maxDepth = 7.0;
const lightDirection = vec3f(- 1.0, - 1.0, 1.0);

const pos = array(vec2f(- 1.0, - 1.0), vec2f(3.0, - 1.0), vec2f(- 1.0, 3.0));

const useAABB = true;
