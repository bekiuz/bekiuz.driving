/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, ArrowRight, Flame, RotateCcw, Camera } from 'lucide-react';
import { InputControls } from '../types/game';

interface TouchControlsProps {
  onInputChange: (updater: (prev: InputControls) => InputControls) => void;
  onReset: () => void;
  onToggleCamera: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onInputChange,
  onReset,
  onToggleCamera,
}) => {
  // Steer Left
  const setSteerLeft = (active: boolean) => {
    onInputChange((prev) => ({
      ...prev,
      steer: active ? -1 : prev.steer === -1 ? 0 : prev.steer,
    }));
  };

  // Steer Right
  const setSteerRight = (active: boolean) => {
    onInputChange((prev) => ({
      ...prev,
      steer: active ? 1 : prev.steer === 1 ? 0 : prev.steer,
    }));
  };

  // Throttle
  const setThrottle = (active: boolean) => {
    onInputChange((prev) => ({ ...prev, throttle: active ? 1 : 0 }));
  };

  // Brake
  const setBrake = (active: boolean) => {
    onInputChange((prev) => ({ ...prev, brake: active ? 1 : 0 }));
  };

  // Handbrake
  const setHandbrake = (active: boolean) => {
    onInputChange((prev) => ({ ...prev, handbrake: active }));
  };

  // Nitro
  const setNitro = (active: boolean) => {
    onInputChange((prev) => ({ ...prev, nitro: active }));
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex justify-between items-end p-4 sm:p-6 pb-6">
      {/* Left Pod: Steering + Camera & Reset */}
      <div className="flex flex-col gap-3 pointer-events-auto">
        {/* Quick Utilities: Camera toggle + Reset */}
        <div className="flex gap-2 mb-1">
          <button
            onClick={onToggleCamera}
            className="w-12 h-12 rounded-xl bg-slate-900/80 active:bg-cyan-600 border border-slate-700 active:border-cyan-400 flex items-center justify-center text-slate-300 active:text-white shadow-lg transition-transform active:scale-95"
            title="Change Camera View"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            onClick={onReset}
            className="w-12 h-12 rounded-xl bg-slate-900/80 active:bg-amber-600 border border-slate-700 active:border-amber-400 flex items-center justify-center text-slate-300 active:text-white shadow-lg transition-transform active:scale-95"
            title="Reset Vehicle (R)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Steer Buttons */}
        <div className="flex gap-3">
          <button
            onTouchStart={() => setSteerLeft(true)}
            onTouchEnd={() => setSteerLeft(false)}
            onMouseDown={() => setSteerLeft(true)}
            onMouseUp={() => setSteerLeft(false)}
            onMouseLeave={() => setSteerLeft(false)}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900/85 active:bg-cyan-500/80 border-2 border-cyan-500/40 active:border-cyan-300 flex items-center justify-center text-cyan-400 active:text-white shadow-xl transition-transform active:scale-90"
            aria-label="Steer Left"
          >
            <ArrowLeft className="w-8 h-8" />
          </button>

          <button
            onTouchStart={() => setSteerRight(true)}
            onTouchEnd={() => setSteerRight(false)}
            onMouseDown={() => setSteerRight(true)}
            onMouseUp={() => setSteerRight(false)}
            onMouseLeave={() => setSteerRight(false)}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900/85 active:bg-cyan-500/80 border-2 border-cyan-500/40 active:border-cyan-300 flex items-center justify-center text-cyan-400 active:text-white shadow-xl transition-transform active:scale-90"
            aria-label="Steer Right"
          >
            <ArrowRight className="w-8 h-8" />
          </button>
        </div>
      </div>

      {/* Right Pod: Handbrake, Nitro, Brake, Gas */}
      <div className="flex flex-col items-end gap-3 pointer-events-auto">
        {/* Nitro & Handbrake row */}
        <div className="flex gap-2 mb-1">
          <button
            onTouchStart={() => setNitro(true)}
            onTouchEnd={() => setNitro(false)}
            onMouseDown={() => setNitro(true)}
            onMouseUp={() => setNitro(false)}
            onMouseLeave={() => setNitro(false)}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 active:from-cyan-400 active:to-blue-500 border-2 border-cyan-300 flex flex-col items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-transform active:scale-90"
            aria-label="Nitro Boost"
          >
            <Flame className="w-6 h-6 animate-pulse" />
            <span className="text-[9px] font-race font-extrabold tracking-wider">NITRO</span>
          </button>

          <button
            onTouchStart={() => setHandbrake(true)}
            onTouchEnd={() => setHandbrake(false)}
            onMouseDown={() => setHandbrake(true)}
            onMouseUp={() => setHandbrake(false)}
            onMouseLeave={() => setHandbrake(false)}
            className="w-14 h-14 rounded-2xl bg-amber-950/85 active:bg-amber-600 border-2 border-amber-500/60 active:border-amber-300 flex flex-col items-center justify-center text-amber-400 active:text-white shadow-lg transition-transform active:scale-90"
            aria-label="Handbrake Drift"
          >
            <span className="text-xs font-race font-extrabold">DRIFT</span>
            <span className="text-[8px] font-race text-amber-300">BRAKE</span>
          </button>
        </div>

        {/* Primary Pedals: Brake and Gas */}
        <div className="flex gap-3 items-end">
          {/* Brake / Reverse Pedal */}
          <button
            onTouchStart={() => setBrake(true)}
            onTouchEnd={() => setBrake(false)}
            onMouseDown={() => setBrake(true)}
            onMouseUp={() => setBrake(false)}
            onMouseLeave={() => setBrake(false)}
            className="w-16 h-20 sm:w-18 sm:h-24 rounded-2xl bg-rose-950/90 active:bg-rose-600 border-2 border-rose-500/60 active:border-rose-300 flex flex-col items-center justify-center text-rose-300 active:text-white shadow-xl transition-transform active:scale-90"
            aria-label="Brake and Reverse"
          >
            <span className="text-sm font-race font-bold">BRAKE</span>
            <span className="text-[9px] font-race text-rose-400 uppercase">REV</span>
          </button>

          {/* Gas / Throttle Pedal */}
          <button
            onTouchStart={() => setThrottle(true)}
            onTouchEnd={() => setThrottle(false)}
            onMouseDown={() => setThrottle(true)}
            onMouseUp={() => setThrottle(false)}
            onMouseLeave={() => setThrottle(false)}
            className="w-20 h-28 sm:w-24 sm:h-32 rounded-2xl bg-gradient-to-t from-emerald-950 to-emerald-900 active:from-emerald-600 active:to-emerald-500 border-2 border-emerald-500 active:border-emerald-300 flex flex-col items-center justify-center text-emerald-300 active:text-white shadow-2xl transition-transform active:scale-95"
            aria-label="Accelerate"
          >
            <span className="text-xl font-race font-black tracking-wider">GAS</span>
            <span className="text-[10px] font-race text-emerald-400 uppercase tracking-widest mt-1">DRIVE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
