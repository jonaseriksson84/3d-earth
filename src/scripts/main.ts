/**
 * Application entry point and orchestrator.
 *
 * Initializes all subsystems (scene, Earth, lighting, controls, markers, etc.),
 * wires up UI event listeners, and runs the animation loop.
 *
 * @module main
 */

import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  initWebGL,
  initScene,
  initEarth,
  updateEarthLOD,
  initLighting,
  initControls,
  setupCanvasTouchHandling,
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
  detectMarkerAtPosition,
  showMarkerTooltip,
  hideMarkerTooltip,
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
  initAurora,
  updateAurora,
  updateAuroraRotation,
  setAuroraVisible,
  getDayOfYear,
  createCloudAnimationState,
  setCloudAnimationMode,
  updateCloudAnimation,
  initCustomMarkers,
  setPlacingMode,
  screenToLatLon,
  addCustomMarker,
  removeCustomMarker,
  editCustomMarkerLabel,
  updateCustomMarkersList,
  initEclipse,
  updateEclipseForDate,
  updateEclipseRotation,
  setEclipseVisible,
  findEclipseForDate,
  updateEclipseNotification,
  populateEclipseButtons,
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
  AuroraState,
  CloudAnimationState,
  CustomMarkerState,
  EclipseState,
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
let auroraState: AuroraState | null = null;
let cloudAnimState: CloudAnimationState | null = null;
let customMarkerState: CustomMarkerState | null = null;
let eclipseState: EclipseState | null = null;
let lastFrameTime: number = 0;
let lastEclipseDateCheck: string = '';
let selectedCityForSunTimes: CityData | null = null;
let lastSunTimesDate: string = '';

