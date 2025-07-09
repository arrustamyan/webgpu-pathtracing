import { createCube } from './generator'
import { loadImageBitmap } from './network'
import { randomBetween } from './random'
import shaderConsts from './shaders/consts.wgsl?raw'
import shaderStructs from './shaders/structs.wgsl?raw'
import shaderRandom from './shaders/random.wgsl?raw'
import shaderMain from './shaders/main.wgsl?raw'
import './style.css'

const shaders = `
${shaderConsts}
${shaderStructs}
${shaderRandom}
${shaderMain}
`

let blueNoiseBitmap = await loadImageBitmap('/blue-noise.png')

const NUM_CUBES = 100

const cubes = Array.from({ length: NUM_CUBES }, (_, i) => {
  const x = randomBetween(-5, 5)
  const z = randomBetween(-5, 5)
  return createCube([x, 0, z], 0.25)
})

const cubeNodes = Array.from({ length: NUM_CUBES }, (_, i) => {
  const r = randomBetween(0, 1)
  const g = randomBetween(0, 1)
  const b = randomBetween(0, 1)
  return [2 + 12 * i, 12, 0, 0, r, g, b, 0]
})

const triangles = [
  100.0, -0.5, 100.0, 0, 1, 0, 0, 0,
  100.0, -0.5, -100.0, 0, 1, 1, 0, 0,
  -100.0, -0.5, 100.0, 0, 0, 0, 0, 0,

  -100.0, -0.5, -100.0, 0, 0, 1, 0, 0,
  -100.0, -0.5, 100.0, 0, 0, 0, 0, 0,
  100.0, -0.5, -100.0, 0, 1, 1, 0, 0,

  ...cubes.flat(),
]

const nodes = new Float32Array([
  0, 2, 0, 0, 0.8, 0.8, 0.0, 0,
  ...cubeNodes.flat(),
])

let positions = new Float32Array(triangles)

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

const positionsBuffer = device.createBuffer({
  label: 'positions buffer',
  size: positions.byteLength,
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
});

const bindGroup = device.createBindGroup({
  label: 'bind group',
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: linearSampler },
    { binding: 1, resource: blueNoiseTexture.createView() },
    { binding: 2, resource: { buffer: positionsBuffer } },
    { binding: 3, resource: { buffer: nodesBuffer } },
  ],
})

device.queue.writeBuffer(positionsBuffer, 0, positions);
device.queue.writeBuffer(nodesBuffer, 0, nodes);

renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

const encoder = device.createCommandEncoder({ label: 'our encoder' });
const pass = encoder.beginRenderPass(renderPassDescriptor);
pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);
pass.draw(3);
pass.end();

const commandBuffer = encoder.finish();
device.queue.submit([commandBuffer]);
device.queue.onSubmittedWorkDone().then(() => {
  // After the work is done, we can request the next frame
  // if (sampleCount < 10000) {
  //   render();
  //   // requestAnimationFrame(render);
  // }
  console.log('Frame rendered');
});
