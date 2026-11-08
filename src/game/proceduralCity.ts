/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface CityEnvironment {
  sceneGroup: THREE.Group;
  collisionBoxes: THREE.Box3[];
  roadBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  ramps: { box: THREE.Box3; incline: number; direction: THREE.Vector3 }[];
  update: (delta: number) => void;
  dispose: () => void;
}

// Procedural Canvas Textures
function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base with subtle aggregate noise
  ctx.fillStyle = '#1e2229';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 4000; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Yellow center double line
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(250, 0, 4, 512);
  ctx.fillRect(258, 0, 4, 512);

  // White lane dashes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(128, y, 6, 36);
    ctx.fillRect(384, y, 6, 36);
  }

  // White shoulder solid lines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(24, 0, 6, 512);
  ctx.fillRect(482, 0, 6, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBuildingWindowTexture(litColor = '#fef08a'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Building wall concrete / metal cladding
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 256, 256);

  // Window grid
  const cols = 8;
  const rows = 12;
  const w = 18;
  const h = 12;
  const padX = 14;
  const padY = 8;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLit = Math.random() > 0.45;
      if (isLit) {
        ctx.fillStyle = Math.random() > 0.2 ? litColor : '#38bdf8';
      } else {
        ctx.fillStyle = '#1f2937';
      }
      ctx.fillRect(c * (w + padX) + 8, r * (h + padY) + 8, w, h);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createNeonBillboardTexture(text: string, bgColor = '#0f172a', textColor = '#00f0ff'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = textColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = textColor;
  ctx.shadowBlur = 15;
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createProceduralCity(): CityEnvironment {
  const sceneGroup = new THREE.Group();
  const collisionBoxes: THREE.Box3[] = [];
  const ramps: { box: THREE.Box3; incline: number; direction: THREE.Vector3 }[] = [];

  const roadBounds = {
    minX: -240,
    maxX: 240,
    minZ: -200,
    maxZ: 200,
  };

  const roadTexture = createRoadTexture();
  const windowTextureWarm = createBuildingWindowTexture('#fef08a');
  const windowTextureCyan = createBuildingWindowTexture('#38bdf8');
  const billboardTexture1 = createNeonBillboardTexture('BEKIUZ DRIVE', '#020617', '#00f0ff');
  const billboardTexture2 = createNeonBillboardTexture('CITY RUSH', '#050505', '#f59e0b');
  const billboardTexture3 = createNeonBillboardTexture('TURBO APEX', '#111827', '#e11d48');

  // Materials
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: 0.8,
    metalness: 0.1,
  });

  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.9,
    metalness: 0.05,
  });

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.95,
    metalness: 0.02,
  });

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    metalness: 0.8,
    roughness: 0.15,
    transparent: true,
    opacity: 0.88,
  });

  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.7,
    roughness: 0.3,
  });

  const bridgeSteelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.85,
    roughness: 0.25,
  });

  const bridgeCableMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.9,
    roughness: 0.2,
  });

  // ==========================================
  // 1. TERRAIN / GROUND BASE
  // ==========================================
  // Main ground plane
  const groundGeo = new THREE.PlaneGeometry(600, 600);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, grassMat);
  groundMesh.position.y = -0.05;
  groundMesh.receiveShadow = true;
  sceneGroup.add(groundMesh);

  // Waterfront bay on the East side (X: 160 to 280, Z: -250 to 250)
  const bayWaterGeo = new THREE.PlaneGeometry(140, 500);
  bayWaterGeo.rotateX(-Math.PI / 2);
  const bayWater = new THREE.Mesh(bayWaterGeo, waterMat);
  bayWater.position.set(200, -0.2, 0);
  sceneGroup.add(bayWater);

  // Distant horizon mountain barrier (zero-pill / no void)
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });
  for (let m = 0; m < 16; m++) {
    const angle = (m * Math.PI * 2) / 16;
    const dist = 280;
    const mHeight = 40 + Math.random() * 35;
    const mMesh = new THREE.Mesh(new THREE.ConeGeometry(50 + Math.random() * 30, mHeight, 6), mountainMat);
    mMesh.position.set(Math.cos(angle) * dist, mHeight * 0.4, Math.sin(angle) * dist);
    sceneGroup.add(mMesh);
  }

  // ==========================================
  // 2. ROAD NETWORK (Central Grid & Highways)
  // ==========================================
  // Road Helper
  const addRoad = (x: number, z: number, w: number, l: number, rotY = 0) => {
    const roadGeo = new THREE.PlaneGeometry(w, l);
    roadGeo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(roadGeo, roadMat);
    mesh.position.set(x, 0.01, z);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    sceneGroup.add(mesh);

    // Place sidewalks along the road's rotated local X axis.
    const curbW = 2.4;
    const curbH = 0.2;
    const sideOffset = w / 2 + curbW / 2;
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(curbW, curbH, l), sidewalkMat);
    sideL.position.set(
      x - Math.cos(rotY) * sideOffset,
      curbH / 2,
      z + Math.sin(rotY) * sideOffset
    );
    sideL.rotation.y = rotY;
    sideL.receiveShadow = true;

    const sideR = new THREE.Mesh(new THREE.BoxGeometry(curbW, curbH, l), sidewalkMat);
    sideR.position.set(
      x + Math.cos(rotY) * sideOffset,
      curbH / 2,
      z - Math.sin(rotY) * sideOffset
    );
    sideR.rotation.y = rotY;
    sideR.receiveShadow = true;

    sceneGroup.add(sideL, sideR);
  };

  const roadWidth = 20;

  // Central North-South Avenue (X = 0, Z: -180 to 180)
  addRoad(0, 0, roadWidth, 360, 0);

  // Central East-West Boulevard (Z = 0, X: -200 to 160)
  addRoad(-20, 0, roadWidth, 360, Math.PI / 2);

  // North Perimeter Avenue (Z = -155, X: -200 to 180)
  addRoad(-10, -160, roadWidth, 380, Math.PI / 2);

  // South Perimeter / Waterfront Promenade (Z = 160, X: -200 to 180)
  addRoad(-10, 160, roadWidth, 380, Math.PI / 2);

  // West Outer Highway (X = -195, Z: -155 to 160)
  addRoad(-195, 0, roadWidth, 320, 0);

  // Middle Avenue (X = -90, Z: -155 to 160)
  addRoad(-90, 0, roadWidth, 320, 0);

  // Middle East Avenue (X = 90, Z: -155 to 160)
  addRoad(90, 0, roadWidth, 320, 0);

  // ==========================================
  // 3. ELEVATED SUSPENSION BRIDGE (Over Water Channel)
  // ==========================================
  const bridgeX = 195;
  const bridgeStartZ = -150;
  const bridgeEndZ = 150;
  const bridgeLength = bridgeEndZ - bridgeStartZ;
  const rampLength = 35;
  const bridgeDeckLength = bridgeLength - rampLength * 2;
  const rampAngle = Math.atan2(5.2, rampLength);

  // The flat deck stops exactly where the two approach ramps begin.
  const bridgeDeck = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth + 4, 1.2, bridgeDeckLength),
    bridgeSteelMat
  );
  bridgeDeck.position.set(bridgeX, 5.0, 0);
  bridgeDeck.receiveShadow = true;
  bridgeDeck.castShadow = true;
  sceneGroup.add(bridgeDeck);

  const bridgeRoad = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, bridgeDeckLength), roadMat);
  bridgeRoad.rotation.x = -Math.PI / 2;
  bridgeRoad.position.set(bridgeX, 5.62, 0);
  bridgeRoad.receiveShadow = true;
  sceneGroup.add(bridgeRoad);

  // Each approach is a sloped structure with an asphalt driving surface and guard rails.
  const createBridgeApproach = (z: number, angle: number) => {
    const approach = new THREE.Group();
    approach.position.set(bridgeX, 2.51, z);
    approach.rotation.x = angle;

    const rampDeck = new THREE.Mesh(
      new THREE.BoxGeometry(roadWidth + 4, 1, rampLength),
      bridgeSteelMat
    );
    approach.add(rampDeck);

    const rampRoad = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, rampLength), roadMat);
    rampRoad.rotation.x = -Math.PI / 2;
    rampRoad.position.y = 0.501;
    rampRoad.receiveShadow = true;
    approach.add(rampRoad);

    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, rampLength), barrierMat);
    railL.position.set(-(roadWidth / 2 + 1), 1.3, 0);
    const railR = railL.clone();
    railR.position.x = roadWidth / 2 + 1;
    approach.add(railL, railR);
    sceneGroup.add(approach);

    collisionBoxes.push(
      new THREE.Box3().setFromObject(railL),
      new THREE.Box3().setFromObject(railR)
    );
  };

  // South ramp rises from the promenade into the bridge deck.
  createBridgeApproach(bridgeEndZ - rampLength / 2, rampAngle);
  // North ramp descends from the bridge deck to the north avenue.
  createBridgeApproach(bridgeStartZ + rampLength / 2, -rampAngle);

  // Short paved links close the 3 m gap between the perimeter roads and bridge deck.
  const southLink = new THREE.Mesh(new THREE.PlaneGeometry(3, roadWidth), roadMat);
  southLink.rotation.x = -Math.PI / 2;
  southLink.rotation.y = Math.PI / 2;
  southLink.position.set(181.5, 0.01, bridgeEndZ + 10);
  const northLink = southLink.clone();
  northLink.position.z = bridgeStartZ - 10;
  sceneGroup.add(southLink, northLink);

  // Bridge Towers (2 massive A-frame suspension towers)
  const towerZPositions = [-50, 55];
  towerZPositions.forEach((tz) => {
    // Left Pillar
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(3, 36, 4), bridgeSteelMat);
    pillarL.position.set(bridgeX - (roadWidth / 2 + 3), 15, tz);
    pillarL.castShadow = true;

    // Right Pillar
    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(3, 36, 4), bridgeSteelMat);
    pillarR.position.set(bridgeX + (roadWidth / 2 + 3), 15, tz);
    pillarR.castShadow = true;

    // Cross beam
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(roadWidth + 10, 3, 4), bridgeSteelMat);
    crossBeam.position.set(bridgeX, 28, tz);

    sceneGroup.add(pillarL, pillarR, crossBeam);

    // Collision for bridge tower pillars
    const boxL = new THREE.Box3().setFromObject(pillarL);
    const boxR = new THREE.Box3().setFromObject(pillarR);
    collisionBoxes.push(boxL, boxR);
  });

  // Suspension Cables (diagonal tubular lines)
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  for (let c = -100; c <= 100; c += 25) {
    const cableL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 26), cableMat);
    cableL.position.set(bridgeX - (roadWidth / 2 + 2.5), 16, c);
    const cableR = cableL.clone();
    cableR.position.x = bridgeX + (roadWidth / 2 + 2.5);
    sceneGroup.add(cableL, cableR);
  }

  // Guard rails on the level bridge deck.
  const railL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, bridgeDeckLength), barrierMat);
  railL.position.set(bridgeX - (roadWidth / 2 + 1), 6.2, 0);
  const railR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, bridgeDeckLength), barrierMat);
  railR.position.set(bridgeX + (roadWidth / 2 + 1), 6.2, 0);
  sceneGroup.add(railL, railR);
  collisionBoxes.push(
    new THREE.Box3().setFromObject(railL),
    new THREE.Box3().setFromObject(railR)
  );

  // ==========================================
  // 4. UNDERGROUND / ENCLOSED TUNNEL SECTION
  // ==========================================
  // Located along Middle Avenue between Z: -120 and Z: -40 (X = -90)
  const tunnelLength = 70;
  const tunnelZ = -80;
  const tunnelX = -90;

  const tunnelMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.7,
    metalness: 0.2,
  });

  // Tunnel Roof
  const tunnelRoof = new THREE.Mesh(new THREE.BoxGeometry(roadWidth + 4, 1.2, tunnelLength), tunnelMat);
  tunnelRoof.position.set(tunnelX, 7.5, tunnelZ);
  tunnelRoof.castShadow = true;

  // Tunnel Left Wall
  const tunnelWallL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7.5, tunnelLength), tunnelMat);
  tunnelWallL.position.set(tunnelX - (roadWidth / 2 + 1.2), 3.75, tunnelZ);

  // Tunnel Right Wall
  const tunnelWallR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7.5, tunnelLength), tunnelMat);
  tunnelWallR.position.set(tunnelX + (roadWidth / 2 + 1.2), 3.75, tunnelZ);

  sceneGroup.add(tunnelRoof, tunnelWallL, tunnelWallR);
  collisionBoxes.push(new THREE.Box3().setFromObject(tunnelWallL), new THREE.Box3().setFromObject(tunnelWallR));

  // Neon Roof Strips inside Tunnel
  const neonStripMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  for (let n = -tunnelLength / 2 + 5; n < tunnelLength / 2; n += 14) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(roadWidth - 2, 0.2, 1.5), neonStripMat);
    strip.position.set(tunnelX, 6.8, tunnelZ + n);
    sceneGroup.add(strip);
  }

  // ==========================================
  // 5. SKYSCRAPERS & CITY BUILDINGS
  // ==========================================
  // Building Placement Definitions (Blocks between road network)
  const buildingBlocks = [
    // North-West Block (X: -180 to -105, Z: -140 to -20)
    { cx: -140, cz: -80, w: 55, d: 85, h: 65, tex: windowTextureWarm, billboard: billboardTexture1 },
    { cx: -140, cz: 60, w: 55, d: 75, h: 55, tex: windowTextureCyan, billboard: null },

    // Central West Block (X: -75 to -15, Z: -140 to -20)
    { cx: -45, cz: -80, w: 45, d: 75, h: 80, tex: windowTextureCyan, billboard: billboardTexture2 },
    { cx: -45, cz: 80, w: 45, d: 70, h: 48, tex: windowTextureWarm, billboard: null },

    // Central East Block (X: 15 to 75, Z: -140 to -20)
    { cx: 45, cz: -80, w: 45, d: 75, h: 90, tex: windowTextureWarm, billboard: billboardTexture3 },
    { cx: 45, cz: 80, w: 45, d: 70, h: 52, tex: windowTextureCyan, billboard: billboardTexture1 },

    // Far East Waterfront District (X: 105 to 170, Z: -140 to -20)
    { cx: 135, cz: -80, w: 50, d: 75, h: 70, tex: windowTextureCyan, billboard: null },
    { cx: 135, cz: 80, w: 50, d: 70, h: 60, tex: windowTextureWarm, billboard: billboardTexture2 },
  ];

  buildingBlocks.forEach((b) => {
    // Primary Tower
    const buildingMat = new THREE.MeshStandardMaterial({
      map: b.tex,
      roughness: 0.35,
      metalness: 0.5,
    });
    // Set texture tiling
    b.tex.repeat.set(Math.floor(b.w / 12), Math.floor(b.h / 12));

    const tower = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), buildingMat);
    tower.position.set(b.cx, b.h / 2, b.cz);
    tower.castShadow = true;
    tower.receiveShadow = true;
    sceneGroup.add(tower);

    // Collision Box for building
    const bBox = new THREE.Box3().setFromObject(tower);
    collisionBoxes.push(bBox);

    // Rooftop Mechanical Room / Helipad / Spire
    const roofLevel = b.h;
    const roofTop = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.6, 6, b.d * 0.6),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
    );
    roofTop.position.set(b.cx, roofLevel + 3, b.cz);
    sceneGroup.add(roofTop);

    // Antenna spire
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.6, 18),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.8 })
    );
    antenna.position.set(b.cx, roofLevel + 15, b.cz);
    sceneGroup.add(antenna);

    // Neon Billboard on Tower Front (if configured)
    if (b.billboard) {
      const billGeo = new THREE.PlaneGeometry(24, 7);
      const billMat = new THREE.MeshBasicMaterial({ map: b.billboard });
      const billMesh = new THREE.Mesh(billGeo, billMat);
      billMesh.position.set(b.cx, 16, b.cz + b.d / 2 + 0.3);
      sceneGroup.add(billMesh);
    }
  });

  // ==========================================
  // 6. STUNT RAMPS / JUMPS
  // ==========================================
  const rampPositions = [
    // Ramp in City Square (Central Ave, launching over plaza)
    { x: 0, z: -30, rotY: 0, w: 10, l: 12, h: 2.8 },
    // Ramp on West Highway
    { x: -195, z: 20, rotY: Math.PI, w: 10, l: 12, h: 2.8 },
    // Ramp along Waterfront Promenade
    { x: 100, z: 160, rotY: -Math.PI / 2, w: 10, l: 12, h: 2.8 },
  ];

  const rampMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.6,
    roughness: 0.35,
  });

  rampPositions.forEach((rp) => {
    const rampGroup = new THREE.Group();
    rampGroup.position.set(rp.x, 0, rp.z);
    rampGroup.rotation.y = rp.rotY;

    // Wedge Geometry
    const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(rp.w, rp.h, rp.l), rampMat);
    rampMesh.position.set(0, rp.h / 2, 0);
    rampMesh.rotation.x = -0.22; // Incline
    rampGroup.add(rampMesh);

    sceneGroup.add(rampGroup);

    // Record ramp box and incline normal
    const box = new THREE.Box3().setFromObject(rampGroup);
    const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rp.rotY);
    ramps.push({ box, incline: rp.h / rp.l, direction: forwardDir });
  });

  // ==========================================
  // 7. STREETLIGHTS & TREES (Instanced for Performance)
  // ==========================================
  // Streetlights
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, 7, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const streetlightCoords: Array<[number, number]> = [];
  // Place streetlights along road sidewalks
  for (let z = -140; z <= 140; z += 40) {
    streetlightCoords.push([12, z], [-12, z], [-102, z], [-78, z], [78, z], [102, z]);
  }

  streetlightCoords.forEach(([lx, lz]) => {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(lx, 3.5, lz);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.6), lampHeadMat);
    head.position.set(lx > 0 ? lx - 0.5 : lx + 0.5, 7, lz);

    sceneGroup.add(pole, head);
    // Streetlight pole collider (the lamp head is above the vehicle).
    collisionBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(lx, 3.5, lz),
        new THREE.Vector3(0.5, 7, 0.5)
      )
    );
  });

  // Trees along sidewalks & parks
  const treeTrunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 3, 6);
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const treeFoliageGeo = new THREE.DodecahedronGeometry(1.6, 1);
  const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

  const treeCoords: Array<[number, number]> = [
    [-13, 25], [-13, 65], [-13, 105], [13, 25], [13, 65], [13, 105],
    [-77, 25], [-77, 65], [-77, 105], [77, 25], [77, 65], [77, 105],
    [-150, 174], [-110, 174], [-70, 174], [-30, 174], [30, 174], [70, 174],
  ];

  treeCoords.forEach(([tx, tz]) => {
    const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
    trunk.position.set(tx, 1.5, tz);

    const foliage = new THREE.Mesh(treeFoliageGeo, treeFoliageMat);
    foliage.position.set(tx, 3.8, tz);
    foliage.castShadow = true;

    sceneGroup.add(trunk, foliage);
    // Tree trunk collider; foliage remains non-solid.
    collisionBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(tx, 1.5, tz),
        new THREE.Vector3(0.9, 3, 0.9)
      )
    );
  });

  // ==========================================
  // 8. UPDATE & DISPOSAL
  // ==========================================
  let time = 0;
  const update = (delta: number) => {
    time += delta;
    // Gentle water shimmer
    bayWater.position.y = -0.2 + Math.sin(time * 1.5) * 0.05;
  };

  const dispose = () => {
    roadTexture.dispose();
    windowTextureWarm.dispose();
    windowTextureCyan.dispose();
    billboardTexture1.dispose();
    billboardTexture2.dispose();
    billboardTexture3.dispose();
    roadMat.dispose();
    sidewalkMat.dispose();
    grassMat.dispose();
    waterMat.dispose();
    barrierMat.dispose();
    bridgeSteelMat.dispose();
  };

  return {
    sceneGroup,
    collisionBoxes,
    roadBounds,
    ramps,
    update,
    dispose,
  };
}
