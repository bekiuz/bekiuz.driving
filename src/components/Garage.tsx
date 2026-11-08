/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Check, Lock, Sparkles, Wrench, Palette, Gift, ChevronRight, ChevronLeft } from 'lucide-react';
import { CarConfig, CarCustomization, CarUpgrades, PlayerProfile } from '../types/game';
import { CARS, UPGRADE_PRICES, COLOR_PALETTES, NEON_COLORS, RIM_COLORS } from '../data/cars';
import { soundManager } from '../services/audio';
import { yandexSdk } from '../services/yandexSdk';

interface GarageProps {
  profile: PlayerProfile;
  activeCarConfig: CarConfig;
  onSelectCar: (carId: string) => void;
  onBuyCar: (car: CarConfig) => boolean;
  onUpgradeCar: (carId: string, upgradeType: keyof CarUpgrades, cost: number) => boolean;
  onUpdateCustomization: (carId: string, customization: CarCustomization) => void;
  onAddCurrency: (amount: number) => void;
  onBack: () => void;
}

export const Garage: React.FC<GarageProps> = ({
  profile,
  activeCarConfig,
  onSelectCar,
  onBuyCar,
  onUpgradeCar,
  onUpdateCustomization,
  onAddCurrency,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'tuning' | 'paint'>('tuning');
  const [previewCarIndex, setPreviewCarIndex] = useState(() => {
    const idx = CARS.findIndex((c) => c.id === activeCarConfig.id);
    return idx >= 0 ? idx : 0;
  });

  const previewCar = CARS[previewCarIndex];
  const isUnlocked = profile.unlockedCarIds.includes(previewCar.id);
  const isSelected = profile.selectedCarId === previewCar.id;

  const currentUpgrades = profile.carUpgrades[previewCar.id] || {
    engine: 1,
    transmission: 1,
    suspension: 1,
    brakes: 1,
    nitro: 1,
  };

  const currentCustomization = profile.carCustomizations[previewCar.id] || {
    bodyColor: '#e11d48',
    secondaryColor: '#18181b',
    rimColor: '#d4d4d8',
    neonColor: '#00f0ff',
    finish: 'gloss',
  };

  const handlePrevCar = () => {
    soundManager.playUiClick();
    const nextIdx = (previewCarIndex - 1 + CARS.length) % CARS.length;
    setPreviewCarIndex(nextIdx);
    onSelectCar(CARS[nextIdx].id);
  };

  const handleNextCar = () => {
    soundManager.playUiClick();
    const nextIdx = (previewCarIndex + 1) % CARS.length;
    setPreviewCarIndex(nextIdx);
    onSelectCar(CARS[nextIdx].id);
  };

  const handleBuy = () => {
    if (profile.currency >= previewCar.price) {
      const ok = onBuyCar(previewCar);
      if (ok) {
        soundManager.playUpgradeSound();
      }
    }
  };

  const handleSelect = () => {
    soundManager.playUiClick();
    onSelectCar(previewCar.id);
  };

  const handleUpgrade = (type: keyof CarUpgrades) => {
    const currentLevel = currentUpgrades[type];
    if (currentLevel >= 5) return;
    const cost = UPGRADE_PRICES[type][currentLevel - 1];
    if (profile.currency >= cost) {
      const ok = onUpgradeCar(previewCar.id, type, cost);
      if (ok) {
        soundManager.playUpgradeSound();
      }
    }
  };

  const handleColorChange = (hex: string) => {
    soundManager.playUiClick();
    const next = { ...currentCustomization, bodyColor: hex };
    onUpdateCustomization(previewCar.id, next);
  };

  const handleFinishChange = (finish: 'gloss' | 'metallic' | 'matte') => {
    soundManager.playUiClick();
    const next = { ...currentCustomization, finish };
    onUpdateCustomization(previewCar.id, next);
  };

  const handleRimColorChange = (hex: string) => {
    soundManager.playUiClick();
    const next = { ...currentCustomization, rimColor: hex };
    onUpdateCustomization(previewCar.id, next);
  };

  const handleNeonColorChange = (hex: string) => {
    soundManager.playUiClick();
    const next = { ...currentCustomization, neonColor: hex };
    onUpdateCustomization(previewCar.id, next);
  };

  const handleAdBonus = () => {
    soundManager.playUiClick();
    yandexSdk.showRewardedAd({
      onRewarded: () => {
        onAddCurrency(500);
        soundManager.playUpgradeSound();
      },
    });
  };

  // Stat calculations
  const engineMult = 1 + (currentUpgrades.engine - 1) * 0.08;
  const transMult = 1 + (currentUpgrades.transmission - 1) * 0.07;
  const suspMult = 1 + (currentUpgrades.suspension - 1) * 0.06;
  const brakeMult = 1 + (currentUpgrades.brakes - 1) * 0.08;

  const currentTopSpeed = Math.round(previewCar.baseStats.topSpeed * engineMult);
  const currentAccel = (previewCar.baseStats.acceleration * transMult).toFixed(1);
  const currentHandling = (previewCar.baseStats.handling * suspMult).toFixed(1);
  const currentBraking = (previewCar.baseStats.braking * brakeMult).toFixed(1);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* Top Bar */}
      <div className="flex justify-between items-center pointer-events-auto">
        <button
          onClick={() => {
            soundManager.playUiClick();
            onBack();
          }}
          className="px-4 py-2 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white font-race text-sm flex items-center gap-2 shadow-lg active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO MENU</span>
        </button>

        {/* Currency & Bonus Ad */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAdBonus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-race font-extrabold text-xs shadow-md transition-all active:scale-95"
          >
            <Gift className="w-4 h-4 animate-bounce" />
            <span>+500 COINS</span>
          </button>

          <div className="px-4 py-2 rounded-xl glass-panel border border-amber-500/40 flex items-center gap-2 shadow-xl">
            <span className="text-amber-400 font-race font-bold">$</span>
            <span className="font-race font-black text-amber-300 text-lg">
              {profile.currency.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Center: Car Switcher Arrows & Name */}
      <div className="flex justify-between items-center px-2 pointer-events-auto my-auto">
        <button
          onClick={handlePrevCar}
          className="w-12 h-12 rounded-full glass-panel border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-xl active:scale-90"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-[11px] font-race text-cyan-400 font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-slate-900/80 border border-cyan-500/30">
            {previewCar.category}
          </span>
          <h2 className="font-race font-black text-3xl sm:text-4xl text-white tracking-wide mt-1">
            {previewCar.name}
          </h2>

          {/* Action: Select or Buy */}
          <div className="mt-3">
            {!isUnlocked ? (
              <button
                onClick={handleBuy}
                disabled={profile.currency < previewCar.price}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-950 font-race font-black text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span>UNLOCK FOR ${previewCar.price.toLocaleString()}</span>
              </button>
            ) : isSelected ? (
              <div className="px-5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-race font-bold text-xs flex items-center gap-1.5 shadow-lg">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>SELECTED VEHICLE</span>
              </div>
            ) : (
              <button
                onClick={handleSelect}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-race font-black text-sm shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95"
              >
                SELECT VEHICLE
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleNextCar}
          className="w-12 h-12 rounded-full glass-panel border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white flex items-center justify-center transition-all shadow-xl active:scale-90"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Panel: Specs & Tabs (Tuning / Customization) */}
      <div className="w-full max-w-4xl mx-auto glass-panel rounded-3xl border border-slate-800 p-4 sm:p-5 pointer-events-auto shadow-2xl flex flex-col gap-4">
        {/* Specs Overview Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center border-b border-slate-800 pb-3">
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
            <div className="text-[10px] font-race text-slate-400">TOP SPEED</div>
            <div className="text-lg font-race font-black text-white">{currentTopSpeed} <span className="text-[10px] text-cyan-400">KM/H</span></div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
            <div className="text-[10px] font-race text-slate-400">ACCELERATION</div>
            <div className="text-lg font-race font-black text-white">{currentAccel} <span className="text-[10px] text-cyan-400">PTS</span></div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
            <div className="text-[10px] font-race text-slate-400">HANDLING</div>
            <div className="text-lg font-race font-black text-white">{currentHandling} <span className="text-[10px] text-cyan-400">PTS</span></div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
            <div className="text-[10px] font-race text-slate-400">BRAKING</div>
            <div className="text-lg font-race font-black text-white">{currentBraking} <span className="text-[10px] text-cyan-400">PTS</span></div>
          </div>
        </div>

        {/* Tab Header */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              soundManager.playUiClick();
              setActiveTab('tuning');
            }}
            className={`flex-1 py-2 rounded-xl font-race font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'tuning'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>PERFORMANCE TUNING</span>
          </button>

          <button
            onClick={() => {
              soundManager.playUiClick();
              setActiveTab('paint');
            }}
            className={`flex-1 py-2 rounded-xl font-race font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'paint'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>PAINT & STYLING</span>
          </button>
        </div>

        {/* Tab 1: Performance Tuning */}
        {activeTab === 'tuning' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-1">
            {(['engine', 'transmission', 'suspension', 'brakes', 'nitro'] as Array<keyof CarUpgrades>).map((type) => {
              const level = currentUpgrades[type];
              const isMax = level >= 5;
              const cost = isMax ? 0 : UPGRADE_PRICES[type][level - 1];
              const canAfford = profile.currency >= cost;

              return (
                <div key={type} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-race font-bold text-xs text-white uppercase">{type}</span>
                    <span className="font-race text-[10px] text-cyan-400">LVL {level}/5</span>
                  </div>

                  {/* Level dots */}
                  <div className="flex gap-1 my-2">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-1.5 flex-1 rounded-full ${
                          lvl <= level ? 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpgrade(type)}
                    disabled={isMax || !canAfford || !isUnlocked}
                    className="w-full py-1.5 rounded-lg font-race font-bold text-xs flex items-center justify-center gap-1 transition-all bg-slate-800 hover:bg-cyan-600 disabled:opacity-40 text-white"
                  >
                    {isMax ? 'MAXED' : !isUnlocked ? 'CAR LOCKED' : `UPGRADE ($${cost})`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Paint & Styling */}
        {activeTab === 'paint' && (
          <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
            {/* Body Colors */}
            <div>
              <div className="text-[11px] font-race text-slate-400 mb-1.5">BODY COLOR</div>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTES.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => handleColorChange(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 ${
                      currentCustomization.bodyColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Finish Type */}
            <div>
              <div className="text-[11px] font-race text-slate-400 mb-1.5">PAINT FINISH</div>
              <div className="flex gap-2">
                {(['gloss', 'metallic', 'matte'] as const).map((finish) => (
                  <button
                    key={finish}
                    onClick={() => handleFinishChange(finish)}
                    className={`px-3 py-1 rounded-lg font-race text-xs uppercase ${
                      currentCustomization.finish === finish
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {finish}
                  </button>
                ))}
              </div>
            </div>

            {/* Neon Underglow */}
            <div>
              <div className="text-[11px] font-race text-slate-400 mb-1.5">NEON UNDERGLOW</div>
              <div className="flex flex-wrap gap-2">
                {NEON_COLORS.map((n) => (
                  <button
                    key={n.name}
                    onClick={() => handleNeonColorChange(n.hex)}
                    style={{ backgroundColor: n.hex === 'none' ? '#1e293b' : n.hex }}
                    className={`px-2.5 py-1 rounded-lg font-race text-[11px] text-white border ${
                      currentCustomization.neonColor === n.hex ? 'border-white font-bold' : 'border-transparent'
                    }`}
                  >
                    {n.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
