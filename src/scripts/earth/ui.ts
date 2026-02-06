/**
 * UI controls for time slider, date picker, playback, and astronomical presets.
 *
 * Manages user input for time-of-day and date selection, play/pause animation,
 * keyboard shortcuts, and solstice/equinox preset buttons.
 *
 * @module ui
 */

import { updateSunPosition } from './astronomy';
import { CONFIG } from './config';
import type { EarthObjects, LightingObjects, SceneObjects, TimeState } from './types';

/**
 * Updates the time display element with local and UTC time strings.
 * Also updates the slider's aria-valuetext for screen reader accessibility.
 *
 * @param now - The current Date to display
 * @param timeDisplayElement - Cached DOM element to update (may be null)
 */
export function updateTimeDisplay(now: Date, timeDisplayElement: HTMLElement | null): void {
  try {
    if (!now || !(now instanceof Date) || Number.isNaN(now.getTime())) {
      console.warn('Invalid date provided to updateTimeDisplay');
      now = new Date();
    }

    const localTime = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const utcTime = now.toUTCString().split(' ')[4].substring(0, 5);

    if (timeDisplayElement) {
      timeDisplayElement.textContent = `${localTime} (${utcTime} UTC)`;
    }

    // Update slider aria-valuetext for screen readers
    const timeSlider = document.getElementById('timeSlider');
    if (timeSlider) {
      timeSlider.setAttribute('aria-valuetext', `${localTime}, ${utcTime} UTC`);
    }
  } catch (error) {
    console.error('Error updating time display:', error);
    if (timeDisplayElement) {
      timeDisplayElement.textContent = '--:-- (--:-- UTC)';
    }
  }
}

/**
 * Creates the initial time state with default values.
 * Playback starts paused at 60x speed.
 *
 * @returns Initialized time state with null DOM references (set during initTimeControls)
 */
export function createTimeState(): TimeState {
  const today = new Date();
  return {
    timeSlider: null as unknown as HTMLInputElement,
    datePicker: null as unknown as HTMLInputElement,
    lastSliderValue: '',
    lastDateValue: '',
    needsSunUpdate: true,
    timeDisplayElement: null,
    selectedDate: today,
    isPlaying: false,
    playbackSpeed: 60, // Default to 60x speed
    lastPlaybackTime: 0,
    currentTime: 0,
  };
}

/**
 * Format a Date object as YYYY-MM-DD for date input
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object
 */
