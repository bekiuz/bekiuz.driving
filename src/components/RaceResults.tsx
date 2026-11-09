/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trophy, Clock, RotateCcw, ArrowRight, Gift, Sparkles } from 'lucide-react';
import { RaceTrack } from '../types/game';
import { soundManager } from '../services/audio';
import { yandexSdk } from '../services/yandexSdk';

interface RaceResultsProps {
  track: RaceTrack;
  finishTimeMs: number;
  isNewRecord: boolean;
  baseRewardCoins: number;
  onRetry: () => void;
  onContinue: () => void;
  onAddCurrency: (amount: number) => void;
}

export const RaceResults: React.FC<RaceResultsProps> = ({
  track,
  finishTimeMs,
  isNewRecord,
  baseRewardCoins,
  onRetry,
  onContinue,
  onAddCurrency,
}) => {
  const [hasClaimedDouble, setHasClaimedDouble] = useState(false);
  const [adLoading, setAdLoading] = useState(false);

  const doubleRewardBonus =
    baseRewardCoins + (isNewRecord ? Math.round(baseRewardCoins * 0.5) : 0);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  const handleClaimDouble = () => {
    if (hasClaimedDouble || adLoading) return;
    soundManager.playUiClick();
    setAdLoading(true);

    yandexSdk.showRewardedAd({
      onRewarded: () => {
        onAddCurrency(doubleRewardBonus);
        setHasClaimedDouble(true);
        soundManager.playUpgradeSound();
      },
      onClose: () => {
        setAdLoading(false);
      },
      onError: () => {
        setAdLoading(false);
      },
    });
  };

  const handleFinishAndContinue = () => {
    soundManager.playUiClick();
    // Show interstitial / fullscreen ad between races as required by Yandex Games guidelines
    yandexSdk.showFullscreenAd({
      onClosed: () => {
        onContinue();
      },
      onError: () => {
        onContinue();
      },
    });
  };

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-amber-500/40 p-6 sm:p-8 flex flex-col items-center text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-in zoom-in-95 duration-200">
        {/* Victory Trophy Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.6)] mb-4 animate-bounce">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="text-xs font-race font-extrabold text-amber-400 tracking-widest uppercase mb-1">
          RACE COMPLETE
        </div>
        <h2 className="font-race font-black text-3xl sm:text-4xl text-white tracking-wide mb-2">
          {track.name}
        </h2>

        {/* New Record Banner */}
        {isNewRecord && (
          <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-race font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg mb-4 animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>NEW PERSONAL BEST TIME!</span>
          </div>
        )}

        {/* Time Card */}
        <div className="w-full bg-slate-900/80 rounded-2xl border border-slate-800 p-4 mb-4">
          <div className="text-[11px] font-race text-slate-400 mb-1 flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            FINISH TIME
          </div>
          <div className="font-race font-black text-4xl text-cyan-300 tracking-wider">
            {formatTime(finishTimeMs)}
          </div>
        </div>

        {/* Rewards Breakdown */}
        <div className="w-full bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4 mb-6 text-xs font-race space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>TRACK REWARD</span>
            <span className="text-amber-400 font-bold">+${baseRewardCoins}</span>
          </div>
          {isNewRecord && (
            <div className="flex justify-between text-amber-300">
              <span>RECORD BONUS</span>
              <span className="text-amber-400 font-bold">+${Math.round(baseRewardCoins * 0.5)}</span>
            </div>
          )}
          {hasClaimedDouble && (
            <div className="flex justify-between text-emerald-400">
              <span>SPONSOR BONUS</span>
              <span className="font-bold">+${baseRewardCoins}</span>
            </div>
          )}
        </div>

        {/* Double Reward Rewarded Ad Button */}
        {!hasClaimedDouble && (
          <button
            onClick={handleClaimDouble}
            disabled={adLoading}
            className="w-full py-3.5 mb-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-race font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 disabled:opacity-50"
          >
            <Gift className="w-4 h-4" />
            <span>{adLoading ? 'LOADING AD...' : `DOUBLE REWARD (+${doubleRewardBonus})`}</span>
          </button>
        )}

        {/* Action Buttons */}
        <div className="w-full flex gap-3">
          <button
            onClick={() => {
              soundManager.playUiClick();
              onRetry();
            }}
            className="flex-1 py-3.5 rounded-2xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white font-race font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RETRY</span>
          </button>

          <button
            onClick={handleFinishAndContinue}
            className="flex-1 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-race font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <span>CONTINUE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
