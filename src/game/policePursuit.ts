/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CarConfig, CarCustomization } from '../types/game';
import { createProceduralCar, CarVisualRig } from './proceduralCar';

const POLICE_LIVERY: CarCustomization = {
  bodyColor: '#f8fafc',
  secondaryColor: '#111827',
  rimColor: '#cbd5e1',
  neonColor: 'none',
  finish: 'gloss',
};

/**
 * A visual pursuit car that follows at a safe, fixed minimum distance.
 * It is intentionally non-colliding and can never catch the player.
 */
export class PolicePursuit {
  public readonly group: THREE.Group;
  private readonly rig: CarVisualRig;
  private readonly scene: THREE.Scene;
  private readonly redLight: THREE.Mesh;
  private readonly blueLight: THREE.Mesh;
  private readonly extraMaterials: THREE.Material[] = [];
  private readonly extraGeometries: THREE.BufferGeometry[] = [];
  private elapsed = 0;
  private active = false;

  private static readonly SAFE_DISTANCE = 24;

  constructor(config: CarConfig, scene: THREE.Scene) {
    this.scene = scene;
    this.rig = createProceduralCar(config, POLICE_LIVERY);
    this.group = this.rig.carGroup;
    this.group.visible = false;

    const { width, height } = config.dimensions;

    // Roof lightbar.
    const barBaseMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.4,
      roughness: 0.45,
    });
    const barBaseGeometry = new THREE.BoxGeometry(width * 0.5, 0.07, 0.2);
    const barBase = new THREE.Mesh(barBaseGeometry, barBaseMaterial);
    barBase.position.set(0, height * 1.02, 0);
    this.rig.chassisMesh.add(barBase);
    this.extraMaterials.push(barBaseMaterial);
    this.extraGeometries.push(barBaseGeometry);

    const redMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1d3d,
      emissive: 0xff002b,
      emissiveIntensity: 4,
      metalness: 0.1,
      roughness: 0.2,
    });
    const blueMaterial = new THREE.MeshStandardMaterial({
      color: 0x2563ff,
      emissive: 0x0044ff,
      emissiveIntensity: 0.2,
      metalness: 0.1,
      roughness: 0.2,
    });
    const lightGeometry = new THREE.BoxGeometry(width * 0.22, 0.11, 0.17);

    this.redLight = new THREE.Mesh(lightGeometry, redMaterial);
    this.blueLight = new THREE.Mesh(lightGeometry, blueMaterial);
    this.redLight.position.set(-width * 0.13, height * 1.07, 0);
    this.blueLight.position.set(width * 0.13, height * 1.07, 0);
    this.rig.chassisMesh.add(this.redLight, this.blueLight);
    this.extraMaterials.push(redMaterial, blueMaterial);
    this.extraGeometries.push(lightGeometry);

    // Dark police-style bands on both doors.
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.25,
      roughness: 0.55,
    });
    const stripeGeometry = new THREE.BoxGeometry(0.035, height * 0.15, width * 0.84);
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.position.set(side * width * 0.475, height * 0.42, 0);
      this.rig.chassisMesh.add(stripe);
    }
    this.extraMaterials.push(stripeMaterial);
    this.extraGeometries.push(stripeGeometry);

    scene.add(this.group);
  }

  public setActive(active: boolean, playerPosition: THREE.Vector3, heading: number) {
    this.active = active;
    this.group.visible = active;

    if (active) {
      this.placeBehindPlayer(playerPosition, heading, true);
    }
  }

  public update(delta: number, playerPosition: THREE.Vector3, heading: number) {
    if (!this.active) return;

    this.elapsed += delta;

    const desired = new THREE.Vector3(
      playerPosition.x - Math.sin(heading) * PolicePursuit.SAFE_DISTANCE,
      playerPosition.y,
      playerPosition.z - Math.cos(heading) * PolicePursuit.SAFE_DISTANCE
    );

    // Smoothly follow the player's path, but never enter the safe distance.
    this.group.position.lerp(desired, 1 - Math.exp(-2.2 * delta));
    const awayFromPlayer = this.group.position.clone().sub(playerPosition);
    if (awayFromPlayer.length() < PolicePursuit.SAFE_DISTANCE) {
      awayFromPlayer.normalize().multiplyScalar(PolicePursuit.SAFE_DISTANCE);
      this.group.position.x = playerPosition.x + awayFromPlayer.x;
      this.group.position.z = playerPosition.z + awayFromPlayer.z;
    }

    const toPlayer = playerPosition.clone().sub(this.group.position);
    const targetRotation = Math.atan2(toPlayer.x, toPlayer.z);
    this.group.rotation.y = THREE.MathUtils.dampAngle(
      this.group.rotation.y,
      targetRotation,
      5,
      delta
    );

    // Alternating red/blue roof lights.
    const redActive = Math.floor(this.elapsed * 6) % 2 === 0;
    (this.redLight.material as THREE.MeshStandardMaterial).emissiveIntensity = redActive ? 4.5 : 0.15;
    (this.blueLight.material as THREE.MeshStandardMaterial).emissiveIntensity = redActive ? 0.15 : 4.5;
  }

  private placeBehindPlayer(
    playerPosition: THREE.Vector3,
    heading: number,
    snap: boolean
  ) {
    const distance = PolicePursuit.SAFE_DISTANCE + 2;
    const target = new THREE.Vector3(
      playerPosition.x - Math.sin(heading) * distance,
      playerPosition.y,
      playerPosition.z - Math.cos(heading) * distance
    );
    if (snap) this.group.position.copy(target);
    else this.group.position.lerp(target, 0.5);
    this.group.rotation.y = heading;
  }

  public dispose() {
    this.active = false;
    this.scene.remove(this.group);
    this.rig.dispose();
    this.extraGeometries.forEach((geometry) => geometry.dispose());
    this.extraMaterials.forEach((material) => material.dispose());
  }
}