/**
 * Gets user geolocation and updates both Earth rotation and user marker.
 * Places default marker immediately, then updates after geolocation resolves.
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

    // Compute frame delta time
    const now = performance.now() / 1000;
    const dt = lastFrameTime > 0 ? Math.min(now - lastFrameTime, 0.1) : 0.016;
    lastFrameTime = now;

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

    // Update cloud animation (drift effect)
    if (cloudAnimState && earthObjects) {
      updateCloudAnimation(cloudAnimState, earthObjects, dt);
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

    // Update aurora animation
    if (auroraState && earthObjects) {
      updateAuroraRotation(auroraState, earthObjects.earth.rotation.y);
      if (auroraState.visible) {
        const sunDir = earthObjects.earthMaterial.uniforms.sunDirection.value;
        updateAurora(auroraState, dt, sunDir.x, sunDir.y, sunDir.z);
      }
    }

    // Update eclipse shadow rotation and date check
    if (eclipseState && earthObjects) {
      updateEclipseRotation(eclipseState, earthObjects.earth.rotation.y);

      // Check for eclipse when date changes
      if (timeState) {
        const currentDateStr = timeState.datePicker.value;
        if (currentDateStr !== lastEclipseDateCheck) {
          lastEclipseDateCheck = currentDateStr;
          updateEclipseForDate(eclipseState, currentDateStr);
          // Update notification
          const eclipse = findEclipseForDate(currentDateStr);
          const notificationEl = document.getElementById('eclipseNotification');
          updateEclipseNotification(eclipse, notificationEl);
        }
      }
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

      // Update LOD levels based on camera distance
      if (earthObjects) {
        updateEarthLOD(earthObjects, camera);
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }
  } catch (error) {
    console.error('Animation error:', error);
    requestAnimationFrame(animate);
  }
}

function refreshCustomMarkersList(): void {
  if (!customMarkerState || !markerState) return;
  const listEl = document.getElementById('customMarkersList');
  const countEl = document.getElementById('customMarkerCount');
  if (!listEl) return;

  if (countEl) {
    countEl.textContent = `${customMarkerState.markers.length}/${customMarkerState.maxMarkers}`;
  }

  updateCustomMarkersList(
    customMarkerState,
    listEl,
    // onDelete
    (id) => {
      if (!customMarkerState || !markerState) return;
      removeCustomMarker(customMarkerState, markerState, id);
      refreshCustomMarkersList();
    },
    // onEdit
    (id) => {
      if (!customMarkerState) return;
      const marker = customMarkerState.markers.find((m) => m.id === id);
      if (!marker) return;
      const newLabel = prompt('Enter new label:', marker.label);
      if (newLabel !== null && newLabel.trim()) {
        editCustomMarkerLabel(customMarkerState, id, newLabel.trim());
        refreshCustomMarkersList();
      }
    },
    // onFlyTo
    (marker) => {
      if (!sceneObjects || !flyToState || !controls) return;
      const cityData: CityData = {
        name: marker.label,
        lat: marker.lat,
        lon: marker.lon,
        timezone: marker.timezone,
      };
      startFlyTo(cityData, sceneObjects, flyToState, controls);
      selectedCityForSunTimes = cityData;
      refreshSunTimesPanel();
    }
  );
}

function setupCustomMarkersUI(): void {
  const addBtn = document.getElementById('addMarkerBtn');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    if (!customMarkerState) return;

    if (customMarkerState.markers.length >= customMarkerState.maxMarkers) {
      alert(`Maximum of ${customMarkerState.maxMarkers} custom markers reached.`);
      return;
    }

    const isPlacing = !customMarkerState.placingMode;
    setPlacingMode(customMarkerState, isPlacing);
    addBtn.classList.toggle('placing-active', isPlacing);
    addBtn.textContent = isPlacing ? 'Click on globe to place...' : '+ Add marker';
  });

  refreshCustomMarkersList();
}

function handleCustomMarkerPlacement(clientX: number, clientY: number): boolean {
  if (!customMarkerState || !customMarkerState.placingMode) return false;
  if (!sceneObjects || !markerState) return false;

  const latLon = screenToLatLon(clientX, clientY, sceneObjects);
  if (!latLon) return false;

  const label = prompt('Enter marker label:');
  if (!label || !label.trim()) {
    // User cancelled - exit placing mode
    setPlacingMode(customMarkerState, false);
    const addBtn = document.getElementById('addMarkerBtn');
    if (addBtn) {
      addBtn.classList.remove('placing-active');
      addBtn.textContent = '+ Add marker';
    }
    return true;
  }

  addCustomMarker(customMarkerState, markerState, latLon.lat, latLon.lon, label.trim());
  setPlacingMode(customMarkerState, false);
  const addBtn = document.getElementById('addMarkerBtn');
  if (addBtn) {
    addBtn.classList.remove('placing-active');
    addBtn.textContent = '+ Add marker';
  }
  refreshCustomMarkersList();
  return true;
}

/**
 * Initializes the entire 3D Earth visualization application.
 * Sets up all subsystems, UI event listeners, and starts the animation loop.
 * Displays an error message if initialization fails.
 */
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
      auroraState = null;
      cloudAnimState = null;
      customMarkerState = null;
      eclipseState = null;
      lastFrameTime = 0;
      lastEclipseDateCheck = '';
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

    // Set up touch handling on canvas to prevent default browser behaviors
    setupCanvasTouchHandling(sceneObjects.renderer.domElement);

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

    // Initialize aurora effects (disabled by default)
    auroraState = initAurora(sceneObjects);

    // Initialize eclipse visualization (disabled by default)
    eclipseState = initEclipse(sceneObjects);

    // Initialize cloud animation (animated by default)
    cloudAnimState = createCloudAnimationState();
    setCloudAnimationMode(cloudAnimState, 'animated');

    // Initialize custom markers (loads from localStorage)
    customMarkerState = initCustomMarkers(markerState);
    setupCustomMarkersUI();

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

    // Set up aurora toggle
    const auroraToggle = document.getElementById('auroraToggle') as HTMLInputElement | null;
    if (auroraToggle) {
      auroraToggle.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (auroraState) {
          setAuroraVisible(auroraState, target.checked);
        }
      });
    }

    // Set up eclipse toggle
    const eclipseToggle = document.getElementById('eclipseToggle') as HTMLInputElement | null;
    if (eclipseToggle) {
      eclipseToggle.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (eclipseState) {
          setEclipseVisible(eclipseState, target.checked);
          // Re-check current date for eclipse
          if (target.checked && timeState) {
            const dateStr = timeState.datePicker.value;
            updateEclipseForDate(eclipseState, dateStr);
          }
        }
      });
    }

    // Populate eclipse quick-jump buttons
    const eclipseButtonsEl = document.getElementById('eclipseButtons');
    populateEclipseButtons(eclipseButtonsEl, (dateStr: string) => {
      if (timeState) {
        timeState.datePicker.value = dateStr;
        timeState.selectedDate = new Date(dateStr + 'T12:00:00');
        timeState.lastDateValue = dateStr;
        timeState.needsSunUpdate = true;
        // Set time to noon for best eclipse viewing
        timeState.timeSlider.value = '720';
        timeState.lastSliderValue = '720';
      }
    });

    // Set up cloud animation mode select
    const cloudModeSelect = document.getElementById('cloudModeSelect') as HTMLSelectElement | null;
    if (cloudModeSelect) {
      cloudModeSelect.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLSelectElement;
        if (cloudAnimState) {
          setCloudAnimationMode(cloudAnimState, target.value as 'static' | 'animated');
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

    // Set up marker click events for fly-to animation and custom marker placement
    window.addEventListener('click', (event: MouseEvent) => {
      // Check if we're in placing mode first
      if (customMarkerState && customMarkerState.placingMode) {
        // Only handle placement on canvas clicks
        if (event.target instanceof HTMLElement && event.target.tagName === 'CANVAS') {
          handleCustomMarkerPlacement(event.clientX, event.clientY);
          return;
        }
      }

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

    // Touch event handling for marker taps on mobile devices
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    const TAP_THRESHOLD = 15; // max pixels moved to count as tap
    const TAP_TIMEOUT = 300; // max ms for a tap

    window.addEventListener('touchstart', (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = performance.now();
      }
    }, { passive: true });

    window.addEventListener('touchend', (event: TouchEvent) => {
      // Only process single-finger taps (not pinch-zoom releases)
      if (event.changedTouches.length !== 1) return;

      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const elapsed = performance.now() - touchStartTime;

      // Determine if this was a tap (short distance, short time)
      if (distance > TAP_THRESHOLD || elapsed > TAP_TIMEOUT) return;

      // Check if the tap target is the canvas
      if (!(touch.target instanceof HTMLElement) || touch.target.tagName !== 'CANVAS') return;

      // Handle custom marker placement on tap
      if (customMarkerState && customMarkerState.placingMode) {
        handleCustomMarkerPlacement(touch.clientX, touch.clientY);
        return;
      }

      if (!sceneObjects || !markerState || !timeState) return;

      const cityData = detectMarkerAtPosition(
        touch.clientX,
        touch.clientY,
        sceneObjects,
        markerState
      );

      if (cityData) {
        // Show tooltip at tap position
        const sliderMinutes = parseInt(timeState.timeSlider.value);
        showMarkerTooltip(
          cityData,
          touch.clientX,
          touch.clientY,
          markerState,
          sliderMinutes,
          timeState.selectedDate
        );

        // Trigger fly-to on tap
        if (flyToState && controls) {
          startFlyTo(cityData, sceneObjects, flyToState, controls);
          selectedCityForSunTimes = cityData;
          refreshSunTimesPanel();
        }

        // Auto-hide tooltip after 3 seconds
        setTimeout(() => {
          if (markerState) {
            hideMarkerTooltip(markerState);
          }
        }, 3000);
      } else {
        // Tap on empty space hides tooltip
        hideMarkerTooltip(markerState);
      }
    }, { passive: true });

    // Cancel fly-to on multi-touch (pinch) gestures
    window.addEventListener('touchmove', (event: TouchEvent) => {
      if (event.touches.length >= 2 && flyToState && flyToState.isAnimating && controls) {
        cancelFlyTo(flyToState, controls);
      }
    }, { passive: true });

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
