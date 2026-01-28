// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createFlyToState, startFlyTo, updateFlyTo, cancelFlyTo, isFlyingTo, shouldCancelFlyTo } from './flyTo';
import type { SceneObjects, CityData, FlyToState } from './types';

// Mock performance.now
vi.spyOn(performance, 'now');

// Helper to create mock scene objects without needing DOM
function createMockSceneObjects(): SceneObjects {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, 1, 0.1, 1000),
    renderer: {
      domElement: {} as HTMLCanvasElement,
    } as unknown as THREE.WebGLRenderer,
  };
}

describe('createFlyToState', () => {
  it('creates initial fly-to state', () => {
    const state = createFlyToState();

    expect(state.isAnimating).toBe(false);
    expect(state.startPosition).toBeInstanceOf(THREE.Vector3);
    expect(state.endPosition).toBeInstanceOf(THREE.Vector3);
    expect(state.startTime).toBe(0);
    expect(state.duration).toBe(2000);
    expect(state.targetCity).toBeNull();
  });

  it('creates vectors initialized to zero', () => {
    const state = createFlyToState();

    expect(state.startPosition.x).toBe(0);
    expect(state.startPosition.y).toBe(0);
    expect(state.startPosition.z).toBe(0);
    expect(state.endPosition.x).toBe(0);
    expect(state.endPosition.y).toBe(0);
    expect(state.endPosition.z).toBe(0);
  });
});

describe('isFlyingTo', () => {
  it('returns false when not animating', () => {
    const state = createFlyToState();
    expect(isFlyingTo(state)).toBe(false);
  });

  it('returns true when animating', () => {
    const state = createFlyToState();
    state.isAnimating = true;
    expect(isFlyingTo(state)).toBe(true);
  });
});

describe('startFlyTo', () => {
  let flyToState: FlyToState;
  let sceneObjects: SceneObjects;
  let controls: { enabled: boolean };
  let city: CityData;

  beforeEach(() => {
    flyToState = createFlyToState();
    sceneObjects = createMockSceneObjects();
    sceneObjects.camera.position.set(0, 0, 15);
    controls = { enabled: true };
    city = { name: 'London', lat: 51.5074, lon: -0.1278, timezone: 0 };

    vi.mocked(performance.now).mockReturnValue(1000);
  });

  it('sets isAnimating to true', () => {
    startFlyTo(city, sceneObjects, flyToState, controls as never);
    expect(flyToState.isAnimating).toBe(true);
  });

  it('stores the target city', () => {
    startFlyTo(city, sceneObjects, flyToState, controls as never);
    expect(flyToState.targetCity).toBe(city);
  });

  it('disables controls during animation', () => {
    startFlyTo(city, sceneObjects, flyToState, controls as never);
    expect(controls.enabled).toBe(false);
  });

  it('records start time', () => {
    startFlyTo(city, sceneObjects, flyToState, controls as never);
    expect(flyToState.startTime).toBe(1000);
  });

  it('copies current camera position to startPosition', () => {
    sceneObjects.camera.position.set(10, 5, 15);
    startFlyTo(city, sceneObjects, flyToState, controls as never);
    expect(flyToState.startPosition.x).toBe(10);
    expect(flyToState.startPosition.y).toBe(5);
    expect(flyToState.startPosition.z).toBe(15);
  });

  it('calculates end position based on city coordinates', () => {
    startFlyTo(city, sceneObjects, flyToState, controls as never);
    // End position should be on a sphere at some distance from origin
    expect(flyToState.endPosition.length()).toBeGreaterThan(0);
  });

  it('sets duration based on angular distance', () => {
    // Start on one side
    sceneObjects.camera.position.set(0, 0, 15);

    // Fly to opposite side of Earth
    const oppositeCity = { name: 'Sydney', lat: -33.8688, lon: 151.2093, timezone: 11 };
    startFlyTo(oppositeCity, sceneObjects, flyToState, controls as never);

    // Duration should be longer for farther distances
    expect(flyToState.duration).toBeGreaterThanOrEqual(2000);
    expect(flyToState.duration).toBeLessThanOrEqual(3000);
  });
});

describe('cancelFlyTo', () => {
  let flyToState: FlyToState;
  let controls: { enabled: boolean };

  beforeEach(() => {
    flyToState = createFlyToState();
    flyToState.isAnimating = true;
    flyToState.targetCity = { name: 'London', lat: 51.5074, lon: -0.1278, timezone: 0 };
    controls = { enabled: false };
  });

  it('sets isAnimating to false', () => {
    cancelFlyTo(flyToState, controls as never);
    expect(flyToState.isAnimating).toBe(false);
  });

  it('clears target city', () => {
    cancelFlyTo(flyToState, controls as never);
    expect(flyToState.targetCity).toBeNull();
  });

  it('re-enables controls', () => {
    cancelFlyTo(flyToState, controls as never);
    expect(controls.enabled).toBe(true);
  });

  it('does nothing if not animating', () => {
    flyToState.isAnimating = false;
    const city = flyToState.targetCity;
    cancelFlyTo(flyToState, controls as never);
    // targetCity is preserved when not animating
    expect(flyToState.targetCity).toBe(city);
  });
});

