/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trophy, Clock, Flag, ArrowLeft, Play, Flame } from 'lucide-react';
import { RaceTrack } from '../types/game';
import { TRACKS } from '../data/tracks';
import { soundManager } from '../services/audio';

interface TrackSelectProps {
  bestTimes: Record<string, number>;
  onSelectTrack: (track: RaceTrack) => void;
  onBack: () => void;
}

export const TrackSelect: React.FC<TrackSelectProps> = ({
  bestTimes,
  onSelectTrack,
  onBack,
}) => {
  const [selectedId, setSelectedId] = useState<string>(TRACKS[0].id);

  const selectedTrack = TRACKS.find((t) => t.id === selectedId) || TRACKS[0];

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl glass-panel rounded-3xl border border-cyan-500/30 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundManager.playUiClick();
                onBack();
              }}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-race font-black text-2xl sm:text-3xl text-white">
                SELECT RACE EVENT
              </h2>
              <p className="text-xs sm:text-sm text-cyan-400 font-race">
                BEAT THE CLOCK & EARN CASH PRIZES
              </p>
            </div>
          </div>
        </div>

        {/* Content: Track Cards Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {TRACKS.map((t) => {
            const isSelected = t.id === selectedId;
            const personalBest = bestTimes[t.id];

            return (
              <div
                key={t.id}
                onClick={() => {
                  soundManager.playUiClick();
                  setSelectedId(t.id);
                }}
                className={`relative rounded-2xl p-5 border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-950/80 to-slate-900/90 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] scale-102'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                <div>
                  {/* Difficulty Tag */}
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-[10px] font-race font-extrabold px-2 py-0.5 rounded ${
                        t.difficulty === 'EASY'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : t.difficulty === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                          : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {t.difficulty}
                    </span>

                    <span className="text-xs font-race font-bold text-amber-300 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      +${t.rewardCoins}
                    </span>
                  </div>

                  <h3 className="font-race font-black text-lg text-white mb-1">
                    {t.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-tech mb-4">
                    {t.subtitle}
                  </p>

                  {/* Track specs */}
                  <div className="space-y-2 text-xs font-race border-t border-slate-800/80 pt-3">
                    <div className="flex justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5 text-cyan-400" /> LAPS
                      </span>
                      <span className="text-slate-200 font-bold">{t.laps}</span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-cyan-400" /> DISTANCE
                      </span>
                      <span className="text-slate-200 font-bold">{t.lengthKm} KM</span>
                    </div>

                    <div className="flex justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" /> PAR TIME
                      </span>
                      <span className="text-slate-200 font-bold">{formatTime(t.parTimeMs)}</span>
                    </div>
                  </div>
                </div>

                {/* Personal Record Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-[11px] font-race text-slate-400 flex justify-between">
                    <span>BEST RECORD:</span>
                    <span className={personalBest ? 'text-amber-400 font-black' : 'text-slate-500'}>
                      {personalBest ? formatTime(personalBest) : '--:--.--'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex justify-between items-center">
          <div className="hidden sm:block text-xs font-tech text-slate-400 max-w-md">
            {selectedTrack.description}
          </div>

          <button
            onClick={() => {
              soundManager.playUiClick();
              onSelectTrack(selectedTrack);
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-race font-black text-base flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START RACE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
