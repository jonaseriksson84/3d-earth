/**
 * Solar eclipse visualization with shadow projection on Earth's surface.
 *
 * Provides a database of solar eclipses from 2024–2030, detects when the
 * selected date matches an eclipse, and renders umbra and penumbra shadows
 * on the Earth using a shader-based approach.
 *
 * @module eclipse
 */

import * as THREE from 'three';
import { CONFIG } from './config';
import type { SceneObjects, EclipseState, EclipseData } from './types';

/**
 * Database of solar eclipses from 2024 to 2030.
 * Each entry contains the date, eclipse type, and approximate subsolar point
 * (latitude/longitude of maximum eclipse at mid-eclipse time).
 */
export const ECLIPSES: EclipseData[] = [
  {
    date: '2024-04-08',
    type: 'total',
    description: 'Total Solar Eclipse — visible across Mexico, USA, Canada',
    maxLat: 25.3,
    maxLon: -104.1,
  },
  {
    date: '2024-10-02',
    type: 'annular',
    description: 'Annular Solar Eclipse — visible across South America',
    maxLat: -21.9,
    maxLon: -65.3,
  },
  {
    date: '2025-03-29',
    type: 'partial',
    description: 'Partial Solar Eclipse — visible across Europe, North Africa',
    maxLat: 64.0,
    maxLon: -30.0,
  },
  {
    date: '2025-09-21',
    type: 'partial',
    description: 'Partial Solar Eclipse — visible across South Pacific, Antarctica',
    maxLat: -60.0,
    maxLon: 140.0,
  },
  {
    date: '2026-02-17',
    type: 'annular',
    description: 'Annular Solar Eclipse — visible across Antarctica',
    maxLat: -64.7,
    maxLon: -24.5,
  },
  {
    date: '2026-08-12',
    type: 'total',
    description: 'Total Solar Eclipse — visible across Arctic, Spain, Iceland',
    maxLat: 65.1,
    maxLon: -25.2,
  },
  {
    date: '2027-02-06',
    type: 'annular',
    description: 'Annular Solar Eclipse — visible across South America',
    maxLat: -31.3,
    maxLon: -46.4,
  },
  {
    date: '2027-08-02',
    type: 'total',
    description: 'Total Solar Eclipse — visible across North Africa, Middle East',
    maxLat: 25.5,
    maxLon: 33.2,
  },
  {
    date: '2028-01-26',
    type: 'annular',
    description: 'Annular Solar Eclipse — visible across South America',
    maxLat: -3.0,
    maxLon: -78.3,
  },
  {
    date: '2028-07-22',
    type: 'total',
    description: 'Total Solar Eclipse — visible across Australia, New Zealand',
    maxLat: -25.5,
    maxLon: 153.0,
  },
  {
    date: '2029-01-14',
    type: 'partial',
    description: 'Partial Solar Eclipse — visible across North America',
    maxLat: 40.0,
    maxLon: -100.0,
  },
  {
    date: '2029-06-12',
    type: 'partial',
    description: 'Partial Solar Eclipse — visible across Arctic regions',
    maxLat: 70.0,
    maxLon: 0.0,
  },
  {
    date: '2029-07-11',
    type: 'partial',
    description: 'Partial Solar Eclipse — visible across South America',
    maxLat: -50.0,
    maxLon: -70.0,
  },
  {
    date: '2029-12-05',
    type: 'partial',
    description: 'Partial Solar Eclipse — visible across Antarctica',
    maxLat: -70.0,
    maxLon: 50.0,
  },
  {
    date: '2030-06-01',
    type: 'annular',
    description: 'Annular Solar Eclipse — visible across North Africa, Europe',
    maxLat: 40.4,
    maxLon: 22.3,
  },
  {
    date: '2030-11-25',
    type: 'total',
    description: 'Total Solar Eclipse — visible across Southern Africa, Australia',
    maxLat: -44.0,
    maxLon: 72.0,
  },
];

/**
 * Finds an eclipse matching the given date string (YYYY-MM-DD format).
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Matching eclipse data, or null if no eclipse on that date
 */
export function findEclipseForDate(dateStr: string): EclipseData | null {
  return ECLIPSES.find((e) => e.date === dateStr) ?? null;
}

/**
 * Returns the next upcoming eclipse from the given date.
 *
 * @param date - Reference date to search from
 * @returns The next eclipse after the given date, or null if none in database
 */
export function getNextEclipse(date: Date): EclipseData | null {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  for (const eclipse of ECLIPSES) {
    if (eclipse.date >= dateStr) {
      return eclipse;
    }
  }
  return null;
}

