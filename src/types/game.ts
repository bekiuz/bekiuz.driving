/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameScreen = 'menu' | 'garage' | 'track_select' | 'racing' | 'free_drive' | 'settings';

export type RaceStatus = 'idle' | 'countdown' | 'active' | 'finished' | 'paused';

export interface CarUpgrades {
  engine: number; // 1 to 5
  transmission: number; // 1 to 5
  suspension: number; // 1 to 5
  brakes: number; // 1 to 5
  nitro: number; // 1 to 5
}

export interface CarCustomization {
  bodyColor: string;
  secondaryColor: string;
  rimColor: string;
  neonColor: string; // underglow
  finish: 'gloss' | 'matte' | 'metallic';
}

export interface CarConfig {
  id: string;
  name: string;
  category: 'STREET TUNER' | 'SPORTS GT' | 'HYPERCAR';
  description: string;
  price: number;
  unlocked: boolean;
  baseStats: {
    topSpeed: number; // km/h (e.g., 200, 260, 340)
    acceleration: number; // 0-100 score 1-10
    handling: number; // 1-10
    braking: number; // 1-10
    nitroCapacity: number; // seconds
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    wheelRadius: number;
    wheelWidth: number;
  };
  style: 'apex' | 'veloce' | 'hyperion';
}

export interface TrackCheckpoint {
  position: [number, number, number];
  rotationY: number;
  radius: number;
  isFinish?: boolean;
}

export interface RaceTrack {
  id: string;
  name: string;
  subtitle: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  laps: number;
  lengthKm: number;
  rewardCoins: number;
  parTimeMs: number;
  startPosition: [number, number, number];
  startRotationY: number;
  checkpoints: TrackCheckpoint[];
  description: string;
}

export interface PlayerProfile {
  currency: number;
  selectedCarId: string;
  unlockedCarIds: string[];
  carUpgrades: Record<string, CarUpgrades>;
  carCustomizations: Record<string, CarCustomization>;
  bestTrackTimes: Record<string, number>; // trackId -> time in ms
  totalRacesFinished: number;
  totalDriftScore: number;
}

export interface GameSettings {
  masterVolume: number;
  engineVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  graphicsQuality: 'low' | 'medium' | 'high';
  steeringSensitivity: number;
  cameraDistance: 'close' | 'normal' | 'far' | 'hood';
  touchControls: 'buttons' | 'slider';
}

export interface VehicleTelemetry {
  speedKmh: number;
  rpm: number;
  gear: number; // -1 = R, 0 = N, 1..6 = D
  driftScore: number;
  driftMultiplier: number;
  isDrifting: boolean;
  nitroRemaining: number; // 0 to 1
  isNitroActive: boolean;
  position: [number, number, number];
  rotationY: number;
  isOffroad: boolean;
}

export interface InputControls {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  handbrake: boolean;
  nitro: boolean;
  reset: boolean;
  lookBack: boolean;
}
