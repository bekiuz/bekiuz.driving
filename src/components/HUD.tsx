/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Pause, RotateCcw, Camera, Flag, Timer, Trophy } from 'lucide-react';
import { GameScreen, TrackCheckpoint, VehicleTelemetry } from '../types/game';
import { RaceManagerState } from '../game/raceManager';
import { Speedometer } from './Speedometer';
import { Minimap } from './Minimap';
import { TouchControls } from './TouchControls';
import { InputControls } from '../types/game';

interface HUDProps {
  screen: GameScreen;
  telemetry: VehicleTelemetry;
  raceState: RaceManagerState | null;
  checkpoints?: TrackCheckpoint[];
  currency: number;
  isMobile: boolean;
  onPause: () => void;
  onReset: () => void;
  onToggleCamera: () => void;
  onInputChange: (updater: (prev: InputControls) => InputControls) => void;
}

export const HUD: React.FC<HUDProps> = ({
  screen,
  telemetry,
  raceState,
  checkpoints,
  currency,
  isMobile,
  onPause,
  onReset,
  onToggleCamera,
  onInputChange,
}) => {
  // Format ms to mm:ss.xx
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  const isRacing = screen === 'racing' && raceState !== null;
  const policeDistance = 18;
  const policePosition: [number, number, number] = [
    telemetry.position[0] - Math.sin(telemetry.rotationY) * policeDistance,
    telemetry.position[1],
    telemetry.position[2] - Math.cos(telemetry.rotationY) * policeDistance,
  ];

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* ==========================================
          TOP BAR: Radar, Race Timers, Badges & Pause
          ========================================== */}
      <div className="flex justify-between items-start gap-4">
        {/* Top-Left: Minimap + Mode Info */}
        <div className="flex items-start gap-3 pointer-events-auto">
          <Minimap
            carPosition={telemetry.position}
            carRotationY={telemetry.rotationY}
            policePosition={policePosition}
            checkpoints={checkpoints}
            activeCheckpointIndex={raceState?.currentCheckpointIndex}
          />

          <div className="flex flex-col gap-1.5 mt-1">
            {/* Mode Badge */}
            <div className="px-3 py-1 rounded-md glass-panel border border-cyan-500/40 text-cyan-300 font-race font-bold text-xs tracking-wider flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              {isRacing ? 'RACE MODE' : 'FREE DRIVE'}
            </div>

            {/* Police Pursuit Indicator */}
            <div className="px-3 py-1 rounded-md glass-panel border border-red-500/40 text-red-300 font-race font-bold text-[10px] tracking-wider flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              POLICE PURSUIT
            </div>

            {/* Currency Pill */}
            <div className="px-3 py-1 rounded-md glass-panel border border-amber-500/30 text-amber-300 font-race font-bold text-xs flex items-center gap-1.5 shadow-lg">
              <span className="text-amber-400">$</span>
              <span>{currency.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Center: Race Progress / Lap & Timers (when racing) */}
        {isRacing && raceState && (
          <div className="flex flex-col items-center gap-1 pointer-events-auto">
            {/* Timer Box */}
            <div className="px-5 py-2 rounded-xl glass-panel border border-cyan-500/40 shadow-2xl flex items-center gap-4">
              <div className="flex items-center gap-2 text-white font-race font-black text-2xl sm:text-3xl tracking-wider">
                <Timer className="w-5 h-5 text-cyan-400" />
                {formatTime(raceState.elapsedTimeMs)}
              </div>
            </div>

            {/* Laps & Checkpoints */}
            <div className="flex gap-2">
              <div className="px-3 py-1 rounded-lg glass-panel text-xs font-race font-bold text-slate-200 border border-slate-700/60 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                LAP {raceState.currentLap} / {raceState.totalLaps}
              </div>
              <div className="px-3 py-1 rounded-lg glass-panel text-xs font-race font-bold text-cyan-300 border border-slate-700/60">
                GATE {raceState.currentCheckpointIndex + 1} / {raceState.totalCheckpoints}
              </div>
            </div>
          </div>
        )}

        {/* Top-Right: Quick Actions (Camera, Reset, Pause) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {!isMobile && (
            <>
              <button
                onClick={onToggleCamera}
                className="px-3 py-1.5 rounded-lg glass-panel border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white font-race text-xs flex items-center gap-1.5 transition-all shadow-md"
                title="Toggle Camera (C)"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">VIEW [C]</span>
              </button>

              <button
                onClick={onReset}
                className="px-3 py-1.5 rounded-lg glass-panel border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-white font-race text-xs flex items-center gap-1.5 transition-all shadow-md"
                title="Reset Vehicle (R)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">RESET [R]</span>
              </button>
            </>
          )}

          <button
            onClick={onPause}
            className="w-10 h-10 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
            title="Pause Game (Esc)"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ==========================================
          CENTER SCREEN: Countdown Display & Stunt Popups
          ========================================== */}
      {isRacing && raceState?.status === 'countdown' && (
        <div className="self-center flex flex-col items-center justify-center my-auto pointer-events-none animate-in zoom-in-75 duration-200">
          <div className={`font-race font-black text-7xl sm:text-9xl drop-shadow-[0_0_35px_rgba(6,182,212,0.8)] ${
            raceState.countdownValue === 0
              ? 'text-emerald-400 scale-125 transition-transform'
              : 'text-amber-400'
          }`}>
            {raceState.countdownValue === 0 ? 'GO!' : raceState.countdownValue}
          </div>
          <div className="font-race text-sm sm:text-base font-bold text-cyan-300 uppercase tracking-widest mt-2 bg-slate-900/80 px-4 py-1 rounded-full border border-cyan-500/40">
            {raceState.countdownValue === 0 ? 'FLOOR IT!' : 'GET READY'}
          </div>
        </div>
      )}

      {/* ==========================================
          BOTTOM ROW: Controls Desktop Hint & Speedometer
          ========================================== */}
      <div className="flex justify-between items-end">
        {/* Desktop Controls Hint (subtle, bottom left) */}
        {!isMobile ? (
          <div className="glass-panel px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] font-race text-slate-400 flex items-center gap-3">
            <div>
              <span className="text-white font-bold">W / ↑</span> GAS
            </div>
            <div>
              <span className="text-white font-bold">S / ↓</span> BRAKE
            </div>
            <div>
              <span className="text-white font-bold">A / D</span> STEER
            </div>
            <div>
              <span className="text-amber-400 font-bold">SPACE</span> DRIFT
            </div>
            <div>
              <span className="text-cyan-400 font-bold">SHIFT</span> NITRO
            </div>
            <div>
              <span className="text-red-300 font-bold">B</span> REAR VIEW
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Speedometer Cluster */}
        <div className="pointer-events-auto">
          <Speedometer
            speedKmh={telemetry.speedKmh}
            rpm={telemetry.rpm}
            gear={telemetry.gear}
            nitroRemaining={telemetry.nitroRemaining}
            isNitroActive={telemetry.isNitroActive}
            driftScore={telemetry.driftScore}
            driftMultiplier={telemetry.driftMultiplier}
            isDrifting={telemetry.isDrifting}
          />
        </div>
      </div>

      {/* Mobile Touch Overlay */}
      {isMobile && (
        <TouchControls
          onInputChange={onInputChange}
          onReset={onReset}
          onToggleCamera={onToggleCamera}
        />
      )}
    </div>
  );
};
