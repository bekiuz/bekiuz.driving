/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RaceTrack } from '../types/game';

export const TRACKS: RaceTrack[] = [
  {
    id: 'downtown_circuit',
    name: 'DOWNTOWN CRUSH',
    subtitle: 'High-speed urban sprint through skyscraper canyons',
    difficulty: 'EASY',
    laps: 2,
    lengthKm: 2.2,
    rewardCoins: 500,
    parTimeMs: 65000,
    startPosition: [0, 0.4, 30],
    startRotationY: 0, // Heading along Central Ave
    description: 'A flowing 2-lap circuit through the city center with sweeping intersections and wide braking zones.',
    checkpoints: [
      { position: [0, 0.4, 90], rotationY: 0, radius: 12 },
      { position: [0, 0.4, 150], rotationY: 0, radius: 12 },
      { position: [50, 0.4, 160], rotationY: Math.PI / 2, radius: 14 },
      { position: [140, 0.4, 160], rotationY: Math.PI / 2, radius: 14 },
      { position: [195, 0.4, 110], rotationY: Math.PI, radius: 14 },
      { position: [195, 0.4, 0], rotationY: Math.PI, radius: 14 },
      { position: [195, 0.4, -90], rotationY: Math.PI, radius: 14 },
      { position: [130, 0.4, -155], rotationY: -Math.PI / 2, radius: 14 },
      { position: [30, 0.4, -155], rotationY: -Math.PI / 2, radius: 14 },
      { position: [0, 0.4, -90], rotationY: 0, radius: 14 },
      { position: [0, 0.4, 0], rotationY: 0, radius: 14, isFinish: true },
    ],
  },
  {
    id: 'bridge_velocity',
    name: 'SKYLINE SUSPENSION',
    subtitle: 'Full-throttle blast across the bay suspension bridge',
    difficulty: 'MEDIUM',
    laps: 1,
    lengthKm: 3.4,
    rewardCoins: 850,
    parTimeMs: 80000,
    startPosition: [-180, 0.4, 0],
    startRotationY: Math.PI / 2, // Facing East towards the bridge
    description: 'Long high-speed straightaways and high-G sweeping curves leading onto the elevated suspension bridge.',
    checkpoints: [
      { position: [-90, 0.4, 0], rotationY: Math.PI / 2, radius: 14 },
      { position: [0, 0.4, 0], rotationY: Math.PI / 2, radius: 14 },
      { position: [90, 0.4, 0], rotationY: Math.PI / 2, radius: 14 },
      { position: [180, 2.0, 20], rotationY: Math.PI / 4, radius: 14 },
      { position: [195, 5.0, 80], rotationY: 0, radius: 14 },
      { position: [195, 5.0, 140], rotationY: 0, radius: 14 },
      { position: [160, 2.0, 160], rotationY: -Math.PI / 2, radius: 14 },
      { position: [80, 0.4, 160], rotationY: -Math.PI / 2, radius: 14 },
      { position: [-60, 0.4, 160], rotationY: -Math.PI / 2, radius: 14 },
      { position: [-195, 0.4, 100], rotationY: Math.PI, radius: 14 },
      { position: [-195, 0.4, 0], rotationY: Math.PI, radius: 14, isFinish: true },
    ],
  },
  {
    id: 'tunnel_metropolis',
    name: 'SUBTERRANEAN GP',
    subtitle: 'Technical grand tour through the neon tunnel & waterfront',
    difficulty: 'HARD',
    laps: 2,
    lengthKm: 4.2,
    rewardCoins: 1400,
    parTimeMs: 110000,
    startPosition: [0, 0.4, -40],
    startRotationY: Math.PI, // Facing South towards tunnel
    description: 'Demanding circuit featuring tight 90-degree hairpins, underground tunnel echoes, and seaside chicane.',
    checkpoints: [
      { position: [0, 0.4, -120], rotationY: Math.PI, radius: 14 },
      { position: [-60, 0.4, -155], rotationY: -Math.PI / 2, radius: 14 },
      { position: [-150, 0.4, -155], rotationY: -Math.PI / 2, radius: 14 },
      { position: [-195, 0.4, -80], rotationY: 0, radius: 14 },
      { position: [-195, 0.4, 40], rotationY: 0, radius: 14 },
      { position: [-130, 0.4, 160], rotationY: Math.PI / 2, radius: 14 },
      { position: [-20, 0.4, 160], rotationY: Math.PI / 2, radius: 14 },
      { position: [70, 0.4, 160], rotationY: Math.PI / 2, radius: 14 },
      { position: [195, 0.4, 110], rotationY: Math.PI, radius: 14 },
      { position: [195, 0.4, -50], rotationY: Math.PI, radius: 14 },
      { position: [100, 0.4, -155], rotationY: -Math.PI / 2, radius: 14 },
      { position: [0, 0.4, -120], rotationY: 0, radius: 14, isFinish: true },
    ],
  },
];
