import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  initWebGL,
  initScene,
  initEarth,
  initLighting,
  initControls,
  createLocationState,
  getLocation,
  createTimeState,
  initTimeControls,
  initEventListeners,
  handleSunUpdate,
  updatePlayback,
  initMarkers,
  updateUserMarker,
  handleMarkerHover,
  handleMarkerClick,
  updateMarkersRotation,
  setMarkersVisible,
  initStars,
  initReferenceLines,
  updateReferenceLinesRotation,
  setReferenceLinesVisible,
  createLoadingState,
  setupRetryButton,
  createFlyToState,
  startFlyTo,
  updateFlyTo,
  cancelFlyTo,
  initAtmosphere,
  updateAtmosphereRotation,
  setAtmosphereVisible,
} from './earth';
import type {
  SceneObjects,
  EarthObjects,
  LightingObjects,
  TimeState,
  LocationState,
  MarkerState,
  ReferenceLinesState,
  LoadingState,
  FlyToState,
  AtmosphereState,
} from './earth';

let sceneObjects: SceneObjects | null = null;
let earthObjects: EarthObjects | null = null;
let lightingObjects: LightingObjects | null = null;
let controls: OrbitControls | null = null;
let timeState: TimeState | null = null;
let locationState: LocationState | null = null;
let markerState: MarkerState | null = null;
let refLinesState: ReferenceLinesState | null = null;
let loadingState: LoadingState | null = null;
let flyToState: FlyToState | null = null;
let atmosphereState: AtmosphereState | null = null;

/**
 * Wrapper to get location and update both Earth rotation and user marker
 */
function getLocationWithMarkerUpdate(
  locState: LocationState,
  earthObjs: EarthObjects,
  markers: MarkerState
): void {
  // First get location (which updates Earth rotation)
  getLocation(locState, earthObjs);

  // Then add/update the user marker after a delay to allow geolocation to complete
  // Also add it immediately with default location
  updateUserMarker(markers, locState);

  // Update again when geolocation completes (if supported)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => {
        // Geolocation succeeded, locState has been updated by getLocation
        updateUserMarker(markers, locState);
      },
      () => {
        // Geolocation failed, but we already have the default marker
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }
}

function animate(): void {
  try {
    requestAnimationFrame(animate);

    // Update time during playback
    if (timeState) {
      updatePlayback(timeState);
    }

    // Only update sun position when slider changes (performance optimization)
    if (timeState && earthObjects && lightingObjects) {
      handleSunUpdate(timeState, earthObjects, lightingObjects);
    }

    // Update fly-to animation
    if (flyToState && sceneObjects && controls) {
      updateFlyTo(flyToState, sceneObjects, controls);
    }

    // Keep markers synced with Earth rotation
    if (markerState && earthObjects) {
      updateMarkersRotation(markerState, earthObjects.earth.rotation.y);
    }

    // Keep reference lines synced with Earth rotation
    if (refLinesState && earthObjects) {
      updateReferenceLinesRotation(refLinesState, earthObjects.earth.rotation.y);
    }

    // Keep atmosphere synced with Earth rotation
    if (atmosphereState && earthObjects) {
      updateAtmosphereRotation(atmosphereState, earthObjects.earth.rotation.y);
    }

    if (controls) controls.update();
    if (sceneObjects) {
      const { renderer, scene, camera } = sceneObjects;
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }
  } catch (error) {
    console.error('Animation error:', error);
    requestAnimationFrame(animate);
  }
}