/**
 * Converts latitude and longitude to a 3D position on the Earth surface.
 * Exported for use by fly-to functionality.
 */
export function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

function getEclipseVertexShader(): string {
  return `
    varying vec2 vUv;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vLocalPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;
}

function getUmbraFragmentShader(): string {
  return `
    uniform vec3 eclipseCenter;
    uniform float umbraRadius;
    uniform float penumbraRadius;
    uniform float eclipseType; // 0 = total, 1 = annular, 2 = partial

    varying vec2 vUv;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;

    void main() {
      // Distance from eclipse center on the sphere surface (using local coordinates)
      vec3 surfacePoint = normalize(vLocalPosition);
      vec3 center = normalize(eclipseCenter);
      float angularDist = acos(clamp(dot(surfacePoint, center), -1.0, 1.0));

      // Normalize distances
      float umbraDist = angularDist / umbraRadius;
      float penumbraDist = angularDist / penumbraRadius;

      if (penumbraDist > 1.15) {
        discard;
      }

      float alpha = 0.0;
      vec3 color = vec3(0.0, 0.0, 0.05);

      // Outer colored ring for visibility
      float ringStart = 0.9;
      float ringEnd = 1.15;
      bool inRing = penumbraDist > ringStart && penumbraDist <= ringEnd;

      if (eclipseType < 0.5) {
        // Total eclipse: dark umbra core + gradient penumbra + orange ring
        if (umbraDist < 1.0) {
          alpha = 0.85; // Very dark in umbra
        } else if (penumbraDist <= 1.0) {
          // Penumbra: smooth falloff
          float t = (penumbraDist - umbraDist) / (1.0 - umbraDist + 0.001);
          alpha = mix(0.6, 0.0, smoothstep(0.0, 1.0, t));
        }
        // Orange ring for total eclipse
        if (inRing) {
          float ringT = (penumbraDist - ringStart) / (ringEnd - ringStart);
          float ringAlpha = sin(ringT * 3.14159) * 0.7;
          color = mix(color, vec3(1.0, 0.5, 0.0), ringAlpha);
          alpha = max(alpha, ringAlpha);
        }
      } else if (eclipseType < 1.5) {
        // Annular eclipse: ring of fire (brighter center than total) + gold ring
        if (umbraDist < 1.0) {
          alpha = 0.55; // Less dark (ring of fire visible)
        } else if (penumbraDist <= 1.0) {
          float t = (penumbraDist - umbraDist) / (1.0 - umbraDist + 0.001);
          alpha = mix(0.4, 0.0, smoothstep(0.0, 1.0, t));
        }
        // Gold ring for annular eclipse
        if (inRing) {
          float ringT = (penumbraDist - ringStart) / (ringEnd - ringStart);
          float ringAlpha = sin(ringT * 3.14159) * 0.7;
          color = mix(color, vec3(1.0, 0.8, 0.2), ringAlpha);
          alpha = max(alpha, ringAlpha);
        }
      } else {
        // Partial eclipse: only penumbra, no umbra + cyan ring
        if (penumbraDist <= 1.0) {
          alpha = mix(0.4, 0.0, smoothstep(0.0, 1.0, penumbraDist));
        }
        // Cyan ring for partial eclipse
        if (inRing) {
          float ringT = (penumbraDist - ringStart) / (ringEnd - ringStart);
          float ringAlpha = sin(ringT * 3.14159) * 0.6;
          color = mix(color, vec3(0.2, 0.8, 1.0), ringAlpha);
          alpha = max(alpha, ringAlpha);
        }
      }

      gl_FragColor = vec4(color, alpha);
    }
  `;
}

/**
 * Initializes the eclipse visualization system.
 * Creates a shadow mesh that can be positioned on Earth's surface.
 * Hidden by default; toggle via UI checkbox.
 *
 * @param sceneObjects - Core scene objects to add the eclipse shadow to
 * @returns Eclipse state with mesh, material, and visibility flag
 */
export function initEclipse(sceneObjects: SceneObjects): EclipseState {
  const { scene } = sceneObjects;

  // Use a sphere slightly above Earth to render the shadow
  const radius = CONFIG.EARTH_RADIUS + 0.02;
  const geometry = new THREE.SphereGeometry(radius, 64, 64);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      eclipseCenter: { value: new THREE.Vector3(0, 1, 0) },
      umbraRadius: { value: 0.02 }, // Angular radius of umbra
      penumbraRadius: { value: 0.08 }, // Angular radius of penumbra
      eclipseType: { value: 0.0 }, // 0=total, 1=annular, 2=partial
    },
    vertexShader: getEclipseVertexShader(),
    fragmentShader: getUmbraFragmentShader(),
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;
  mesh.renderOrder = 2; // Render after Earth

  // Apply Earth's axial tilt
  const tiltRad = (CONFIG.AXIAL_TILT * Math.PI) / 180;
  const group = new THREE.Group();
  group.rotation.z = tiltRad;
  group.add(mesh);
  scene.add(group);

  return {
    group,
    mesh,
    material,
    visible: false,
    currentEclipse: null,
  };
}

/**
 * Updates the eclipse shadow position and visibility based on the current date.
 * If the selected date matches an eclipse in the database, positions the shadow
 * at the eclipse maximum point and configures the shader for the eclipse type.
 *
 * @param eclipseState - Eclipse state to update
 * @param dateStr - Current date in YYYY-MM-DD format
 */
export function updateEclipseForDate(
  eclipseState: EclipseState,
  dateStr: string
): void {
  const eclipse = findEclipseForDate(dateStr);

  if (!eclipse) {
    eclipseState.mesh.visible = false;
    eclipseState.currentEclipse = null;
    return;
  }

  eclipseState.currentEclipse = eclipse;

  if (!eclipseState.visible) {
    eclipseState.mesh.visible = false;
    return;
  }

  // Position eclipse shadow at the maximum eclipse point
  const center = latLonToVec3(eclipse.maxLat, eclipse.maxLon, CONFIG.EARTH_RADIUS + 0.02);
  eclipseState.material.uniforms.eclipseCenter.value.copy(center.normalize());

  // Set eclipse type uniform
  let typeValue = 0.0;
  if (eclipse.type === 'annular') typeValue = 1.0;
  else if (eclipse.type === 'partial') typeValue = 2.0;
  eclipseState.material.uniforms.eclipseType.value = typeValue;

  // Set shadow sizes based on eclipse type
  if (eclipse.type === 'total') {
    eclipseState.material.uniforms.umbraRadius.value = 0.015;
    eclipseState.material.uniforms.penumbraRadius.value = 0.12;
  } else if (eclipse.type === 'annular') {
    eclipseState.material.uniforms.umbraRadius.value = 0.02;
    eclipseState.material.uniforms.penumbraRadius.value = 0.1;
  } else {
    // Partial: no umbra, just penumbra
    eclipseState.material.uniforms.umbraRadius.value = 0.001;
    eclipseState.material.uniforms.penumbraRadius.value = 0.08;
  }

  eclipseState.mesh.visible = true;
}

/**
 * Syncs the eclipse group rotation with Earth's rotation.
 *
 * @param eclipseState - Eclipse state to update
 * @param earthRotationY - Current Earth Y-axis rotation in radians
 */
export function updateEclipseRotation(
  eclipseState: EclipseState,
  earthRotationY: number
): void {
  eclipseState.group.rotation.y = earthRotationY;
}

/**
 * Sets visibility of the eclipse shadow.
 *
 * @param eclipseState - Eclipse state to update
 * @param visible - Whether eclipses should be shown when date matches
 */
export function setEclipseVisible(eclipseState: EclipseState, visible: boolean): void {
  eclipseState.visible = visible;
  // If no eclipse on current date, keep mesh hidden regardless
  if (!eclipseState.currentEclipse) {
    eclipseState.mesh.visible = false;
  } else {
    eclipseState.mesh.visible = visible;
  }
}

/**
 * Updates the eclipse notification UI element.
 * Shows/hides eclipse info based on whether current date has an eclipse.
 *
 * @param eclipse - Eclipse data for current date, or null
 * @param notificationEl - DOM element for displaying eclipse notifications
 */
export function updateEclipseNotification(
  eclipse: EclipseData | null,
  notificationEl: HTMLElement | null
): void {
  if (!notificationEl) return;

  if (eclipse) {
    const typeLabel = eclipse.type.charAt(0).toUpperCase() + eclipse.type.slice(1);
    notificationEl.textContent = `☀ ${typeLabel} Solar Eclipse: ${eclipse.description}`;
    notificationEl.style.display = 'block';
  } else {
    notificationEl.style.display = 'none';
    notificationEl.textContent = '';
  }
}

/**
 * Populates the eclipse quick-jump buttons in the UI.
 * Shows the next 5 upcoming eclipses from the current date.
 *
 * @param containerEl - DOM element to render buttons into
 * @param onSelect - Callback when an eclipse date is selected
 */
export function populateEclipseButtons(
  containerEl: HTMLElement | null,
  onSelect: (dateStr: string) => void
): void {
  if (!containerEl) return;

  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const upcoming = ECLIPSES.filter((e) => e.date >= nowStr).slice(0, 5);

  containerEl.innerHTML = '';
  for (const eclipse of upcoming) {
    const btn = document.createElement('button');
    btn.className = 'eclipse-btn';
    const dateParts = eclipse.date.split('-');
    const shortDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0].slice(2)}`;
    const typeShort = eclipse.type === 'total' ? 'T' : eclipse.type === 'annular' ? 'A' : 'P';
    btn.textContent = `${typeShort} ${shortDate}`;
    btn.title = eclipse.description;
    btn.setAttribute('aria-label', `Jump to ${eclipse.type} eclipse on ${eclipse.date}`);
    btn.addEventListener('click', () => onSelect(eclipse.date));
    containerEl.appendChild(btn);
  }
}

