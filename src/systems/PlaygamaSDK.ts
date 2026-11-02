/**
 * Playgama Bridge SDK Integration Module
 * Full compliance with Playgama / GamePush Bridge requirements:
 * - SDK initialization via bridge.initialize()
 * - Game ready notification via bridge.platform.sendMessage('game_ready')
 * - Interstitials via bridge.advertisement.showInterstitial()
 * - Rewarded Ads via bridge.advertisement.showRewarded() with state listeners
 * - Unified Cloud Storage via bridge.storage.get/set with memory cache fallback
 * - Device Detection via bridge.device.type
 */

import { soundFX } from './SoundFX';

declare global {
  interface Window {
    bridge?: {
      initialize: () => Promise<void>;
      platform: {
        id: string;
        language: string;
        payload: any;
        sendMessage: (message: 'game_ready' | string) => void;
      };
      device: {
        type: 'desktop' | 'mobile' | 'tablet';
      };
      storage: {
        get: (key: string | string[], storageType?: string) => Promise<any>;
        set: (key: string, value: any, storageType?: string) => Promise<void>;
        delete: (key: string | string[], storageType?: string) => Promise<void>;
      };
      advertisement: {
        interstitialState: 'loading' | 'opened' | 'closed' | 'failed';
        rewardedState: 'loading' | 'opened' | 'closed' | 'rewarded' | 'failed';
        isInterstitialSupported: boolean;
        isRewardedSupported: boolean;
        showInterstitial: (placement?: string) => void;
        showRewarded: (placement?: string) => void;
        on: (event: string, callback: (...args: any[]) => void) => void;
        off: (event: string, callback: (...args: any[]) => void) => void;
      };
    };
  }
}

