/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flame, Gauge } from 'lucide-react';

interface SpeedometerProps {
  speedKmh: number;
  rpm: number;
  gear: number;
  nitroRemaining: number;
  isNitroActive: boolean;
  driftScore: number;
  driftMultiplier: number;
  isDrifting: boolean;
}

export const Speedometer: React.FC<SpeedometerProps> = ({
  speedKmh,
  rpm,
  gear,
  nitroRemaining,
  isNitroActive,
  driftScore,
  driftMultiplier,
  isDrifting,
}) => {
  // Clamp RPM
  const rpmPercent = Math.max(0, Math.min(1, (rpm - 800) / (7500 - 800)));
  const rpmAngle = -120 + rpmPercent * 240; // -120 deg to +120 deg

  const gearText = gear === -1 ? 'R' : gear === 0 ? 'N' : `${gear}`;

  return (
    <div className="flex flex-col items-end gap-2 select-none pointer-events-none">
      {/* Dynamic Drift Floating Badge */}
      {(isDrifting || driftScore > 0) && (
        <div className={`transition-all duration-200 flex flex-col items-end px-3 py-1.5 rounded-lg border ${
          isDrifting
            ? 'bg-amber-950/85 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-105'
            : 'bg-slate-900/70 border-slate-700/50 opacity-90'
        }`}>
          <div className="flex items-center gap-1.5 text-xs font-race font-bold text-amber-400">
            <span className="animate-pulse text-amber-300">★</span>
            <span>DRIFT</span>
            <span className="text-amber-200">x{driftMultiplier}</span>
          </div>
          <div className="font-race text-xl font-extrabold text-amber-300 tracking-wider">
            +{driftScore}
          </div>
        </div>
      )}

      {/* Main Cluster Container */}
      <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full glass-panel flex items-center justify-center border border-cyan-500/25 shadow-2xl">
        {/* Radial SVG Gauge Background */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Track Arc */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="5"
            strokeDasharray="180 300"
            strokeDashoffset="-20"
            strokeLinecap="round"
          />
          {/* Active RPM Fill Arc */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={rpmPercent > 0.82 ? '#ef4444' : '#06b6d4'}
            strokeWidth="5"
            strokeDasharray={`${rpmPercent * 180} 300`}
            strokeDashoffset="-20"
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>

        {/* Center Readouts */}
        <div className="flex flex-col items-center justify-center z-10">
          {/* Speed Digital Readout */}
          <div className="font-race text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {speedKmh}
          </div>
          <div className="text-[10px] sm:text-xs font-race font-bold text-cyan-400 tracking-widest uppercase -mt-1">
            KM / H
          </div>

          {/* Gear & RPM indicator */}
          <div className="flex items-center gap-3 mt-2 text-xs font-race font-bold">
            <div className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
              GEAR <span className="text-white text-sm ml-0.5">{gearText}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {Math.round(rpm)} <span className="text-[9px] text-slate-500">RPM</span>
            </div>
          </div>
        </div>

        {/* Nitro Gauge Bar (Curved bottom strip) */}
        <div className="absolute bottom-3 w-28 sm:w-32 flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[9px] font-race text-cyan-300 font-semibold">
            <span className="flex items-center gap-1">
              <Flame className={`w-3 h-3 ${isNitroActive ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
              NITRO (N2O)
            </span>
            <span>{Math.round(nitroRemaining * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/30">
            <div
              className={`h-full transition-all duration-100 ${
                isNitroActive
                  ? 'bg-gradient-to-r from-amber-400 to-cyan-400 shadow-[0_0_8px_#06b6d4]'
                  : 'bg-cyan-500'
              }`}
              style={{ width: `${nitroRemaining * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
