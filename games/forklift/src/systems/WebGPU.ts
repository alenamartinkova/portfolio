import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture';
import glslangJs from '@babylonjs/core/assets/glslang/glslang.js?url';
import glslangWasm from '@babylonjs/core/assets/glslang/glslang.wasm?url';
import twgslJs from '@babylonjs/core/assets/twgsl/twgsl.js?url';
import twgslWasm from '@babylonjs/core/assets/twgsl/twgsl.wasm?url';

// Keep the optional backend and shader compilers out of the WebGL startup path.
export async function createWebGPUEngine(canvas: HTMLCanvasElement) {
  if (!(await WebGPUEngine.IsSupportedAsync)) return undefined;
  const engine = new WebGPUEngine(canvas, { antialias: true });
  try {
    await engine.initAsync(
      { jsPath: glslangJs, wasmPath: glslangWasm },
      { jsPath: twgslJs, wasmPath: twgslWasm },
    );
    return engine;
  } catch (error) {
    engine.dispose();
    throw error;
  }
}
