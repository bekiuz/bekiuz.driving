/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Volume2, Monitor, Gauge, Gamepad2 } from 'lucide-react';
import { GameSettings } from '../types/game';
import { soundManager } from '../services/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const handleVolumeChange = (type: 'master' | 'engine' | 'sfx', val: number) => {
    if (type === 'master') {
      soundManager.setMasterVolume(val);
      onUpdateSettings({ ...settings, masterVolume: val });
    } else if (type === 'engine') {
      soundManager.setEngineVolume(val);
      onUpdateSettings({ ...settings, engineVolume: val });
    } else {
      soundManager.setSfxVolume(val);
      onUpdateSettings({ ...settings, sfxVolume: val });
    }
  };

  const handleQualityChange = (q: 'low' | 'medium' | 'high') => {
    soundManager.playUiClick();
    onUpdateSettings({ ...settings, graphicsQuality: q });
  };

  const handleCameraDistChange = (dist: 'close' | 'normal' | 'far' | 'hood') => {
    soundManager.playUiClick();
    onUpdateSettings({ ...settings, cameraDistance: dist });
  };

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel rounded-3xl border border-cyan-500/30 p-6 sm:p-8 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="font-race font-black text-2xl text-white">SETTINGS</h2>
          </div>
          <button
            onClick={() => {
              soundManager.playUiClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="py-5 space-y-5 font-race text-xs">
          {/* Audio Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
              <Volume2 className="w-4 h-4" />
              <span>AUDIO CONTROLS</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>MASTER VOLUME</span>
                <span>{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => handleVolumeChange('master', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>ENGINE AUDIO</span>
                <span>{Math.round(settings.engineVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.engineVolume}
                onChange={(e) => handleVolumeChange('engine', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>SOUND EFFECTS</span>
                <span>{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
              <Monitor className="w-4 h-4" />
              <span>GRAPHICS QUALITY</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => handleQualityChange(q)}
                  className={`py-2 rounded-xl uppercase font-bold text-xs transition-all ${
                    settings.graphicsQuality === q
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Distance View */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
              <Gauge className="w-4 h-4" />
              <span>CHASE CAMERA DISTANCE</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['close', 'normal', 'far', 'hood'] as const).map((dist) => (
                <button
                  key={dist}
                  onClick={() => handleCameraDistChange(dist)}
                  className={`py-2 rounded-xl uppercase font-bold text-xs transition-all ${
                    settings.cameraDistance === dist
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {dist}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={() => {
            soundManager.playUiClick();
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-race font-black text-sm shadow-lg transition-all active:scale-95"
        >
          SAVE & CLOSE
        </button>
      </div>
    </div>
  );
};
