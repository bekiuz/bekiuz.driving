/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CarConfig, CarUpgrades, InputControls, VehicleTelemetry } from '../types/game';
import { CityEnvironment } from './proceduralCity';
import { soundManager } from '../services/audio';

export class VehiclePhysics {
  public position = new THREE.Vector3(0, 0.4, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  public rotationY = 0; // Heading in radians
  public pitch = 0;
  public roll = 0;
  public forwardSpeed = 0; // m/s
  public steerAngle = 0;
  public isGrounded = true;

  // Upgraded stats
  public maxSpeedMs = 60; // m/s
  public maxReverseMs = 15;
  public accelerationForce = 18;
  public brakeForce = 32;
  public gripFactor = 0.92;
  public driftSlip = 0;

  // Drift & Stunt scoring
  public isDrifting = false;
  public currentDriftScore = 0;
  public driftMultiplier = 1;
  public airtimeSeconds = 0;

  // Nitro System
  public nitroRemaining = 1.0; // 0 to 1
  public isNitroActive = false;

  // Transmission & Engine
  public rpm = 800; // 800 idle, 7500 redline
  public gear = 1; // -1 = R, 0 = N, 1..6

  private config: CarConfig;
  private upgrades: CarUpgrades;
  private city: CityEnvironment;

  // Scratch vectors for zero GC
  private _forward = new THREE.Vector3();
  private _right = new THREE.Vector3();
  private _up = new THREE.Vector3(0, 1, 0);

  constructor(config: CarConfig, upgrades: CarUpgrades, city: CityEnvironment, initialPos?: [number, number, number], initialRotY = 0) {
    this.config = config;
    this.upgrades = upgrades;
    this.city = city;

    if (initialPos) {
      this.position.set(initialPos[0], initialPos[1], initialPos[2]);
    }
    this.rotationY = initialRotY;

    this.recalculateStats();
  }

  public recalculateStats() {
    const { baseStats } = this.config;
    // Upgrades scale 1..5 (+5% to +25% per level)
    const engineMult = 1 + (this.upgrades.engine - 1) * 0.08;
    const transMult = 1 + (this.upgrades.transmission - 1) * 0.07;
    const suspMult = 1 + (this.upgrades.suspension - 1) * 0.06;
    const brakeMult = 1 + (this.upgrades.brakes - 1) * 0.08;

    const topSpeedKmh = baseStats.topSpeed * engineMult;
    this.maxSpeedMs = (topSpeedKmh * 1000) / 3600;
    this.accelerationForce = (baseStats.acceleration * 2.8) * transMult * engineMult;
    this.brakeForce = (baseStats.braking * 3.5) * brakeMult;
    this.gripFactor = 0.91 + (baseStats.handling / 10) * 0.05 * suspMult;
  }

  public update(delta: number, input: InputControls): VehicleTelemetry {
    // Clamp delta to prevent tunneling on frame hitch
    const dt = Math.min(delta, 0.06);

    // Compute vehicle coordinate directions
    this._forward.set(0, 0, 1).applyAxisAngle(this._up, this.rotationY);
    this._right.set(1, 0, 0).applyAxisAngle(this._up, this.rotationY);

    // 1. Steering Dynamics (tapered at high speed for stability)
    const speedRatio = Math.abs(this.forwardSpeed) / this.maxSpeedMs;
    const maxSteer = 0.55 - speedRatio * 0.28; // 31 deg at low speed, 15 deg at top speed
    const steerTarget = -input.steer * maxSteer;
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, steerTarget, 12, dt);

    // 2. Nitro Handling
    const nitroUpMult = 1 + (this.upgrades.nitro - 1) * 0.15;
    if (input.nitro && this.nitroRemaining > 0.05 && this.forwardSpeed > 5) {
      this.isNitroActive = true;
      this.nitroRemaining = Math.max(0, this.nitroRemaining - (dt / (this.config.baseStats.nitroCapacity * nitroUpMult)));
    } else {
      this.isNitroActive = false;
      // Passive recharge + drift recharge
      const rechargeRate = this.isDrifting ? 0.25 : 0.05;
      this.nitroRemaining = Math.min(1.0, this.nitroRemaining + dt * rechargeRate);
    }
    soundManager.updateNitro(this.isNitroActive);

    // 3. Acceleration & Braking Dynamics
    let engineAccel = 0;
    const isReverseIntent = input.brake > 0.1 && this.forwardSpeed <= 0.5;

    if (isReverseIntent) {
      // Reverse driving
      this.gear = -1;
      engineAccel = -this.accelerationForce * 0.5 * input.brake;
    } else if (input.throttle > 0.05) {
      // Forward driving
      const nitroBoost = this.isNitroActive ? 1.65 : 1.0;
      // Torque curve: highest in low gears, tapering near top speed
      const effectiveMaxSpeed = this.isNitroActive ? this.maxSpeedMs * 1.25 : this.maxSpeedMs;
      const speedHeadroom = Math.max(0, (effectiveMaxSpeed - this.forwardSpeed) / effectiveMaxSpeed);
      engineAccel = this.accelerationForce * input.throttle * nitroBoost * (0.4 + speedHeadroom * 0.6);
    }

    // Braking force
    let braking = 0;
    if (!isReverseIntent && input.brake > 0.05 && this.forwardSpeed > 0) {
      braking = this.brakeForce * input.brake;
    }

    // Handbrake / Drift engagement
    const isHandbraking = input.handbrake;
    if (isHandbraking) {
      braking += this.brakeForce * 1.4;
    }

    // Aerodynamic Drag & Rolling Resistance
    const airDrag = 0.0035 * this.forwardSpeed * Math.abs(this.forwardSpeed);
    const rollingResistance = 0.8 * Math.sign(this.forwardSpeed);

    // Update forward speed
    if (this.isGrounded) {
      const netForce = engineAccel - (braking * Math.sign(this.forwardSpeed)) - airDrag - rollingResistance;
      this.forwardSpeed += netForce * dt;

      // Stop jitter when nearly stationary
      if (Math.abs(this.forwardSpeed) < 0.2 && input.throttle < 0.05 && input.brake < 0.05) {
        this.forwardSpeed = 0;
      }
    } else {
      // In air: slight air drag
      this.forwardSpeed -= airDrag * dt;
    }

    // Clamp speed limits
    const maxForward = this.isNitroActive ? this.maxSpeedMs * 1.25 : this.maxSpeedMs;
    this.forwardSpeed = Math.max(-this.maxReverseMs, Math.min(maxForward, this.forwardSpeed));

    // 4. Turning & Yaw Rotation
    if (Math.abs(this.forwardSpeed) > 0.2 && this.isGrounded) {
      const turnDirection = Math.sign(this.forwardSpeed);
      const driftYawMultiplier = this.isDrifting ? 1.45 : 1.0;
      const yawRate = (this.forwardSpeed / 3.0) * Math.tan(this.steerAngle) * driftYawMultiplier;
      this.rotationY += yawRate * dt * turnDirection;
    }

    // 5. Drift Dynamics & Slip Angle
    const speedKmh = Math.abs(this.forwardSpeed) * 3.6;
    const steerIntensity = Math.abs(input.steer);
    const slipTrigger = (isHandbraking && speedKmh > 20) || (steerIntensity > 0.7 && speedKmh > 65);

    if (slipTrigger && this.isGrounded) {
      this.isDrifting = true;
      this.driftSlip = THREE.MathUtils.damp(this.driftSlip, 0.75, 5, dt);
      // Accumulate drift score
      const driftDelta = speedKmh * steerIntensity * dt * 8;
      this.currentDriftScore += Math.round(driftDelta);
      this.driftMultiplier = Math.min(4.0, this.driftMultiplier + dt * 0.3);
      soundManager.updateDrift(this.driftSlip * (speedKmh / 100));
    } else {
      if (this.isDrifting) {
        // Just exited drift
        soundManager.updateDrift(0);
      }
      this.isDrifting = false;
      this.driftSlip = THREE.MathUtils.damp(this.driftSlip, 0, 8, dt);
    }

    // 6. Velocity vector computation
    const driftAngleOffset = this.isDrifting ? -Math.sign(this.steerAngle) * this.driftSlip * 0.45 : 0;
    const moveHeading = this.rotationY + driftAngleOffset;
    const moveDir = new THREE.Vector3(Math.sin(moveHeading), 0, Math.cos(moveHeading));

    this.velocity.x = moveDir.x * this.forwardSpeed;
    this.velocity.z = moveDir.z * this.forwardSpeed;

    // 7. Height / Ground / Ramps & Bridge Elevation
    this.handleGroundAndCollisions(dt);

    // Apply movement
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // 8. Suspension Pitch & Roll Tilting
    const accelPitch = -(engineAccel - braking) * 0.006;
    this.pitch = THREE.MathUtils.damp(this.pitch, accelPitch, 10, dt);

    const corneringRoll = this.steerAngle * (speedKmh / 120) * 0.12;
    this.roll = THREE.MathUtils.damp(this.roll, corneringRoll, 10, dt);

    // 9. Gear and RPM calculation
    this.updateGearsAndRpm(input.throttle);

    // 10. Update Engine Audio
    const rpmNorm = (this.rpm - 800) / (7500 - 800);
    soundManager.updateEngine(rpmNorm, input.throttle, speedRatio);

    // Reset vehicle (R key)
    if (input.reset) {
      this.resetVehicle();
    }

    return {
      speedKmh: Math.round(speedKmh),
      rpm: Math.round(this.rpm),
      gear: this.gear,
      driftScore: this.currentDriftScore,
      driftMultiplier: Math.round(this.driftMultiplier * 10) / 10,
      isDrifting: this.isDrifting,
      nitroRemaining: this.nitroRemaining,
      isNitroActive: this.isNitroActive,
      position: [this.position.x, this.position.y, this.position.z],
      rotationY: this.rotationY,
      isOffroad: false,
    };
  }

