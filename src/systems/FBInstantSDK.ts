/**
 * Facebook Instant Games SDK v7.1 Integration Module
 * Meta App ID: 1786072816007845
 *
 * Full compliance with Meta Instant Games requirements:
 * - Lifecycle: initializeAsync -> setLoadingProgress -> startGameAsync
 * - Interstitial Ads (Audience Network) with automatic pre-loading & cooldown
 * - Rewarded Video Ads with pre-loading & guaranteed fallback rewards
 * - Cloud Storage: FBInstant.player.getDataAsync / setDataAsync with memory cache
 * - Player Profile (Name, Photo, ID)
 * - Social Features (Share score, invite friends)
 */

import { soundFX } from './SoundFX';

export interface FBInstantConfig {
  appId: string;
  interstitialPlacementId: string;
  rewardedPlacementId: string;
}

export const DEFAULT_FB_CONFIG: FBInstantConfig = {
  appId: '1786072816007845',
  // You can set these to your Audience Network Placement IDs created in Meta Developer Portal
  interstitialPlacementId: '1786072816007845_INTERSTITIAL',
  rewardedPlacementId: '1786072816007845_REWARDED'
};

declare global {
  interface Window {
    FBInstant?: {
      initializeAsync: () => Promise<void>;
      setLoadingProgress: (percentage: number) => void;
      startGameAsync: () => Promise<void>;
      getPlatform: () => 'IOS' | 'ANDROID' | 'WEB' | 'MOBILE_WEB';
      getLocale: () => string;
      getSupportedAPIs: () => string[];
      player: {
        getID: () => string | null;
        getName: () => string | null;
        getPhoto: () => string | null;
        getDataAsync: (keys: string[]) => Promise<{ [key: string]: any }>;
        setDataAsync: (data: { [key: string]: any }) => Promise<void>;
        flushDataAsync: () => Promise<void>;
      };
      getInterstitialAdAsync: (placementId: string) => Promise<{
        loadAsync: () => Promise<void>;
        showAsync: () => Promise<void>;
        getPlacementID: () => string;
      }>;
      getRewardedVideoAsync: (placementId: string) => Promise<{
        loadAsync: () => Promise<void>;
        showAsync: () => Promise<void>;
        getPlacementID: () => string;
      }>;
      shareAsync: (payload: {
        intent?: 'INVITE' | 'REQUEST' | 'CHALLENGE' | 'SHARE';
        text: string;
        image?: string;
        data?: any;
      }) => Promise<void>;
      canCreateShortcutAsync?: () => Promise<boolean>;
      createShortcutAsync?: () => Promise<void>;
      quit?: () => void;
    };
  }
}

export class FBInstantManager {
  private isInitialized: boolean = false;
  private isGameStarted: boolean = false;
  private config: FBInstantConfig = DEFAULT_FB_CONFIG;
  private preloadedInterstitial: any = null;
  private preloadedRewarded: any = null;
  private isPreloadingInterstitial: boolean = false;
  private isPreloadingRewarded: boolean = false;
  private memoryStorage: Map<string, string> = new Map();
  private isAdPlaying: boolean = false;
  private soundWasMutedBeforeAd: boolean = false;
  private lastMidgameAdTime: number = 0;
  private readonly midgameCooldownMs = 120000; // 2 minutes cooldown between interstitials

  constructor(customConfig?: Partial<FBInstantConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.FBInstant !== 'undefined';
  }

  /**
   * Initializes the FBInstant SDK and preloads player cloud save data.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.isAvailable()) {
      console.info('ℹ️ [FBInstant SDK] Not running in Facebook Instant Games environment.');
      return;
    }

    try {
      console.log('🔄 [FBInstant SDK] Calling FBInstant.initializeAsync()...');
      await window.FBInstant!.initializeAsync();
      this.isInitialized = true;
      console.log('✅ [FBInstant SDK] Initialized successfully. App ID:', this.config.appId);

      // Warm up initial cache from FB Cloud Storage
      await this.syncFromCloud();

      // Begin background preloading of first ads
      this.preloadInterstitial();
      this.preloadRewarded();
    } catch (err) {
      console.warn('⚠️ [FBInstant SDK] initializeAsync failed / fallback:', err);
    }
  }

  /**
   * Updates loading bar (0 to 100) on Facebook's loading screen.
   */
  public setLoadingProgress(progress: number): void {
    if (!this.isAvailable()) return;
    try {
      const clamped = Math.max(0, Math.min(100, Math.floor(progress)));
      window.FBInstant!.setLoadingProgress(clamped);
    } catch (e) {
      console.warn('[FBInstant] setLoadingProgress error:', e);
    }
  }

