/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CarConfig, CarCustomization, CarUpgrades, InputControls, RaceTrack, VehicleTelemetry, GameScreen } from '../types/game';
import { createProceduralCar, CarVisualRig } from './proceduralCar';
import { createProceduralCity, CityEnvironment } from './proceduralCity';
import { TrafficSystem } from './traffic';
import { PolicePursuit } from './policePursuit';
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
  private traffic: TrafficSystem;
  private police: PolicePursuit;

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
  private showroomOrbitRadius = 8.5;
  private showroomCameraLift = 2.2;
  private showroomLookTarget = new THREE.Vector3(0, 0.35, 0);

  // Wheel spin accumulator
  private wheelSpin = 0;

  // Optional CC0 GLB visual for the four premium garage cars.
  private externalVehicleLoadId = 0;
  private externalVehicleModel: THREE.Group | null = null;
  private externalWheelMeshes: { mesh: THREE.Object3D; axis: 'x' | 'y' }[] = [];
  private externalPrimaryPaint: THREE.MeshStandardMaterial[] = [];
  private externalSecondaryPaint: THREE.MeshStandardMaterial[] = [];

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

    // Add autonomous cars and feed their moving colliders into vehicle physics.
    this.traffic = new TrafficSystem();
    this.scene.add(this.traffic.group);
    this.city.collisionBoxes.push(...this.traffic.collisionBoxes);

    // 7. Car Visual Rig & Physics
    this.carRig = createProceduralCar(carConfig, customization);
    this.scene.add(this.carRig.carGroup);
    this.carRig.carGroup.position.set(0, 0.38, 0);
    this.updateShowroomFraming();
    void this.loadExternalVehicle(carConfig, customization);

    this.physics = new VehiclePhysics(carConfig, carUpgrades, this.city, [0, 0.4, 0], 0);
    this.police = new PolicePursuit(carConfig, this.scene);

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
    const isDriving = screen === 'free_drive' || screen === 'racing';
    this.police.setActive(isDriving, this.physics.position, this.physics.rotationY);
    if (isDriving) {
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
    // Invalidate any model request still loading for the previous car.
    this.externalVehicleLoadId++;
    this.externalVehicleModel = null;
    this.externalWheelMeshes = [];
    this.externalPrimaryPaint = [];
    this.externalSecondaryPaint = [];

    // Remove old car visual rig
    this.scene.remove(this.carRig.carGroup);
    this.carRig.dispose();

    // Create new car visual rig
    this.carRig = createProceduralCar(config, customization);
    this.scene.add(this.carRig.carGroup);
    this.carRig.carGroup.position.set(0, 0.38, 0);
    this.carRig.carGroup.rotation.set(0, 0, 0);
    this.updateShowroomFraming();
    void this.loadExternalVehicle(config, customization);

    // Re-initialize physics with new car parameters
    const currentPos = this.physics.position.toArray() as [number, number, number];
    const currentRot = this.physics.rotationY;
    this.physics = new VehiclePhysics(config, upgrades, this.city, currentPos, currentRot);
  }


  /**
   * Loads a detailed, unbranded CC0 sports-car asset for the premium garage slots.
   * The procedural rig stays visible until the GLB is fully loaded, so a network
   * failure never leaves the player with an invisible vehicle.
   */
  private async loadExternalVehicle(config: CarConfig, customization: CarCustomization) {
    const requestId = ++this.externalVehicleLoadId;
    this.externalVehicleModel = null;
    this.externalWheelMeshes = [];
    this.externalPrimaryPaint = [];
    this.externalSecondaryPaint = [];

    const assetBase =
      'https://cdn.jsdelivr.net/gh/nutricionistaalmeidavh-spec/assetscarros3d@3eb0f1afac277d81bca7b7f643de81915ea76965/assets/';
    const sourceFiles: Record<string, string> = {
      bmw_m4: 'bmw-g82-m4.glb',
      mercedes_amg: 'mercedes-benz-amg-gt.glb',
      bugatti_chiron: 'bugatti-chiron.glb',
      ferrari_488: 'ferrari-488.glb',
    };
    const modelFile = sourceFiles[config.style];
    if (!modelFile) return;

    const urls = [
      assetBase + modelFile,
      'https://raw.githubusercontent.com/nutricionistaalmeidavh-spec/assetscarros3d/3eb0f1afac277d81bca7b7f643de81915ea76965/assets/' + modelFile,
      // A detailed CC0 sports car stays available as a fallback if a brand model CDN is unavailable.
      'https://cdn.jsdelivr.net/gh/JaronKBragg7337/spectral-gt-rs@main/spectral_gt_rs_game_ready.glb',
      'https://jaronkbragg7337.github.io/spectral-gt-rs/spectral_gt_rs_game_ready.glb',
    ];

    try {
      const loader = new GLTFLoader();
      let gltf: Awaited<ReturnType<GLTFLoader['loadAsync']>> | null = null;
      let lastError: unknown = null;
      let loadedUrl = '';

      for (const url of urls) {
        try {
          gltf = await loader.loadAsync(url);
          loadedUrl = url;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!gltf) throw lastError ?? new Error('Vehicle model could not be loaded.');

      const model = gltf.scene;
      model.name = config.id === 'bmw_m4' ? 'BMW_G82_M4' :
        config.id === 'mercedes_amg' ? 'Mercedes_AMG_GT' :
        config.id === 'bugatti_chiron' ? 'Bugatti_Chiron' :
        config.id === 'ferrari_488' ? 'Ferrari_488_Pista' : 'Detailed_Sports_Car';

      // glTF cars may be authored lengthwise on X or Z. Normalize the long axis
      // to the game's +Z direction before fitting the model to the car dimensions.
      model.updateMatrixWorld(true);
      const sourceBounds = new THREE.Box3().setFromObject(model);
      const sourceSize = sourceBounds.getSize(new THREE.Vector3());
      const longitudinalAxis: 'x' | 'z' = sourceSize.x > sourceSize.z ? 'x' : 'z';
      model.rotation.y = longitudinalAxis === 'x' ? -Math.PI / 2 : 0;
      model.updateMatrixWorld(true);

      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const lengthOnZ = size.z;
      if (!Number.isFinite(lengthOnZ) || lengthOnZ < 0.1) {
        throw new Error('Loaded vehicle has invalid dimensions.');
      }

      // Fit by real car length and place the tyres on the road plane.
      const scale = config.dimensions.length / lengthOnZ;
      const center = bounds.getCenter(new THREE.Vector3());
      model.scale.setScalar(scale);
      model.position.set(
        -center.x * scale,
        -bounds.min.y * scale,
        -center.z * scale
      );
      model.updateMatrixWorld(true);

      const primaryPaint: THREE.MeshStandardMaterial[] = [];
      const secondaryPaint: THREE.MeshStandardMaterial[] = [];
      const wheels: { mesh: THREE.Object3D; axis: 'x' | 'y' }[] = [];
      const paintNamePatterns: Record<string, RegExp[]> = {
        bugatti_chiron: [/meshpart128mtl/i],
        ferrari_488: [/green_car_paint/i, /car.?paint/i, /body.?paint/i],
        bmw_m4: [/paint_m4/i, /car.?paint/i, /body.?paint/i],
        mercedes_amg: [/amg.?paint/i, /car.?paint/i, /body.?paint/i],
      };
      const primaryPatterns = paintNamePatterns[config.style] ?? [];

      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;

        object.castShadow = true;
        object.receiveShadow = true;

        const sourceMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const clonedMaterials = sourceMaterials.map((source) => {
          const material = source.clone();
          const materialName = material.name.toLowerCase();

          if (
            material instanceof THREE.MeshStandardMaterial &&
            primaryPatterns.some((pattern) => pattern.test(materialName))
          ) {
            material.color.set(customization.bodyColor);
            primaryPaint.push(material);
          }

          return material;
        });

        object.material = Array.isArray(object.material)
          ? clonedMaterials
          : clonedMaterials[0];

        const nodeName = object.name.toLowerCase();
        if (
          !/steering/i.test(nodeName) &&
          /(tire|tyre|rim|wheel)/i.test(nodeName)
        ) {
          wheels.push({
            mesh: object,
            // Wheels on X-longitudinal source meshes spin around local Y;
            // wheels on Z-longitudinal meshes spin around local X.
            axis: longitudinalAxis === 'x' ? 'y' : 'x',
          });
        }
      });

      // A late response must never replace a newer car or touch a disposed scene.
      if (this.isDestroyed || requestId !== this.externalVehicleLoadId) {
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          geometries.add(object.geometry);
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach((material) => materials.add(material));
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        return;
      }

      // Hide all primitive bodywork and all four procedural wheel assemblies.
      this.carRig.chassisMesh.visible = false;
      this.carRig.wheelMeshes.forEach((wheel) => {
        if (wheel.parent) wheel.parent.visible = false;
      });
      this.carRig.carGroup.add(model);

      this.externalVehicleModel = model;
      this.externalWheelMeshes = wheels;
      this.externalPrimaryPaint = primaryPaint;
      this.externalSecondaryPaint = secondaryPaint;
      this.updateShowroomFraming();
      console.info('[Engine] Loaded detailed vehicle:', model.name, loadedUrl);
    } catch (error) {
      // The original procedural vehicle remains as a safe visual fallback.
      console.warn('[Engine] Detailed vehicle model unavailable; using procedural car.', error);
    }
  }

  private updateExternalVehiclePaint(customization: CarCustomization) {
    this.externalPrimaryPaint.forEach((material) => {
      material.color.set(customization.bodyColor);
    });
    this.externalSecondaryPaint.forEach((material) => {
      material.color.set(customization.bodyColor).multiplyScalar(0.22);
    });
  }

  public updateCustomization(customization: CarCustomization) {
    this.carRig.updateCustomization(customization);
    this.updateExternalVehiclePaint(customization);
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
    if (this.currentScreen !== 'free_drive' && this.currentScreen !== 'racing') {
      this.updateShowroomFraming();
    }
  };

  private updateShowroomFraming() {
    // Fit the full vehicle (including mirrors, wheels and bodywork) inside the preview.
    this.carRig.carGroup.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.carRig.carGroup);
    if (bounds.isEmpty()) return;

    const size = bounds.getSize(new THREE.Vector3());
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect = Math.max(0.1, this.camera.aspect);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const limitingFov = Math.max(0.25, Math.min(verticalFov, horizontalFov));

    // The bounding sphere prevents long cars being clipped as the camera rotates around them.
    this.showroomOrbitRadius = Math.max(
      7.8,
      (sphere.radius / Math.sin(limitingFov / 2)) * 1.1
    );

    this.showroomLookTarget.copy(sphere.center);
    // Raise the vehicle in the available preview area so the bottom upgrade panel cannot cover it.
    this.showroomLookTarget.y -= Math.max(0.28, size.y * 0.3);
    this.showroomCameraLift = Math.max(2.0, size.y * 1.45);
  }

  private tick = () => {
    if (this.isDestroyed) return;

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.08);
    this.lastTime = now;

    // 1. Update city traffic and its dynamic collision boxes.
    this.traffic.update(delta);

    // 2. Update Game Mode
    if (this.currentScreen === 'racing' || this.currentScreen === 'free_drive') {
      this.updateActiveGameplay(delta);
    } else {
      this.updateShowroom(delta);
    }

    // 3. City Environment update
    this.city.update(delta);

    // 4. Render
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
    this.police.update(delta, this.physics.position, this.physics.rotationY);
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
    if (this.externalVehicleModel) {
      this.externalVehicleModel.rotation.x = this.physics.pitch;
      this.externalVehicleModel.rotation.z = this.physics.roll;
    }
    this.externalWheelMeshes.forEach(({ mesh, axis }) => {
      mesh.rotation[axis] += wheelSpinDelta;
    });

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
    const lookTargetX = carPos.x + Math.sin(effectiveHeading) * lookAheadDist;
    const lookTargetY = carPos.y + lookHeight;
    const lookTargetZ = carPos.z + Math.cos(effectiveHeading) * lookAheadDist;

    this.cameraLookTarget.x = THREE.MathUtils.damp(this.cameraLookTarget.x, lookTargetX, dampRate, delta);
    this.cameraLookTarget.y = THREE.MathUtils.damp(this.cameraLookTarget.y, lookTargetY, dampRate, delta);
    this.cameraLookTarget.z = THREE.MathUtils.damp(this.cameraLookTarget.z, lookTargetZ, dampRate, delta);

    this.camera.lookAt(this.cameraLookTarget);
  }

  private updateShowroom(delta: number) {
    // Smooth turntable orbit around the car in Garage / Menu
    this.garageOrbitAngle += delta * 0.35;
    const camHeight =
      this.showroomLookTarget.y +
      this.showroomCameraLift +
      Math.sin(this.garageOrbitAngle * 0.5) * 0.18;

    this.camera.position.set(
      Math.sin(this.garageOrbitAngle) * this.showroomOrbitRadius,
      camHeight,
      Math.cos(this.garageOrbitAngle) * this.showroomOrbitRadius
    );
    this.camera.lookAt(this.showroomLookTarget);

    // Stationary car positioning
    this.carRig.carGroup.position.set(0, 0.38, 0);
    this.carRig.carGroup.rotation.set(0, 0, 0);
    this.carRig.updateState(0, 0, false, false, 0, 0);
    if (this.externalVehicleModel) {
      this.externalVehicleModel.rotation.x = 0;
      this.externalVehicleModel.rotation.z = 0;
    }
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
    this.externalVehicleLoadId++;
    cancelAnimationFrame(this.animationFrameId);
    clearTimeout(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);

    soundManager.stopEngine();

    this.carRig.dispose();
    this.police.dispose();
    this.traffic.dispose();
    this.scene.remove(this.traffic.group);
    this.city.dispose();
    this.raceManager?.dispose();

    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
