/**
 * YouTube Playables SDK Integration Module
 * Full compliance with official YouTube Playables specifications & Test Suite:
 * - Lifecycle: ytgame.game.firstFrameReady() and ytgame.game.gameReady()
 * - Cloud Storage: ytgame.game.loadData() and ytgame.game.saveData() (with mandatory load-before-save rule & <3MiB payload limit)
 * - System Audio: ytgame.system.isAudioEnabled() & ytgame.system.onAudioEnabledChange()
 * - System Pause/Resume: ytgame.system.onPause() and ytgame.system.onResume()
 * - Engagement: ytgame.engagement.sendScore({ value })
 * - Health Diagnostics: ytgame.health.logError() & ytgame.health.logWarning()
 */

import { soundFX } from './SoundFX';

declare global {
  interface Window {
    ytgame?: {
      IN_PLAYABLES_ENV?: boolean;
      game?: {
        firstFrameReady: () => void;
        gameReady: () => void;
        loadData: () => Promise<string | null>;
        saveData: (data: string) => Promise<void>;
      };
      system?: {
        isAudioEnabled: () => boolean;
        onAudioEnabledChange: (callback: (isAudioEnabled: boolean) => void) => void;
        onPause: (callback: () => void) => void;
        onResume: (callback: () => void) => void;
      };
      engagement?: {
        sendScore: (scoreData: { value: number }) => Promise<void> | void;
        openYTContent?: (data: { id: string }) => void;
      };
      health?: {
        logError: (message: string) => void;
        logWarning: (message: string) => void;
      };
    };
  }
}

export class YouTubePlayablesManager {
  private isInitialized: boolean = false;
  private hasFirstFrameFired: boolean = false;
  private hasGameReadyFired: boolean = false;
  private hasLoadedData: boolean = false;
  private memoryCache: Map<string, string> = new Map();
  private saveDebounceTimer: any = null;
  private onPauseCallbacks: Array<() => void> = [];
  private onResumeCallbacks: Array<() => void> = [];
  private isPlatformPaused: boolean = false;