export class PlaygamaManager {
  private isInitialized: boolean = false;
  private isAdPlaying: boolean = false;
  private soundWasMutedBeforeAd: boolean = false;
  private memoryCache: Map<string, string> = new Map();
  private pendingRewardedCallback: (() => void) | null = null;
  private pendingRewardedFailedCallback: (() => void) | null = null;
  private isRewardedGranted: boolean = false;

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.bridge !== 'undefined';
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.isAvailable()) {
      console.info('ℹ️ [Playgama Bridge] Not running in Playgama Bridge environment.');
      return;
    }

    try {
      console.log('🔄 [Playgama Bridge] Initializing Playgama Bridge...');
      await window.bridge!.initialize();
      this.isInitialized = true;
      console.log('✅ [Playgama Bridge] Initialized. Platform:', window.bridge!.platform.id);

      // Setup ad event listeners
      this.setupAdListeners();

      // Prefetch common cloud save keys into memory cache
      await this.warmupStorageCache();

      // Signal game is ready
      try {
        window.bridge!.platform.sendMessage('game_ready');
      } catch {}
    } catch (err) {
      console.warn('⚠️ [Playgama Bridge] initialize fallback:', err);
    }
  }

  private setupAdListeners(): void {
    if (!this.isAvailable()) return;

    try {
      // Interstitial state events
      window.bridge!.advertisement.on('interstitialStateChanged', (state: string) => {
        console.log('[Playgama Ad] Interstitial state:', state);
        if (state === 'opened') {
          this.pauseGame();
        } else if (state === 'closed' || state === 'failed') {
          this.resumeGame();
        }
      });

      // Rewarded ad state events
      window.bridge!.advertisement.on('rewardedStateChanged', (state: string) => {
        console.log('[Playgama Ad] Rewarded state:', state);
        if (state === 'opened') {
          this.pauseGame();
          this.isRewardedGranted = false;
        } else if (state === 'rewarded') {
          this.isRewardedGranted = true;
          console.log('🎁 [Playgama Ad] Reward granted by platform!');
        } else if (state === 'closed') {
          this.resumeGame();
          if (this.isRewardedGranted) {
            this.pendingRewardedCallback?.();
          } else {
            if (this.pendingRewardedFailedCallback) {
              this.pendingRewardedFailedCallback();
            } else {
              // Graceful fallback reward
              this.pendingRewardedCallback?.();
            }
          }
          this.pendingRewardedCallback = null;
          this.pendingRewardedFailedCallback = null;
        } else if (state === 'failed') {
          this.resumeGame();
          // Fallback reward ensures players are never stuck
          if (this.pendingRewardedFailedCallback) {
            this.pendingRewardedFailedCallback();
          } else {
            this.pendingRewardedCallback?.();
          }
          this.pendingRewardedCallback = null;
          this.pendingRewardedFailedCallback = null;
        }
      });
    } catch (e) {
      console.warn('[Playgama Ad] Error attaching ad listeners:', e);
    }
  }

  // ── Device Detection ──
  public isMobile(): boolean {
    if (this.isAvailable()) {
      try {
        const type = window.bridge!.device.type;
        return type === 'mobile' || type === 'tablet';
      } catch {}
    }
    return false;
  }

  // ── Storage Cache & Sync ──
  private async warmupStorageCache(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const keys = ['ragdoll_archers_save_v1', 'ragdoll_archers_sound_muted', 'ragdoll_archers_games_played'];
      for (const k of keys) {
        try {
          const val = await window.bridge!.storage.get(k);
          if (val !== null && val !== undefined) {
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            this.memoryCache.set(k, strVal);
            try { localStorage.setItem(k, strVal); } catch {}
          } else {
            const localVal = localStorage.getItem(k);
            if (localVal !== null) {
              this.memoryCache.set(k, localVal);
              window.bridge!.storage.set(k, localVal).catch(() => {});
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn('⚠️ [Playgama Storage] Warmup fallback:', e);
    }
  }

  public getItem(key: string): string | null {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) || null;
    }
    try {
      const local = localStorage.getItem(key);
      if (local !== null) {
        this.memoryCache.set(key, local);
        return local;
      }
    } catch {}
    return null;
  }

  public setItem(key: string, value: string): void {
    this.memoryCache.set(key, value);
    try { localStorage.setItem(key, value); } catch {}
    if (this.isAvailable()) {
      try {
        window.bridge!.storage.set(key, value).catch(() => {});
      } catch {}
    }
  }

  public removeItem(key: string): void {
    this.memoryCache.delete(key);
    try { localStorage.removeItem(key); } catch {}
    if (this.isAvailable()) {
      try {
        window.bridge!.storage.delete(key).catch(() => {});
      } catch {}
    }
  }

  public clear(): void {
    this.memoryCache.clear();
    try { localStorage.clear(); } catch {}
  }

  // ── Ad Handlers ──
  private pauseGame(): void {
    this.isAdPlaying = true;
    this.soundWasMutedBeforeAd = soundFX.muted;
    try { soundFX.muted = true; } catch {}
    const g = (window as any).game;
    if (g) {
      const sc = g.scene?.getScene('MainScene');
      if (sc && sc.scene.isActive()) {
        sc.scene.pause();
      }
    }
  }

  private resumeGame(): void {
    this.isAdPlaying = false;
    try { soundFX.muted = this.soundWasMutedBeforeAd; } catch {}
    const g = (window as any).game;
    if (g) {
      const sc = g.scene?.getScene('MainScene');
      if (sc && sc.scene.isPaused()) {
        sc.scene.resume();
      }
    }
  }

  public requestMidgameAd(onComplete?: () => void): void {
    if (!this.isAvailable()) {
      onComplete?.();
      return;
    }

    try {
      if (window.bridge!.advertisement.isInterstitialSupported) {
        window.bridge!.advertisement.showInterstitial();
      } else {
        onComplete?.();
      }
    } catch (e) {
      console.warn('[Playgama Ad] showInterstitial error:', e);
      onComplete?.();
    }
  }

  public requestRewardedAd(onRewarded: () => void, onFailed?: () => void): void {
    if (!this.isAvailable()) {
      onRewarded();
      return;
    }

    this.pendingRewardedCallback = onRewarded;
    this.pendingRewardedFailedCallback = onFailed || null;

    try {
      if (window.bridge!.advertisement.isRewardedSupported) {
        window.bridge!.advertisement.showRewarded();
      } else {
        console.warn('[Playgama Ad] Rewarded ads not supported on current platform, granting reward directly.');
        onRewarded();
      }
    } catch (e) {
      console.warn('[Playgama Ad] showRewarded error:', e);
      onRewarded();
    }
  }
}

export const playgamaSDK = new PlaygamaManager();
