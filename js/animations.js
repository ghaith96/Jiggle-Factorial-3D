/**
 * Animation system for Jiggle Factorial 3D
 * Provides custom easing functions and animation utilities
 */

import * as THREE from 'three';

/**
 * Custom easing functions (no external library needed)
 */
export const Easing = {
  /**
   * Elastic easing for bounce effects
   * @param {number} t - Progress (0 to 1)
   * @returns {number} Eased value
   */
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : 
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  /**
   * Back easing for overshoot effects
   * @param {number} t - Progress (0 to 1)
   * @returns {number} Eased value
   */
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  /**
   * Cubic easing for smooth transitions
   * @param {number} t - Progress (0 to 1)
   * @returns {number} Eased value
   */
  easeInOutCubic: (t) => {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  /**
   * Quadratic easing
   * @param {number} t - Progress (0 to 1)
   * @returns {number} Eased value
   */
  easeOutQuad: (t) => {
    return 1 - (1 - t) * (1 - t);
  },

  /**
   * Sine easing for natural movement
   * @param {number} t - Progress (0 to 1)
   * @returns {number} Eased value
   */
  easeInOutSine: (t) => {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }
};

/**
 * Animate ball bounce on spawn
 * @param {THREE.Mesh} ball - Ball mesh
 * @param {number} duration - Animation duration in ms
 */
export function animateBallSpawn(ball, duration = 500) {
  const startTime = Date.now();
  const startScale = 0.1;
  const targetScale = 1.0;
  const startY = ball.position.y;

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Bounce effect
    const scale = startScale + (targetScale - startScale) * Easing.easeOutElastic(progress);
    ball.scale.set(scale, scale, scale);
    
    // Slight upward movement
    const yOffset = Math.sin(progress * Math.PI) * 2;
    ball.position.y = startY + yOffset;
    
    ball.userData.animationProgress = progress;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      ball.scale.set(1, 1, 1);
      ball.position.y = startY;
    }
  }
  
  animate();
}

/**
 * Animate ball selection feedback
 * @param {THREE.Mesh} ball - Ball mesh
 * @param {boolean} isCorrect - Whether selection was correct
 * @param {THREE.Scene} scene - Scene to add particles to
 */
export function animateBallSelection(ball, isCorrect, scene) {
  const startTime = Date.now();
  const duration = 500;
  const startScale = ball.scale.x;
  const originalPosition = ball.position.clone();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    if (isCorrect) {
      // Bounce effect
      const targetScale = 1.2;
      const scale = startScale + (targetScale - startScale) * Easing.easeOutElastic(progress);
      ball.scale.set(scale, scale, scale);
      
      // Glow effect
      if (ball.material.emissiveIntensity !== undefined) {
        ball.material.emissiveIntensity = 0.3 * (1 - progress);
      }
    } else {
      // Shake effect
      const shakeAmount = 0.3 * (1 - progress);
      const offsetX = Math.sin(progress * 40) * shakeAmount;
      const offsetY = Math.sin(progress * 35) * shakeAmount;
      ball.position.x = originalPosition.x + offsetX;
      ball.position.y = originalPosition.y + offsetY;
    }
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      ball.scale.set(1, 1, 1);
      ball.position.copy(originalPosition);
      if (ball.material.emissiveIntensity !== undefined) {
        ball.material.emissiveIntensity = 0.05;
      }
    }
  }
  
  animate();
  
  // Create particle burst for correct selection
  if (isCorrect) {
    createParticleBurst(ball.position, 0xFFD700, scene);
  }
}

/**
 * Create particle burst effect
 * @param {THREE.Vector3} position - Position to create burst
 * @param {number} color - Particle color
 * @param {THREE.Scene} scene - Scene to add particles to
 */
export function createParticleBurst(position, color, scene) {
  const particleCount = 30;
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const velocities = [];
  
  // Create particles in a sphere pattern
  for (let i = 0; i < particleCount; i++) {
    vertices.push(position.x, position.y, position.z);
    
    // Random velocity in all directions
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const speed = 0.5 + Math.random() * 0.5;
    
    velocities.push(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    );
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
  const material = new THREE.PointsMaterial({ 
    color: color, 
    size: 0.3,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending
  });
  
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  
  // Animate particles
  const startTime = Date.now();
  const duration = 800;
  
  function animateParticles() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;
    
    if (progress < 1) {
      const positions = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];
        
        // Add gravity
        velocities[i * 3 + 1] -= 0.02;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      particles.material.opacity = 1 - progress;
      
      requestAnimationFrame(animateParticles);
    } else {
      scene.remove(particles);
      particles.geometry.dispose();
      particles.material.dispose();
    }
  }
  
  animateParticles();
}

/**
 * Smooth color transition for ball
 * @param {THREE.Mesh} ball - Ball mesh
 * @param {number} targetColor - Target color (hex)
 * @param {number} duration - Transition duration in ms
 */
export function animateColorTransition(ball, targetColor, duration = 300) {
  const startTime = Date.now();
  const startColor = new THREE.Color(ball.material.color.getHex());
  const endColor = new THREE.Color(targetColor);
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    ball.material.color.copy(startColor).lerp(endColor, Easing.easeInOutCubic(progress));
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

/**
 * Pulse animation for highlighted balls
 * @param {THREE.Mesh} ball - Ball mesh
 * @param {number} intensity - Pulse intensity
 */
export function pulseBall(ball, intensity = 0.2) {
  const startTime = Date.now();
  
  function animate() {
    if (!ball.userData.isCurrentlyHighlighted) return;
    
    const elapsed = Date.now() - startTime;
    const cycle = (elapsed % 1000) / 1000; // 1 second cycle
    
    const scale = 1.0 + Math.sin(cycle * Math.PI * 2) * intensity;
    ball.scale.set(scale, scale, scale);
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

/**
 * Fade in/out animation
 * @param {THREE.Object3D} object - Object to fade
 * @param {boolean} fadeIn - True to fade in, false to fade out
 * @param {number} duration - Animation duration in ms
 * @param {Function} onComplete - Callback when complete
 */
export function fadeObject(object, fadeIn, duration = 500, onComplete = null) {
  const startTime = Date.now();
  const startOpacity = fadeIn ? 0 : 1;
  const endOpacity = fadeIn ? 1 : 0;
  
  // Make material transparent if not already
  if (object.material) {
    object.material.transparent = true;
    object.material.opacity = startOpacity;
  }
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const opacity = startOpacity + (endOpacity - startOpacity) * Easing.easeInOutSine(progress);
    
    if (object.material) {
      object.material.opacity = opacity;
    }
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  }
  
  animate();
}