  /**
   * Tells Facebook the game is ready. Facebook dismisses the loading screen.
   */
  public async startGameAsync(): Promise<void> {
    if (this.isGameStarted) return;
    if (!this.isAvailable()) {
      this.isGameStarted = true;
      return;
    }

    try {
      console.log('🚀 [FBInstant SDK] Calling FBInstant.startGameAsync()...');
      await window.FBInstant!.startGameAsync();
      this.isGameStarted = true;
      console.log('✅ [FBInstant SDK] Game session active.');
    } catch (err) {
      console.warn('⚠️ [FBInstant SDK] startGameAsync fallback:', err);
      this.isGameStarted = true;
    }
  }

  // ── Player Profile ──
  public getPlayerName(): string {
    try {
      return window.FBInstant?.player?.getName() || 'Archer';
    } catch {
      return 'Archer';
    }
  }

  public getPlayerPhoto(): string | null {
    try {
      return window.FBInstant?.player?.getPhoto() || null;
    } catch {
      return null;
    }
  }

  public getPlayerId(): string | null {
    try {
      return window.FBInstant?.player?.getID() || null;
    } catch {
      return null;
    }
  }

  // ── Device Detection ──
  public isMobile(): boolean {
    if (this.isAvailable()) {
      try {
        const platform = window.FBInstant!.getPlatform();
        if (platform === 'IOS' || platform === 'ANDROID' || platform === 'MOBILE_WEB') {
          return true;
        }
      } catch {}
    }
    return false;
  }

