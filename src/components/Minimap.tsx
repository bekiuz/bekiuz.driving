/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { TrackCheckpoint } from '../types/game';

interface MinimapProps {
  carPosition: [number, number, number];
  carRotationY: number;
  checkpoints?: TrackCheckpoint[];
  activeCheckpointIndex?: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  carPosition,
  carRotationY,
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

    // Draw Roads
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 5;

    // Central N-S
    let [x1, y1] = worldToMap(0, -180);
    let [x2, y2] = worldToMap(0, 180);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Central E-W
    [x1, y1] = worldToMap(-200, 0);
    [x2, y2] = worldToMap(160, 0);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // North & South Perimeter
    [x1, y1] = worldToMap(-200, -155);
    [x2, y2] = worldToMap(180, -155);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    [x1, y1] = worldToMap(-200, 160);
    [x2, y2] = worldToMap(180, 160);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Bridge road (East side)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    [x1, y1] = worldToMap(195, -155);
    [x2, y2] = worldToMap(195, 160);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

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
  }, [carPosition, carRotationY, checkpoints, activeCheckpointIndex]);

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
