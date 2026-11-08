/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CarConfig } from '../types/game';

export const CARS: CarConfig[] = [
  {
    id: 'apex_sprint',
    name: 'APEX SPRINT',
    category: 'STREET TUNER',
    description: 'Lightweight turbocharged street machine with nimble cornering and instant throttle response. The ideal starter car for urban racing.',
    price: 0,
    unlocked: true,
    baseStats: {
      topSpeed: 210, // km/h
      acceleration: 6.8, // 0-100 rating
      handling: 7.8,
      braking: 7.2,
      nitroCapacity: 3.5, // seconds
    },
    dimensions: {
      length: 4.2,
      width: 1.85,
      height: 1.25,
      wheelRadius: 0.35,
      wheelWidth: 0.26,
    },
    style: 'apex',
  },
  {
    id: 'veloce_gt',
    name: 'VELOCE GT',
    category: 'SPORTS GT',
    description: 'Mid-engine Italian-inspired thoroughbred with a screaming twin-turbo V8, aggressive aerodynamic side scoops, and track-tuned suspension.',
    price: 3000,
    unlocked: false,
    baseStats: {
      topSpeed: 275,
      acceleration: 8.5,
      handling: 8.6,
      braking: 8.4,
      nitroCapacity: 4.5,
    },
    dimensions: {
      length: 4.5,
      width: 1.95,
      height: 1.2,
      wheelRadius: 0.36,
      wheelWidth: 0.28,
    },
    style: 'veloce',
  },
  {
    id: 'hyperion_r',
    name: 'HYPERION R',
    category: 'HYPERCAR',
    description: 'Ultra-advanced carbon fiber prototype hypercar with active aerodynamics, hybrid quad-motor drive, and blistering Le Mans straight-line speed.',
    price: 7500,
    unlocked: false,
    baseStats: {
      topSpeed: 350,
      acceleration: 9.8,
      handling: 9.4,
      braking: 9.6,
      nitroCapacity: 5.5,
    },
    dimensions: {
      length: 4.8,
      width: 2.05,
      height: 1.15,
      wheelRadius: 0.38,
      wheelWidth: 0.32,
    },
    style: 'hyperion',
  },
  {
    id: 'bmw_m4',
    name: 'BMW M4 COMPETITION',
    category: 'SPORTS GT',
    description: 'A rear-drive performance coupe with a wide stance, twin-kidney front grille and sharp LED lighting.',
    price: 2800,
    unlocked: false,
    baseStats: {
      topSpeed: 290,
      acceleration: 8.4,
      handling: 8.8,
      braking: 8.5,
      nitroCapacity: 4.3,
    },
    dimensions: {
      length: 4.8,
      width: 1.92,
      height: 1.38,
      wheelRadius: 0.36,
      wheelWidth: 0.28,
    },
    style: 'bmw_m4',
  },
  {
    id: 'mercedes_amg',
    name: 'MERCEDES-AMG GT',
    category: 'SPORTS GT',
    description: 'A long-hood grand tourer with a low cockpit, broad grille and premium performance styling.',
    price: 4200,
    unlocked: false,
    baseStats: {
      topSpeed: 315,
      acceleration: 9.0,
      handling: 8.9,
      braking: 9.1,
      nitroCapacity: 4.5,
    },
    dimensions: {
      length: 4.72,
      width: 1.95,
      height: 1.32,
      wheelRadius: 0.37,
      wheelWidth: 0.29,
    },
    style: 'mercedes_amg',
  },
  {
    id: 'bugatti_chiron',
    name: 'BUGATTI CHIRON',
    category: 'HYPERCAR',
    description: 'A wide, low hypercar with a signature horseshoe grille, central body line and extreme top speed.',
    price: 12000,
    unlocked: false,
    baseStats: {
      topSpeed: 380,
      acceleration: 9.8,
      handling: 9.2,
      braking: 9.7,
      nitroCapacity: 5.5,
    },
    dimensions: {
      length: 4.9,
      width: 2.0,
      height: 1.22,
      wheelRadius: 0.39,
      wheelWidth: 0.32,
    },
    style: 'bugatti_chiron',
  },
  {
    id: 'ferrari_488',
    name: 'FERRARI 488 GTB',
    category: 'HYPERCAR',
    description: 'A mid-engine Italian supercar with a low nose, sculpted side intakes and race-inspired aero.',
    price: 7500,
    unlocked: false,
    baseStats: {
      topSpeed: 330,
      acceleration: 9.4,
      handling: 9.3,
      braking: 9.2,
      nitroCapacity: 5.0,
    },
    dimensions: {
      length: 4.6,
      width: 1.95,
      height: 1.2,
      wheelRadius: 0.37,
      wheelWidth: 0.3,
    },
    style: 'ferrari_488',
  },
];

export const UPGRADE_PRICES = {
  engine: [400, 900, 1600, 2500],
  transmission: [350, 800, 1400, 2200],
  suspension: [300, 700, 1300, 2000],
  brakes: [250, 600, 1100, 1800],
  nitro: [350, 850, 1500, 2400],
};

export const COLOR_PALETTES = [
  { name: 'Solar Crimson', hex: '#e11d48' },
  { name: 'Velocity Cyan', hex: '#06b6d4' },
  { name: 'Cyber Amber', hex: '#f59e0b' },
  { name: 'Stealth Onyx', hex: '#18181b' },
  { name: 'Alpine Frost', hex: '#f8fafc' },
  { name: 'Neon Emerald', hex: '#10b981' },
  { name: 'Ultraviolet', hex: '#8b5cf6' },
  { name: 'Titanium Grey', hex: '#64748b' },
];

export const NEON_COLORS = [
  { name: 'None', hex: 'none' },
  { name: 'Cyan Glow', hex: '#00f0ff' },
  { name: 'Acid Green', hex: '#39ff14' },
  { name: 'Magenta Pulse', hex: '#ff007f' },
  { name: 'Blazing Gold', hex: '#ffb700' },
  { name: 'Ice Blue', hex: '#80dfff' },
];

export const RIM_COLORS = [
  { name: 'Brushed Chrome', hex: '#d4d4d8' },
  { name: 'Matte Charcoal', hex: '#27272a' },
  { name: 'Race Gold', hex: '#eab308' },
  { name: 'Gloss Black', hex: '#09090b' },
  { name: 'Bronze Alloy', hex: '#b45309' },
];