export function initApp(): void {
  try {
    console.log('Initializing 3D Earth visualization...');

    // Initialize loading state first
    loadingState = createLoadingState();

    // Set up retry button for error recovery
    setupRetryButton(loadingState, () => {
      // Reset state and reinitialize
      sceneObjects = null;
      earthObjects = null;
      lightingObjects = null;
      controls = null;
      timeState = null;
      locationState = null;
      markerState = null;
      refLinesState = null;
      flyToState = null;
      atmosphereState = null;

      // Clear the scene
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.remove();
      }

      // Reinitialize
      initApp();
    });

    // Initialize all systems
    initWebGL();
    sceneObjects = initScene();
    initStars(sceneObjects);
    earthObjects = initEarth(sceneObjects, loadingState);
    lightingObjects = initLighting(sceneObjects);
    controls = initControls(sceneObjects);

    timeState = createTimeState();
    initTimeControls(timeState, earthObjects, lightingObjects);
    initEventListeners(sceneObjects);

    // Initialize markers
    markerState = initMarkers(sceneObjects);

    // Initialize fly-to state
    flyToState = createFlyToState();

    // Initialize reference lines (disabled by default)
    refLinesState = initReferenceLines(sceneObjects);

    // Initialize atmosphere glow effect (enabled by default)
    atmosphereState = initAtmosphere(sceneObjects);

    // Set up marker toggle
    const markerToggle = document.getElementById('markerToggle') as HTMLInputElement | null;
    if (markerToggle) {
      markerToggle.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (markerState) {
          setMarkersVisible(markerState, target.checked);
        }
      });
    }

    // Set up reference lines toggle
    const refLinesToggle = document.getElementById('refLinesToggle') as HTMLInputElement | null;
    if (refLinesToggle) {
      refLinesToggle.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (refLinesState) {
          setReferenceLinesVisible(refLinesState, target.checked);
        }
      });
    }

    // Set up atmosphere toggle
    const atmosphereToggle = document.getElementById('atmosphereToggle') as HTMLInputElement | null;
    if (atmosphereToggle) {
      atmosphereToggle.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (atmosphereState) {
          setAtmosphereVisible(atmosphereState, target.checked);
        }
      });
    }

    // Set up marker hover events
    window.addEventListener('mousemove', (event: MouseEvent) => {
      if (sceneObjects && markerState && timeState) {
        const sliderMinutes = parseInt(timeState.timeSlider.value);
        handleMarkerHover(event, sceneObjects, markerState, sliderMinutes);
      }
    });

    // Set up marker click events for fly-to animation
    window.addEventListener('click', (event: MouseEvent) => {
      if (sceneObjects && markerState && flyToState && controls) {
        const cityData = handleMarkerClick(event, sceneObjects, markerState);
        if (cityData) {
          startFlyTo(cityData, sceneObjects, flyToState, controls);
        }
      }
    });

    // Allow user interaction to cancel fly-to animation
    window.addEventListener('mousedown', (event: MouseEvent) => {
      // Cancel if user starts dragging during fly-to (but not if clicking marker)
      if (flyToState && flyToState.isAnimating && controls) {
        // Check if this is a marker click
        if (sceneObjects && markerState) {
          const cityData = handleMarkerClick(event, sceneObjects, markerState);
          if (!cityData) {
            // Not clicking a marker, so cancel the animation
            cancelFlyTo(flyToState, controls);
          }
        }
      }
    });

    // Also cancel on scroll/zoom
    window.addEventListener('wheel', () => {
      if (flyToState && flyToState.isAnimating && controls) {
        cancelFlyTo(flyToState, controls);
      }
    });

    // Start location detection and animation
    locationState = createLocationState();
    getLocationWithMarkerUpdate(locationState, earthObjects, markerState);
    animate();

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText =
      'position: fixed; bottom: 20px; left: 20px; background: rgba(255, 0, 0, 0.8); color: white; padding: 10px; border-radius: 5px; font-family: Arial, sans-serif;';
    const strongEl = document.createElement('strong');
    strongEl.textContent = 'Error:';
    errorDiv.appendChild(strongEl);
    errorDiv.appendChild(
      document.createTextNode(' Application failed to start. Check console for details.')
    );
    document.body.appendChild(errorDiv);
  }
}

// Start the application when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
