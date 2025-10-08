/**
 * Touch Controls for Mobile Devices
 */

import * as THREE from 'three';
import { vibrateDevice } from './utils.js';

/**
 * TouchControls - Manages touch input for mobile devices
 */
export class TouchControls {
  constructor(camera, controls, renderer) {
    this.camera = camera;
    this.controls = controls;
    this.renderer = renderer;
    
    this.touchState = {
      touches: [],
      initialDistance: 0,
      initialCameraDistance: 0,
      lastTouches: [],
      lastTapTime: 0
    };
    
    this.isUserTurnCallback = null;
  }

  /**
   * Set the callback to check if it's user's turn
   * @param {Function} callback - Function that returns boolean
   */
  setIsUserTurnCallback(callback) {
    this.isUserTurnCallback = callback;
  }

  /**
   * Setup touch event listeners
   */
  setup() {
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
  }

  /**
   * Calculate distance between two touches
   * @param {TouchList} touches - Touch list
   * @returns {number} Distance between touches
   */
  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Handle touch start event
   * @param {TouchEvent} event - Touch event
   */
  onTouchStart(event) {
    this.touchState.touches = Array.from(event.touches);

    if (event.touches.length === 1) {
      // Check for double-tap to reset camera
      const currentTime = Date.now();
      const tapGap = currentTime - this.touchState.lastTapTime;
      
      const isUserTurn = this.isUserTurnCallback ? this.isUserTurnCallback() : false;
      
      if (tapGap < 300 && tapGap > 0 && !isUserTurn) {
        // Double tap detected (only when not selecting balls)
        event.preventDefault();
        event.stopPropagation();
        this.resetCamera();
        vibrateDevice(50); // Short vibration for camera reset
      } else if (isUserTurn) {
        // Single tap for ball selection - prioritize selection over camera controls
        // preventDefault stops OrbitControls from interfering
        event.preventDefault();
        event.stopPropagation();
        // pointerdown event will handle the actual selection
      }
      
      this.touchState.lastTapTime = currentTime;
    } else if (event.touches.length === 2) {
      // Initialize pinch/rotate gesture - prevent default to stop OrbitControls
      event.preventDefault();
      event.stopPropagation();
      this.touchState.initialDistance = this.getTouchDistance(event.touches);
      this.touchState.initialCameraDistance = this.camera.position.length();
      this.touchState.lastTouches = Array.from(event.touches);
    }
  }

  /**
   * Handle touch move event
   * @param {TouchEvent} event - Touch event
   */
  onTouchMove(event) {
    const isUserTurn = this.isUserTurnCallback ? this.isUserTurnCallback() : false;

    if (event.touches.length === 2) {
      // Two-finger gestures have priority over OrbitControls
      event.preventDefault();
      event.stopPropagation();

      // Handle pinch zoom
      const currentDistance = this.getTouchDistance(event.touches);
      const scale = currentDistance / this.touchState.initialDistance;
      const newDistance = THREE.MathUtils.clamp(
        this.touchState.initialCameraDistance / scale,
        20, // min distance
        150  // max distance
      );

      // Update camera distance
      const direction = this.camera.position.clone().normalize();
      this.camera.position.copy(direction.multiplyScalar(newDistance));

      this.touchState.lastTouches = Array.from(event.touches);
    } else if (event.touches.length === 1 && isUserTurn) {
      // Prevent OrbitControls from interfering during ball selection
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Handle touch end event
   * @param {TouchEvent} event - Touch event
   */
  onTouchEnd(event) {
    const isUserTurn = this.isUserTurnCallback ? this.isUserTurnCallback() : false;
    
    // If user is selecting balls, prevent OrbitControls from handling the event
    if (isUserTurn && event.touches.length === 0) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (event.touches.length < 2) {
      this.touchState.initialDistance = 0;
    }
    this.touchState.touches = Array.from(event.touches);
  }

  /**
   * Reset camera to default position
   */
  resetCamera() {
    this.camera.position.set(0, 0, 60);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.controls.update();
  }
}

