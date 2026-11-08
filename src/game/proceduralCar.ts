/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CarConfig, CarCustomization } from '../types/game';

export interface CarVisualRig {
  carGroup: THREE.Group;
  bodyMesh: THREE.Mesh;
  frontWheelPivots: THREE.Group[];
  wheelMeshes: THREE.Group[];
  rimMeshes: THREE.Mesh[];
  neonLightMesh: THREE.Mesh | null;
  taillightMat: THREE.MeshStandardMaterial;
  headlightMat: THREE.MeshStandardMaterial;
  nitroFlames: THREE.Group;
  chassisMesh: THREE.Group;
  updateCustomization: (customization: CarCustomization) => void;
  updateState: (steerAngle: number, wheelSpinDelta: number, isBraking: boolean, isNitro: boolean, pitch: number, roll: number) => void;
  dispose: () => void;
}

export function createProceduralCar(config: CarConfig, customization: CarCustomization): CarVisualRig {
  const carGroup = new THREE.Group();
  const chassisMesh = new THREE.Group();
  carGroup.add(chassisMesh);

  const { length, width, height, wheelRadius, wheelWidth } = config.dimensions;

  // Car Paint Material
  const paintMaterial = new THREE.MeshStandardMaterial({
    color: customization.bodyColor,
    metalness: customization.finish === 'metallic' ? 0.85 : customization.finish === 'matte' ? 0.1 : 0.6,
    roughness: customization.finish === 'metallic' ? 0.2 : customization.finish === 'matte' ? 0.75 : 0.15,
  });

  const secondaryMaterial = new THREE.MeshStandardMaterial({
    color: customization.secondaryColor,
    metalness: 0.8,
    roughness: 0.25,
  });

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.4,
    roughness: 0.5,
  });

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.05,
    transparent: true,
    opacity: 0.82,
  });

  const interiorMaterial = new THREE.MeshStandardMaterial({
    color: 0x111115,
    roughness: 0.8,
    metalness: 0.1,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xffffff,
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff1122,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: customization.rimColor,
    metalness: 0.9,
    roughness: 0.2,
  });

  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1c1f,
    roughness: 0.85,
    metalness: 0.05,
  });

  const brakeCaliperMaterial = new THREE.MeshStandardMaterial({
    color: 0xe11d48, // Sporty red caliper
    metalness: 0.6,
    roughness: 0.3,
  });

  const brakeRotorMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.95,
    roughness: 0.25,
  });

  const rimMeshes: THREE.Mesh[] = [];

  // ==========================================
  // 1. CAR BODY SHAPING (Custom per Style)
  // ==========================================
  let mainBodyMesh: THREE.Mesh;

  if (config.style === 'hyperion') {
    // Hypercar: low-slung, aerodynamic fuselage with central shark fin and side pods
    const mainBodyGeo = new THREE.BoxGeometry(width * 0.92, height * 0.42, length);
    mainBodyMesh = new THREE.Mesh(mainBodyGeo, paintMaterial);
    mainBodyMesh.position.y = height * 0.32;
    mainBodyMesh.castShadow = true;
    chassisMesh.add(mainBodyMesh);

    // Aerodynamic cockpit bubble
    const cockpitGeo = new THREE.CylinderGeometry(width * 0.36, width * 0.46, length * 0.48, 12);
    cockpitGeo.rotateX(Math.PI / 2);
    const cockpitMesh = new THREE.Mesh(cockpitGeo, glassMaterial);
    cockpitMesh.position.set(0, height * 0.62, -length * 0.02);
    cockpitMesh.scale.set(1, 0.6, 1);
    chassisMesh.add(cockpitMesh);

    // Hypercar Shark Fin
    const finGeo = new THREE.BoxGeometry(0.04, height * 0.45, length * 0.38);
    const finMesh = new THREE.Mesh(finGeo, carbonMaterial);
    finMesh.position.set(0, height * 0.72, -length * 0.16);
    chassisMesh.add(finMesh);

    // Massive GT Wing Spoiler
    const wingGeo = new THREE.BoxGeometry(width * 1.05, 0.05, 0.35);
    const wingMesh = new THREE.Mesh(wingGeo, carbonMaterial);
    wingMesh.position.set(0, height * 0.78, -length * 0.44);
    wingMesh.castShadow = true;
    chassisMesh.add(wingMesh);

    // Wing Struts
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.03, height * 0.35, 0.15), carbonMaterial);
    strutL.position.set(-width * 0.32, height * 0.6, -length * 0.44);
    const strutR = strutL.clone();
    strutR.position.x = width * 0.32;
    chassisMesh.add(strutL, strutR);

    // Front Splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.04, 0.4), carbonMaterial);
    splitter.position.set(0, height * 0.14, length * 0.48);
    chassisMesh.add(splitter);

  } else if (
    config.style === 'bmw_m4' ||
    config.style === 'mercedes_amg' ||
    config.style === 'bugatti_chiron' ||
    config.style === 'ferrari_488'
  ) {
    // Four distinct performance-car silhouettes built from lightweight Three.js geometry.
    const addBox = (
      boxWidth: number,
      boxHeight: number,
      boxLength: number,
      material: THREE.Material,
      x: number,
      y: number,
      z: number,
      rotationX = 0,
      rotationZ = 0
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(boxWidth, boxHeight, boxLength),
        material
      );
      mesh.position.set(x, y, z);
      mesh.rotation.set(rotationX, 0, rotationZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      chassisMesh.add(mesh);
      return mesh;
    };

    const isBmw = config.style === 'bmw_m4';
    const isMercedes = config.style === 'mercedes_amg';
    const isBugatti = config.style === 'bugatti_chiron';
    const isFerrari = config.style === 'ferrari_488';

    const mainBodyGeo = new THREE.BoxGeometry(
      width * 0.95,
      height * (isBugatti || isFerrari ? 0.39 : 0.44),
      length
    );
    mainBodyMesh = new THREE.Mesh(mainBodyGeo, paintMaterial);
    mainBodyMesh.position.y = height * 0.31;
    mainBodyMesh.castShadow = true;
    mainBodyMesh.receiveShadow = true;
    chassisMesh.add(mainBodyMesh);

    // Long bonnet and rear deck are angled to avoid the old box-shaped starter-car look.
    addBox(width * 0.91, height * 0.12, length * (isMercedes ? 0.38 : 0.34),
      paintMaterial, 0, height * 0.49, length * 0.29, isBugatti ? 0.03 : 0.10);
    addBox(width * 0.88, height * 0.10, length * 0.20,
      paintMaterial, 0, height * 0.47, -length * 0.39, -0.06);

    const cabinWidth = width * (isBugatti ? 0.69 : isFerrari ? 0.72 : 0.75);
    const cabinLength = length * (isMercedes ? 0.43 : isBugatti ? 0.39 : 0.45);
    addBox(cabinWidth, height * 0.39, cabinLength,
      glassMaterial, 0, height * 0.67, -length * (isMercedes ? 0.10 : 0.07), -0.04);
    addBox(cabinWidth * 0.97, height * 0.055, cabinLength * 0.90,
      paintMaterial, 0, height * 0.88, -length * 0.07);

    // Side skirts, mirrors and sculpted door lines.
    for (const side of [-1, 1]) {
      addBox(width * 0.055, height * 0.09, length * 0.62,
        carbonMaterial, side * width * 0.47, height * 0.20, -length * 0.01);
      addBox(width * 0.095, height * 0.075, length * 0.12,
        secondaryMaterial, side * width * 0.48, height * 0.61, length * 0.13);
      addBox(width * 0.012, height * 0.018, length * 0.32,
        secondaryMaterial, side * width * 0.475, height * 0.34, -length * 0.02);
    }

    if (isBmw) {
      // Twin kidney grille and a compact M-style rear lip.
      for (const side of [-1, 1]) {
        addBox(width * 0.145, height * 0.25, 0.045,
          secondaryMaterial, side * width * 0.105, height * 0.31, length * 0.514);
        addBox(width * 0.105, height * 0.20, 0.052,
          carbonMaterial, side * width * 0.105, height * 0.31, length * 0.52);
        addBox(width * 0.025, height * 0.035, length * 0.25,
          secondaryMaterial, side * width * 0.27, height * 0.53, length * 0.24);
      }
      addBox(width * 0.82, height * 0.045, 0.18,
        carbonMaterial, 0, height * 0.63, -length * 0.47);
    } else if (isMercedes) {
      // Wide Panamericana-inspired grille and a three-point star silhouette.
      addBox(width * 0.42, height * 0.25, 0.055,
        carbonMaterial, 0, height * 0.30, length * 0.515);
      for (let bar = -2; bar <= 2; bar++) {
        addBox(width * 0.012, height * 0.22, 0.018,
          secondaryMaterial, bar * width * 0.065, height * 0.30, length * 0.535);
      }
      const starRing = new THREE.Mesh(
        new THREE.TorusGeometry(width * 0.09, 0.018, 8, 24),
        secondaryMaterial
      );
      starRing.position.set(0, height * 0.30, length * 0.55);
      starRing.castShadow = true;
      chassisMesh.add(starRing);
      for (let spoke = 0; spoke < 3; spoke++) {
        addBox(0.022, height * 0.15, 0.022,
          secondaryMaterial, 0, height * 0.30, length * 0.555,
          0, (spoke * Math.PI) / 3);
      }
      addBox(width * 0.84, height * 0.045, 0.18,
        carbonMaterial, 0, height * 0.18, length * 0.50);
    } else if (isBugatti) {
      // Horseshoe grille and the characteristic central spine.
      addBox(width * 0.38, height * 0.29, 0.05,
        carbonMaterial, 0, height * 0.27, length * 0.51);
      const horseshoe = new THREE.Mesh(
        new THREE.TorusGeometry(width * 0.125, 0.045, 10, 28),
        secondaryMaterial
      );
      horseshoe.position.set(0, height * 0.28, length * 0.55);
      horseshoe.scale.set(0.88, 1.2, 1);
      horseshoe.castShadow = true;
      chassisMesh.add(horseshoe);
      addBox(width * 0.022, height * 0.055, length * 0.36,
        secondaryMaterial, 0, height * 0.53, length * 0.25);
      addBox(width * 0.98, height * 0.04, 0.28,
        carbonMaterial, 0, height * 0.15, length * 0.50);
      addBox(width * 0.96, height * 0.06, 0.20,
        carbonMaterial, 0, height * 0.17, -length * 0.49);
    } else if (isFerrari) {
      // Wide lower intake, bonnet creases and a track-inspired rear diffuser.
      addBox(width * 0.58, height * 0.16, 0.055,
        carbonMaterial, 0, height * 0.23, length * 0.515);
      for (let line = -1; line <= 1; line++) {
        addBox(width * 0.48, 0.018, 0.018,
          secondaryMaterial, 0, height * (0.19 + (line + 1) * 0.045), length * 0.545);
      }
      for (const side of [-1, 1]) {
        addBox(width * 0.035, height * 0.04, length * 0.28,
          secondaryMaterial, side * width * 0.24, height * 0.54, length * 0.25, 0.08);
        addBox(width * 0.12, height * 0.16, length * 0.22,
          carbonMaterial, side * width * 0.44, height * 0.36, -length * 0.06, 0, side * -0.10);
      }
      addBox(width * 0.98, height * 0.035, 0.34,
        carbonMaterial, 0, height * 0.14, length * 0.50);
      addBox(width * 0.86, height * 0.055, 0.20,
        carbonMaterial, 0, height * 0.57, -length * 0.45);
    }
  } else if (config.style === 'veloce') {
    // Sports GT: Wide sculpted stance, mid-engine profile, aggressive lines
    const mainBodyGeo = new THREE.BoxGeometry(width * 0.94, height * 0.45, length);
    mainBodyMesh = new THREE.Mesh(mainBodyGeo, paintMaterial);
    mainBodyMesh.position.y = height * 0.34;
    mainBodyMesh.castShadow = true;
    chassisMesh.add(mainBodyMesh);

    // Greenhouse / Cabin
    const cabinGeo = new THREE.BoxGeometry(width * 0.76, height * 0.45, length * 0.52);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
    cabinMesh.position.set(0, height * 0.68, -length * 0.06);
    chassisMesh.add(cabinMesh);

    // Roof Panel
    const roofGeo = new THREE.BoxGeometry(width * 0.72, 0.04, length * 0.45);
    const roofMesh = new THREE.Mesh(roofGeo, secondaryMaterial);
    roofMesh.position.set(0, height * 0.9, -length * 0.06);
    roofMesh.castShadow = true;
    chassisMesh.add(roofMesh);

    // Side air intakes
    const intakeGeo = new THREE.BoxGeometry(0.12, height * 0.25, 0.6);
    const intakeL = new THREE.Mesh(intakeGeo, carbonMaterial);
    intakeL.position.set(-width * 0.47, height * 0.35, -length * 0.15);
    const intakeR = intakeL.clone();
    intakeR.position.x = width * 0.47;
    chassisMesh.add(intakeL, intakeR);

    // Ducktail spoiler
    const spoilerGeo = new THREE.BoxGeometry(width * 0.88, 0.1, 0.22);
    const spoiler = new THREE.Mesh(spoilerGeo, carbonMaterial);
    spoiler.position.set(0, height * 0.62, -length * 0.46);
    chassisMesh.add(spoiler);

    // Rear diffuser
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.08, 0.35), carbonMaterial);
    diffuser.position.set(0, height * 0.18, -length * 0.48);
    chassisMesh.add(diffuser);

  } else {
    // Apex Sprint: Street Tuner, agile hatchback/coupe look
    const mainBodyGeo = new THREE.BoxGeometry(width * 0.92, height * 0.48, length);
    mainBodyMesh = new THREE.Mesh(mainBodyGeo, paintMaterial);
    mainBodyMesh.position.y = height * 0.36;
    mainBodyMesh.castShadow = true;
    chassisMesh.add(mainBodyMesh);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(width * 0.8, height * 0.48, length * 0.55);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
    cabinMesh.position.set(0, height * 0.72, -length * 0.04);
    chassisMesh.add(cabinMesh);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.04, length * 0.5), paintMaterial);
    roof.position.set(0, height * 0.95, -length * 0.04);
    roof.castShadow = true;
    chassisMesh.add(roof);

    // Hood scoop
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.08, 0.45), carbonMaterial);
    scoop.position.set(0, height * 0.62, length * 0.22);
    chassisMesh.add(scoop);

    // Tuner Rear Wing
    const wing = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.05, 0.26), secondaryMaterial);
    wing.position.set(0, height * 0.84, -length * 0.46);
    wing.castShadow = true;
    chassisMesh.add(wing);

    const wingPostL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.1), carbonMaterial);
    wingPostL.position.set(-width * 0.26, height * 0.72, -length * 0.46);
    const wingPostR = wingPostL.clone();
    wingPostR.position.x = width * 0.26;
    chassisMesh.add(wingPostL, wingPostR);
  }

  // ==========================================
  // 2. LIGHTS (Headlights & Taillights)
  // ==========================================
  // Headlights
  const headlightWidth =
    config.style === 'bmw_m4' ? 0.20 :
    config.style === 'mercedes_amg' ? 0.22 :
    config.style === 'bugatti_chiron' ? 0.16 :
    config.style === 'ferrari_488' ? 0.24 : 0.22;
  const headlightGeo = new THREE.BoxGeometry(width * headlightWidth, 0.09, 0.05);
  const headL = new THREE.Mesh(headlightGeo, headlightMat);
  headL.position.set(-width * 0.33, height * 0.38, length * 0.495);
  const headR = headL.clone();
  headR.position.x = width * 0.33;
  chassisMesh.add(headL, headR);

  // Taillights bar
  const taillightGeo = new THREE.BoxGeometry(width * 0.82, 0.08, 0.05);
  const tailMesh = new THREE.Mesh(taillightGeo, taillightMat);
  tailMesh.position.set(0, height * 0.44, -length * 0.495);
  chassisMesh.add(tailMesh);

  // Twin Exhausts
  const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.2, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.2 });
  const exhaustL = new THREE.Mesh(exhaustGeo, exhaustMat);
  exhaustL.position.set(-width * 0.22, height * 0.18, -length * 0.5);
  const exhaustR = exhaustL.clone();
  exhaustR.position.x = width * 0.22;
  chassisMesh.add(exhaustL, exhaustR);

  // ==========================================
  // 3. NITRO FLAMES (Cones at exhaust)
  // ==========================================
  const nitroFlames = new THREE.Group();
  const flameGeo = new THREE.ConeGeometry(0.12, 0.6, 12);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.85,
  });
  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(-width * 0.22, height * 0.18, -length * 0.55);
  const flameR = flameL.clone();
  flameR.position.x = width * 0.22;
  nitroFlames.add(flameL, flameR);
  nitroFlames.visible = false;
  chassisMesh.add(nitroFlames);

  // ==========================================
  // 4. UNDERGLOW NEON
  // ==========================================
  let neonLightMesh: THREE.Mesh | null = null;
  if (customization.neonColor && customization.neonColor !== 'none') {
    const neonGeo = new THREE.PlaneGeometry(width * 0.9, length * 0.85);
    neonGeo.rotateX(-Math.PI / 2);
    const neonMat = new THREE.MeshBasicMaterial({
      color: customization.neonColor,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    neonLightMesh = new THREE.Mesh(neonGeo, neonMat);
    neonLightMesh.position.y = 0.05;
    carGroup.add(neonLightMesh);
  }

  // ==========================================
  // 5. CONTACT SHADOW BENEATH CAR
  // ==========================================
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 256;
  const shadowCtx = shadowCanvas.getContext('2d');
  if (shadowCtx) {
    const grad = shadowCtx.createRadialGradient(64, 128, 10, 64, 128, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    shadowCtx.fillStyle = grad;
    shadowCtx.fillRect(0, 0, 128, 256);
  }
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.3, length * 1.15),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
  );
  shadowPlane.rotateX(-Math.PI / 2);
  shadowPlane.position.y = 0.02;
  carGroup.add(shadowPlane);

  // ==========================================
  // 6. WHEELS, RIMS & BRAKES
  // ==========================================
  const wheelMeshes: THREE.Group[] = [];
  const frontWheelPivots: THREE.Group[] = [];

  const halfTrack = width * 0.48;
  const halfWheelbase = length * 0.32;

  const wheelPositions = [
    { name: 'FL', pos: new THREE.Vector3(-halfTrack, wheelRadius, halfWheelbase), isFront: true },
    { name: 'FR', pos: new THREE.Vector3(halfTrack, wheelRadius, halfWheelbase), isFront: true },
    { name: 'RL', pos: new THREE.Vector3(-halfTrack, wheelRadius, -halfWheelbase), isFront: false },
    { name: 'RR', pos: new THREE.Vector3(halfTrack, wheelRadius, -halfWheelbase), isFront: false },
  ];

  wheelPositions.forEach((wp) => {
    // Outer pivot for steering (front wheels turn left/right)
    const pivot = new THREE.Group();
    pivot.position.copy(wp.pos);
    carGroup.add(pivot);

    // Inner wheel assembly (rotates around pitch/X axis for forward rolling)
    const wheelAssembly = new THREE.Group();
    pivot.add(wheelAssembly);
    wheelMeshes.push(wheelAssembly);

    if (wp.isFront) {
      frontWheelPivots.push(pivot);
    }

    // Tire (Cylinder oriented along X axis)
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, tireMaterial);
    tireMesh.castShadow = true;
    wheelAssembly.add(tireMesh);

    // Rim Outer Ring & Spokes
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.74, wheelRadius * 0.74, wheelWidth * 1.02, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, rimMaterial);
    wheelAssembly.add(rimMesh);
    rimMeshes.push(rimMesh);

    // Center hub cap
    const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.28, wheelRadius * 0.28, wheelWidth * 1.06, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeo, carbonMaterial);
    wheelAssembly.add(hubMesh);

    // 5 Rim Spokes (procedural sport wheel)
    for (let s = 0; s < 5; s++) {
      const angle = (s * Math.PI * 2) / 5;
      const spokeGeo = new THREE.BoxGeometry(wheelWidth * 1.04, wheelRadius * 0.65, 0.04);
      spokeGeo.rotateX(angle);
      const spokeMesh = new THREE.Mesh(spokeGeo, rimMaterial);
      spokeMesh.position.x = wp.name.includes('L') ? -0.01 : 0.01;
      wheelAssembly.add(spokeMesh);
    }

    // Brake Disc (Fixed to pivot so it doesn't spin wildly, sits inside rim)
    const discGeo = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, 0.03, 16);
    discGeo.rotateZ(Math.PI / 2);
    const discMesh = new THREE.Mesh(discGeo, brakeRotorMaterial);
    discMesh.position.x = wp.name.includes('L') ? 0.04 : -0.04;
    pivot.add(discMesh);

    // Brake Caliper
    const caliperGeo = new THREE.BoxGeometry(0.06, wheelRadius * 0.35, wheelRadius * 0.3);
    const caliperMesh = new THREE.Mesh(caliperGeo, brakeCaliperMaterial);
    caliperMesh.position.set(wp.name.includes('L') ? 0.06 : -0.06, wheelRadius * 0.3, 0);
    pivot.add(caliperMesh);
  });

  // State update logic
  const updateState = (
    steerAngle: number,
    wheelSpinDelta: number,
    isBraking: boolean,
    isNitro: boolean,
    pitch: number,
    roll: number
  ) => {
    // Front wheel steering
    frontWheelPivots.forEach((p) => {
      p.rotation.y = steerAngle;
    });

    // Wheel spin (roll)
    wheelMeshes.forEach((w) => {
      w.rotation.x += wheelSpinDelta;
    });

    // Chassis suspension dynamics (pitch under brake/accel, roll during cornering)
    chassisMesh.rotation.x = pitch;
    chassisMesh.rotation.z = roll;

    // Taillight glow on braking
    if (isBraking) {
      taillightMat.emissiveIntensity = 3.5;
    } else {
      taillightMat.emissiveIntensity = 1.6;
    }

    // Nitro exhaust flames
    nitroFlames.visible = isNitro;
    if (isNitro) {
      const flicker = 0.8 + Math.random() * 0.4;
      nitroFlames.scale.set(flicker, flicker, flicker * (1.2 + Math.random() * 0.5));
    }
  };

  const updateCustomization = (newCust: CarCustomization) => {
    paintMaterial.color.set(newCust.bodyColor);
    paintMaterial.metalness = newCust.finish === 'metallic' ? 0.85 : newCust.finish === 'matte' ? 0.1 : 0.6;
    paintMaterial.roughness = newCust.finish === 'metallic' ? 0.2 : newCust.finish === 'matte' ? 0.75 : 0.15;
    paintMaterial.needsUpdate = true;

    rimMaterial.color.set(newCust.rimColor);
    rimMaterial.needsUpdate = true;

    if (neonLightMesh) {
      if (!newCust.neonColor || newCust.neonColor === 'none') {
        neonLightMesh.visible = false;
      } else {
        neonLightMesh.visible = true;
        (neonLightMesh.material as THREE.MeshBasicMaterial).color.set(newCust.neonColor);
      }
    }
  };

  const dispose = () => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    carGroup.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      geometries.add(mesh.geometry);
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      meshMaterials.forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    shadowTexture.dispose();
  };

  return {
    carGroup,
    bodyMesh: mainBodyMesh,
    frontWheelPivots,
    wheelMeshes,
    rimMeshes,
    neonLightMesh,
    taillightMat,
    headlightMat,
    nitroFlames,
    chassisMesh,
    updateCustomization,
    updateState,
    dispose,
  };
}
