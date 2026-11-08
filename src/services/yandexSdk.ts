/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

declare global {
  interface Window {
    YaGames?: {
      init: () => Promise<YandexSDK>;
    };
  }
}

export interface YandexSDK {
  features: {
    LoadingAPI?: {
      ready: () => void;
    };
    GameplayAPI?: {
      start: () => void;
      stop: () => void;
    };
  };
  adv: {
    showFullscreenAdv: (options: {
      callbacks?: {
        onOpen?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (error: unknown) => void;
      };
    }) => void;
    showRewardedVideo: (options: {
      callbacks?: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: () => void;
        onError?: (error: unknown) => void;
      };
    }) => void;
  };
  getPlayer?: (options?: { signed?: boolean }) => Promise<unknown>;
}

class YandexGamesService {
  private ysdk: YandexSDK | null = null;
  private isInitialized = false;
  private isAvailable = false;
  private onAdStateChangeListeners: Array<(isAdActive: boolean) => void> = [];

  constructor() {
    this.init();
  }

  public async init(): Promise<boolean> {
    if (this.isInitialized) return this.isAvailable;

    try {
      if (typeof window !== 'undefined' && window.YaGames) {
        this.ysdk = await window.YaGames.init();
        this.isAvailable = true;
        this.isInitialized = true;
        console.log('[YandexSDK] Initialized successfully');
        return true;
      }
    } catch (err) {
      console.warn('[YandexSDK] Failed to initialize official SDK, falling back to standalone mode:', err);
    }

    this.isInitialized = true;
    this.isAvailable = false;
    return false;
  }

  public markGameReady() {
    if (this.ysdk?.features?.LoadingAPI) {
      try {
        this.ysdk.features.LoadingAPI.ready();
        console.log('[YandexSDK] LoadingAPI.ready() called');
      } catch (e) {
        console.warn('[YandexSDK] Error calling LoadingAPI.ready', e);
      }
    }
  }

  public notifyGameplayStart() {
    if (this.ysdk?.features?.GameplayAPI) {
      try {
        this.ysdk.features.GameplayAPI.start();
        console.log('[YandexSDK] GameplayAPI.start() called');
      } catch (e) {
        console.warn('[YandexSDK] Error calling GameplayAPI.start', e);
      }
    }
  }

  public notifyGameplayStop() {
    if (this.ysdk?.features?.GameplayAPI) {
      try {
        this.ysdk.features.GameplayAPI.stop();
        console.log('[YandexSDK] GameplayAPI.stop() called');
      } catch (e) {
        console.warn('[YandexSDK] Error calling GameplayAPI.stop', e);
      }
    }
  }

  public onAdStateChange(listener: (isAdActive: boolean) => void): () => void {
    this.onAdStateChangeListeners.push(listener);
    return () => {
      this.onAdStateChangeListeners = this.onAdStateChangeListeners.filter(l => l !== listener);
    };
  }

  private setAdActive(active: boolean) {
    this.onAdStateChangeListeners.forEach(listener => listener(active));
  }

  public showFullscreenAd(callbacks?: { onClosed?: () => void; onError?: () => void }) {
    if (!this.ysdk?.adv) {
      // SDK not present in local preview; simulate quick ad lifecycle
      console.log('[YandexSDK: Standalone] Fullscreen ad requested (simulation)');
      this.setAdActive(true);
      setTimeout(() => {
        this.setAdActive(false);
        callbacks?.onClosed?.();
      }, 500);
      return;
    }

    this.setAdActive(true);
    this.ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => {
          this.setAdActive(true);
        },
        onClose: () => {
          this.setAdActive(false);
          callbacks?.onClosed?.();
        },
        onError: (err) => {
          console.warn('[YandexSDK] Fullscreen Ad error:', err);
          this.setAdActive(false);
          callbacks?.onError?.();
        },
      },
    });
  }

  public showRewardedAd(options: {
    onRewarded: () => void;
    onClose?: () => void;
    onError?: () => void;
  }) {
    if (!this.ysdk?.adv) {
      // Standalone simulation for testing rewarding flows
      console.log('[YandexSDK: Standalone] Rewarded ad requested (simulating success reward)');
      this.setAdActive(true);
      setTimeout(() => {
        this.setAdActive(false);
        options.onRewarded();
        options.onClose?.();
      }, 600);
      return;
    }

    this.setAdActive(true);
    this.ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => {
          this.setAdActive(true);
        },
        onRewarded: () => {
          console.log('[YandexSDK] User earned reward!');
          options.onRewarded();
        },
        onClose: () => {
          this.setAdActive(false);
          options.onClose?.();
        },
        onError: (err) => {
          console.warn('[YandexSDK] Rewarded Ad error:', err);
          this.setAdActive(false);
          options.onError?.();
        },
      },
    });
  }

  public isSdkReady(): boolean {
    return this.isAvailable && this.ysdk !== null;
  }
}

export const yandexSdk = new YandexGamesService();
