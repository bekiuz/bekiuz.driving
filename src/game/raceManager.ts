/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RaceTrack, TrackCheckpoint, RaceStatus } from '../types/game';
import { soundManager } from '../services/audio';

export interface RaceManagerState {
  status: RaceStatus;
  currentLap: number;
  totalLaps: number;
  currentCheckpointIndex: number;
  totalCheckpoints: number;
  elapsedTimeMs: number;
  countdownValue: number; // 3, 2, 1, 0 (GO)
  isNewRecord: boolean;
  earnedCoins: number;
}

export class RaceManager {
  public track: RaceTrack;
  public status: RaceStatus = 'idle';
  public currentLap = 1;
  public currentCheckpointIndex = 0;
  public elapsedTimeMs = 0;
  public countdownTimer = 3.9; // 3..2..1..GO!
  public countdownDisplay = 3;
  public earnedCoins = 0;
  public isNewRecord = false;

  public gatesGroup = new THREE.Group();
  private gateMeshes: Array<{
    group: THREE.Group;
    archMat: THREE.MeshBasicMaterial;
    arrowMesh: THREE.Mesh;
    beaconMesh: THREE.Mesh;
    checkpoint: TrackCheckpoint;
    index: number;
  }> = [];

  private lastBeepPlayed = 4;

  constructor(track: RaceTrack) {
    this.track = track;
    this.buildGates();
  }

  private buildGates() {
    this.track.checkpoints.forEach((cp, idx) => {
      const gateGroup = new THREE.Group();
      gateGroup.position.set(cp.position[0], cp.position[1], cp.position[2]);
      gateGroup.rotation.y = cp.rotationY;

      const isFinish = cp.isFinish ?? false;
      const gateWidth = cp.radius * 1.8;
      const gateHeight = 9.0;

      // Gate Arch Material
      const archMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0xf59e0b : 0x06b6d4,
        wireframe: false,
        transparent: true,
        opacity: idx === 0 ? 0.95 : 0.35,
      });

      // Left Post
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, gateHeight, 8), archMat);
      postL.position.set(-gateWidth / 2, gateHeight / 2, 0);

      // Right Post
      const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, gateHeight, 8), archMat);
      postR.position.set(gateWidth / 2, gateHeight / 2, 0);

      // Top Crossbar
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(gateWidth + 1, 0.8, 0.8), archMat);
      crossbar.position.set(0, gateHeight, 0);

      // Floating Directional Chevron Arrow
      const arrowGeo = new THREE.ConeGeometry(1.6, 2.8, 4);
      arrowGeo.rotateX(-Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0xffffff : 0x00f0ff,
        transparent: true,
        opacity: 0.9,
      });
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      arrowMesh.position.set(0, gateHeight * 0.55, 0);

      // Vertical Sky Beacon Beam for the active checkpoint
      const beaconGeo = new THREE.CylinderGeometry(0.3, 1.2, 80, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0xf59e0b : 0x00f0ff,
        transparent: true,
        opacity: idx === 0 ? 0.4 : 0.05,
        depthWrite: false,
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.set(0, 40, 0);

      gateGroup.add(postL, postR, crossbar, arrowMesh, beaconMesh);
      this.gatesGroup.add(gateGroup);

      this.gateMeshes.push({
        group: gateGroup,
        archMat,
        arrowMesh,
        beaconMesh,
        checkpoint: cp,
        index: idx,
      });
    });

    this.updateGateHighlights();
  }

  public startCountdown() {
    this.status = 'countdown';
    this.countdownTimer = 3.9;
    this.lastBeepPlayed = 4;
    this.elapsedTimeMs = 0;
    this.currentLap = 1;
    this.currentCheckpointIndex = 0;
    this.isNewRecord = false;
    this.earnedCoins = 0;
    this.updateGateHighlights();
  }

  public update(delta: number, carPosition: THREE.Vector3, previousBestTime?: number): RaceManagerState {
    // 1. Countdown update
    if (this.status === 'countdown') {
      this.countdownTimer -= delta;
      const currentBeepInt = Math.ceil(this.countdownTimer);

      if (currentBeepInt < this.lastBeepPlayed && currentBeepInt >= 1) {
        soundManager.playCountdownBeep(false);
        this.lastBeepPlayed = currentBeepInt;
      }

      if (this.countdownTimer <= 0) {
        this.status = 'active';
        this.countdownTimer = 0;
        soundManager.playCountdownBeep(true); // "GO!"
      }
    }

    // 2. Active Racing update
    if (this.status === 'active') {
      this.elapsedTimeMs += delta * 1000;

      // Check distance to active checkpoint
      const activeGate = this.gateMeshes[this.currentCheckpointIndex];
      if (activeGate) {
        const cp = activeGate.checkpoint;
        const dx = carPosition.x - cp.position[0];
        const dz = carPosition.z - cp.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Within checkpoint trigger radius
        if (dist <= cp.radius * 1.3) {
          soundManager.playCheckpointSound();

          // Advance to next checkpoint
          this.currentCheckpointIndex++;

          // Check if lap or race complete
          if (this.currentCheckpointIndex >= this.track.checkpoints.length) {
            if (this.currentLap < this.track.laps) {
              // Next Lap
              this.currentLap++;
              this.currentCheckpointIndex = 0;
            } else {
              // Race Finished!
              this.status = 'finished';
              this.earnedCoins = this.track.rewardCoins;
              if (!previousBestTime || this.elapsedTimeMs < previousBestTime) {
                this.isNewRecord = true;
                this.earnedCoins += Math.round(this.track.rewardCoins * 0.5); // 50% record bonus
              }
              soundManager.playVictoryFanfare();
            }
          }
          this.updateGateHighlights();
        }
      }

      // Animate Chevron Arrows & Beacons
      const timeSec = this.elapsedTimeMs / 1000;
      this.gateMeshes.forEach((g) => {
        g.arrowMesh.rotation.y = timeSec * 2.5;
        g.arrowMesh.position.y = 4.5 + Math.sin(timeSec * 4 + g.index) * 0.4;
      });
    }

    const dispCountdown = Math.max(0, Math.ceil(this.countdownTimer));

    return {
      status: this.status,
      currentLap: this.currentLap,
      totalLaps: this.track.laps,
      currentCheckpointIndex: this.currentCheckpointIndex,
      totalCheckpoints: this.track.checkpoints.length,
      elapsedTimeMs: Math.round(this.elapsedTimeMs),
      countdownValue: dispCountdown,
      isNewRecord: this.isNewRecord,
      earnedCoins: this.earnedCoins,
    };
  }

  private updateGateHighlights() {
    this.gateMeshes.forEach((g) => {
      const isActive = g.index === this.currentCheckpointIndex;
      const isNext = g.index === (this.currentCheckpointIndex + 1) % this.track.checkpoints.length;

      if (isActive) {
        g.archMat.opacity = 0.95;
        g.beaconMesh.visible = true;
        (g.beaconMesh.material as THREE.MeshBasicMaterial).opacity = 0.45;
      } else if (isNext) {
        g.archMat.opacity = 0.6;
        g.beaconMesh.visible = true;
        (g.beaconMesh.material as THREE.MeshBasicMaterial).opacity = 0.15;
      } else {
        g.archMat.opacity = 0.2;
        g.beaconMesh.visible = false;
      }
    });
  }

  public dispose() {
    this.gateMeshes.forEach((g) => {
      g.archMat.dispose();
      (g.arrowMesh.material as THREE.Material).dispose();
      (g.beaconMesh.material as THREE.Material).dispose();
    });
    this.gatesGroup.clear();
  }
}
