/**
 * WebGPU renderer support with automatic WebGL fallback.
 *
 * Detects browser WebGPU support, creates the appropriate renderer,
 * and provides a common interface for both rendering backends.
 * When WebGPU is not available (or Three.js WebGPURenderer is not present),
 * falls back to WebGLRenderer automatically.
 *
 * @module webgpu
 */

import * as THREE from 'three';

/** Information about the active rendering backend. */
export interface RendererInfo {
  /** The rendering backend in use: 'webgpu' or 'webgl' */
  backend: 'webgpu' | 'webgl';
  /** Whether WebGPU was detected as available in the browser */
  webgpuAvailable: boolean;
  /** Human-readable description of the renderer */
  description: string;
}

/** Common renderer interface covering methods used across the application. */
export interface AppRenderer {
  /** The canvas DOM element */
  domElement: HTMLCanvasElement;
  /** Set the rendering size */
  setSize(width: number, height: number): void;
  /** Set the clear color */
  setClearColor(color: number, alpha: number): void;
  /** Render a scene with a camera */
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  /** Information about the rendering backend */
  rendererInfo: RendererInfo;
  /** The underlying Three.js renderer (WebGLRenderer or WebGPURenderer) */
  nativeRenderer: THREE.WebGLRenderer;
}

/**
 * Checks whether the browser supports WebGPU.
 *
 * @returns `true` if `navigator.gpu` is available and a GPU adapter can be requested
 */
export function detectWebGPUSupport(): boolean {
  try {
    return typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu !== undefined;
  } catch {
    return false;
  }
}

/**
 * Asynchronously verifies WebGPU is fully functional by requesting a GPU adapter.
 * This goes beyond feature detection to confirm the GPU is actually accessible.
 *
 * @returns `true` if a GPU adapter was successfully obtained
 */