function parseDateFromInput(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Gets solstice and equinox dates for a given year.
 * Uses approximate dates that are accurate for most years.
 *
 * @param year - The calendar year to generate preset dates for
 * @returns Array of preset objects with DOM element ID and corresponding Date
 */
export function getAstronomicalPresets(year: number): { id: string; date: Date }[] {
  return [
    { id: 'presetSpringEquinox', date: new Date(year, 2, 20) }, // March 20
    { id: 'presetSummerSolstice', date: new Date(year, 5, 21) }, // June 21
    { id: 'presetAutumnEquinox', date: new Date(year, 8, 22) }, // September 22
    { id: 'presetWinterSolstice', date: new Date(year, 11, 21) }, // December 21
  ];
}

/**
 * Set date to preset and update UI
 */
function applyPresetDate(timeState: TimeState, presetDate: Date): void {
  timeState.selectedDate = presetDate;
  timeState.datePicker.value = formatDateForInput(presetDate);
  // Set time to noon UTC for best visualization
  timeState.timeSlider.value = String(CONFIG.UTC_NOON_MINUTES);
  timeState.currentTime = CONFIG.UTC_NOON_MINUTES;
  timeState.needsSunUpdate = true;
}

/**
 * Update active state on preset buttons
 */
function updatePresetActiveState(activeId: string): void {
  const presets = getAstronomicalPresets(new Date().getFullYear());
  for (const preset of presets) {
    const btn = document.getElementById(preset.id);
    if (btn) {
      btn.classList.toggle('active', preset.id === activeId);
    }
  }
}

/**
 * Clears the active/highlighted state from all astronomical preset buttons.
 */
export function clearPresetActiveState(): void {
  const presets = getAstronomicalPresets(new Date().getFullYear());
  for (const preset of presets) {
    const btn = document.getElementById(preset.id);
    if (btn) {
      btn.classList.remove('active');
    }
  }
}

/**
 * Toggles time playback between playing and paused.
 * Syncs currentTime from the slider when starting playback.
 *
 * @param timeState - Mutable time state to toggle
 */
export function togglePlayback(timeState: TimeState): void {
  timeState.isPlaying = !timeState.isPlaying;
  timeState.lastPlaybackTime = performance.now();
  // Sync currentTime from slider when starting playback
  if (timeState.isPlaying) {
    timeState.currentTime = parseInt(timeState.timeSlider.value, 10);
  }
  updatePlaybackUI(timeState.isPlaying);
}

/**
 * Sets the playback speed multiplier.
 *
 * @param timeState - Mutable time state to update
 * @param speed - Speed multiplier (1, 10, 60, or 360)
 */
export function setPlaybackSpeed(timeState: TimeState, speed: number): void {
  timeState.playbackSpeed = speed;
}

/**
 * Steps the time forward or backward by one slider increment.
 * Wraps around at day boundaries (midnight).
 *
 * @param timeState - Mutable time state to update
 * @param direction - Step direction: 1 for forward, -1 for backward
 */
export function stepTime(timeState: TimeState, direction: number): void {
  const currentValue = parseInt(timeState.timeSlider.value, 10);
  const step = CONFIG.SLIDER_STEP * direction;
  let newValue = currentValue + step;

  // Wrap around at day boundaries
  if (newValue >= CONFIG.MINUTES_PER_DAY) {
    newValue = newValue - CONFIG.MINUTES_PER_DAY;
  } else if (newValue < 0) {
    newValue = CONFIG.MINUTES_PER_DAY + newValue;
  }

  timeState.timeSlider.value = String(newValue);
  timeState.currentTime = newValue;
  timeState.needsSunUpdate = true;
}

/**
 * Update playback UI elements
 */
function updatePlaybackUI(isPlaying: boolean): void {
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const playPauseBtn = document.getElementById('playPauseBtn');

  if (playIcon && pauseIcon) {
    playIcon.style.display = isPlaying ? 'none' : 'inline';
    pauseIcon.style.display = isPlaying ? 'inline' : 'none';
  }

  if (playPauseBtn) {
    playPauseBtn.setAttribute(
      'aria-label',
      isPlaying ? 'Pause time animation' : 'Play time animation',
    );
  }
}

/**
 * Advances time during active playback based on elapsed real time and speed multiplier.
 * Should be called each animation frame. No-op when playback is paused.
 *
 * @param timeState - Mutable time state to advance
 */
export function updatePlayback(timeState: TimeState): void {
  if (!timeState.isPlaying) return;

  const now = performance.now();
  const elapsed = now - timeState.lastPlaybackTime;
  timeState.lastPlaybackTime = now;

  // Calculate how many minutes to advance
  // At 1x speed, 1 real second = 1 simulated minute
  // Elapsed is in ms, so divide by 1000 to get seconds
  const minutesToAdd = (elapsed / 1000) * timeState.playbackSpeed;

  // Advance precise time (not limited by slider step)
  timeState.currentTime += minutesToAdd;

  // Wrap around at midnight
  if (timeState.currentTime >= CONFIG.MINUTES_PER_DAY) {
    timeState.currentTime -= CONFIG.MINUTES_PER_DAY;
  }

  // Sync slider to the nearest whole minute
  const sliderValue = Math.floor(timeState.currentTime);
  if (timeState.timeSlider.value !== String(sliderValue)) {
    timeState.timeSlider.value = String(sliderValue);
    timeState.needsSunUpdate = true;
  }
}

/**
 * Initializes all time-related UI controls including the time slider, date picker,
 * cloud toggle, play/pause button, speed selector, preset buttons, and keyboard shortcuts.
 *
 * @param timeState - Mutable time state to bind to UI elements
 * @param earthObjects - Earth objects for cloud visibility toggling
 * @param _lightingObjects - Lighting objects (currently unused, reserved for future use)
 * @throws {Error} If required UI elements (timeSlider, datePicker, cloudToggle) are not found
 */
export function initTimeControls(
  timeState: TimeState,
  earthObjects: EarthObjects,
  _lightingObjects: LightingObjects,
): void {
  const timeSlider = document.getElementById('timeSlider') as HTMLInputElement | null;
  const datePicker = document.getElementById('datePicker') as HTMLInputElement | null;
  const cloudToggle = document.getElementById('cloudToggle') as HTMLInputElement | null;
  const timeDisplayElement = document.getElementById('currentTime');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const speedSelect = document.getElementById('speedSelect') as HTMLSelectElement | null;

  if (!timeSlider || !cloudToggle || !datePicker) {
    console.error('Required control elements not found');
    throw new Error('Required UI elements missing');
  }

  timeState.timeSlider = timeSlider;
  timeState.datePicker = datePicker;
  timeState.timeDisplayElement = timeDisplayElement;

  // Configure slider
  timeSlider.min = '0';
  timeSlider.max = String(CONFIG.MINUTES_PER_DAY);
  timeSlider.step = String(CONFIG.SLIDER_STEP);

  // Initialize to current date and time
  const initNow = new Date();
  timeState.selectedDate = initNow;
  datePicker.value = formatDateForInput(initNow);

  let initMinutes = initNow.getHours() * 60 + initNow.getMinutes();
  initMinutes = Math.max(0, Math.min(CONFIG.MINUTES_PER_DAY - 1, initMinutes));
  timeSlider.value = String(initMinutes);

  // Performance tracking
  timeState.lastSliderValue = timeSlider.value;
  timeState.lastDateValue = datePicker.value;
  timeState.needsSunUpdate = true;

  // Time slider event listener
  timeSlider.addEventListener('input', (event: Event) => {
    try {
      const target = event.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      if (Number.isNaN(value) || value < 0 || value >= CONFIG.MINUTES_PER_DAY) {
        console.warn('Invalid slider value, clamping to valid range');
        target.value = String(Math.max(0, Math.min(CONFIG.MINUTES_PER_DAY - 1, value || 0)));
      }
      timeState.currentTime = parseInt(target.value, 10);
      timeState.needsSunUpdate = true;
    } catch (error) {
      console.error('Error handling slider input:', error);
    }
  });

  // Date picker event listener
  datePicker.addEventListener('change', (event: Event) => {
    try {
      const target = event.target as HTMLInputElement;
      if (target.value) {
        timeState.selectedDate = parseDateFromInput(target.value);
        timeState.needsSunUpdate = true;
        clearPresetActiveState();
      }
    } catch (error) {
      console.error('Error handling date picker change:', error);
    }
  });

  // Solstice/Equinox preset buttons
  const year = new Date().getFullYear();
  const presets = getAstronomicalPresets(year);
  for (const preset of presets) {
    const btn = document.getElementById(preset.id);
    if (btn) {
      btn.addEventListener('click', () => {
        applyPresetDate(timeState, preset.date);
        updatePresetActiveState(preset.id);
      });
    }
  }

  // Cloud toggle event listener
  cloudToggle.addEventListener('change', (event: Event) => {
    try {
      const target = event.target as HTMLInputElement;
      if (earthObjects.clouds) {
        earthObjects.clouds.visible = target.checked;
      }
    } catch (error) {
      console.error('Error handling cloud toggle:', error);
    }
  });

  // Play/Pause button event listener
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      togglePlayback(timeState);
    });
  }

  // Speed select event listener
  if (speedSelect) {
    // Set initial speed from select value
    timeState.playbackSpeed = parseInt(speedSelect.value, 10);

    speedSelect.addEventListener('change', (event: Event) => {
      const target = event.target as HTMLSelectElement;
      setPlaybackSpeed(timeState, parseInt(target.value, 10));
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    // Ignore if user is typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        togglePlayback(timeState);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        stepTime(timeState, -1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        stepTime(timeState, 1);
        break;
    }
  });
}

