import shaderConsts from './shaders/consts.wgsl?raw'
import shaderStructs from './shaders/structs.wgsl?raw'
import shaderRandom from './shaders/random.wgsl?raw'
import shaderTexture from './shaders/texture.wgsl?raw'
import shaderMain from './shaders/main.wgsl?raw'
import { createCube } from './generator'
import { loadImageBitmap } from './network'
import { randomBetween } from './random'
import { constructAABB, convertAABBTreeToArray } from './aabb'
import './style.css'

const shaders = `
${shaderConsts}
${shaderStructs}
${shaderRandom}
${shaderTexture}
${shaderMain}
`

let blueNoiseBitmap = await loadImageBitmap('/blue-noise.png')
let concreteBitmap = await loadImageBitmap('/concrete.jpg')

let sampleCount = new Uint32Array([0])

const NUM_CUBES = 400

const cubes = Array.from({ length: NUM_CUBES }, (_, i) => {
  const x = randomBetween(-5, 5)
  const y = randomBetween(-0.5, 0.5)
  const z = randomBetween(-5, 5)
  return createCube([x, y, z], 0.25)
})

const cubeNodes = Array.from({ length: NUM_CUBES }, (_, i) => {
  const r = randomBetween(0, 1)
  const g = randomBetween(0, 1)
  const b = randomBetween(0, 1)
  const textureIndex = randomBetween(0, 11)
  return [2 + 12 * i, 12, textureIndex, 0, r, g, b, 0]
})

const triangles = [
  2.0, -0.5, 2.0, 0, 1, 0, 0, 0,
  2.0, -0.5, -2.0, 0, 1, 1, 0, 0,
  -2.0, -0.5, 2.0, 0, 0, 0, 0, 0,

  -2.0, -0.5, -2.0, 0, 0, 1, 0, 0,
  -2.0, -0.5, 2.0, 0, 0, 0, 0, 0,
  2.0, -0.5, -2.0, 0, 1, 1, 0, 0,

  ...cubes.flat(),
]

const nodes = new Float32Array([
  0, 2, 0, 0, 0.8, 0.8, 0.0, 0,
  ...cubeNodes.flat(),
])

let positions = new Float32Array(triangles)

const indices = new Uint32Array(Array.from({ length: triangles.length / 24 }, (_, i) => i))

const aabbTree = constructAABB(triangles, indices);
const aabb = new Float32Array(convertAABBTreeToArray(aabbTree));

const adapter = await navigator.gpu?.requestAdapter()
const device = await adapter?.requestDevice()

if (!device) {
  throw new Error('WebGPU is not available in this browser.')
}

const canvas = document.querySelector('#main')
const context = canvas.getContext('webgpu')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

canvas.width = Math.max(1, Math.min(window.innerWidth, device.limits.maxTextureDimension2D))
canvas.height = Math.max(1, Math.min(window.innerHeight, device.limits.maxTextureDimension2D))

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
context.configure({ device, format: presentationFormat })

const module = device.createShaderModule({
  label: 'our box shaders',
  code: shaders,
})

const pipeline = device.createRenderPipeline({
  label: 'pipeline',
  layout: 'auto',
  vertex: {
    entryPoint: 'vs',
    module,
  },
  fragment: {
    entryPoint: 'fs',
    module,
    targets: [{ format: presentationFormat }],
  },
})

const renderPassDescriptor = {
  label: 'our basic canvas renderPass',
  colorAttachments: [
    {
      // view: <- to be filled out when we render
      clearValue: [0.3, 0.3, 0.3, 1],
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
}

const linearSampler = device.createSampler({
  addressModeU: 'repeat',
  addressModeV: 'repeat',
  magFilter: 'linear',
  minFilter: 'linear',
})

const sampleCountBuffer = device.createBuffer({
  label: 'positions buffer',
  size: sampleCount.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
})

const positionsBuffer = device.createBuffer({
  label: 'positions buffer',
  size: positions.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
})

const aabbBuffer = device.createBuffer({
  label: 'positions buffer',
  size: aabb.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
})

const nodesBuffer = device.createBuffer({
  label: 'positions buffer',
  size: nodes.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
})

const blueNoiseTexture = device.createTexture({
  label: 'texture',
  format: 'rgba8unorm',
  size: [blueNoiseBitmap.width, blueNoiseBitmap.height],
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
})

const accumulationTextureWrite = device.createTexture({
  label: 'accumulation texture A',
  format: 'rgba32float',
  size: [canvas.width, canvas.height],
  usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
})

const accumulationTextureRead = device.createTexture({
  label: 'accumulation texture B',
  format: 'rgba32float',
  size: [canvas.width, canvas.height],
  usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
})

// Create a 2D texture array instead of individual textures
// This uses only 1 binding instead of 18!
const NUM_TEXTURES = 12;
const textureArray = device.createTexture({
  label: 'texture array',
  format: 'rgba8unorm',
  size: [concreteBitmap.width, concreteBitmap.height, NUM_TEXTURES],
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
});

const bindGroup = device.createBindGroup({
  label: 'bind group',
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: linearSampler },
    { binding: 1, resource: blueNoiseTexture.createView() },
    { binding: 2, resource: accumulationTextureWrite.createView({}) },
    { binding: 3, resource: accumulationTextureRead.createView({}) },
    { binding: 6, resource: { buffer: sampleCountBuffer } },
    { binding: 7, resource: { buffer: positionsBuffer } },
    { binding: 8, resource: { buffer: aabbBuffer } },
    { binding: 9, resource: { buffer: nodesBuffer } },
  ],
})

const texturesBindGroup = device.createBindGroup({
  label: 'textures bind group',
  layout: pipeline.getBindGroupLayout(1),
  entries: [
    { binding: 0, resource: textureArray.createView() },
  ],
})

device.queue.writeBuffer(positionsBuffer, 0, positions)
device.queue.writeBuffer(aabbBuffer, 0, aabb)
device.queue.writeBuffer(nodesBuffer, 0, nodes)

device.queue.copyExternalImageToTexture(
  { source: blueNoiseBitmap, flipY: true },
  { texture: blueNoiseTexture },
  { width: blueNoiseBitmap.width, height: blueNoiseBitmap.height },
)

// Copy the concrete texture to all layers of the texture array
// In a real application, you'd load different textures for each layer
for (let i = 0; i < NUM_TEXTURES; i++) {
  device.queue.copyExternalImageToTexture(
    { source: concreteBitmap, flipY: true },
    { 
      texture: textureArray,
      origin: { x: 0, y: 0, z: i } // Specify which layer to copy to
    },
    { width: concreteBitmap.width, height: concreteBitmap.height },
  )
}

function render() {
  sampleCount[0] += 1

  device.queue.writeBuffer(sampleCountBuffer, 0, sampleCount);

  renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView()

  const encoder = device.createCommandEncoder({ label: 'our encoder' })
  const pass = encoder.beginRenderPass(renderPassDescriptor)
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.setBindGroup(1, texturesBindGroup)
  pass.draw(3)
  pass.end()

  encoder.copyTextureToTexture(
    { texture: accumulationTextureWrite },
    { texture: accumulationTextureRead },
    [canvas.width, canvas.height, 1]
  );

  const commandBuffer = encoder.finish()

  const now = performance.now()
  device.queue.submit([commandBuffer])
  device.queue.onSubmittedWorkDone().then(() => {
    // After the work is done, we can request the next frame
    if (sampleCount <= 100) {
      requestAnimationFrame(render)
    }
    console.log('Frame rendered', performance.now() - now, 'ms')
  })
}

render()
