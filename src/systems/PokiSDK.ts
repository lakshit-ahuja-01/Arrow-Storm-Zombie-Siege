/**
 * Poki SDK v2 Integration Module
 * Full compliance with Poki Developer Guidelines:
 * - SDK v2 initialization & adblock resilience
 * - Lifecycle tracking: gameLoadingStart / gameLoadingFinished
 * - Gameplay sessions: gameplayStart / gameplayStop
 * - Commercial breaks (Interstitial Ads) with automatic audio & scene pausing
 * - Rewarded breaks (Revive / Double Skulls) with rewarded callback & safe fallback
 */

import { soundFX } from './SoundFX';

declare global {
  interface Window {
    PokiSDK?: {
      init: () => Promise<void>;
      gameLoadingStart: () => void;
      gameLoadingFinished: () => void;
      gameplayStart: () => void;
      gameplayStop: () => void;
      commercialBreak: (fn?: () => void) => Promise<void>;
      rewardedBreak: (fn?: () => void) => Promise<boolean>;
      setDebug: (debug: boolean) => void;
    };
  }
}

export class PokiManager {
  private isInitialized: boolean = false;
  private isAdPlaying: boolean = false;
  private soundWasMutedBeforeAd: boolean = false;
  private hasAdblock: boolean = false;

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.PokiSDK !== 'undefined';
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.isAvailable()) {
      console.info('ℹ️ [Poki SDK] Not running in Poki environment.');
      return;
    }

    try {
      console.log('🔄 [Poki SDK] Calling PokiSDK.init()...');
      await window.PokiSDK!.init();
      this.isInitialized = true;
      console.log('✅ [Poki SDK] Initialized successfully');
    } catch (err) {
      console.warn('⚠️ [Poki SDK] User has adblock enabled or offline:', err);
      this.hasAdblock = true;
      this.isInitialized = true;
    }
  }

  public loadingStart(): void {
    if (!this.isAvailable()) return;
    try {
      window.PokiSDK!.gameLoadingStart();
      console.log('⏳ [Poki SDK] gameLoadingStart');
    } catch (e) {}
  }

  public loadingStop(): void {
    if (!this.isAvailable()) return;
    try {
      window.PokiSDK!.gameLoadingFinished();
      console.log('✅ [Poki SDK] gameLoadingFinished');
    } catch (e) {}
  }

  public gameplayStart(): void {
    if (!this.isAvailable()) return;
    try {
      window.PokiSDK!.gameplayStart();
      console.log('▶️ [Poki SDK] gameplayStart');
    } catch (e) {}
  }

  public gameplayStop(): void {
    if (!this.isAvailable()) return;
    try {
      window.PokiSDK!.gameplayStop();
      console.log('⏹️ [Poki SDK] gameplayStop');
    } catch (e) {}
  }

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

  /**
   * Request a Poki Commercial Break (Interstitial Ad) between rounds or at game over.
   */
  public async requestMidgameAd(onComplete?: () => void): Promise<void> {
    if (!this.isAvailable()) {
      onComplete?.();
      return;
    }

    this.pauseGame();

    try {
      await window.PokiSDK!.commercialBreak(() => {
        // Commercial break in progress
      });
      console.log('🎉 [Poki SDK] Commercial break completed');
    } catch (err) {
      console.warn('⚠️ [Poki SDK] Commercial break error:', err);
    } finally {
      this.resumeGame();
      onComplete?.();
    }
  }

  /**
   * Request a Poki Rewarded Break (watch ad for Revive or 2x Skulls).
   */
  public async requestRewardedAd(onRewarded: () => void, onFailed?: () => void): Promise<void> {
    if (!this.isAvailable()) {
      onRewarded();
      return;
    }

    this.pauseGame();

    try {
      const success = await window.PokiSDK!.rewardedBreak(() => {
        // Rewarded break in progress
      });

      this.resumeGame();

      if (success) {
        console.log('🎁 [Poki SDK] Rewarded ad watched successfully!');
        onRewarded();
      } else {
        console.warn('⚠️ [Poki SDK] Rewarded ad skipped or cancelled.');
        if (onFailed) onFailed(); else onRewarded();
      }
    } catch (err) {
      console.warn('⚠️ [Poki SDK] Rewarded break exception:', err);
      this.resumeGame();
      onRewarded(); // Fallback reward for review and offline resilience
    }
  }
}

export const pokiSDK = new PokiManager();