/**
 * Checks for time or date changes and updates the sun position if needed.
 * Called each animation frame for efficient change detection.
 *
 * @param timeState - Time state with slider value and change-detection flags
 * @param earthObjects - Earth objects with shader material to update
 * @param lightingObjects - Lighting objects to reposition
 */
export function handleSunUpdate(
  timeState: TimeState,
  earthObjects: EarthObjects,
  lightingObjects: LightingObjects,
): void {
  const currentSliderValue = timeState.timeSlider.value;
  const currentDateValue = timeState.datePicker.value;
  const sliderChanged = currentSliderValue !== timeState.lastSliderValue;
  const dateChanged = currentDateValue !== timeState.lastDateValue;

  if (timeState.needsSunUpdate || sliderChanged || dateChanged) {
    // During playback, use precise currentTime; otherwise use slider value
    const sliderMinutes = timeState.isPlaying
      ? Math.floor(timeState.currentTime)
      : parseInt(timeState.timeSlider.value, 10);
    const date = updateSunPosition(
      sliderMinutes,
      earthObjects,
      lightingObjects,
      timeState.selectedDate,
    );
    updateTimeDisplay(date, timeState.timeDisplayElement);
    timeState.lastSliderValue = currentSliderValue;
    timeState.lastDateValue = currentDateValue;
    timeState.needsSunUpdate = false;
  }
}

/**
 * Sets up global event listeners for window resize handling.
 * Updates camera aspect ratio and renderer size on resize.
 *
 * @param sceneObjects - Scene objects containing camera and renderer to update
 */
export function initEventListeners(sceneObjects: SceneObjects): void {
  const { camera, renderer } = sceneObjects;

  // Handle window resize
  window.addEventListener('resize', () => {
    try {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    } catch (error) {
      console.error('Error handling window resize:', error);
    }
  });
}
