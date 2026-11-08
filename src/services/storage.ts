/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerProfile, GameSettings } from '../types/game';
import { CARS } from '../data/cars';

const PROFILE_KEY = 'bekiuz_drive_profile_v1';
const SETTINGS_KEY = 'bekiuz_drive_settings_v1';

export const DEFAULT_PROFILE: PlayerProfile = {
  currency: 1200,
  selectedCarId: 'apex_sprint',
  unlockedCarIds: ['apex_sprint'],
  carUpgrades: {
    apex_sprint: { engine: 1, transmission: 1, suspension: 1, brakes: 1, nitro: 1 },
    veloce_gt: { engine: 1, transmission: 1, suspension: 1, brakes: 1, nitro: 1 },
    hyperion_r: { engine: 1, transmission: 1, suspension: 1, brakes: 1, nitro: 1 },
  },
  carCustomizations: {
    apex_sprint: {
      bodyColor: '#e11d48',
      secondaryColor: '#18181b',
      rimColor: '#d4d4d8',
      neonColor: '#00f0ff',
      finish: 'gloss',
    },
    veloce_gt: {
      bodyColor: '#f59e0b',
      secondaryColor: '#09090b',
      rimColor: '#eab308',
      neonColor: '#ffb700',
      finish: 'metallic',
    },
    hyperion_r: {
      bodyColor: '#06b6d4',
      secondaryColor: '#18181b',
      rimColor: '#27272a',
      neonColor: '#39ff14',
      finish: 'matte',
    },
  },
  bestTrackTimes: {},
  totalRacesFinished: 0,
  totalDriftScore: 0,
};

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  engineVolume: 0.7,
  sfxVolume: 0.85,
  musicEnabled: true,
  graphicsQuality: 'high',
  steeringSensitivity: 1.0,
  cameraDistance: 'normal',
  touchControls: 'buttons',
};

export function loadPlayerProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      carUpgrades: { ...DEFAULT_PROFILE.carUpgrades, ...(parsed.carUpgrades || {}) },
      carCustomizations: { ...DEFAULT_PROFILE.carCustomizations, ...(parsed.carCustomizations || {}) },
      bestTrackTimes: { ...(parsed.bestTrackTimes || {}) },
    };
  } catch (e) {
    console.warn('[Storage] Error reading profile, using default:', e);
    return { ...DEFAULT_PROFILE };
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('[Storage] Error saving profile:', e);
  }
}

export function loadGameSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveGameSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[Storage] Error saving settings:', e);
  }
}
