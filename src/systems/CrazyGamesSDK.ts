/**
 * CrazyGames SDK v3 Integration Module
 * Full official compliance with CrazyGames Developer Portal requirements:
 * - SDK v3 initialization & lifecycle hooks (loadingStart/Stop, gameplayStart/Stop, happytime)
 * - Midgame interstitial ads with automatic audio muting & game pause
 * - Rewarded video ads (Revive hero, 2x Skulls, etc.) with safe fallback
 * - AdBlock & offline resilience
 */

import { soundFX } from './SoundFX';

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        init: () => Promise<void>;
        ad: {
          requestAd: (
            type: 'midgame' | 'rewarded',
            callbacks: {
              adStarted?: () => void;
              adFinished?: () => void;
              adError?: (error: any, errorData?: any) => void;
            }
          ) => void;
          hasAdblock?: () => Promise<boolean>;
        };
        game: {
          gameplayStart: () => void;
          gameplayStop: () => void;
          happytime: () => void;
          loadingStart: () => void;
          loadingStop: () => void;
        };
      };
    };
  }
}

class CrazyGamesManager {
  private isInitialized: boolean = false;
  private isAdPlaying: boolean = false;
  private soundWasMutedBeforeAd: boolean = false;
  private isGameplayActive: boolean = false;

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (window.CrazyGames?.SDK) {
        await window.CrazyGames.SDK.init();
        this.isInitialized = true;
        console.log('🎮 [CrazyGames SDK v3] Initialized successfully');
      } else {
        console.info('ℹ️ [CrazyGames SDK] Standalone/Offline mode active');
      }
    } catch (err) {
      console.warn('⚠️ [CrazyGames SDK] Initialization fallback:', err);
    }
  }

  public loadingStart(): void {
    try {
      window.CrazyGames?.SDK?.game?.loadingStart();
    } catch {}
  }

  public loadingStop(): void {
    try {
      window.CrazyGames?.SDK?.game?.loadingStop();
    } catch {}
  }

  public gameplayStart(): void {
    if (this.isGameplayActive) return;
    this.isGameplayActive = true;
    try {
      window.CrazyGames?.SDK?.game?.gameplayStart();
      console.log('▶️ [CrazyGames] gameplayStart');
    } catch {}
  }

  public gameplayStop(): void {
    if (!this.isGameplayActive) return;
    this.isGameplayActive = false;
    try {
      window.CrazyGames?.SDK?.game?.gameplayStop();
      console.log('⏹️ [CrazyGames] gameplayStop');
    } catch {}
  }

  public happyTime(): void {
    try {
      window.CrazyGames?.SDK?.game?.happytime();
      console.log('🎉 [CrazyGames] happytime celebration triggered');
    } catch {}
  }

  /**
   * Request a Midgame (Interstitial) Ad.
   * Automatically pauses physics/scene and mutes sound, then restores them.
   */
  public requestMidgameAd(onComplete?: () => void): void {
    if (!window.CrazyGames?.SDK?.ad?.requestAd) {
      onComplete?.();
      return;
    }

    this.soundWasMutedBeforeAd = soundFX.muted;
    this.isAdPlaying = true;

    // Mute game audio during ad
    try { soundFX.muted = true; } catch {}

    const pauseGame = () => {
      const g = (window as any).game;
      if (g) {
        const sc = g.scene?.getScene('MainScene');
        if (sc && sc.scene.isActive()) {
          sc.scene.pause();
        }
      }
    };

    const resumeGame = () => {
      this.isAdPlaying = false;
      try { soundFX.muted = this.soundWasMutedBeforeAd; } catch {}
      const g = (window as any).game;
      if (g) {
        const sc = g.scene?.getScene('MainScene');
        if (sc && sc.scene.isPaused()) {
          sc.scene.resume();
        }
      }
      onComplete?.();
    };

    try {
      window.CrazyGames.SDK.ad.requestAd('midgame', {
        adStarted: () => {
          pauseGame();
        },
        adFinished: () => {
          resumeGame();
        },
        adError: (error, errorData) => {
          console.warn('Midgame Ad Error:', error, errorData);
          resumeGame();
        }
      });
    } catch (e) {
      console.warn('CrazyGames requestAd error:', e);
      resumeGame();
    }
  }

  /**
   * Request a Rewarded Ad (watch for Revive or Double Skulls).
   */
  public requestRewardedAd(onRewarded: () => void, onFailed?: () => void): void {
    if (!window.CrazyGames?.SDK?.ad?.requestAd) {
      // Local/offline test environment: grant reward directly
      onRewarded();
      return;
    }

    this.soundWasMutedBeforeAd = soundFX.muted;
    this.isAdPlaying = true;
    try { soundFX.muted = true; } catch {}

    const pauseGame = () => {
      const g = (window as any).game;
      if (g) {
        const sc = g.scene?.getScene('MainScene');
        if (sc && sc.scene.isActive()) {
          sc.scene.pause();
        }
      }
    };

    const resumeGame = () => {
      this.isAdPlaying = false;
      try { soundFX.muted = this.soundWasMutedBeforeAd; } catch {}
      const g = (window as any).game;
      if (g) {
        const sc = g.scene?.getScene('MainScene');
        if (sc && sc.scene.isPaused()) {
          sc.scene.resume();
        }
      }
    };

    try {
      window.CrazyGames.SDK.ad.requestAd('rewarded', {
        adStarted: () => {
          pauseGame();
        },
        adFinished: () => {
          resumeGame();
          onRewarded();
        },
        adError: (error, errorData) => {
          console.warn('Rewarded Ad Error:', error, errorData);
          resumeGame();
          onFailed?.();
        }
      });
    } catch (e) {
      console.warn('CrazyGames requestRewardedAd error:', e);
      resumeGame();
      onFailed?.();
    }
  }
}

export const crazyGames = new CrazyGamesManager();
