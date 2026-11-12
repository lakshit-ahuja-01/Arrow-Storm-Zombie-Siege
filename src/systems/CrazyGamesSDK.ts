/**
 * CrazyGames SDK v3 Integration Module
 * Full official compliance with CrazyGames Developer Portal requirements:
 * - SDK v3 initialization & lifecycle hooks (loadingStart/Stop, gameplayStart/Stop, happytime)
 * - Midgame interstitial ads with automatic audio muting & game pause
 * - Rewarded video ads (Revive hero, 2x Skulls, etc.) with safe fallback
 * - AdBlock & offline resilience
 */

import { soundFX } from './SoundFX';
import { fbInstant } from './FBInstantSDK';
import { pokiSDK } from './PokiSDK';
import { playgamaSDK } from './PlaygamaSDK';
import { youtubePlayables } from './YouTubePlayablesSDK';

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
        user?: {
          getSystemInfo: () => Promise<{
            device?: { type?: 'desktop' | 'tablet' | 'mobile' };
            os?: { name?: string };
            browser?: { name?: string };
          }>;
        };
        data?: {
          getItem: (key: string) => string | null;
          setItem: (key: string, value: string) => void;
          removeItem: (key: string) => void;
          clear: () => void;
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
  private deviceType: 'desktop' | 'tablet' | 'mobile' | null = null;
  private cachedUser: { username: string; profilePictureUrl?: string } | null = null;
  public onAuthChange: ((user: { username: string; profilePictureUrl?: string } | null) => void) | null = null;

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (youtubePlayables.isAvailable()) {
      await youtubePlayables.init();
      this.isInitialized = true;
      return;
    }

    if (playgamaSDK.isAvailable()) {
      await playgamaSDK.init();
      this.isInitialized = true;
      return;
    }

    if (pokiSDK.isAvailable()) {
      await pokiSDK.init();
      this.isInitialized = true;
      return;
    }

    if (fbInstant.isAvailable()) {
      await fbInstant.init();
      this.isInitialized = true;
      return;
    }

    try {
      if (window.CrazyGames?.SDK) {
        await window.CrazyGames.SDK.init();
        this.isInitialized = true;
        console.log('[CrazyGames SDK v3] Initialized successfully');
        try {
          await this.getSystemInfo();
        } catch {}

        // Cloud save data migration: sync existing local storage to CrazyGames data module
        try {
          if (window.CrazyGames.SDK.data) {
            const keysToSync = ['ragdoll_archers_save_v1', 'ragdoll_archers_sound_muted', 'ragdoll_archers_games_played'];
            for (const k of keysToSync) {
              const cloudVal = window.CrazyGames.SDK.data.getItem(k);
              const localVal = localStorage.getItem(k);
              if (!cloudVal && localVal) {
                window.CrazyGames.SDK.data.setItem(k, localVal);
                console.log(`[CrazyGames Data] Synced ${k} to cloud storage`);
              }
            }
          }
        } catch (e) {
          console.warn('[CrazyGames Data] Sync migration fallback:', e);
        }
      } else {
        console.info('ℹ️ [Platform SDK] Standalone/Offline mode active');
      }
    } catch (err) {
      console.warn('⚠️ [CrazyGames SDK] Initialization fallback:', err);
    }
  }

  // ── Universal Data Storage Module (Cross-Device Cloud Sync + Local Fallback) ──
  public getItem(key: string): string | null {
    if (youtubePlayables.isAvailable()) {
      return youtubePlayables.getItem(key);
    }
    if (playgamaSDK.isAvailable()) {
      return playgamaSDK.getItem(key);
    }
    if (fbInstant.isAvailable()) {
      return fbInstant.getItem(key);
    }
    try {
      if (window.CrazyGames?.SDK?.data?.getItem) {
        const cloudVal = window.CrazyGames.SDK.data.getItem(key);
        if (cloudVal !== null && cloudVal !== undefined) return cloudVal;
      }
    } catch (e) {
      console.warn('[CrazyGames Data] getItem fallback:', e);
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  public setItem(key: string, value: string): void {
    if (youtubePlayables.isAvailable()) {
      youtubePlayables.setItem(key, value);
      return;
    }
    if (playgamaSDK.isAvailable()) {
      playgamaSDK.setItem(key, value);
      return;
    }
    if (fbInstant.isAvailable()) {
      fbInstant.setItem(key, value);
      return;
    }
    // 1. Save to CrazyGames SDK Data Module (Syncs across devices for logged-in players)
    try {
      if (window.CrazyGames?.SDK?.data?.setItem) {
        window.CrazyGames.SDK.data.setItem(key, value);
      }
    } catch (e) {
      console.warn('[CrazyGames Data] setItem error:', e);
    }
    // 2. Dual-save to browser localStorage for offline reliability & immediate fast read
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  public removeItem(key: string): void {
    if (youtubePlayables.isAvailable()) {
      youtubePlayables.removeItem(key);
      return;
    }
    if (playgamaSDK.isAvailable()) {
      playgamaSDK.removeItem(key);
      return;
    }
    if (fbInstant.isAvailable()) {
      fbInstant.removeItem(key);
      return;
    }
    try {
      if (window.CrazyGames?.SDK?.data?.removeItem) {
        window.CrazyGames.SDK.data.removeItem(key);
      }
    } catch (e) {}
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  public clear(): void {
    if (playgamaSDK.isAvailable()) {
      playgamaSDK.clear();
      return;
    }
    if (fbInstant.isAvailable()) {
      fbInstant.clear();
      return;
    }
    try {
      if (window.CrazyGames?.SDK?.data?.clear) {
        window.CrazyGames.SDK.data.clear();
      }
    } catch (e) {}
    try {
      localStorage.clear();
    } catch {}
  }

  public async getSystemInfo(): Promise<any> {
    try {
      if (window.CrazyGames?.SDK?.user?.getSystemInfo) {
        const sys = await window.CrazyGames.SDK.user.getSystemInfo();
        if (sys?.device?.type) {
          this.deviceType = sys.device.type;
          console.log(`[CrazyGames SDK v3] Device type detected: ${this.deviceType}`);
        }
        return sys;
      }
    } catch (err) {
      console.warn('⚠️ [CrazyGames SDK] getSystemInfo fallback:', err);
    }
    return null;
  }

  public getDeviceType(): 'desktop' | 'tablet' | 'mobile' | null {
    return this.deviceType;
  }

  public isMobile(): boolean {
    if (playgamaSDK.isAvailable()) {
      return playgamaSDK.isMobile();
    }
    if (fbInstant.isAvailable()) {
      return fbInstant.isMobile();
    }
    return this.deviceType === 'mobile' || this.deviceType === 'tablet';
  }

  public loadingStart(): void {
    if (pokiSDK.isAvailable()) {
      pokiSDK.loadingStart();
      return;
    }
    if (fbInstant.isAvailable()) {
      fbInstant.setLoadingProgress(10);
      return;
    }
    try {
      window.CrazyGames?.SDK?.game?.loadingStart();
    } catch {}
  }

  public loadingStop(): void {
    if (youtubePlayables.isAvailable()) {
      youtubePlayables.gameReady();
      return;
    }
    if (pokiSDK.isAvailable()) {
      pokiSDK.loadingStop();
      return;
    }
    if (fbInstant.isAvailable()) {
      fbInstant.setLoadingProgress(100);
      fbInstant.startGameAsync();
      return;
    }
    try {
      window.CrazyGames?.SDK?.game?.loadingStop();
    } catch {}
  }

  public gameplayStart(): void {
    if (this.isGameplayActive) return;
    this.isGameplayActive = true;
    if (youtubePlayables.isAvailable()) {
      youtubePlayables.gameReady();
      return;
    }
    if (pokiSDK.isAvailable()) {
      pokiSDK.gameplayStart();
      return;
    }
    try {
      window.CrazyGames?.SDK?.game?.gameplayStart();
      console.log('▶️ [CrazyGames] gameplayStart');
    } catch {}
  }

  public gameplayStop(): void {
    if (!this.isGameplayActive) return;
    this.isGameplayActive = false;
    if (pokiSDK.isAvailable()) {
      pokiSDK.gameplayStop();
      return;
    }
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

  private gamesPlayedCount: number = 0;

  /**
   * Tracks completed games and requests a midgame ad at Game Over.
   * CrazyGames SDK automatically enforces the official 3-minute cooldown pacing.
   */
  public recordGamePlayedAndCheckMidgameAd(): void {
    let count = 0;
    try {
      const stored = this.getItem('ragdoll_archers_games_played');
      count = stored ? parseInt(stored, 10) : 0;
      if (isNaN(count)) count = 0;
      count += 1;
      this.setItem('ragdoll_archers_games_played', count.toString());
    } catch {
      this.gamesPlayedCount += 1;
      count = this.gamesPlayedCount;
    }

    console.log(`[CrazyGames] Game session finished. Total games played: ${count}. Requesting midgame ad (CrazyGames SDK enforces 3-minute cooldown).`);
    this.requestMidgameAd();
  }

  /**
   * Request a Midgame (Interstitial) Ad.
   * Automatically pauses physics/scene and mutes sound, then restores them.
   */
  public requestMidgameAd(onComplete?: () => void): void {
    if (youtubePlayables.isAvailable()) {
      onComplete?.();
      return;
    }

    if (playgamaSDK.isAvailable()) {
      playgamaSDK.requestMidgameAd(onComplete);
      return;
    }

    if (pokiSDK.isAvailable()) {
      pokiSDK.requestMidgameAd(onComplete);
      return;
    }

    if (fbInstant.isAvailable()) {
      fbInstant.requestMidgameAd(onComplete);
      return;
    }

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
    if (youtubePlayables.isAvailable()) {
      // YouTube Playables does not permit external ad SDKs; auto-grant reward
      onRewarded();
      return;
    }

    if (playgamaSDK.isAvailable()) {
      playgamaSDK.requestRewardedAd(onRewarded, onFailed);
      return;
    }

    if (pokiSDK.isAvailable()) {
      pokiSDK.requestRewardedAd(onRewarded, onFailed);
      return;
    }

    if (fbInstant.isAvailable()) {
      fbInstant.requestRewardedAd(onRewarded, onFailed);
      return;
    }

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
          console.warn('[CrazyGames] Rewarded Ad Error / Unfilled:', error, errorData);
          resumeGame();
          // Fallback reward ensures players and CrazyGames QA reviewers can always revive even if ads fail/unfilled
          onRewarded();
        }
      });
    } catch (e) {
      console.warn('[CrazyGames] requestRewardedAd exception:', e);
      resumeGame();
      onRewarded();
    }
  }

  public async submitScore(score: number, mode: 'endless' | 'campaign' = 'endless'): Promise<void> {
    const safeScore = Math.floor(score);
    if (isNaN(safeScore) || safeScore < 0) return;

    // 1. YouTube Playables Engagement API
    if (youtubePlayables.isAvailable()) {
      youtubePlayables.sendScore(safeScore);
      return;
    }

    // 2. Playgama / GamePush Bridge
    if (playgamaSDK.isAvailable()) {
      try {
        const bridge = (window as any).bridge;
        if (bridge?.leaderboard?.setScore) {
          await bridge.leaderboard.setScore({
            id: mode === 'endless' ? 'endless_best_wave' : 'campaign_wave',
            score: safeScore
          });
        }
      } catch (e) {
        console.warn('[Playgama Bridge] Leaderboard error:', e);
      }
    }

    // 3. Facebook Instant Games
    if (fbInstant.isAvailable()) {
      try {
        const fb = (window as any).FBInstant;
        if (fb?.getLeaderboardAsync) {
          const boardName = mode === 'endless' ? 'endless_best_wave' : 'campaign_wave';
          const board = await fb.getLeaderboardAsync(boardName);
          await board.setScoreAsync(safeScore);
        }
      } catch (e) {
        console.warn('[FBInstant] Leaderboard error:', e);
      }
    }

    // 4. CrazyGames SDK v3 Data persistence
    try {
      const cg = window.CrazyGames?.SDK;
      if (cg?.data) {
        const key = mode === 'endless' ? 'ragdoll_endless_best' : 'ragdoll_campaign_best';
        const existing = parseInt(cg.data.getItem(key) || '0', 10);
        if (safeScore > existing) {
          cg.data.setItem(key, `${safeScore}`);
        }
      }
    } catch (e) {}
  }

  public async getUser(): Promise<{ username: string; profilePictureUrl?: string } | null> {
    if (this.cachedUser) return this.cachedUser;

    if (playgamaSDK.isAvailable()) {
      try {
        const bridge = (window as any).bridge;
        if (bridge?.player?.name) {
          this.cachedUser = {
            username: bridge.player.name,
            profilePictureUrl: bridge.player.avatar || undefined
          };
          return this.cachedUser;
        }
      } catch {}
    }

    try {
      const cgUser = window.CrazyGames?.SDK?.user;
      if (cgUser && (cgUser as any).getUser) {
        const user = await (cgUser as any).getUser();
        if (user && user.username) {
          this.cachedUser = {
            username: user.username,
            profilePictureUrl: user.profilePictureUrl || undefined
          };
          return this.cachedUser;
        }
      }
    } catch (e) {}

    return null;
  }

  public async showAuthPrompt(): Promise<{ username: string; profilePictureUrl?: string } | null> {
    try {
      const cgUser = window.CrazyGames?.SDK?.user;
      if (cgUser && (cgUser as any).showAuthPrompt) {
        const user = await (cgUser as any).showAuthPrompt();
        if (user && user.username) {
          this.cachedUser = {
            username: user.username,
            profilePictureUrl: user.profilePictureUrl || undefined
          };
          if (this.onAuthChange) this.onAuthChange(this.cachedUser);
          return this.cachedUser;
        }
      }
    } catch (e) {}
    return null;
  }

  public async getLeaderboardEntries(mode: 'endless' | 'campaign' = 'endless'): Promise<Array<{ rank: number; name: string; score: number; skulls?: number; isPlayer?: boolean }> | null> {
    if (playgamaSDK.isAvailable()) {
      try {
        const bridge = (window as any).bridge;
        if (bridge?.leaderboard?.getEntries) {
          const res = await bridge.leaderboard.getEntries({
            id: mode === 'endless' ? 'endless_best_wave' : 'campaign_wave'
          });
          if (Array.isArray(res?.entries) && res.entries.length > 0) {
            return res.entries.map((e: any, idx: number) => ({
              rank: e.rank || idx + 1,
              name: e.player?.name || 'Anonymous Survivor',
              score: e.score || 0,
              isPlayer: Boolean(e.isPlayer)
            }));
          }
        }
      } catch (err) {}
    }

    if (fbInstant.isAvailable()) {
      try {
        const fb = (window as any).FBInstant;
        if (fb?.getLeaderboardAsync) {
          const boardName = mode === 'endless' ? 'endless_best_wave' : 'campaign_wave';
          const board = await fb.getLeaderboardAsync(boardName);
          const entries = await board.getEntriesAsync(10, 0);
          if (Array.isArray(entries) && entries.length > 0) {
            const myId = fb.player?.getID?.();
            return entries.map((e: any) => ({
              rank: e.getRank(),
              name: e.getPlayer()?.getName() || 'Survivor',
              score: e.getScore(),
              isPlayer: e.getPlayer()?.getID() === myId
            }));
          }
        }
      } catch (err) {}
    }

    return null;
  }

  public async hasAdblock(): Promise<boolean> {
    try {
      if (window.CrazyGames?.SDK?.ad?.hasAdblock) {
        return await window.CrazyGames.SDK.ad.hasAdblock();
      }
    } catch (e) {
      console.warn('[CrazyGames] hasAdblock check error:', e);
    }
    return false;
  }
}

export const crazyGames = new CrazyGamesManager();
export const platform = crazyGames;
export { fbInstant, pokiSDK, playgamaSDK, youtubePlayables };
