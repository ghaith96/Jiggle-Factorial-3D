/**
 * Utility Functions for Jiggle Factorial 3D
 */

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generate an array of non-consecutive random numbers
 * @param {number} count - Number of random numbers to generate
 * @returns {number[]} Array of unique random numbers
 */
export function generateNonConsecutiveNumbers(count) {
  const numbers = [];
  while (numbers.length < count) {
    const num = Math.floor(Math.random() * 100) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers;
}

/**
 * Show loading indicator with progress
 * @param {number} progress - Progress percentage (0-100)
 */
export function showLoading(progress) {
  const indicator = document.getElementById('loading-indicator');
  const progressBar = document.getElementById('loading-progress');
  if (indicator && progressBar) {
    indicator.style.display = 'block';
    progressBar.style.width = progress + '%';
  }
}

/**
 * Hide loading indicator
 */
export function hideLoading() {
  const indicator = document.getElementById('loading-indicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

/**
 * Trigger device vibration (mobile)
 * @param {number|number[]} pattern - Vibration duration(s) in milliseconds
 */
export function vibrateDevice(pattern) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Toggle fullscreen mode
 */
export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log('Error attempting to enable fullscreen:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

/**
 * Detect if device is mobile
 * @returns {boolean} True if mobile device
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Detect if device is low-end
 * @returns {boolean} True if low-end device
 */
export function isLowEndDevice() {
  return navigator.hardwareConcurrency <= 4 || isMobileDevice();
}

/**
 * Performance level detection
 * @returns {string} 'low', 'medium', or 'high'
 */
export function detectPerformanceLevel() {
  const mobile = isMobileDevice();
  const lowEnd = isLowEndDevice();
  
  if (mobile && lowEnd) return 'low';
  if (mobile) return 'medium';
  return 'high';
}

/**
 * Performance presets configuration
 */
export const performancePresets = {
  low: {
    shadowMapSize: 512,
    sphereSegments: 16,
    antialias: false,
    maxBalls: 10,
    enableScreenRotation: false,
    enableFlashMode: false
  },
  medium: {
    shadowMapSize: 1024,
    sphereSegments: 24,
    antialias: true,
    maxBalls: 15,
    enableScreenRotation: false,
    enableFlashMode: false
  },
  high: {
    shadowMapSize: 2048,
    sphereSegments: 32,
    antialias: true,
    maxBalls: 30,
    enableScreenRotation: true,
    enableFlashMode: true
  }
};

