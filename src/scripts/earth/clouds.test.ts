import { describe, it, expect } from 'vitest';
import { CONFIG } from './config';
import {
  createCloudAnimationState,
  setCloudAnimationMode,
  updateCloudAnimation,
} from './clouds';

describe('createCloudAnimationState', () => {
  it('creates state with static mode by default', () => {
    const state = createCloudAnimationState();
    expect(state.mode).toBe('static');
    expect(state.rotationOffset).toBe(0);
  });
});

describe('setCloudAnimationMode', () => {
  it('sets mode to animated', () => {
    const state = createCloudAnimationState();
    setCloudAnimationMode(state, 'animated');
    expect(state.mode).toBe('animated');
  });

  it('sets mode to static and resets offset', () => {
    const state = createCloudAnimationState();
    setCloudAnimationMode(state, 'animated');
    state.rotationOffset = 1.5;
    setCloudAnimationMode(state, 'static');
    expect(state.mode).toBe('static');
    expect(state.rotationOffset).toBe(0);
  });

  it('preserves offset when switching to animated', () => {
    const state = createCloudAnimationState();
    state.rotationOffset = 0.5;
    setCloudAnimationMode(state, 'animated');
    expect(state.rotationOffset).toBe(0.5);
  });
});

describe('CONFIG.CLOUD_DRIFT_SPEED', () => {
  it('is a positive number', () => {
    expect(CONFIG.CLOUD_DRIFT_SPEED).toBeGreaterThan(0);
  });

  it('is a small value (slow drift)', () => {
    expect(CONFIG.CLOUD_DRIFT_SPEED).toBeLessThan(0.1);
  });
});

describe('updateCloudAnimation', () => {
  function makeEarthObjects() {
    return {
      earth: { rotation: { y: -1.5 } },
      clouds: { rotation: { y: -1.5 } },
      earthMaterial: {},
    } as any;
  }

  it('in static mode, clouds match earth rotation exactly', () => {
    const state = createCloudAnimationState();
    const earth = makeEarthObjects();
    updateCloudAnimation(state, earth, 0.016);
    expect(earth.clouds.rotation.y).toBe(earth.earth.rotation.y);
  });

  it('in animated mode, clouds drift away from earth rotation', () => {
    const state = createCloudAnimationState();
    setCloudAnimationMode(state, 'animated');
    const earth = makeEarthObjects();
    updateCloudAnimation(state, earth, 1.0);
    expect(state.rotationOffset).toBeCloseTo(CONFIG.CLOUD_DRIFT_SPEED, 5);
    expect(earth.clouds.rotation.y).toBeCloseTo(
      earth.earth.rotation.y + CONFIG.CLOUD_DRIFT_SPEED,
      5
    );
  });

  it('accumulates offset over multiple frames', () => {
    const state = createCloudAnimationState();
    setCloudAnimationMode(state, 'animated');
    const earth = makeEarthObjects();
    updateCloudAnimation(state, earth, 1.0);
    updateCloudAnimation(state, earth, 1.0);
    updateCloudAnimation(state, earth, 1.0);
    expect(state.rotationOffset).toBeCloseTo(CONFIG.CLOUD_DRIFT_SPEED * 3, 5);
  });

  it('wraps offset at 2*PI', () => {
    const state = createCloudAnimationState();
    setCloudAnimationMode(state, 'animated');
    state.rotationOffset = Math.PI * 2 - 0.001;
    const earth = makeEarthObjects();
    updateCloudAnimation(state, earth, 1.0);
    expect(state.rotationOffset).toBeLessThan(Math.PI * 2);
  });

  it('static mode does not change offset', () => {
    const state = createCloudAnimationState();
    const earth = makeEarthObjects();
    updateCloudAnimation(state, earth, 1.0);
    expect(state.rotationOffset).toBe(0);
  });
});