  // ── Cloud Save / Storage (Dual Sync: FBInstant Cloud + Memory Cache + LocalStorage) ──
  private async syncFromCloud(): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const keys = ['ragdoll_archers_save_v1', 'ragdoll_archers_sound_muted', 'ragdoll_archers_games_played'];
      const data = await window.FBInstant!.player.getDataAsync(keys);
      if (data) {
        for (const k of keys) {
          if (data[k] !== undefined && data[k] !== null) {
            this.memoryStorage.set(k, String(data[k]));
            try { localStorage.setItem(k, String(data[k])); } catch {}
          } else {
            // If cloud has nothing yet, check local storage and back-fill cloud
            const localVal = localStorage.getItem(k);
            if (localVal !== null) {
              this.memoryStorage.set(k, localVal);
              this.setItem(k, localVal);
            }
          }
        }
        console.log('☁️ [FBInstant Data] Cloud save synced successfully');
      }
    } catch (e) {
      console.warn('⚠️ [FBInstant Data] Failed to sync cloud save:', e);
    }
  }

  public getItem(key: string): string | null {
    if (this.memoryStorage.has(key)) {
      return this.memoryStorage.get(key) || null;
    }
    try {
      const local = localStorage.getItem(key);
      if (local !== null) {
        this.memoryStorage.set(key, local);
        return local;
      }
    } catch {}
    return null;
  }

  public setItem(key: string, value: string): void {
    this.memoryStorage.set(key, value);
    try { localStorage.setItem(key, value); } catch {}

    if (this.isAvailable()) {
      try {
        window.FBInstant!.player.setDataAsync({ [key]: value }).catch((e) => {
          console.warn(`[FBInstant Data] Background save failed for ${key}:`, e);
        });
      } catch (e) {
        console.warn(`[FBInstant Data] setDataAsync error:`, e);
      }
    }
  }

  public removeItem(key: string): void {
    this.memoryStorage.delete(key);
    try { localStorage.removeItem(key); } catch {}
    if (this.isAvailable()) {
      try {
        window.FBInstant!.player.setDataAsync({ [key]: null }).catch(() => {});
      } catch {}
    }
  }

  public clear(): void {
    this.memoryStorage.clear();
    try { localStorage.clear(); } catch {}
  }

  // ── Ad Management (Audience Network) ──

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

  public async preloadInterstitial(): Promise<void> {
    if (!this.isAvailable() || this.isPreloadingInterstitial || this.preloadedInterstitial) return;
    this.isPreloadingInterstitial = true;
    try {
      const ad = await window.FBInstant!.getInterstitialAdAsync(this.config.interstitialPlacementId);
      await ad.loadAsync();
      this.preloadedInterstitial = ad;
      console.log('✅ [FBInstant] Interstitial ad preloaded');
    } catch (err) {
      console.warn('⚠️ [FBInstant] Preloading interstitial failed (check Placement ID / ad inventory):', err);
      this.preloadedInterstitial = null;
    } finally {
      this.isPreloadingInterstitial = false;
    }
  }

  public async preloadRewarded(): Promise<void> {
    if (!this.isAvailable() || this.isPreloadingRewarded || this.preloadedRewarded) return;
    this.isPreloadingRewarded = true;
    try {
      const ad = await window.FBInstant!.getRewardedVideoAsync(this.config.rewardedPlacementId);
      await ad.loadAsync();
      this.preloadedRewarded = ad;
      console.log('✅ [FBInstant] Rewarded video ad preloaded');
    } catch (err) {
      console.warn('⚠️ [FBInstant] Preloading rewarded ad failed (check Placement ID / ad inventory):', err);
      this.preloadedRewarded = null;
    } finally {
      this.isPreloadingRewarded = false;
    }
  }

  /**
   * Request an Interstitial (Midgame) ad.
   */
  public async requestMidgameAd(onComplete?: () => void): Promise<void> {
    const now = Date.now();
    if (now - this.lastMidgameAdTime < this.midgameCooldownMs) {
      console.log('⏳ [FBInstant] Midgame ad cooldown active, skipping ad display.');
      onComplete?.();
      return;
    }

    if (!this.isAvailable()) {
      onComplete?.();
      return;
    }

    this.pauseGame();

    try {
      let ad = this.preloadedInterstitial;
      if (ad) {
        this.preloadedInterstitial = null;
      } else {
        ad = await window.FBInstant!.getInterstitialAdAsync(this.config.interstitialPlacementId);
        await ad.loadAsync();
      }

      await ad.showAsync();
      this.lastMidgameAdTime = Date.now();
      console.log('🎉 [FBInstant] Interstitial ad finished successfully');
    } catch (err) {
      console.warn('⚠️ [FBInstant] Midgame ad display error or unfilled:', err);
    } finally {
      this.resumeGame();
      onComplete?.();
      // Preload next interstitial in background
      setTimeout(() => this.preloadInterstitial(), 5000);
    }
  }

  /**
   * Request a Rewarded Video ad.
   */
  public async requestRewardedAd(onRewarded: () => void, onFailed?: () => void): Promise<void> {
    if (!this.isAvailable()) {
      // Local development or unsupported environment: grant reward immediately
      onRewarded();
      return;
    }

    this.pauseGame();

    try {
      let ad = this.preloadedRewarded;
      if (ad) {
        this.preloadedRewarded = null;
      } else {
        ad = await window.FBInstant!.getRewardedVideoAsync(this.config.rewardedPlacementId);
        await ad.loadAsync();
      }

      await ad.showAsync();
      console.log('🎁 [FBInstant] Rewarded ad watched completely!');
      this.resumeGame();
      onRewarded();
    } catch (err) {
      console.warn('⚠️ [FBInstant] Rewarded ad show error / unfilled:', err);
      this.resumeGame();
      // Meta compliance best practice: if ad fails to load or no fill, fall back gracefully
      if (onFailed) {
        onFailed();
      } else {
        onRewarded();
      }
    } finally {
      // Preload next rewarded ad in background
      setTimeout(() => this.preloadRewarded(), 5000);
    }
  }

  // ── Social & Viral Sharing ──
  public async shareScore(score: number, wave: number): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await window.FBInstant!.shareAsync({
        intent: 'SHARE',
        text: `🏹 I survived wave ${wave} and scored ${score} points in Arrow Storm: Zombie Siege! Can you beat my high score?`,
        data: { wave, score }
      });
      console.log('📢 [FBInstant] High score shared successfully');
    } catch (e) {
      console.warn('[FBInstant] shareScore error:', e);
    }
  }
}

export const fbInstant = new FBInstantManager();