  private handleGroundAndCollisions(dt: number) {
    const carX = this.position.x;
    const carZ = this.position.z;

    // Determine target ground level
    let targetGroundY = 0.4; // Default asphalt level

    // Check Bridge elevation (East highway between X: 180 and 210, Z: -155 to 160)
    if (Math.abs(carX - 195) < 14 && carZ >= -155 && carZ <= 160) {
      // Approach ramps at ends
      if (carZ > 125) {
        // South ramp
        const rampFrac = (160 - carZ) / 35;
        targetGroundY = 0.4 + rampFrac * 5.2;
      } else if (carZ < -120) {
        // North ramp
        const rampFrac = (carZ - (-155)) / 35;
        targetGroundY = 0.4 + rampFrac * 5.2;
      } else {
        // Center flat bridge deck
        targetGroundY = 5.62;
      }
    }

    // Check Stunt Ramps
    for (const ramp of this.city.ramps) {
      if (ramp.box.containsPoint(this.position)) {
        // If driving up ramp in ramp direction
        const dot = this._forward.dot(ramp.direction);
        if (dot > 0.2 && this.forwardSpeed > 10) {
          // Launch upwards into air
          this.velocity.y = Math.min(18, 5 + (this.forwardSpeed * 0.35));
          this.isGrounded = false;
        }
      }
    }

    // Gravity and Vertical Dynamics
    const gravity = 22; // m/s^2
    if (!this.isGrounded || this.position.y > targetGroundY + 0.1) {
      this.velocity.y -= gravity * dt;
      this.airtimeSeconds += dt;

      if (this.position.y <= targetGroundY) {
        // Landed!
        this.position.y = targetGroundY;
        this.velocity.y = 0;
        this.isGrounded = true;

        if (this.airtimeSeconds > 0.6) {
          // Rewarded airtime stunt score
          const stuntBonus = Math.round(this.airtimeSeconds * 300);
          this.currentDriftScore += stuntBonus;
          soundManager.playCrashSound(0.3);
        }
        this.airtimeSeconds = 0;
      }
    } else {
      this.position.y = THREE.MathUtils.damp(this.position.y, targetGroundY, 15, dt);
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Static world collisions (buildings, tunnel walls, bridge rails, poles and tree trunks).
    // Use a yaw-aware vehicle AABB and a swept box so thin posts are not skipped at speed.
    const halfWidth = this.config.dimensions.width * 0.5 + 0.08;
    const halfLength = this.config.dimensions.length * 0.5 + 0.08;
    const sinYaw = Math.abs(Math.sin(this.rotationY));
    const cosYaw = Math.abs(Math.cos(this.rotationY));
    const halfX = cosYaw * halfWidth + sinYaw * halfLength;
    const halfZ = sinYaw * halfWidth + cosYaw * halfLength;
    const createCarBox = (position: THREE.Vector3) =>
      new THREE.Box3(
        new THREE.Vector3(position.x - halfX, position.y - 0.25, position.z - halfZ),
        new THREE.Vector3(position.x + halfX, position.y + this.config.dimensions.height + 0.35, position.z + halfZ)
      );

    const currentBox = createCarBox(this.position);
    const predictedPosition = this.position.clone().addScaledVector(this.velocity, dt);
    const predictedBox = createCarBox(predictedPosition);

    // World perimeter: stop the car before its body passes through the invisible city boundary.
    const { roadBounds } = this.city;
    const safeMinX = roadBounds.minX + halfX;
    const safeMaxX = roadBounds.maxX - halfX;
    const safeMinZ = roadBounds.minZ + halfZ;
    const safeMaxZ = roadBounds.maxZ - halfZ;
    const boundaryHit =
      predictedPosition.x < safeMinX ||
      predictedPosition.x > safeMaxX ||
      predictedPosition.z < safeMinZ ||
      predictedPosition.z > safeMaxZ ||
      currentBox.min.x < roadBounds.minX ||
      currentBox.max.x > roadBounds.maxX ||
      currentBox.min.z < roadBounds.minZ ||
      currentBox.max.z > roadBounds.maxZ;

    if (boundaryHit) {
      this.position.x = THREE.MathUtils.clamp(this.position.x, safeMinX, safeMaxX);
      this.position.z = THREE.MathUtils.clamp(this.position.z, safeMinZ, safeMaxZ);
      const impactSpeed = Math.abs(this.forwardSpeed);
      this.forwardSpeed *= -0.12;
      this.velocity.x = this._forward.x * this.forwardSpeed;
      this.velocity.z = this._forward.z * this.forwardSpeed;
      if (impactSpeed > 1.5) {
        soundManager.playCrashSound(Math.min(1.0, impactSpeed / 30));
      }
    } else {
      // Swept collision catches narrow obstacles even when the car moves several metres in one frame.
      const sweptBox = currentBox.clone().union(predictedBox);

      for (const obstacleBox of this.city.collisionBoxes) {
        if (!sweptBox.intersectsBox(obstacleBox)) continue;

        // If already overlapping, move the car out along the shallowest horizontal penetration.
        if (currentBox.intersectsBox(obstacleBox)) {
          const overlapX =
            Math.min(currentBox.max.x, obstacleBox.max.x) -
            Math.max(currentBox.min.x, obstacleBox.min.x);
          const overlapZ =
            Math.min(currentBox.max.z, obstacleBox.max.z) -
            Math.max(currentBox.min.z, obstacleBox.min.z);
          const obstacleCenter = obstacleBox.getCenter(new THREE.Vector3());

          if (overlapX <= overlapZ) {
            const direction = this.position.x < obstacleCenter.x ? -1 : 1;
            this.position.x += direction * (overlapX + 0.08);
          } else {
            const direction = this.position.z < obstacleCenter.z ? -1 : 1;
            this.position.z += direction * (overlapZ + 0.08);
          }
        }

        // Strongly slow and rebound away from the obstacle; do not push the car deeper into it.
        const impactSpeed = Math.abs(this.forwardSpeed);
        this.forwardSpeed *= -0.12;
        this.velocity.x = this._forward.x * this.forwardSpeed;
        this.velocity.z = this._forward.z * this.forwardSpeed;
        if (impactSpeed > 1.5) {
          soundManager.playCrashSound(Math.min(1.0, impactSpeed / 30));
        }
        break;
      }
    }
  }

  private updateGearsAndRpm(throttle: number) {
    if (this.gear === -1) {
      // Reverse
      this.rpm = 900 + (Math.abs(this.forwardSpeed) / this.maxReverseMs) * 4500;
      return;
    }

    const speed = Math.max(0, this.forwardSpeed);
    const gearRatios = [0, 12, 24, 38, 52, 68, 90]; // Max m/s per gear

    // Auto-shift calculation
    if (speed < gearRatios[1]) {
      this.gear = 1;
    } else if (speed < gearRatios[2]) {
      this.gear = 2;
    } else if (speed < gearRatios[3]) {
      this.gear = 3;
    } else if (speed < gearRatios[4]) {
      this.gear = 4;
    } else if (speed < gearRatios[5]) {
      this.gear = 5;
    } else {
      this.gear = 6;
    }

    const prevGearSpeed = this.gear === 1 ? 0 : gearRatios[this.gear - 1];
    const nextGearSpeed = gearRatios[this.gear];
    const gearProgress = Math.max(0, Math.min(1, (speed - prevGearSpeed) / (nextGearSpeed - prevGearSpeed)));

    // RPM curve
    this.rpm = 1200 + gearProgress * 5800 + throttle * 500;
  }

  public resetVehicle(pos?: [number, number, number], rotY = 0) {
    if (pos) {
      this.position.set(pos[0], pos[1], pos[2]);
      this.rotationY = rotY;
    } else {
      // Flip upright on nearest street level
      this.position.y = 0.4;
      this.pitch = 0;
      this.roll = 0;
    }
    this.velocity.set(0, 0, 0);
    this.forwardSpeed = 0;
    this.steerAngle = 0;
    this.isDrifting = false;
    this.currentDriftScore = 0;
  }
}
