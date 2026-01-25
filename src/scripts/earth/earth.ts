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

function getSegments(): number {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const isHighDPI = devicePixelRatio > 1.5;
  const isLargeScreen = window.innerWidth > 1200;

  const segments =
    isHighDPI && isLargeScreen
      ? CONFIG.GEOMETRY_HIGH
      : isHighDPI || isLargeScreen
        ? CONFIG.GEOMETRY_MEDIUM
        : CONFIG.GEOMETRY_LOW;

  console.log(
    `Using ${segments}x${segments} geometry segments (${segments * segments * 2} triangles)`
  );

  return segments;
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
  const segments = getSegments();

  const earthGeometry = new THREE.SphereGeometry(
    CONFIG.EARTH_RADIUS,
    segments,
    segments
  );

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

  // Earth shader material
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: getVertexShader(),
    fragmentShader: getFragmentShader(),
  });

  const earth = new THREE.Mesh(earthGeometry, earthMaterial);

  // Apply Earth's axial tilt (23.4 degrees on the Z-axis)
  const tiltRadians = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  earth.rotation.z = tiltRadians;

  scene.add(earth);

  // Clouds
  const cloudsGeometry = new THREE.SphereGeometry(
    CONFIG.CLOUD_RADIUS,
    segments,
    segments
  );
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
  const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);

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
