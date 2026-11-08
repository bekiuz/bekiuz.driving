/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { TrackCheckpoint } from '../types/game';

interface MinimapProps {
  carPosition: [number, number, number];
  carRotationY: number;
  policePosition?: [number, number, number];
  checkpoints?: TrackCheckpoint[];
  activeCheckpointIndex?: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  carPosition,
  carRotationY,
  policePosition,
  checkpoints,
  activeCheckpointIndex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    // Map coordinate bounds: -240 to 240 maps to 0 to size
    const scale = size / 500;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Radar circular background
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.clip();

    // Concentric radar rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    [center * 0.4, center * 0.7, center * 0.95].forEach((r) => {
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    const worldToMap = (wx: number, wz: number): [number, number] => {
      const mx = center + wx * scale;
      const my = center + wz * scale;
      return [mx, my];
    };

    // Draw the same building footprints and road center-lines used by the 3D city.
    const drawRoad = (
      fromX: number,
      fromZ: number,
      toX: number,
      toZ: number,
      color = 'rgba(148, 163, 184, 0.52)',
      widthMeters = 20
    ) => {
      const [sx, sy] = worldToMap(fromX, fromZ);
      const [ex, ey] = worldToMap(toX, toZ);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, widthMeters * scale);
      ctx.lineCap = 'round';
      ctx.stroke();
    };

    const drawBuilding = (cx: number, cz: number, width: number, depth: number) => {
      const [x, y] = worldToMap(cx, cz);
      ctx.fillStyle = 'rgba(71, 85, 105, 0.72)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1;
      ctx.fillRect(x - (width * scale) / 2, y - (depth * scale) / 2, width * scale, depth * scale);
      ctx.strokeRect(x - (width * scale) / 2, y - (depth * scale) / 2, width * scale, depth * scale);
    };

    // Buildings, plotted from the exact centers and sizes in proceduralCity.ts.
    [
      [-140, -80, 55, 85],
      [-140, 60, 55, 75],
      [-45, -80, 45, 75],
      [-45, 80, 45, 70],
      [45, -80, 45, 75],
      [45, 80, 45, 70],
      [135, -80, 50, 75],
      [135, 80, 50, 70],
    ].forEach(([x, z, width, depth]) => drawBuilding(x, z, width, depth));

    // Main grid and perimeter streets.
    drawRoad(0, -180, 0, 180);
    drawRoad(-200, 0, 160, 0);
    drawRoad(-200, -160, 180, -160);
    drawRoad(-200, 160, 180, 160);

    // Three north-south avenues through the city.
    drawRoad(-195, -160, -195, 160);
    drawRoad(-90, -160, -90, 160);
    drawRoad(90, -160, 90, 160);

    // Elevated bridge and short links into each perimeter road.
    drawRoad(195, -150, 195, 150, 'rgba(6, 182, 212, 0.82)');
    drawRoad(180, 160, 183, 160, 'rgba(6, 182, 212, 0.7)', 20);
    drawRoad(180, -160, 183, -160, 'rgba(6, 182, 212, 0.7)', 20);

    // Draw Race Checkpoints
    if (checkpoints && checkpoints.length > 0) {
      checkpoints.forEach((cp, idx) => {
        const [cx, cy] = worldToMap(cp.position[0], cp.position[2]);
        const isActive = idx === activeCheckpointIndex;
        ctx.beginPath();
        ctx.arc(cx, cy, isActive ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#00f0ff' : cp.isFinish ? '#f59e0b' : 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        if (isActive) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

    // Police marker: red/blue flashing ring behind the player.
    if (policePosition) {
      const [policeX, policeY] = worldToMap(policePosition[0], policePosition[2]);
      const pulse = 4 + (Math.sin(performance.now() / 140) + 1) * 1.5;
      ctx.beginPath();
      ctx.arc(policeX, policeY, pulse + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(policeX, policeY, pulse, 0, Math.PI * 2);
      ctx.fillStyle = Math.sin(performance.now() / 110) > 0 ? '#ef4444' : '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw Player Car Icon (Triangle pointing in heading)
    const [px, py] = worldToMap(carPosition[0], carPosition[2]);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-carRotationY + Math.PI); // Coordinate inversion for 2D canvas

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }, [carPosition, carRotationY, policePosition, checkpoints, activeCheckpointIndex]);

  return (
    <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-2xl border border-cyan-500/30">
      <canvas
        ref={canvasRef}
        width={144}
        height={144}
        className="w-full h-full block"
      />
      <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-race text-cyan-400 font-bold uppercase tracking-wider bg-slate-900/60 px-1 rounded">
        GPS
      </div>
    </div>
  );
};
