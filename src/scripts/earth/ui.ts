import { CONFIG } from './config';
import type { TimeState, EarthObjects, LightingObjects, SceneObjects } from './types';
import { updateSunPosition } from './astronomy';

export function updateTimeDisplay(
  now: Date,
  timeDisplayElement: HTMLElement | null
): void {
  try {
    if (!now || !(now instanceof Date) || isNaN(now.getTime())) {
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
  } catch (error) {
    console.error('Error updating time display:', error);
    if (timeDisplayElement) {
      timeDisplayElement.textContent = '--:-- (--:-- UTC)';
    }
  }
}

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

export function initTimeControls(
  timeState: TimeState,
  earthObjects: EarthObjects,
  _lightingObjects: LightingObjects
): void {
  const timeSlider = document.getElementById('timeSlider') as HTMLInputElement | null;
  const datePicker = document.getElementById('datePicker') as HTMLInputElement | null;
  const cloudToggle = document.getElementById('cloudToggle') as HTMLInputElement | null;
  const timeDisplayElement = document.getElementById('currentTime');

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
      const value = parseInt(target.value);
      if (isNaN(value) || value < 0 || value >= CONFIG.MINUTES_PER_DAY) {
        console.warn('Invalid slider value, clamping to valid range');
        target.value = String(
          Math.max(0, Math.min(CONFIG.MINUTES_PER_DAY - 1, value || 0))
        );
      }
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
      }
    } catch (error) {
      console.error('Error handling date picker change:', error);
    }
  });

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
}

export function handleSunUpdate(
  timeState: TimeState,
  earthObjects: EarthObjects,
  lightingObjects: LightingObjects
): void {
  const currentSliderValue = timeState.timeSlider.value;
  const currentDateValue = timeState.datePicker.value;
  const sliderChanged = currentSliderValue !== timeState.lastSliderValue;
  const dateChanged = currentDateValue !== timeState.lastDateValue;

  if (timeState.needsSunUpdate || sliderChanged || dateChanged) {
    const sliderMinutes = parseInt(timeState.timeSlider.value);
    const date = updateSunPosition(sliderMinutes, earthObjects, lightingObjects, timeState.selectedDate);
    updateTimeDisplay(date, timeState.timeDisplayElement);
    timeState.lastSliderValue = currentSliderValue;
    timeState.lastDateValue = currentDateValue;
    timeState.needsSunUpdate = false;
  }
}

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
