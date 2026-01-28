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
  initCitySearch,
  updateSearchResults,
  clearCitySearch,
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
  shouldCancelFlyTo,
  searchCities,
  handleSearchKeydown,
  initAtmosphere,
  updateAtmosphereRotation,
  setAtmosphereVisible,
  initTerminator,
  updateTerminatorPosition,
  setTerminatorVisible,
  initMoon,
  updateMoonPosition,
  setMoonVisible,
  updateSunTimesDisplay,
  initSatellites,
  updateSatellitePositions,
  updateSatellitesRotation,
  setSatellitesVisible,
  getDayOfYear,
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
  CitySearchState,
  TerminatorState,
  MoonState,
  SatelliteState,
  CityData,
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
let terminatorState: TerminatorState | null = null;
let citySearchState: CitySearchState | null = null;
let moonState: MoonState | null = null;
let satelliteState: SatelliteState | null = null;
let selectedCityForSunTimes: CityData | null = null;
let lastSunTimesDate: string = '';

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

function refreshSunTimesPanel(): void {
  if (!locationState || !timeState) return;
  const userTimezone = -new Date().getTimezoneOffset() / 60;
  updateSunTimesDisplay(
    locationState.userLatitude,
    locationState.userLongitude,
    timeState.selectedDate,
    userTimezone,
    selectedCityForSunTimes ?? undefined
  );
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

      // Update sunrise/sunset panel when date changes
      const currentDateStr = timeState.datePicker.value;
      if (currentDateStr !== lastSunTimesDate) {
        lastSunTimesDate = currentDateStr;
        refreshSunTimesPanel();
      }
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

    // Update terminator line position based on sun direction
    if (terminatorState && earthObjects) {
      // Keep terminator synced with Earth rotation
      terminatorState.group.rotation.y = earthObjects.earth.rotation.y;

      if (terminatorState.visible) {
        const sunDir = earthObjects.earthMaterial.uniforms.sunDirection.value;
        updateTerminatorPosition(terminatorState, sunDir.x, sunDir.y, sunDir.z);
      }
    }

    // Update Moon position based on date and sun direction
    if (moonState && moonState.visible && earthObjects && timeState) {
      const sunDir = earthObjects.earthMaterial.uniforms.sunDirection.value;
      updateMoonPosition(moonState, timeState.selectedDate, sunDir.x, sunDir.y, sunDir.z);
    }

    // Update satellite positions
    if (satelliteState && satelliteState.visible && earthObjects && timeState) {
      const sliderMinutes = parseInt(timeState.timeSlider.value);
      const dayOfYearVal = getDayOfYear(timeState.selectedDate);
      updateSatellitePositions(satelliteState, sliderMinutes, dayOfYearVal);
      updateSatellitesRotation(satelliteState, earthObjects.earth.rotation.y);
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
      terminatorState = null;
      moonState = null;
      satelliteState = null;
      citySearchState = null;
      selectedCityForSunTimes = null;
      lastSunTimesDate = '';

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

    // Initialize terminator line (disabled by default)
    terminatorState = initTerminator(sceneObjects);

    // Initialize Moon (disabled by default)
    moonState = initMoon(sceneObjects);

    // Initialize satellite orbits (disabled by default)
    satelliteState = initSatellites(sceneObjects);

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

    // Set up city search
    citySearchState = initCitySearch();
    if (citySearchState) {
      const searchInput = citySearchState.input;
      const searchStateRef = citySearchState;

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      searchInput.addEventListener('input', () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          updateSearchResults(searchStateRef, searchInput.value, (city) => {
            if (sceneObjects && flyToState && controls) {
              startFlyTo(city, sceneObjects, flyToState, controls);
            }
          });
        }, 200);
      });

      searchInput.addEventListener('keydown', (event: KeyboardEvent) => {
        if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
          event.preventDefault();
          const matches = searchCities(searchInput.value).slice(0, 8);
          const city = handleSearchKeydown(event.key, searchStateRef, matches, (c) => {
            if (sceneObjects && flyToState && controls) {
              startFlyTo(c, sceneObjects, flyToState, controls);
            }
          });
          if (city) {
            selectedCityForSunTimes = city;
            refreshSunTimesPanel();
          }
        }
      });

      searchInput.addEventListener('blur', () => {
        // Delay to allow click on result
        setTimeout(() => {
          searchStateRef.results.style.display = 'none';
        }, 150);
      });

      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
          updateSearchResults(searchStateRef, searchInput.value, (city) => {
            if (sceneObjects && flyToState && controls) {
              startFlyTo(city, sceneObjects, flyToState, controls);
            }
          });
        }
      });

      searchStateRef.clearButton.addEventListener('click', () => {
        clearCitySearch(searchStateRef);
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

    // Set up terminator line toggle
    const terminatorToggle = document.getElementById('terminatorToggle') as HTMLInputElement | null;
    if (terminatorToggle) {
      terminatorToggle.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (terminatorState) {
          setTerminatorVisible(terminatorState, target.checked);
          // Immediately update position when enabled
          if (target.checked && earthObjects) {
            const sunDir = earthObjects.earthMaterial.uniforms.sunDirection.value;
            updateTerminatorPosition(terminatorState, sunDir.x, sunDir.y, sunDir.z);
          }
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

    // Set up Moon toggle
    const moonToggle = document.getElementById('moonToggle') as HTMLInputElement | null;
    if (moonToggle) {
      moonToggle.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (moonState) {
          setMoonVisible(moonState, target.checked);
          // Immediately update position when enabled
          if (target.checked && earthObjects && timeState) {
            const sunDir = earthObjects.earthMaterial.uniforms.sunDirection.value;
            updateMoonPosition(
              moonState,
              timeState.selectedDate,
              sunDir.x,
              sunDir.y,
              sunDir.z
            );
          }
        }
      });
    }

    // Set up satellite toggle
    const satelliteToggle = document.getElementById('satelliteToggle') as HTMLInputElement | null;
    if (satelliteToggle) {
      satelliteToggle.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (satelliteState) {
          setSatellitesVisible(satelliteState, target.checked);
          // Immediately update positions when enabled
          if (target.checked && timeState) {
            const sliderMinutes = parseInt(timeState.timeSlider.value);
            const dayOfYearVal = getDayOfYear(timeState.selectedDate);
            updateSatellitePositions(satelliteState, sliderMinutes, dayOfYearVal);
          }
        }
      });
    }

    // Set up marker hover events
    window.addEventListener('mousemove', (event: MouseEvent) => {
      if (sceneObjects && markerState && timeState) {
        const sliderMinutes = parseInt(timeState.timeSlider.value);
        handleMarkerHover(event, sceneObjects, markerState, sliderMinutes, timeState.selectedDate);
      }
    });

    // Set up marker click events for fly-to animation
    window.addEventListener('click', (event: MouseEvent) => {
      if (sceneObjects && markerState && flyToState && controls) {
        const cityData = handleMarkerClick(event, sceneObjects, markerState);
        if (cityData) {
          startFlyTo(cityData, sceneObjects, flyToState, controls);
          selectedCityForSunTimes = cityData;
          refreshSunTimesPanel();
        }
      }
    });

    // Allow user interaction to cancel fly-to animation
    window.addEventListener('mousedown', (event: MouseEvent) => {
      // Only cancel fly-to when clicking on the canvas (globe interaction)
      if (flyToState && flyToState.isAnimating && controls && shouldCancelFlyTo(event.target)) {
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
    refreshSunTimesPanel();
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
