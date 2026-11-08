/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { CARS } from './data/cars';
import { TRACKS } from './data/tracks';
import {
  GameScreen,
  PlayerProfile,
  GameSettings,
  VehicleTelemetry,
  CarConfig,
  CarUpgrades,
  CarCustomization,
  RaceTrack,
  InputControls,
} from './types/game';
import { RaceManagerState } from './game/raceManager';
import {
  loadPlayerProfile,
  savePlayerProfile,
  loadGameSettings,
  saveGameSettings,
} from './services/storage';
import { soundManager } from './services/audio';
import { yandexSdk } from './services/yandexSdk';

import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { Garage } from './components/Garage';
import { TrackSelect } from './components/TrackSelect';
import { RaceResults } from './components/RaceResults';
import { SettingsModal } from './components/SettingsModal';
import { PauseMenu } from './components/PauseMenu';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Persistent States
  const [profile, setProfile] = useState<PlayerProfile>(() => loadPlayerProfile());
  const [settings, setSettings] = useState<GameSettings>(() => loadGameSettings());

  // Screen & Navigation
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [activeTrack, setActiveTrack] = useState<RaceTrack | null>(null);

  // Live Gameplay Telemetry & Race State
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>({
    speedKmh: 0,
    rpm: 800,
    gear: 1,
    driftScore: 0,
    driftMultiplier: 1,
    isDrifting: false,
    nitroRemaining: 1,
    isNitroActive: false,
    position: [0, 0.4, 0],
    rotationY: 0,
    isOffroad: false,
  });

  const [raceState, setRaceState] = useState<RaceManagerState | null>(null);
  const [showRaceResults, setShowRaceResults] = useState(false);

  // Mobile Detection
  const [isMobile, setIsMobile] = useState(false);

  // Current Active Car Config
  const activeCar = CARS.find((c) => c.id === profile.selectedCarId) || CARS[0];
  const activeUpgrades = profile.carUpgrades[activeCar.id] || {
    engine: 1,
    transmission: 1,
    suspension: 1,
    brakes: 1,
    nitro: 1,
  };
  const activeCustomization = profile.carCustomizations[activeCar.id] || {
    bodyColor: '#e11d48',
    secondaryColor: '#18181b',
    rimColor: '#d4d4d8',
    neonColor: '#00f0ff',
    finish: 'gloss',
  };

  // Keyboard Inputs
  const inputRef = useRef<InputControls>({
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    nitro: false,
    reset: false,
    lookBack: false,
  });

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth <= 850;
      setIsMobile(isTouch);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save profile & settings on change
  useEffect(() => {
    savePlayerProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveGameSettings(settings);
  }, [settings]);

  // 1. Initialize 3D Engine & Yandex Games SDK
  useEffect(() => {
    if (!canvasMountRef.current) return;

    // Initialize 3D Engine
    const engine = new GameEngine(activeCar, activeUpgrades, activeCustomization, {
      container: canvasMountRef.current,
      quality: settings.graphicsQuality,
      onTelemetryUpdate: (telem) => {
        setTelemetry(telem);
      },
      onRaceUpdate: (rState) => {
        setRaceState(rState);
        if (rState.status === 'finished') {
          setShowRaceResults(true);
          yandexSdk.notifyGameplayStop();
        }
      },
    });

    engine.setCameraDistance(settings.cameraDistance);
    engine.setScreenMode('menu');
    engineRef.current = engine;

    // Initialize Yandex Games SDK
    yandexSdk.init().then(() => {
      yandexSdk.markGameReady();
    });

    // Cleanup
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Synchronize audio volumes with settings
  useEffect(() => {
    soundManager.setMasterVolume(settings.masterVolume);
    soundManager.setEngineVolume(settings.engineVolume);
    soundManager.setSfxVolume(settings.sfxVolume);
  }, [settings]);

  // Handle Race Finish: Bank earned coins & update personal best
  useEffect(() => {
    if (showRaceResults && activeTrack && raceState && raceState.status === 'finished') {
      const earned = raceState.earnedCoins;
      const finishTime = raceState.elapsedTimeMs;

      setProfile((prev) => {
        const prevBest = prev.bestTrackTimes[activeTrack.id];
        const isBetter = !prevBest || finishTime < prevBest;
        const newBestTimes = {
          ...prev.bestTrackTimes,
          [activeTrack.id]: isBetter ? finishTime : prevBest,
        };

        return {
          ...prev,
          currency: prev.currency + earned,
          bestTrackTimes: newBestTimes,
          totalRacesFinished: prev.totalRacesFinished + 1,
        };
      });
    }
  }, [showRaceResults]);

  // 2. Desktop Keyboard Event Listeners
  useEffect(() => {
    const activeKeys = new Set<string>();

    const updateInputs = () => {
      const throttle = activeKeys.has('KeyW') || activeKeys.has('ArrowUp') ? 1 : 0;
      const brake = activeKeys.has('KeyS') || activeKeys.has('ArrowDown') ? 1 : 0;

      let steer = 0;
      if (activeKeys.has('KeyA') || activeKeys.has('ArrowLeft')) steer -= 1;
      if (activeKeys.has('KeyD') || activeKeys.has('ArrowRight')) steer += 1;

      const handbrake = activeKeys.has('Space');
      const nitro = activeKeys.has('ShiftLeft') || activeKeys.has('ShiftRight');
      const reset = activeKeys.has('KeyR');
      const lookBack = activeKeys.has('KeyB');

      inputRef.current = {
        throttle,
        brake,
        steer,
        handbrake,
        nitro,
        reset,
        lookBack,
      };

      engineRef.current?.setInput(inputRef.current);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      // Escape key toggles pause
      if (e.code === 'Escape') {
        if (currentScreen === 'free_drive' || currentScreen === 'racing') {
          setIsPaused((p) => {
            const next = !p;
            if (next) {
              soundManager.pauseAll();
              yandexSdk.notifyGameplayStop();
            } else {
              soundManager.resumeAll();
              yandexSdk.notifyGameplayStart();
            }
            return next;
          });
          return;
        }
      }

      // Camera view toggle (C key)
      if (e.code === 'KeyC') {
        toggleCameraDistance();
        return;
      }

      // Vehicle reset (R key)
      if (e.code === 'KeyR') {
        engineRef.current?.resetVehicle();
        soundManager.playUiClick();
        return;
      }

      activeKeys.add(e.code);
      updateInputs();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);
      updateInputs();
    };

    const handleBlur = () => {
      activeKeys.clear();
      updateInputs();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [currentScreen]);

  // Screen Navigation handlers
  const handleStartFreeDrive = () => {
    setCurrentScreen('free_drive');
    setIsPaused(false);
    setShowRaceResults(false);
    setActiveTrack(null);
    setRaceState(null);

    engineRef.current?.stopRace();
    engineRef.current?.resetVehicle([0, 0.4, 0], 0);
    engineRef.current?.setScreenMode('free_drive');

    yandexSdk.notifyGameplayStart();
  };

  const handleStartRace = (track: RaceTrack) => {
    setActiveTrack(track);
    setCurrentScreen('racing');
    setIsPaused(false);
    setShowRaceResults(false);

    const prevBest = profile.bestTrackTimes[track.id];
    engineRef.current?.startRace(track, prevBest);
    engineRef.current?.setScreenMode('racing');

    yandexSdk.notifyGameplayStart();
  };

  const handleOpenRaceSelect = () => {
    setCurrentScreen('track_select');
    engineRef.current?.setScreenMode('menu');
  };

  const handleOpenGarage = () => {
    setCurrentScreen('garage');
    engineRef.current?.setScreenMode('garage');
  };

  const handleOpenSettings = () => {
    setCurrentScreen('settings');
  };

  const handleBackToMenu = () => {
    if (currentScreen === 'garage') {
      // Restore the actually selected vehicle after previewing locked cars.
      engineRef.current?.switchCar(activeCar, activeUpgrades, activeCustomization);
    }
    setCurrentScreen('menu');
    setIsPaused(false);
    setShowRaceResults(false);
    setActiveTrack(null);
    setRaceState(null);

    engineRef.current?.stopRace();
    engineRef.current?.setScreenMode('menu');

    yandexSdk.notifyGameplayStop();
  };

  // Car Selection & Upgrades
  const handleSelectCar = (carId: string) => {
    const selected = CARS.find((c) => c.id === carId);
    if (!selected) return;

    setProfile((prev) => ({ ...prev, selectedCarId: carId }));

    const upgrades = profile.carUpgrades[carId] || {
      engine: 1,
      transmission: 1,
      suspension: 1,
      brakes: 1,
      nitro: 1,
    };
    const customization = profile.carCustomizations[carId] || {
      bodyColor: '#e11d48',
      secondaryColor: '#18181b',
      rimColor: '#d4d4d8',
      neonColor: '#00f0ff',
      finish: 'gloss',
    };

    engineRef.current?.switchCar(selected, upgrades, customization);
  };

  const handlePreviewCar = (carId: string) => {
    const car = CARS.find((c) => c.id === carId);
    if (!car) return;
    const upgrades = profile.carUpgrades[carId] || {
      engine: 1,
      transmission: 1,
      suspension: 1,
      brakes: 1,
      nitro: 1,
    };
    const customization = profile.carCustomizations[carId] || {
      bodyColor: '#e11d48',
      secondaryColor: '#18181b',
      rimColor: '#d4d4d8',
      neonColor: 'none',
      finish: 'gloss' as const,
    };
    engineRef.current?.switchCar(car, upgrades, customization);
  };

  const handleBuyCar = (car: CarConfig): boolean => {
    if (profile.currency < car.price) return false;

    setProfile((prev) => ({
      ...prev,
      currency: prev.currency - car.price,
      unlockedCarIds: [...prev.unlockedCarIds, car.id],
      selectedCarId: car.id,
    }));

    handleSelectCar(car.id);
    return true;
  };

  const handleUpgradeCar = (
    carId: string,
    upgradeType: keyof CarUpgrades,
    cost: number
  ): boolean => {
    if (profile.currency < cost) return false;

    setProfile((prev) => {
      const currentCarUpgrades = prev.carUpgrades[carId] || {
        engine: 1,
        transmission: 1,
        suspension: 1,
        brakes: 1,
        nitro: 1,
      };
      const newUpgrades = {
        ...currentCarUpgrades,
        [upgradeType]: Math.min(5, currentCarUpgrades[upgradeType] + 1),
      };

      const updatedProfile = {
        ...prev,
        currency: prev.currency - cost,
        carUpgrades: {
          ...prev.carUpgrades,
          [carId]: newUpgrades,
        },
      };

      // Notify engine
      const car = CARS.find((c) => c.id === carId) || activeCar;
      const cust = updatedProfile.carCustomizations[carId] || activeCustomization;
      engineRef.current?.switchCar(car, newUpgrades, cust);

      return updatedProfile;
    });

    return true;
  };

  const handleUpdateCustomization = (carId: string, customization: CarCustomization) => {
    setProfile((prev) => ({
      ...prev,
      carCustomizations: {
        ...prev.carCustomizations,
        [carId]: customization,
      },
    }));
    engineRef.current?.updateCustomization(customization);
  };

  const handleAddCurrency = (amount: number) => {
    setProfile((prev) => ({ ...prev, currency: prev.currency + amount }));
  };

  const toggleCameraDistance = () => {
    soundManager.playUiClick();
    const modes: Array<'close' | 'normal' | 'far' | 'hood'> = ['close', 'normal', 'far', 'hood'];
    const currentIdx = modes.indexOf(settings.cameraDistance);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setSettings((prev) => ({ ...prev, cameraDistance: nextMode }));
    engineRef.current?.setCameraDistance(nextMode);
  };

  const handleResetVehicle = () => {
    engineRef.current?.resetVehicle();
    soundManager.playUiClick();
  };

  // Touch controls input bridge
  const handleTouchInputChange = useCallback(
    (updater: (prev: InputControls) => InputControls) => {
      const nextInput = updater(inputRef.current);
      inputRef.current = nextInput;
      engineRef.current?.setInput(nextInput);
    },
    []
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-neutral-950 font-tech">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full z-0" />

      {/* 1. MAIN MENU SCREEN */}
      {currentScreen === 'menu' && (
        <MainMenu
          profile={profile}
          onStartFreeDrive={handleStartFreeDrive}
          onOpenRaceSelect={handleOpenRaceSelect}
          onOpenGarage={handleOpenGarage}
          onOpenSettings={handleOpenSettings}
          onAddCurrency={handleAddCurrency}
        />
      )}

      {/* 2. TRACK SELECTION MODAL */}
      {currentScreen === 'track_select' && (
        <TrackSelect
          bestTimes={profile.bestTrackTimes}
          onSelectTrack={handleStartRace}
          onBack={handleBackToMenu}
        />
      )}

      {/* 3. GARAGE & TUNING SCREEN */}
      {currentScreen === 'garage' && (
        <Garage
          profile={profile}
          activeCarConfig={activeCar}
          onSelectCar={handleSelectCar}
          onPreviewCar={handlePreviewCar}
          onBuyCar={handleBuyCar}
          onUpgradeCar={handleUpgradeCar}
          onUpdateCustomization={handleUpdateCustomization}
          onAddCurrency={handleAddCurrency}
          onBack={handleBackToMenu}
        />
      )}

      {/* 4. ACTIVE GAMEPLAY HUD (Free Drive or Racing) */}
      {(currentScreen === 'free_drive' || currentScreen === 'racing') && (
        <HUD
          screen={currentScreen}
          telemetry={telemetry}
          raceState={raceState}
          checkpoints={activeTrack?.checkpoints}
          currency={profile.currency}
          isMobile={isMobile}
          onPause={() => {
            soundManager.playUiClick();
            setIsPaused(true);
            soundManager.pauseAll();
            yandexSdk.notifyGameplayStop();
          }}
          onReset={handleResetVehicle}
          onToggleCamera={toggleCameraDistance}
          onInputChange={handleTouchInputChange}
        />
      )}

      {/* 5. PAUSE MENU */}
      {isPaused && (
        <PauseMenu
          isRacing={currentScreen === 'racing'}
          onResume={() => {
            setIsPaused(false);
            soundManager.resumeAll();
            yandexSdk.notifyGameplayStart();
          }}
          onRestart={() => {
            setIsPaused(false);
            soundManager.resumeAll();
            if (activeTrack) {
              handleStartRace(activeTrack);
            } else {
              handleResetVehicle();
            }
          }}
          onToggleCamera={toggleCameraDistance}
          onMainMenu={handleBackToMenu}
        />
      )}

      {/* 6. RACE RESULTS CELEBRATION MODAL */}
      {showRaceResults && activeTrack && raceState && (
        <RaceResults
          track={activeTrack}
          finishTimeMs={raceState.elapsedTimeMs}
          isNewRecord={raceState.isNewRecord}
          baseRewardCoins={activeTrack.rewardCoins}
          onRetry={() => {
            setShowRaceResults(false);
            handleStartRace(activeTrack);
          }}
          onContinue={() => {
            setShowRaceResults(false);
            handleBackToMenu();
          }}
          onAddCurrency={handleAddCurrency}
        />
      )}

      {/* 7. SETTINGS MODAL */}
      {currentScreen === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSettings) => {
            setSettings(newSettings);
            engineRef.current?.setCameraDistance(newSettings.cameraDistance);
          }}
          onClose={() => {
            setCurrentScreen('menu');
          }}
        />
      )}
    </div>
  );
}
