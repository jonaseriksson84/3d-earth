// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererInfo, WGSLShaderName } from './webgpu';
import { detectWebGPUSupport, getWGSLShader, verifyWebGPUAdapter, WGSL_SHADERS } from './webgpu';

describe('detectWebGPUSupport', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('returns false when navigator.gpu is not available', () => {
    // jsdom doesn't have navigator.gpu
    expect(detectWebGPUSupport()).toBe(false);
  });

  it('returns true when navigator.gpu is available', () => {
    Object.defineProperty(globalThis.navigator, 'gpu', {
      value: { requestAdapter: vi.fn() },
      writable: true,
      configurable: true,
    });
    expect(detectWebGPUSupport()).toBe(true);
  });

  it('returns false when navigator.gpu is undefined', () => {
    Object.defineProperty(globalThis.navigator, 'gpu', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(detectWebGPUSupport()).toBe(false);
  });
});

describe('verifyWebGPUAdapter', () => {
  afterEach(() => {
    // Clean up gpu property
    if ('gpu' in navigator) {
      Object.defineProperty(globalThis.navigator, 'gpu', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    }
  });

  it('returns false when WebGPU is not supported', async () => {
    const result = await verifyWebGPUAdapter();
    expect(result).toBe(false);
  });

  it('returns true when adapter is available', async () => {
    const mockAdapter = { name: 'test-adapter' };
    Object.defineProperty(globalThis.navigator, 'gpu', {
      value: { requestAdapter: vi.fn().mockResolvedValue(mockAdapter) },
      writable: true,
      configurable: true,
    });
    const result = await verifyWebGPUAdapter();
    expect(result).toBe(true);
  });

  it('returns false when adapter request returns null', async () => {
    Object.defineProperty(globalThis.navigator, 'gpu', {
      value: { requestAdapter: vi.fn().mockResolvedValue(null) },
      writable: true,
      configurable: true,
    });
    const result = await verifyWebGPUAdapter();
    expect(result).toBe(false);
  });

  it('returns false when adapter request throws', async () => {
    Object.defineProperty(globalThis.navigator, 'gpu', {
      value: { requestAdapter: vi.fn().mockRejectedValue(new Error('GPU error')) },
      writable: true,
      configurable: true,
    });
    const result = await verifyWebGPUAdapter();
    expect(result).toBe(false);
  });
});

describe('WGSL_SHADERS', () => {
  it('contains earth vertex shader', () => {
    expect(WGSL_SHADERS.earthVertex).toBeDefined();
    expect(typeof WGSL_SHADERS.earthVertex).toBe('string');
    expect(WGSL_SHADERS.earthVertex).toContain('@vertex');
    expect(WGSL_SHADERS.earthVertex).toContain('fn main');
  });

  it('contains earth fragment shader', () => {
    expect(WGSL_SHADERS.earthFragment).toBeDefined();
    expect(typeof WGSL_SHADERS.earthFragment).toBe('string');
    expect(WGSL_SHADERS.earthFragment).toContain('@fragment');
    expect(WGSL_SHADERS.earthFragment).toContain('sunDirection');
  });

  it('contains atmosphere vertex shader', () => {
    expect(WGSL_SHADERS.atmosphereVertex).toBeDefined();
    expect(WGSL_SHADERS.atmosphereVertex).toContain('@vertex');
    expect(WGSL_SHADERS.atmosphereVertex).toContain('normalMatrix');
  });

  it('contains atmosphere fragment shader', () => {
    expect(WGSL_SHADERS.atmosphereFragment).toBeDefined();
    expect(WGSL_SHADERS.atmosphereFragment).toContain('@fragment');
    expect(WGSL_SHADERS.atmosphereFragment).toContain('fresnelPower');
  });

  it('earth fragment shader references textures', () => {
    expect(WGSL_SHADERS.earthFragment).toContain('dayTexture');
    expect(WGSL_SHADERS.earthFragment).toContain('nightTexture');
    expect(WGSL_SHADERS.earthFragment).toContain('smoothstep');
  });

  it('atmosphere fragment shader has Fresnel calculation', () => {
    expect(WGSL_SHADERS.atmosphereFragment).toContain('viewDirection');
    expect(WGSL_SHADERS.atmosphereFragment).toContain('glowColor');
    expect(WGSL_SHADERS.atmosphereFragment).toContain('glowIntensity');
  });
});

describe('getWGSLShader', () => {
  it('returns shader source by name', () => {
    const shader = getWGSLShader('earthVertex');
    expect(shader).toBe(WGSL_SHADERS.earthVertex);
  });

  it('returns atmosphere fragment shader', () => {
    const shader = getWGSLShader('atmosphereFragment');
    expect(shader).toBe(WGSL_SHADERS.atmosphereFragment);
  });

  it('all shader keys are accessible', () => {
    const keys: WGSLShaderName[] = [
      'earthVertex',
      'earthFragment',
      'atmosphereVertex',
      'atmosphereFragment',
    ];
    for (const key of keys) {
      expect(getWGSLShader(key)).toBeTruthy();
    }
  });
});

describe('RendererInfo type', () => {
  it('has correct structure for WebGL backend', () => {
    const info: RendererInfo = {
      backend: 'webgl',
      webgpuAvailable: false,
      description: 'WebGL (WebGPU not supported by browser)',
    };
    expect(info.backend).toBe('webgl');
    expect(info.webgpuAvailable).toBe(false);
  });

  it('has correct structure for WebGPU backend', () => {
    const info: RendererInfo = {
      backend: 'webgpu',
      webgpuAvailable: true,
      description: 'WebGPU (GPU-native rendering)',
    };
    expect(info.backend).toBe('webgpu');
    expect(info.webgpuAvailable).toBe(true);
  });

  it('describes WebGL with WebGPU available', () => {
    const info: RendererInfo = {
      backend: 'webgl',
      webgpuAvailable: true,
      description: 'WebGL (WebGPU available but Three.js WebGPURenderer not present)',
    };
    expect(info.backend).toBe('webgl');
    expect(info.webgpuAvailable).toBe(true);
    expect(info.description).toContain('WebGPU available');
  });
});