describe('updateFlyTo', () => {
  let flyToState: FlyToState;
  let sceneObjects: SceneObjects;
  let controls: { enabled: boolean; target: THREE.Vector3 };

  beforeEach(() => {
    flyToState = createFlyToState();
    sceneObjects = createMockSceneObjects();
    sceneObjects.camera.position.set(0, 0, 15);
    controls = { enabled: false, target: new THREE.Vector3() };
  });

  it('returns false when not animating', () => {
    const result = updateFlyTo(flyToState, sceneObjects, controls as never);
    expect(result).toBe(false);
  });

  it('updates camera position during animation', () => {
    // Setup animation
    flyToState.isAnimating = true;
    flyToState.startPosition.set(0, 0, 15);
    flyToState.endPosition.set(15, 0, 0);
    flyToState.duration = 2000;
    flyToState.startTime = 0;

    vi.mocked(performance.now).mockReturnValue(1000); // 50% progress

    updateFlyTo(flyToState, sceneObjects, controls as never);

    // Camera should have moved from start
    expect(sceneObjects.camera.position.x).not.toBe(0);
    expect(sceneObjects.camera.position.z).not.toBe(15);
  });

  it('completes animation and returns true when duration elapsed', () => {
    flyToState.isAnimating = true;
    flyToState.startPosition.set(0, 0, 15);
    flyToState.endPosition.set(15, 0, 0);
    flyToState.duration = 2000;
    flyToState.startTime = 0;

    vi.mocked(performance.now).mockReturnValue(2500); // Past duration

    const result = updateFlyTo(flyToState, sceneObjects, controls as never);

    expect(result).toBe(true);
    expect(flyToState.isAnimating).toBe(false);
    expect(controls.enabled).toBe(true);
  });

  it('sets controls target to origin', () => {
    flyToState.isAnimating = true;
    flyToState.startPosition.set(0, 0, 15);
    flyToState.endPosition.set(15, 0, 0);
    flyToState.duration = 2000;
    flyToState.startTime = 0;

    vi.mocked(performance.now).mockReturnValue(1000);

    updateFlyTo(flyToState, sceneObjects, controls as never);

    expect(controls.target.x).toBe(0);
    expect(controls.target.y).toBe(0);
    expect(controls.target.z).toBe(0);
  });

  it('uses eased progress for smooth animation', () => {
    flyToState.isAnimating = true;
    flyToState.startPosition.set(0, 0, 15);
    flyToState.endPosition.set(0, 15, 0);
    flyToState.duration = 1000;
    flyToState.startTime = 0;

    // At 50% linear time, eased progress should be different from linear
    vi.mocked(performance.now).mockReturnValue(500);
    updateFlyTo(flyToState, sceneObjects, controls as never);

    // Camera distance from origin should be maintained (spherical interpolation)
    const distance = sceneObjects.camera.position.length();
    expect(distance).toBeCloseTo(15, 0);
  });

  it('maintains camera distance during animation', () => {
    flyToState.isAnimating = true;
    flyToState.startPosition.set(0, 0, 15);
    flyToState.endPosition.set(15, 0, 0);
    flyToState.duration = 1000;
    flyToState.startTime = 0;

    // Check at various points during animation
    [250, 500, 750].forEach((time) => {
      vi.mocked(performance.now).mockReturnValue(time);
      sceneObjects.camera.position.set(0, 0, 15); // Reset
      updateFlyTo(flyToState, sceneObjects, controls as never);

      // Camera should stay at a reasonable distance
      const distance = sceneObjects.camera.position.length();
      expect(distance).toBeGreaterThan(10);
      expect(distance).toBeLessThan(20);
    });
  });
});

describe('shouldCancelFlyTo', () => {
  it('returns true when target is a canvas element', () => {
    const canvas = document.createElement('canvas');
    expect(shouldCancelFlyTo(canvas)).toBe(true);
  });

  it('returns false when target is null', () => {
    expect(shouldCancelFlyTo(null)).toBe(false);
  });

  it('returns false when target is a non-canvas HTMLElement', () => {
    const div = document.createElement('div');
    expect(shouldCancelFlyTo(div)).toBe(false);
  });

  it('returns false when target is a button element', () => {
    const button = document.createElement('button');
    expect(shouldCancelFlyTo(button)).toBe(false);
  });
});
