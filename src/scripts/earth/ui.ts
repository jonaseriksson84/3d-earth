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
  return {
    timeSlider: null as unknown as HTMLInputElement,
    lastSliderValue: '',
    needsSunUpdate: true,
    timeDisplayElement: null,
  };
}

export function initTimeControls(
  timeState: TimeState,
  earthObjects: EarthObjects,
  _lightingObjects: LightingObjects
): void {
  const timeSlider = document.getElementById('timeSlider') as HTMLInputElement | null;
  const cloudToggle = document.getElementById('cloudToggle') as HTMLInputElement | null;
  const timeDisplayElement = document.getElementById('currentTime');

  if (!timeSlider || !cloudToggle) {
    console.error('Time slider or cloud toggle element not found');
    throw new Error('Required UI elements missing');
  }

  timeState.timeSlider = timeSlider;
  timeState.timeDisplayElement = timeDisplayElement;

  // Configure slider
  timeSlider.min = '0';
  timeSlider.max = String(CONFIG.MINUTES_PER_DAY);
  timeSlider.step = String(CONFIG.SLIDER_STEP);

  // Initialize to current time
  const initNow = new Date();
  let initMinutes = initNow.getHours() * 60 + initNow.getMinutes();
  initMinutes = Math.max(0, Math.min(CONFIG.MINUTES_PER_DAY - 1, initMinutes));
  timeSlider.value = String(initMinutes);

  // Performance tracking
  timeState.lastSliderValue = timeSlider.value;
  timeState.needsSunUpdate = true;

  // Event listeners
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
  if (timeState.needsSunUpdate || currentSliderValue !== timeState.lastSliderValue) {
    const sliderMinutes = parseInt(timeState.timeSlider.value);
    const date = updateSunPosition(sliderMinutes, earthObjects, lightingObjects);
    updateTimeDisplay(date, timeState.timeDisplayElement);
    timeState.lastSliderValue = currentSliderValue;
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