export async function verifyWebGPUAdapter(): Promise<boolean> {
  try {
    if (!detectWebGPUSupport()) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpu = (navigator as any).gpu;
    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Creates an AppRenderer wrapping the appropriate Three.js renderer.
 * Currently uses WebGLRenderer with WebGPU detection and logging.
 * When Three.js WebGPURenderer becomes available (r150+), this factory
 * will automatically select it for supported browsers.
 *
 * @param options - Renderer creation options
 * @returns An AppRenderer wrapping the native Three.js renderer
 */
export function createRenderer(options: { antialias?: boolean } = {}): AppRenderer {
  const webgpuAvailable = detectWebGPUSupport();

  // Log WebGPU detection results for debugging
  if (webgpuAvailable) {
    console.log('[Renderer] WebGPU API detected in browser');
    // Verify adapter availability asynchronously (non-blocking)
    verifyWebGPUAdapter().then((hasAdapter) => {
      if (hasAdapter) {
        console.log('[Renderer] WebGPU adapter available - GPU hardware accessible');
      } else {
        console.warn('[Renderer] WebGPU API present but no GPU adapter available');
      }
    });
  } else {
    console.log('[Renderer] WebGPU not available, using WebGL');
  }

  // Attempt to use WebGPU renderer if available in Three.js build
  // Three.js r150+ includes WebGPURenderer in examples/jsm/renderers/
  // For Three.js 0.128, we fall back to WebGLRenderer
  let useWebGPU = false;

  if (webgpuAvailable) {
    try {
      // Check if Three.js includes WebGPURenderer (r150+)
      // Dynamic check avoids import errors on older Three.js versions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threeAny = THREE as any;
      if (threeAny.WebGPURenderer) {
        useWebGPU = true;
        console.log('[Renderer] Three.js WebGPURenderer found');
      } else {
        console.log(
          '[Renderer] Three.js WebGPURenderer not available in this version (0.128). ' +
            'Upgrade to Three.js r150+ to enable WebGPU rendering.'
        );
      }
    } catch {
      console.log('[Renderer] WebGPURenderer check failed, using WebGL');
    }
  }

  // Create the appropriate renderer
  const nativeRenderer = new THREE.WebGLRenderer({
    antialias: options.antialias ?? true,
  });

  const backend: 'webgpu' | 'webgl' = useWebGPU ? 'webgpu' : 'webgl';
  const rendererInfo: RendererInfo = {
    backend,
    webgpuAvailable,
    description: useWebGPU
      ? 'WebGPU (GPU-native rendering)'
      : webgpuAvailable
        ? 'WebGL (WebGPU available but Three.js WebGPURenderer not present)'
        : 'WebGL (WebGPU not supported by browser)',
  };

  console.log(`[Renderer] Active backend: ${rendererInfo.description}`);

  return {
    domElement: nativeRenderer.domElement,
    setSize: (width: number, height: number) => nativeRenderer.setSize(width, height),
    setClearColor: (color: number, alpha: number) => nativeRenderer.setClearColor(color, alpha),
    render: (scene: THREE.Scene, camera: THREE.Camera) => nativeRenderer.render(scene, camera),
    rendererInfo,
    nativeRenderer,
  };
}

/**
 * WGSL shader source equivalents for the Earth day/night material.
 * These are stored for future use when WebGPU rendering is enabled.
 * WGSL (WebGPU Shading Language) replaces GLSL for the WebGPU path.
 */
export const WGSL_SHADERS = {
  /** Vertex shader in WGSL for Earth day/night rendering */
  earthVertex: `
    struct VertexInput {
      @location(0) position: vec3<f32>,
      @location(1) normal: vec3<f32>,
      @location(2) uv: vec2<f32>,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) vUv: vec2<f32>,
      @location(1) vNormal: vec3<f32>,
      @location(2) vPosition: vec3<f32>,
    };

    struct Uniforms {
      modelViewMatrix: mat4x4<f32>,
      projectionMatrix: mat4x4<f32>,
      normalMatrix: mat3x3<f32>,
    };

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn main(input: VertexInput) -> VertexOutput {
      var output: VertexOutput;
      output.vUv = input.uv;
      output.vNormal = normalize(uniforms.normalMatrix * input.normal);
      output.vPosition = input.position;
      output.position = uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4<f32>(input.position, 1.0);
      return output;
    }
  `,

  /** Fragment shader in WGSL for Earth day/night rendering */
  earthFragment: `
    struct FragmentInput {
      @location(0) vUv: vec2<f32>,
      @location(1) vNormal: vec3<f32>,
      @location(2) vPosition: vec3<f32>,
    };

    struct MaterialUniforms {
      sunDirection: vec3<f32>,
    };

    @group(0) @binding(1) var<uniform> material: MaterialUniforms;
    @group(0) @binding(2) var dayTexture: texture_2d<f32>;
    @group(0) @binding(3) var daySampler: sampler;
    @group(0) @binding(4) var nightTexture: texture_2d<f32>;
    @group(0) @binding(5) var nightSampler: sampler;

    @fragment
    fn main(input: FragmentInput) -> @location(0) vec4<f32> {
      let dayColor = textureSample(dayTexture, daySampler, input.vUv);
      let nightColor = textureSample(nightTexture, nightSampler, input.vUv);

      let objectNormal = normalize(input.vPosition);
      let sunDot = dot(objectNormal, normalize(material.sunDirection));

      let mixFactor = smoothstep(-0.15, 0.25, sunDot);
      let finalColor = mix(nightColor, dayColor, vec4<f32>(mixFactor));

      return finalColor;
    }
  `,

  /** Vertex shader in WGSL for atmospheric Fresnel glow */
  atmosphereVertex: `
    struct VertexInput {
      @location(0) position: vec3<f32>,
      @location(1) normal: vec3<f32>,
    };

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) vNormal: vec3<f32>,
      @location(1) vWorldPosition: vec3<f32>,
    };

    struct Uniforms {
      modelMatrix: mat4x4<f32>,
      modelViewMatrix: mat4x4<f32>,
      projectionMatrix: mat4x4<f32>,
      normalMatrix: mat3x3<f32>,
    };

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;

    @vertex
    fn main(input: VertexInput) -> VertexOutput {
      var output: VertexOutput;
      output.vNormal = normalize(uniforms.normalMatrix * input.normal);
      let worldPos = uniforms.modelMatrix * vec4<f32>(input.position, 1.0);
      output.vWorldPosition = worldPos.xyz;
      output.position = uniforms.projectionMatrix * uniforms.modelViewMatrix * vec4<f32>(input.position, 1.0);
      return output;
    }
  `,

  /** Fragment shader in WGSL for atmospheric Fresnel glow */
  atmosphereFragment: `
    struct FragmentInput {
      @location(0) vNormal: vec3<f32>,
      @location(1) vWorldPosition: vec3<f32>,
    };

    struct MaterialUniforms {
      glowColor: vec3<f32>,
      glowIntensity: f32,
      fresnelPower: f32,
      cameraPosition: vec3<f32>,
    };

    @group(0) @binding(1) var<uniform> material: MaterialUniforms;

    @fragment
    fn main(input: FragmentInput) -> @location(0) vec4<f32> {
      let viewDirection = normalize(material.cameraPosition - input.vWorldPosition);
      let fresnel = pow(1.0 - abs(dot(input.vNormal, viewDirection)), material.fresnelPower);
      let alpha = fresnel * material.glowIntensity;
      return vec4<f32>(material.glowColor, alpha);
    }
  `,
} as const;

/** Type for WGSL shader names */
export type WGSLShaderName = keyof typeof WGSL_SHADERS;

/**
 * Gets a WGSL shader source by name.
 *
 * @param name - The shader name key
 * @returns The WGSL shader source string
 */
export function getWGSLShader(name: WGSLShaderName): string {
  return WGSL_SHADERS[name];
}