/**
 * Creates a tooltip element for eclipse hover display.
 *
 * @returns The tooltip DOM element
 */
export function createEclipseTooltip(): HTMLElement {
  const tooltip = document.createElement('div');
  tooltip.className = 'eclipse-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    display: none;
    background: rgba(10, 10, 20, 0.95);
    border: 1px solid rgba(255, 160, 0, 0.5);
    border-radius: 6px;
    padding: 8px 12px;
    color: #fff;
    font-size: 13px;
    pointer-events: none;
    z-index: 1000;
    max-width: 280px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  `;
  document.body.appendChild(tooltip);
  return tooltip;
}

/**
 * Checks if the mouse is hovering over the eclipse shadow using raycasting.
 *
 * @param clientX - Mouse X position
 * @param clientY - Mouse Y position
 * @param sceneObjects - Scene objects for raycasting
 * @param eclipseState - Eclipse state to check
 * @returns True if hovering over visible eclipse
 */
export function detectEclipseHover(
  clientX: number,
  clientY: number,
  sceneObjects: SceneObjects,
  eclipseState: EclipseState
): boolean {
  if (!eclipseState.visible || !eclipseState.mesh.visible || !eclipseState.currentEclipse) {
    return false;
  }

  const { camera, renderer } = sceneObjects;
  const rect = renderer.domElement.getBoundingClientRect();

  // Convert mouse to normalized device coordinates
  const mouse = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Check intersection with eclipse mesh
  const intersects = raycaster.intersectObject(eclipseState.mesh);

  if (intersects.length > 0) {
    // Check if the intersection point is within the eclipse penumbra
    const intersectPoint = intersects[0].point.clone().normalize();
    const eclipseCenter = eclipseState.material.uniforms.eclipseCenter.value.clone().normalize();
    const angularDist = intersectPoint.angleTo(eclipseCenter);
    const penumbraRadius = eclipseState.material.uniforms.penumbraRadius.value * 1.15;

    return angularDist < penumbraRadius;
  }

  return false;
}

/**
 * Shows the eclipse tooltip at the mouse position.
 *
 * @param eclipse - Eclipse data to display
 * @param clientX - Mouse X position
 * @param clientY - Mouse Y position
 * @param tooltip - Tooltip DOM element
 */
export function showEclipseTooltip(
  eclipse: EclipseData,
  clientX: number,
  clientY: number,
  tooltip: HTMLElement
): void {
  const typeLabel = eclipse.type.charAt(0).toUpperCase() + eclipse.type.slice(1);
  const typeColor =
    eclipse.type === 'total' ? '#ff8000' :
    eclipse.type === 'annular' ? '#ffcc33' : '#33ccff';

  tooltip.innerHTML = `
    <div style="font-weight: bold; color: ${typeColor}; margin-bottom: 4px;">
      ☀ ${typeLabel} Solar Eclipse
    </div>
    <div style="color: #ccc; margin-bottom: 4px;">${eclipse.description}</div>
    <div style="color: #888; font-size: 11px;">
      Date: ${eclipse.date}<br>
      Location: ${eclipse.maxLat.toFixed(1)}°${eclipse.maxLat >= 0 ? 'N' : 'S'}, ${Math.abs(eclipse.maxLon).toFixed(1)}°${eclipse.maxLon >= 0 ? 'E' : 'W'}
    </div>
  `;
  tooltip.style.display = 'block';
  tooltip.style.left = `${clientX + 15}px`;
  tooltip.style.top = `${clientY + 15}px`;
}

/**
 * Hides the eclipse tooltip.
 *
 * @param tooltip - Tooltip DOM element
 */
export function hideEclipseTooltip(tooltip: HTMLElement): void {
  tooltip.style.display = 'none';
}
