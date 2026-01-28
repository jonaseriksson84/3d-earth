import * as THREE from 'three';
import { CONFIG } from './config';
import type { EarthObjects, SceneObjects, LoadingState } from './types';
import { createTextureLoadingManager, showErrorOverlay } from './loading';

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

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec4 dayColor = texture2D(dayTexture, vUv);
      vec4 nightColor = texture2D(nightTexture, vUv);

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

export function initEarth(
  sceneObjects: SceneObjects,
  loadingState: LoadingState
): EarthObjects {
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
    }
  );

  const textureLoader = new THREE.TextureLoader(loadingManager);
  const lodLevels = getLODLevels();

  // Load Earth textures
  const dayTexture = textureLoader.load(
    '/textures/earth_day.jpg',
    undefined,
    undefined,
    () => console.warn('Day texture failed')
  );
  const nightTexture = textureLoader.load(
    '/textures/earth_night.jpg',
    undefined,
    undefined,
    () => console.warn('Night lights texture failed')
  );

  // Earth shader material (shared across LOD levels)
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: getVertexShader(),
    fragmentShader: getFragmentShader(),
  });

  // Create Earth LOD with multiple detail levels
  const earth = new THREE.LOD();
  for (const level of lodLevels) {
    const geometry = new THREE.SphereGeometry(
      CONFIG.EARTH_RADIUS,
      level.segments,
      level.segments
    );
    const mesh = new THREE.Mesh(geometry, earthMaterial);
    earth.addLevel(mesh, level.distance);
  }

  console.log(
    `Earth LOD: ${lodLevels.map((l) => `${l.segments}seg@${l.distance}u`).join(', ')}`
  );

  // Apply Earth's axial tilt (23.4 degrees on the Z-axis)
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  earth.rotation.z = tiltRadians;

  scene.add(earth);

  // Clouds LOD with matching detail levels
  const cloudTexture = textureLoader.load(
    '/textures/earth_clouds.jpg',
    undefined,
    undefined,
    () => console.warn('Cloud texture failed')
  );
  const cloudsMaterial = new THREE.MeshLambertMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: CONFIG.CLOUD_OPACITY,
  });

  const clouds = new THREE.LOD();
  for (const level of lodLevels) {
    const geometry = new THREE.SphereGeometry(
      CONFIG.CLOUD_RADIUS,
      level.segments,
      level.segments
    );
    const mesh = new THREE.Mesh(geometry, cloudsMaterial);
    clouds.addLevel(mesh, level.distance);
  }

  // Apply same tilt to clouds
  clouds.rotation.z = tiltRadians;

  scene.add(clouds);

  return { earth, clouds, earthMaterial };
}

export function updateEarthRotation(
  earthObjects: EarthObjects,
  userLongitude: number
): void {
  const { earth, clouds } = earthObjects;

  // Center user's longitude at camera by yawing Earth
  // Preserve the axial tilt (z rotation) while updating y rotation
  earth.rotation.y = -(Math.PI / 2) - (userLongitude * Math.PI) / 180;
  clouds.rotation.y = earth.rotation.y;
}

export function updateEarthLOD(
  earthObjects: EarthObjects,
  camera: THREE.Camera
): void {
  earthObjects.earth.update(camera);
  earthObjects.clouds.update(camera);
}
