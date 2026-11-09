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
    LoadingAPI?: { ready: () => void };
    GameplayAPI?: { start: () => void; stop: () => void };
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
        onClose?: (wasShown: boolean) => void;
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
  private initializationPromise: Promise<boolean> | null = null;
  private onAdStateChangeListeners: Array<(isAdActive: boolean) => void> = [];

  constructor() {
    void this.init();
  }

  public init(): Promise<boolean> {
    if (this.isInitialized) return Promise.resolve(this.isAvailable);
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      if (typeof window === 'undefined' || !window.YaGames) {
        this.isAvailable = false;
        return false;
      }

      try {
        this.ysdk = await window.YaGames.init();
        this.isAvailable = true;
        this.isInitialized = true;
        console.log('[YandexSDK] Initialized successfully');
        return true;
      } catch (err) {
        this.ysdk = null;
        this.isAvailable = false;
        this.isInitialized = false;
        console.warn('[YandexSDK] Failed to initialize official SDK:', err);
        return false;
      }
    })().finally(() => {
      this.initializationPromise = null;
    });

    return this.initializationPromise;
  }

  public markGameReady() {
    try {
      this.ysdk?.features?.LoadingAPI?.ready();
    } catch (e) {
      console.warn('[YandexSDK] Error calling LoadingAPI.ready', e);
    }
  }

  public notifyGameplayStart() {
    try {
      this.ysdk?.features?.GameplayAPI?.start();
    } catch (e) {
      console.warn('[YandexSDK] Error calling GameplayAPI.start', e);
    }
  }

  public notifyGameplayStop() {
    try {
      this.ysdk?.features?.GameplayAPI?.stop();
    } catch (e) {
      console.warn('[YandexSDK] Error calling GameplayAPI.stop', e);
    }
  }

  public onAdStateChange(listener: (isAdActive: boolean) => void): () => void {
    this.onAdStateChangeListeners.push(listener);
    return () => {
      this.onAdStateChangeListeners = this.onAdStateChangeListeners.filter((l) => l !== listener);
    };
  }

  private setAdActive(active: boolean) {
    this.onAdStateChangeListeners.forEach((listener) => listener(active));
  }

  public showFullscreenAd(callbacks?: { onClosed?: () => void; onError?: () => void }) {
    if (!this.ysdk?.adv) {
      // Only local development may simulate an interstitial ad lifecycle.
      if (import.meta.env.DEV) {
        this.setAdActive(true);
        window.setTimeout(() => {
          this.setAdActive(false);
          callbacks?.onClosed?.();
        }, 500);
      } else {
        console.warn('[YandexSDK] Fullscreen ad unavailable: SDK is not ready.');
        this.setAdActive(false);
        callbacks?.onError?.();
      }
      return;
    }

    this.setAdActive(true);
    try {
      this.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => this.setAdActive(true),
          onClose: () => {
            this.setAdActive(false);
            callbacks?.onClosed?.();
          },
          onError: (err) => {
            console.warn('[YandexSDK] Fullscreen ad error:', err);
            this.setAdActive(false);
            callbacks?.onError?.();
          },
        },
      });
    } catch (err) {
      console.warn('[YandexSDK] Fullscreen ad call failed:', err);
      this.setAdActive(false);
      callbacks?.onError?.();
    }
  }

  public showRewardedAd(options: {
    onRewarded: () => void;
    onClose?: (wasShown?: boolean) => void;
    onError?: () => void;
  }) {
    if (!this.ysdk?.adv) {
      // Never grant in-game currency in a published build unless Yandex confirms
      // that the rewarded-video callback actually fired.
      if (import.meta.env.DEV) {
        this.setAdActive(true);
        window.setTimeout(() => {
          this.setAdActive(false);
          options.onRewarded();
          options.onClose?.(true);
        }, 600);
      } else {
        console.warn('[YandexSDK] Rewarded ad unavailable: SDK is not ready.');
        this.setAdActive(false);
        options.onError?.();
      }
      return;
    }

    this.setAdActive(true);
    try {
      this.ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => this.setAdActive(true),
          onRewarded: () => {
            options.onRewarded();
          },
          onClose: (wasShown) => {
            this.setAdActive(false);
            options.onClose?.(wasShown);
          },
          onError: (err) => {
            console.warn('[YandexSDK] Rewarded ad error:', err);
            this.setAdActive(false);
            options.onError?.();
          },
        },
      });
    } catch (err) {
      console.warn('[YandexSDK] Rewarded ad call failed:', err);
      this.setAdActive(false);
      options.onError?.();
    }
  }

  public isSdkReady(): boolean {
    return this.isAvailable && this.ysdk !== null;
  }
}

export const yandexSdk = new YandexGamesService();
