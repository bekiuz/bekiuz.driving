/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Compass, Wrench, Settings, Volume2, VolumeX, Gift, Trophy, Sparkles } from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { soundManager } from '../services/audio';
import { yandexSdk } from '../services/yandexSdk';

interface MainMenuProps {
  profile: PlayerProfile;
  onStartFreeDrive: () => void;
  onOpenRaceSelect: () => void;
  onOpenGarage: () => void;
  onOpenSettings: () => void;
  onAddCurrency: (amount: number) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  onStartFreeDrive,
  onOpenRaceSelect,
  onOpenGarage,
  onOpenSettings,
  onAddCurrency,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [adLoading, setAdLoading] = useState(false);

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    soundManager.playUiClick();
  };

  const handleWatchRewardedAd = () => {
    soundManager.playUiClick();
    setAdLoading(true);

    yandexSdk.showRewardedAd({
      onRewarded: () => {
        onAddCurrency(500);
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

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 sm:p-10">
      {/* Top Header: Brand spec + Currency & Sound */}
      <div className="flex justify-between items-center pointer-events-auto">
        {/* Subtle Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-cyan-950/90 border border-cyan-500/40 text-[10px] font-race text-cyan-300 font-extrabold uppercase tracking-widest shadow-lg">
            v1.0 OFFICIAL
          </span>
          <span className="hidden sm:inline text-xs font-race text-slate-400">
            YANDEX GAMES READY
          </span>
        </div>

        {/* Currency & Rewarded Ad & Audio */}
        <div className="flex items-center gap-3">
          {/* Rewarded Ad Bonus Button */}
          <button
            onClick={handleWatchRewardedAd}
            disabled={adLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-race font-extrabold text-xs shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all active:scale-95 disabled:opacity-50"
            title="Watch a quick sponsor ad to get +500 Coins"
          >
            <Gift className="w-4 h-4 animate-bounce" />
            <span>{adLoading ? 'LOADING...' : '+500 COINS'}</span>
          </button>

          {/* Currency Display */}
          <div className="px-4 py-1.5 rounded-xl glass-panel border border-amber-500/40 flex items-center gap-2 shadow-xl">
            <span className="text-amber-400 font-race font-bold">$</span>
            <span className="font-race font-black text-amber-300 text-base">
              {profile.currency.toLocaleString()}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="w-10 h-10 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-lg active:scale-95"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Main Title & Hero Branding */}
      <div className="max-w-xl pointer-events-auto my-auto flex flex-col gap-3">
        <div className="flex items-center gap-2 text-cyan-400 font-race text-xs sm:text-sm font-black tracking-widest uppercase">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          NEXT-GEN 3D BROWSER RACER
        </div>

        <h1 className="font-race font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-100 to-cyan-400 drop-shadow-[0_4px_25px_rgba(6,182,212,0.6)]">
          BEKIUZ DRIVE
        </h1>
        <div className="font-race text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-wider -mt-1 flex items-center gap-3">
          <span>CITY RUSH</span>
          <span className="text-xs font-mono text-slate-400 font-normal px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
            PRO EDITION
          </span>
        </div>

        <p className="text-sm sm:text-base text-slate-300 max-w-md font-tech font-medium leading-relaxed drop-shadow">
          Tear through wide urban avenues, hit top speed over the suspension bridge, drift hairpin corners, and tune your dream supercar collection.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {/* Race Event Button */}
          <button
            onClick={() => {
              soundManager.playUiClick();
              onOpenRaceSelect();
            }}
            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 bg-[length:200%_auto] hover:bg-right transition-all duration-300 text-white font-race font-black text-lg flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:shadow-[0_0_35px_rgba(6,182,212,0.9)] active:scale-95"
          >
            <Trophy className="w-5 h-5 text-amber-300" />
            <span>RACE EVENT</span>
          </button>

          {/* Free Drive Button */}
          <button
            onClick={() => {
              soundManager.playUiClick();
              onStartFreeDrive();
            }}
            className="px-6 py-4 rounded-2xl glass-panel border border-slate-600 hover:border-cyan-400 text-white font-race font-extrabold text-lg flex items-center justify-center gap-3 shadow-xl transition-all hover:bg-slate-800/80 active:scale-95"
          >
            <Compass className="w-5 h-5 text-cyan-400" />
            <span>FREE DRIVE</span>
          </button>
        </div>
      </div>

      {/* Bottom Nav: Garage & Settings */}
      <div className="flex justify-between items-end pointer-events-auto">
        <div className="flex gap-3">
          <button
            onClick={() => {
              soundManager.playUiClick();
              onOpenGarage();
            }}
            className="px-5 py-3 rounded-xl glass-panel border border-slate-700 hover:border-amber-400 text-slate-200 hover:text-white font-race font-bold text-sm flex items-center gap-2.5 transition-all shadow-lg active:scale-95"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>GARAGE & TUNING</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUiClick();
              onOpenSettings();
            }}
            className="px-5 py-3 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white font-race font-bold text-sm flex items-center gap-2.5 transition-all shadow-lg active:scale-95"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>SETTINGS</span>
          </button>
        </div>

        {/* Quick hint */}
        <div className="hidden md:flex items-center gap-2 text-xs font-race text-slate-400 bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800">
          <span>TIP:</span>
          <span className="text-slate-300">Drift around corners to earn bonus coins & recharge Nitro!</span>
        </div>
      </div>
    </div>
  );
};
