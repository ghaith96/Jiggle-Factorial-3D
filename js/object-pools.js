/**
 * Object Pooling Classes for Jiggle Factorial 3D
 * Manages pools of balls and labels to prevent garbage collection pressure
 */

import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

/**
 * BallPool - Manages pool of ball meshes
 */
export class BallPool {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    this.sharedGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    this.sharedOutlineGeometry = new THREE.SphereGeometry(1.5 + 0.12, 32, 32);
    this.labelPool = null; // Will be set externally
  }

  /**
   * Initialize pool with pre-allocated balls
   * @param {number} maxSize - Maximum number of balls to pre-allocate
   */
  initialize(maxSize) {
    // Pre-allocate balls
    for (let i = 0; i < maxSize; i++) {
      const ball = this.createBall();
      ball.visible = false;
      this.pool.push(ball);
      this.scene.add(ball); // Add to scene once
    }
  }

  /**
   * Create a new ball mesh with outline
   * @returns {THREE.Mesh} Ball mesh
   */
  createBall() {
    // Use premium PBR material for realistic rendering
    const material = new THREE.MeshPhysicalMaterial({
      metalness: 0.3,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
      envMapIntensity: 1.5,
      emissive: "#FFFFFF",
      emissiveIntensity: 0.05,
    });
    const ball = new THREE.Mesh(this.sharedGeometry, material);
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.userData = {
      velocity: new THREE.Vector3(),
      isRotating: false,
      rotationGroup: 0,
      rotationAxis: '',
      originalColor: 0x87CEEB,
      rotationAngle: 0,
      isGameObject: true,
      isCurrentlyHighlighted: false,
      isFlashing: false,
      label: null,
      animationProgress: 0, // For spawn/despawn animations
      targetScale: 1.0 // For smooth scaling
    };

    // Create outline once with better visuals
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
      depthWrite: false,
      opacity: 0.4,
      transparent: true,
    });
    const outline = new THREE.Mesh(this.sharedOutlineGeometry, outlineMaterial);
    ball.add(outline);

    return ball;
  }

  /**
   * Acquire a ball from the pool
   * @param {number} color - Color for the ball
   * @returns {THREE.Mesh} Ball mesh
   */
  acquire(color) {
    let ball;
    if (this.pool.length > 0) {
      ball = this.pool.pop();
    } else {
      ball = this.createBall();
      this.scene.add(ball);
    }
    ball.visible = true;
    ball.material.color.set(color);
    ball.userData.originalColor = color;
    this.active.push(ball);
    return ball;
  }

  /**
   * Release a ball back to the pool
   * @param {THREE.Mesh} ball - Ball to release
   */
  release(ball) {
    ball.visible = false;
    // Reset ball state
    ball.position.set(0, 0, 0);
    ball.userData.velocity.set(0, 0, 0);
    ball.userData.isRotating = false;
    ball.userData.isCurrentlyHighlighted = false;
    ball.userData.isFlashing = false;
    ball.userData.rotationAngle = 0;
    ball.userData.rotationGroup = 0;
    ball.userData.rotationAxis = '';
    // Remove label if attached
    if (ball.userData.label && this.labelPool) {
      this.labelPool.release(ball.userData.label);
      ball.remove(ball.userData.label);
      ball.userData.label = null;
    }
    const index = this.active.indexOf(ball);
    if (index > -1) {
      this.active.splice(index, 1);
      this.pool.push(ball);
    }
  }

  /**
   * Release all active balls back to the pool
   */
  releaseAll() {
    // Create a copy of active array since release() modifies it
    const activeCopy = [...this.active];
    activeCopy.forEach(ball => this.release(ball));
  }

  /**
   * Set the label pool reference
   * @param {LabelPool} labelPool - Label pool instance
   */
  setLabelPool(labelPool) {
    this.labelPool = labelPool;
  }
}

/**
 * LabelPool - Manages pool of text label meshes
 */
export class LabelPool {
  constructor() {
    this.pool = {};
    this.active = [];
    this.loadedFont = null;
    this.settings = null; // Will be set externally
  }

  /**
   * Set the loaded font
   * @param {THREE.Font} font - Loaded font
   */
  setFont(font) {
    this.loadedFont = font;
  }

  /**
   * Set the settings object
   * @param {Object} settings - Game settings
   */
  setSettings(settings) {
    this.settings = settings;
  }

  /**
   * Acquire a label for a number
   * @param {number} number - Number to display
   * @returns {THREE.Mesh|null} Label mesh or null if font not loaded
   */
  acquire(number) {
    if (!this.loadedFont) return null;

    const key = number.toString();
    let label = this.pool[key];

    if (!label) {
      label = this.createLabel(number);
      this.pool[key] = label;
    }

    // Clone the label for use
    const clonedLabel = label.clone();
    clonedLabel.visible = true;
    this.active.push(clonedLabel);
    return clonedLabel;
  }

  /**
   * Create a new label mesh
   * @param {number} number - Number to display
   * @returns {THREE.Mesh} Label mesh
   */
  createLabel(number) {
    const geometry = new TextGeometry(number.toString(), {
      font: this.loadedFont,
      size: this.settings ? this.settings.numberSize : 0.5,
      depth: this.settings ? this.settings.numberSize * 0.1 : 0.05,
    });

    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const textMesh = new THREE.Mesh(geometry, material);

    geometry.computeBoundingBox();
    const centerOffsetX = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    const centerOffsetY = -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
    const numberSize = this.settings ? this.settings.numberSize : 0.5;
    const offsetZ = 1.6 + numberSize * 0.1;
    textMesh.position.set(centerOffsetX, centerOffsetY, offsetZ);
    textMesh.userData.isLabel = true;
    textMesh.visible = false; // Hidden by default

    return textMesh;
  }

  /**
   * Release a label back to the pool
   * @param {THREE.Mesh} label - Label to release
   */
  release(label) {
    if (!label) return;
    const index = this.active.indexOf(label);
    if (index > -1) {
      this.active.splice(index, 1);
    }
    label.visible = false;
  }

  /**
   * Release all active labels
   */
  releaseAll() {
    this.active.forEach(label => {
      label.visible = false;
    });
    this.active = [];
  }
}

