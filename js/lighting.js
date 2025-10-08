/**
 * Enhanced Lighting System for Jiggle Factorial 3D
 * Provides premium lighting setup with hemisphere, rim lighting, and dynamic effects
 */

import * as THREE from 'three';

/**
 * Create enhanced lighting setup for premium feel
 * @param {THREE.Scene} scene - Scene to add lights to
 * @param {Object} settings - Game settings
 * @returns {Object} Object containing all light references
 */
export function createPremiumLighting(scene, settings) {
  const lights = {};

  // Hemisphere light for natural ambient lighting
  const hemisphereLight = new THREE.HemisphereLight(
    0x87CEEB, // Sky color (light blue)
    0x404040, // Ground color (dark gray)
    0.6
  );
  scene.add(hemisphereLight);
  lights.hemisphere = hemisphereLight;

  // Main directional light (key light)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  
  // Configure shadow properties
  const shadowMapSize = settings && settings.isMobile ? 512 : 1024;
  directionalLight.shadow.mapSize.width = shadowMapSize;
  directionalLight.shadow.mapSize.height = shadowMapSize;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -30;
  directionalLight.shadow.camera.right = 30;
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  directionalLight.shadow.bias = -0.001;
  
  scene.add(directionalLight);
  lights.directional = directionalLight;

  // Rim light (back light for edge definition)
  const rimLight = new THREE.DirectionalLight(0x667eea, 0.3);
  rimLight.position.set(-10, 5, -10);
  scene.add(rimLight);
  lights.rim = rimLight;

  // Fill light (soft light from opposite side)
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
  fillLight.position.set(-5, 0, 5);
  scene.add(fillLight);
  lights.fill = fillLight;

  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);
  lights.ambient = ambientLight;

  return lights;
}

/**
 * Animate light based on game state
 * @param {Object} lights - Light references
 * @param {string} state - Game state ('idle', 'tracking', 'selection', 'success', 'error')
 */
export function animateLightForGameState(lights, state) {
  const duration = 500;
  const startTime = Date.now();

  // Define target intensities for each state
  const stateConfigs = {
    idle: {
      hemisphere: 0.6,
      directional: 0.5,
      rim: 0.3,
      fill: 0.2,
      ambient: 0.4
    },
    tracking: {
      hemisphere: 0.7,
      directional: 0.6,
      rim: 0.4,
      fill: 0.3,
      ambient: 0.5
    },
    selection: {
      hemisphere: 0.8,
      directional: 0.7,
      rim: 0.5,
      fill: 0.3,
      ambient: 0.6
    },
    success: {
      hemisphere: 1.0,
      directional: 0.8,
      rim: 0.6,
      fill: 0.4,
      ambient: 0.7
    },
    error: {
      hemisphere: 0.4,
      directional: 0.4,
      rim: 0.2,
      fill: 0.1,
      ambient: 0.3
    }
  };

  const targetConfig = stateConfigs[state] || stateConfigs.idle;
  
  // Store initial intensities
  const initialIntensities = {
    hemisphere: lights.hemisphere ? lights.hemisphere.intensity : 0,
    directional: lights.directional ? lights.directional.intensity : 0,
    rim: lights.rim ? lights.rim.intensity : 0,
    fill: lights.fill ? lights.fill.intensity : 0,
    ambient: lights.ambient ? lights.ambient.intensity : 0
  };

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease function
    const eased = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate light intensities
    Object.keys(targetConfig).forEach(lightKey => {
      if (lights[lightKey]) {
        const start = initialIntensities[lightKey];
        const end = targetConfig[lightKey];
        lights[lightKey].intensity = start + (end - start) * eased;
      }
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  animate();
}

/**
 * Add subtle light animation for dynamic feel
 * @param {Object} lights - Light references
 */
export function addDynamicLightAnimation(lights) {
  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    const cycle = (elapsed % 5000) / 5000; // 5 second cycle

    // Subtle pulsing of rim light
    if (lights.rim) {
      const baseIntensity = 0.3;
      const variance = 0.1;
      lights.rim.intensity = baseIntensity + Math.sin(cycle * Math.PI * 2) * variance;
    }

    // Subtle movement of key light
    if (lights.directional) {
      const angle = cycle * Math.PI * 2;
      const radius = 2;
      const baseX = 10;
      const baseZ = 10;
      lights.directional.position.x = baseX + Math.cos(angle) * radius;
      lights.directional.position.z = baseZ + Math.sin(angle) * radius;
    }

    requestAnimationFrame(animate);
  }

  animate();
}

/**
 * Create light flash effect for ball highlighting
 * @param {THREE.Vector3} position - Position to flash light at
 * @param {THREE.Scene} scene - Scene to add light to
 * @param {number} color - Light color
 * @param {number} duration - Flash duration in ms
 */
export function createLightFlash(position, scene, color = 0xFFD700, duration = 500) {
  const pointLight = new THREE.PointLight(color, 2, 10);
  pointLight.position.copy(position);
  scene.add(pointLight);

  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Fade out intensity
    pointLight.intensity = 2 * (1 - progress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      scene.remove(pointLight);
      pointLight.dispose();
    }
  }

  animate();
}

/**
 * Update environment lighting based on performance preset
 * @param {Object} lights - Light references
 * @param {string} preset - Performance preset ('low', 'medium', 'high')
 */
export function updateLightingForPreset(lights, preset) {
  const presetConfigs = {
    low: {
      hemisphere: 0.6,
      directional: 0.3,
      rim: 0.1,
      fill: 0.1,
      ambient: 0.6,
      enableRim: false
    },
    medium: {
      hemisphere: 0.6,
      directional: 0.4,
      rim: 0.2,
      fill: 0.15,
      ambient: 0.5,
      enableRim: true
    },
    high: {
      hemisphere: 0.6,
      directional: 0.5,
      rim: 0.3,
      fill: 0.2,
      ambient: 0.4,
      enableRim: true
    }
  };

  const config = presetConfigs[preset] || presetConfigs.medium;

  if (lights.hemisphere) lights.hemisphere.intensity = config.hemisphere;
  if (lights.directional) lights.directional.intensity = config.directional;
  if (lights.rim) {
    lights.rim.intensity = config.enableRim ? config.rim : 0;
  }
  if (lights.fill) lights.fill.intensity = config.fill;
  if (lights.ambient) lights.ambient.intensity = config.ambient;
}