  /**
   * Returns true if running in the YouTube Playables environment (or SDK is injected)
   */
  public isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.ytgame);
  }

  /**
   * Initialize YouTube Playables SDK hooks and listeners
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[YouTube Playables SDK] Initializing module...');

    if (!this.isAvailable()) {
      console.log('[YouTube Playables SDK] ytgame object not detected, operating in offline/mock mode');
      return;
    }

    try {
      // 1. Audio Sync
      if (window.ytgame?.system?.isAudioEnabled) {
        try {
          const audioOn = window.ytgame.system.isAudioEnabled();
          console.log('[YouTube Playables SDK] Initial audio enabled:', audioOn);
          soundFX.setMuted(!audioOn);
        } catch (e) {
          console.warn('[YouTube Playables SDK] Error reading isAudioEnabled:', e);
        }
      }

      if (window.ytgame?.system?.onAudioEnabledChange) {
        window.ytgame.system.onAudioEnabledChange((enabled: boolean) => {
          console.log('[YouTube Playables SDK] onAudioEnabledChange fired:', enabled);
          soundFX.setMuted(!enabled);
        });
      }

      // 2. Lifecycle System Listeners (onPause / onResume)
      if (window.ytgame?.system?.onPause) {
        window.ytgame.system.onPause(() => {
          console.log('[YouTube Playables SDK] onPause received from YouTube host');
          this.handlePlatformPause();
        });
      }

      if (window.ytgame?.system?.onResume) {
        window.ytgame.system.onResume(() => {
          console.log('[YouTube Playables SDK] onResume received from YouTube host');
          this.handlePlatformResume();
        });
      }

      // 3. Mandatory Cloud Data Load (Must await loadData before saving)
      await this.loadInitialCloudData();

      // Signal first frame if ready
      this.firstFrameReady();

      console.log('✅ [YouTube Playables SDK] Integration initialized successfully');
    } catch (err) {
      console.error('[YouTube Playables SDK] Initialization error:', err);
      this.logError(`Init error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Notifies YouTube that the game is drawing its initial frame/canvas.
   * MUST be called as early as possible.
   */
  public firstFrameReady(): void {
    if (this.hasFirstFrameFired) return;
    this.hasFirstFrameFired = true;

    try {
      if (window.ytgame?.game?.firstFrameReady) {
        window.ytgame.game.firstFrameReady();
        console.log('🚀 [YouTube Playables SDK] firstFrameReady() signaled to host');
      }
    } catch (e) {
      console.warn('[YouTube Playables SDK] firstFrameReady error:', e);
    }
  }

  /**
   * Notifies YouTube that the game has finished loading assets and is fully interactive.
   * MUST be called after firstFrameReady() and only when UI/gameplay is interactable.
   */
  public gameReady(): void {
    if (this.hasGameReadyFired) return;
    this.hasGameReadyFired = true;

    // Ensure firstFrameReady was signaled first
    if (!this.hasFirstFrameFired) {
      this.firstFrameReady();
    }

    try {
      if (window.ytgame?.game?.gameReady) {
        window.ytgame.game.gameReady();
        console.log('🎮 [YouTube Playables SDK] gameReady() signaled to host');
      }
    } catch (e) {
      console.warn('[YouTube Playables SDK] gameReady error:', e);
    }
  }

  /**
   * Pre-load cloud progress from YouTube Playables Cloud Storage
   */
  private async loadInitialCloudData(): Promise<void> {
    if (this.hasLoadedData) return;
    this.hasLoadedData = true;

    try {
      if (window.ytgame?.game?.loadData) {
        console.log('[YouTube Playables SDK] Calling ytgame.game.loadData()...');
        const raw = await window.ytgame.game.loadData();
        if (raw && typeof raw === 'string' && raw.trim().length > 0) {
          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null) {
              for (const [k, v] of Object.entries(parsed)) {
                const valStr = typeof v === 'string' ? v : JSON.stringify(v);
                this.memoryCache.set(k, valStr);
                try { localStorage.setItem(k, valStr); } catch {}
              }
              console.log('[YouTube Playables SDK] Cloud save state restored:', Object.keys(parsed).length, 'keys');
            }
          } catch (pe) {
            console.warn('[YouTube Playables SDK] Failed to parse cloud save string:', pe);
          }
        } else {
          console.log('[YouTube Playables SDK] No previous cloud save found, using initial state');
        }
      }
    } catch (err) {
      console.warn('[YouTube Playables SDK] loadData error:', err);
    }
  }

  /**
   * Retrieve stored value by key (checks memory cache populated from loadData, falls back to localStorage)
   */
  public getItem(key: string): string | null {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) || null;
    }
    try {
      const local = localStorage.getItem(key);
      if (local !== null) {
        this.memoryCache.set(key, local);
      }
      return local;
    } catch {
      return null;
    }
  }

  /**
   * Store key-value data with debounced cloud persistence
   */
  public setItem(key: string, value: string): void {
    this.memoryCache.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch {}

    this.scheduleCloudSave();
  }

  /**
   * Remove item from storage
   */
  public removeItem(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {}
    this.scheduleCloudSave();
  }

  /**
   * Debounces saving state to YouTube Cloud to avoid excessive network requests
   */
  private scheduleCloudSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.flushDataToCloud();
    }, 1200);
  }

  /**
   * Commits cached data to YouTube Cloud Storage via ytgame.game.saveData()
   */
  public async flushDataToCloud(): Promise<void> {
    if (!this.hasLoadedData) {
      console.warn('[YouTube Playables SDK] Cannot saveData before loadData completes!');
      return;
    }

    if (!window.ytgame?.game?.saveData) return;

    try {
      const snapshot: Record<string, any> = {};
      this.memoryCache.forEach((val, key) => {
        try {
          snapshot[key] = JSON.parse(val);
        } catch {
          snapshot[key] = val;
        }
      });

      const serialized = JSON.stringify(snapshot);

      // YouTube Playables 3 MiB payload limit guard
      const byteLength = new Blob([serialized]).size;
      if (byteLength > 2.8 * 1024 * 1024) {
        console.warn('[YouTube Playables SDK] Save payload exceeds safe 3 MiB limit:', byteLength);
        return;
      }

      await window.ytgame.game.saveData(serialized);
      console.log(`[YouTube Playables SDK] Saved to cloud (${byteLength} bytes)`);
    } catch (err) {
      console.warn('[YouTube Playables SDK] saveData failed:', err);
      this.logWarning(`saveData failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Submit high score to YouTube Playables engagement leaderboard
   */
  public sendScore(score: number): void {
    const intScore = Math.floor(score);
    if (isNaN(intScore) || intScore < 0) return;

    try {
      if (window.ytgame?.engagement?.sendScore) {
        window.ytgame.engagement.sendScore({ value: intScore });
        console.log('🏆 [YouTube Playables SDK] sendScore submitted:', intScore);
      }
    } catch (e) {
      console.warn('[YouTube Playables SDK] sendScore error:', e);
    }
  }

  /**
   * Register custom pause listener (called when YouTube host pauses game)
   */
  public registerPauseListener(cb: () => void): void {
    this.onPauseCallbacks.push(cb);
  }

  /**
   * Register custom resume listener (called when YouTube host resumes game)
   */
  public registerResumeListener(cb: () => void): void {
    this.onResumeCallbacks.push(cb);
  }

  private handlePlatformPause(): void {
    this.isPlatformPaused = true;
    for (const cb of this.onPauseCallbacks) {
      try { cb(); } catch {}
    }
  }

  private handlePlatformResume(): void {
    this.isPlatformPaused = false;
    for (const cb of this.onResumeCallbacks) {
      try { cb(); } catch {}
    }
  }

  public isPaused(): boolean {
    return this.isPlatformPaused;
  }

  /**
   * Telemetry / Health Logging
   */
  public logError(message: string): void {
    try {
      window.ytgame?.health?.logError?.(message);
    } catch {}
  }

  public logWarning(message: string): void {
    try {
      window.ytgame?.health?.logWarning?.(message);
    } catch {}
  }
}

export const youtubePlayables = new YouTubePlayablesManager();
