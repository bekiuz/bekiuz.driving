/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CarConfig, CarCustomization, CarUpgrades, InputControls, RaceTrack, VehicleTelemetry, GameScreen } from '../types/game';
import { createProceduralCar, CarVisualRig } from './proceduralCar';
import { createProceduralCity, CityEnvironment } from './proceduralCity';
import { VehiclePhysics } from './vehiclePhysics';
import { RaceManager, RaceManagerState } from './raceManager';
import { soundManager } from '../services/audio';

export interface GameEngineOptions {
  container: HTMLDivElement;
  quality: 'low' | 'medium' | 'high';
  onTelemetryUpdate: (telemetry: VehicleTelemetry) => void;
  onRaceUpdate?: (raceState: RaceManagerState) => void;
}

export class GameEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public city: CityEnvironment;
  public carRig: CarVisualRig;
  public physics: VehiclePhysics;
  public raceManager: RaceManager | null = null;

  private container: HTMLDivElement;
  private isSoftwareGl = false;
  private animationFrameId = 0;
  private lastTime = 0;
  private isDestroyed = false;

  private currentScreen: GameScreen = 'menu';
  private cameraDistanceMode: 'close' | 'normal' | 'far' | 'hood' = 'normal';

  // Camera damping targets
  private cameraTargetPos = new THREE.Vector3();
  private cameraLookTarget = new THREE.Vector3();
  private garageOrbitAngle = 0;

  // Wheel spin accumulator
  private wheelSpin = 0;

  // Callbacks
  private onTelemetryUpdate: (telemetry: VehicleTelemetry) => void;
  private onRaceUpdate?: (raceState: RaceManagerState) => void;

  // Input state
  private currentInput: InputControls = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    nitro: false,
    reset: false,
    lookBack: false,
  };

  constructor(
    carConfig: CarConfig,
    carUpgrades: CarUpgrades,
    customization: CarCustomization,
    options: GameEngineOptions
  ) {
    this.container = options.container;
    this.onTelemetryUpdate = options.onTelemetryUpdate;
    this.onRaceUpdate = options.onRaceUpdate;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 1. Setup Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && options.quality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, options.quality === 'high' ? 2 : 1.5)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && options.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 2. Setup Scene & Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1017);
    this.scene.fog = new THREE.FogExp2(0x0c1017, 0.0038);

    // 3. Setup Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.2,
      700
    );
    this.camera.position.set(0, 3, -8);

    // 4. Studio Environment Reflection (RoomEnvironment)
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch (e) {
      console.warn('[Engine] RoomEnvironment fallback:', e);
    }

    // 5. Lighting Setup
    this.setupLighting();

    // 6. City Environment
    this.city = createProceduralCity();
    this.scene.add(this.city.sceneGroup);

    // 7. Car Visual Rig & Physics
    this.carRig = createProceduralCar(carConfig, customization);
    this.scene.add(this.carRig.carGroup);

    this.physics = new VehiclePhysics(carConfig, carUpgrades, this.city, [0, 0.4, 0], 0);

    // Window Resize Handler
    window.addEventListener('resize', this.onWindowResize);

    // Start Loop
    this.lastTime = performance.now();
    this.tick();
  }

  private setupLighting() {
    // Warm Key Light (Sun at late afternoon angle)
    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.4);
    keyLight.position.set(120, 160, 90);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 450;
    const shadowD = 80;
    keyLight.shadow.camera.left = -shadowD;
    keyLight.shadow.camera.right = shadowD;
    keyLight.shadow.camera.top = shadowD;
    keyLight.shadow.camera.bottom = -shadowD;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Cool Hemisphere Fill (Skylight contrast)
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.2);
    this.scene.add(hemiLight);

    // Subtle Rim Light
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.9);
    rimLight.position.set(-100, 40, -100);
    this.scene.add(rimLight);
  }

  public setScreenMode(screen: GameScreen) {
    this.currentScreen = screen;
    if (screen === 'free_drive' || screen === 'racing') {
      soundManager.startEngine();
    } else {
      soundManager.stopEngine();
    }
  }

  public setInput(input: InputControls) {
    this.currentInput = { ...input };
  }

  public setCameraDistance(mode: 'close' | 'normal' | 'far' | 'hood') {
    this.cameraDistanceMode = mode;
  }

  public switchCar(config: CarConfig, upgrades: CarUpgrades, customization: CarCustomization) {
    // Remove old car visual rig
    this.scene.remove(this.carRig.carGroup);
    this.carRig.dispose();

    // Create new car visual rig
    this.carRig = createProceduralCar(config, customization);
    this.scene.add(this.carRig.carGroup);

    // Re-initialize physics with new car parameters
    const currentPos = this.physics.position.toArray() as [number, number, number];
    const currentRot = this.physics.rotationY;
    this.physics = new VehiclePhysics(config, upgrades, this.city, currentPos, currentRot);
  }

  public updateCustomization(customization: CarCustomization) {
    this.carRig.updateCustomization(customization);
  }

  public startRace(track: RaceTrack, bestTimeMs?: number) {
    if (this.raceManager) {
      this.scene.remove(this.raceManager.gatesGroup);
      this.raceManager.dispose();
    }

    this.raceManager = new RaceManager(track);
    this.scene.add(this.raceManager.gatesGroup);

    // Position car at start line
    this.physics.resetVehicle(track.startPosition, track.startRotationY);
    this.raceManager.startCountdown();
    this.setScreenMode('racing');
  }

  public stopRace() {
    if (this.raceManager) {
      this.scene.remove(this.raceManager.gatesGroup);
      this.raceManager.dispose();
      this.raceManager = null;
    }
  }

  public resetVehicle(pos?: [number, number, number], rotY = 0) {
    if (pos) {
      this.physics.resetVehicle(pos, rotY);
      return;
    }
    if (this.raceManager && this.raceManager.status === 'active') {
      // Reset to current checkpoint
      const cp = this.raceManager.track.checkpoints[this.raceManager.currentCheckpointIndex];
      if (cp) {
        this.physics.resetVehicle(cp.position, cp.rotationY);
        return;
      }
    }
    this.physics.resetVehicle();
  }

  private onWindowResize = () => {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private tick = () => {
    if (this.isDestroyed) return;

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.08);
    this.lastTime = now;

    // 1. Update Game Mode
    if (this.currentScreen === 'racing' || this.currentScreen === 'free_drive') {
      this.updateActiveGameplay(delta);
    } else {
      this.updateShowroom(delta);
    }

    // 2. City Environment update
    this.city.update(delta);

    // 3. Render
    this.renderer.render(this.scene, this.camera);

    // 4. Schedule next frame
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  };

  private updateActiveGameplay(delta: number) {
    // Block throttle during race countdown
    const effectiveInput = { ...this.currentInput };
    if (this.raceManager && this.raceManager.status === 'countdown') {
      effectiveInput.throttle = 0;
      effectiveInput.nitro = false;
    }

    // Physics step
    const telemetry = this.physics.update(delta, effectiveInput);
    this.onTelemetryUpdate(telemetry);

    // Race update
    if (this.raceManager && this.onRaceUpdate) {
      const raceState = this.raceManager.update(delta, this.physics.position);
      this.onRaceUpdate(raceState);
    }

    // Update Car 3D Transform
    this.carRig.carGroup.position.copy(this.physics.position);
    this.carRig.carGroup.rotation.y = this.physics.rotationY;

    // Wheel spin delta (roll angle based on speed)
    const wheelSpinDelta = (this.physics.forwardSpeed * delta) / 0.35;
    this.wheelSpin += wheelSpinDelta;

    // Update car visual components (steering, brake lights, suspension roll/pitch, nitro flame)
    this.carRig.updateState(
      this.physics.steerAngle,
      wheelSpinDelta,
      this.currentInput.brake > 0.1,
      this.physics.isNitroActive,
      this.physics.pitch,
      this.physics.roll
    );

    // Update Dynamic Third-Person Camera
    this.updateChaseCamera(delta, telemetry);
  }

  private updateChaseCamera(delta: number, telemetry: VehicleTelemetry) {
    const carPos = this.physics.position;
    const carHeading = this.physics.rotationY;

    // Distance presets
    let distBehind = 7.0;
    let heightAbove = 2.4;
    let lookHeight = 1.2;

    if (this.cameraDistanceMode === 'close') {
      distBehind = 5.2;
      heightAbove = 1.9;
    } else if (this.cameraDistanceMode === 'far') {
      distBehind = 9.5;
      heightAbove = 3.2;
    } else if (this.cameraDistanceMode === 'hood') {
      distBehind = 0.8;
      heightAbove = 1.4;
      lookHeight = 1.3;
    }

    // Speed stretch (FOV expands and camera pulls back slightly at high speed for exhilaration)
    const speedRatio = Math.min(1.0, telemetry.speedKmh / 280);
    distBehind += speedRatio * 1.5;
    const targetFov = 60 + speedRatio * 14 + (telemetry.isNitroActive ? 8 : 0);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, delta);
    this.camera.updateProjectionMatrix();

    // Look-back check
    const headingOffset = this.currentInput.lookBack ? Math.PI : 0;
    const effectiveHeading = carHeading + headingOffset;

    // Calculate camera target position in world space
    const offsetX = -Math.sin(effectiveHeading) * distBehind;
    const offsetZ = -Math.cos(effectiveHeading) * distBehind;

    const targetCamX = carPos.x + offsetX;
    const targetCamY = carPos.y + heightAbove;
    const targetCamZ = carPos.z + offsetZ;

    // Smooth exponential damping
    const dampRate = 9;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, dampRate, delta);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, dampRate * 1.2, delta);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, dampRate, delta);

    // Look-at point slightly ahead of the car
    const lookAheadDist = 4.0;
    const lookTargetX = carPos.x + Math.sin(carHeading) * lookAheadDist;
    const lookTargetY = carPos.y + lookHeight;
    const lookTargetZ = carPos.z + Math.cos(carHeading) * lookAheadDist;

    this.cameraLookTarget.x = THREE.MathUtils.damp(this.cameraLookTarget.x, lookTargetX, dampRate, delta);
    this.cameraLookTarget.y = THREE.MathUtils.damp(this.cameraLookTarget.y, lookTargetY, dampRate, delta);
    this.cameraLookTarget.z = THREE.MathUtils.damp(this.cameraLookTarget.z, lookTargetZ, dampRate, delta);

    this.camera.lookAt(this.cameraLookTarget);
  }

  private updateShowroom(delta: number) {
    // Smooth turntable orbit around the car in Garage / Menu
    this.garageOrbitAngle += delta * 0.35;
    const orbitRadius = 6.8;
    const camHeight = 1.9 + Math.sin(this.garageOrbitAngle * 0.5) * 0.3;

    this.camera.position.set(
      Math.sin(this.garageOrbitAngle) * orbitRadius,
      camHeight,
      Math.cos(this.garageOrbitAngle) * orbitRadius
    );
    this.camera.lookAt(0, 0.7, 0);

    // Stationary car positioning
    this.carRig.carGroup.position.set(0, 0.38, 0);
    this.carRig.carGroup.rotation.set(0, 0, 0);
    this.carRig.updateState(0, 0, false, false, 0, 0);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animationFrameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.animationFrameId = window.setTimeout(cb, 80);
      }
    };
    this.animationFrameId = window.setTimeout(poll, 5);
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animationFrameId);
    clearTimeout(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);

    soundManager.stopEngine();

    this.carRig.dispose();
    this.city.dispose();
    this.raceManager?.dispose();

    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
