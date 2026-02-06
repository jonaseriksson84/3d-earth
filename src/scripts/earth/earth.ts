/**
 * Earth mesh creation, shader materials, and LOD management.
 *
 * Creates the Earth sphere with day/night shader, cloud layer, and
 * Level-of-Detail switching based on camera distance.
 *
 * @module earth
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import { createTextureLoadingManager, showErrorOverlay } from './loading';
import { loadTexturesWithCompression } from './textureCompression';
import type { EarthObjects, LoadingState, SceneObjects } from './types';

function getVertexShader(): string {
  return `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
}

function getFragmentShader(): string {
  return `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec3 sunDirection;
    uniform float textureFlipY;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Apply Y-flip for KTX2 compressed textures (textureFlipY = 1.0)
      vec2 uv = vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, textureFlipY));

      vec4 dayColor = texture2D(dayTexture, uv);
      vec4 nightColor = texture2D(nightTexture, uv);

      vec3 objectNormal = normalize(vPosition);
      float sunDot = dot(objectNormal, normalize(sunDirection));

      float mixFactor = smoothstep(${CONFIG.DAY_NIGHT_TRANSITION.min}, ${CONFIG.DAY_NIGHT_TRANSITION.max}, sunDot);
      vec4 finalColor = mix(nightColor, dayColor, mixFactor);

      gl_FragColor = finalColor;
    }
  `;
}

interface LODLevel {
  segments: number;
  distance: number;
}

function getLODLevels(): LODLevel[] {
  // Three LOD levels based on camera distance
  // High: close-up (< 15 units) - 128 segments
  // Medium: medium zoom (15-30 units) - 64 segments
  // Low: far away (> 30 units) - 32 segments
  return [
    { segments: CONFIG.LOD_HIGH_SEGMENTS, distance: CONFIG.LOD_HIGH_DISTANCE },
    { segments: CONFIG.GEOMETRY_HIGH, distance: CONFIG.LOD_MEDIUM_DISTANCE },
    { segments: CONFIG.GEOMETRY_LOW, distance: CONFIG.LOD_LOW_DISTANCE },
  ];
}

/**
 * Initializes the Earth and cloud meshes with LOD, textures, and day/night shader.
 * Earth's axial tilt is applied to both meshes.
 *
 * @param sceneObjects - Core scene objects to add Earth to
 * @param loadingState - Loading overlay state for progress tracking
 * @returns Earth objects including LOD meshes and shader material
 */
export function initEarth(sceneObjects: SceneObjects, loadingState: LoadingState): EarthObjects {
  const { scene, renderer } = sceneObjects;

  const loadingManager = createTextureLoadingManager(
    loadingState,
    () => {
      // On complete - show the canvas
      renderer.domElement.style.display = 'block';
    },
    (url: string) => {
      // On error - show error overlay
      showErrorOverlay(loadingState, `Failed to load texture: ${url}`);
    },
  );

  const lodLevels = getLODLevels();

  // Load Earth textures with KTX2 compression support and JPEG fallback
  const textures = loadTexturesWithCompression(renderer, loadingManager);
  const dayTexture = textures.dayTexture;
  const nightTexture = textures.nightTexture;

  // Earth shader material (shared across LOD levels)
  // KTX2 compressed textures need Y-flip correction (textureFlipY = 1.0)
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      textureFlipY: { value: textures.compressed ? 1.0 : 0.0 },
    },
    vertexShader: getVertexShader(),
    fragmentShader: getFragmentShader(),
  });

  // Create Earth LOD with multiple detail levels
  const earth = new THREE.LOD();
  for (const level of lodLevels) {
    const geometry = new THREE.SphereGeometry(CONFIG.EARTH_RADIUS, level.segments, level.segments);
    const mesh = new THREE.Mesh(geometry, earthMaterial);
    earth.addLevel(mesh, level.distance);
  }

  console.log(`Earth LOD: ${lodLevels.map((l) => `${l.segments}seg@${l.distance}u`).join(', ')}`);

  // Apply Earth's axial tilt (23.4 degrees on the Z-axis)
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  earth.rotation.z = tiltRadians;

  scene.add(earth);

  // Clouds LOD with matching detail levels
  // depthWrite: false allows overlay layers (terminator, reference lines, timezones)
  // to render correctly on top of the cloud layer
  const cloudTexture = textures.cloudTexture;
  const cloudsMaterial = new THREE.MeshLambertMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: CONFIG.CLOUD_OPACITY,
    depthWrite: false,
  });

  const clouds = new THREE.LOD();
  for (const level of lodLevels) {
    const geometry = new THREE.SphereGeometry(CONFIG.CLOUD_RADIUS, level.segments, level.segments);

    // Flip UVs for KTX2 compressed textures (Y coordinate is inverted)
    if (textures.compressed) {
      const uvAttr = geometry.getAttribute('uv');
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setY(i, 1.0 - uvAttr.getY(i));
      }
      uvAttr.needsUpdate = true;
    }

    const mesh = new THREE.Mesh(geometry, cloudsMaterial);
    clouds.addLevel(mesh, level.distance);
  }

  // Apply same tilt to clouds
  clouds.rotation.z = tiltRadians;

  scene.add(clouds);

  return { earth, clouds, earthMaterial };
}

/**
 * Rotates the Earth and cloud meshes to center the user's longitude at the camera.
 * Preserves the axial tilt (Z rotation) while updating Y rotation.
 *
 * @param earthObjects - Earth and cloud mesh objects
 * @param userLongitude - User's longitude in degrees (-180 to 180)
 */
export function updateEarthRotation(earthObjects: EarthObjects, userLongitude: number): void {
  const { earth, clouds } = earthObjects;

  // Center user's longitude at camera by yawing Earth
  // Preserve the axial tilt (z rotation) while updating y rotation
  earth.rotation.y = -(Math.PI / 2) - (userLongitude * Math.PI) / 180;
  clouds.rotation.y = earth.rotation.y;
}

/**
 * Updates the LOD level for Earth and cloud meshes based on camera distance.
 * Should be called each frame before rendering.
 *
 * @param earthObjects - Earth and cloud LOD objects
 * @param camera - Current camera for distance calculation
 */
export function updateEarthLOD(earthObjects: EarthObjects, camera: THREE.Camera): void {
  earthObjects.earth.update(camera);
  earthObjects.clouds.update(camera);
}
