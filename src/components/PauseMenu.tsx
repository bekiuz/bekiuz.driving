/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Camera } from 'lucide-react';
import { soundManager } from '../services/audio';

interface PauseMenuProps {
  isRacing: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleCamera: () => void;
  onMainMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isRacing,
  onResume,
  onRestart,
  onToggleCamera,
  onMainMenu,
}) => {
  const [isMuted, setIsMuted] = React.useState(soundManager.getIsMuted());

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    soundManager.playUiClick();
  };

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel rounded-3xl border border-cyan-500/40 p-6 sm:p-8 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-150">
        <h2 className="font-race font-black text-3xl text-white tracking-wider mb-1">
          GAME PAUSED
        </h2>
        <p className="text-xs font-race text-cyan-400 uppercase tracking-widest mb-6">
          BEKIUZ DRIVE: CITY RUSH
        </p>

        {/* Buttons */}
        <div className="w-full space-y-3 font-race text-sm font-bold">
          {/* Resume */}
          <button
            onClick={() => {
              soundManager.playUiClick();
              onResume();
            }}
            className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              soundManager.playUiClick();
              onRestart();
            }}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isRacing ? 'RESTART RACE' : 'RESET VEHICLE'}</span>
          </button>

          {/* Camera View */}
          <button
            onClick={() => {
              soundManager.playUiClick();
              onToggleCamera();
            }}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>CHANGE CAMERA VIEW</span>
          </button>

          {/* Audio Mute */}
          <button
            onClick={handleToggleSound}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
          </button>

          {/* Return to Menu */}
          <button
            onClick={() => {
              soundManager.playUiClick();
              onMainMenu();
            }}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
