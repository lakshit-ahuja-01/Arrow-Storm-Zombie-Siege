import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { soundFX } from './systems/SoundFX';
import { uiManager } from './systems/UIManager';
import { crazyGames } from './systems/CrazyGamesSDK';
import { syncMobileMode } from './utils/DeviceDetection';

// Apply initial device detection immediately
syncMobileMode();

// Signal loading start to CrazyGames immediately
crazyGames.loadingStart();
crazyGames.init().then(() => {
  crazyGames.loadingStop();
  // Re-sync mobile mode if CrazyGames SDK reported mobile/tablet device info
  syncMobileMode();
});

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

// Determine explicit renderType for custom canvas environment (fixes Phaser Error: Must set explicit renderType in custom environment)
let renderType = Phaser.WEBGL;
try {
  const testCanvas = document.createElement('canvas');
  const hasWebGL = Boolean(
    window.WebGLRenderingContext &&
    (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
  );
  if (!hasWebGL) {
    renderType = Phaser.CANVAS;
  }
} catch {
  renderType = Phaser.CANVAS;
}

export function getGameResolution(): { width: number; height: number } {
  const minWidth = 1200;
  const screenW = window.innerWidth || document.documentElement.clientWidth || 1200;
  const screenH = window.innerHeight || document.documentElement.clientHeight || 675;

  if (screenW < minWidth) {
    const aspect = screenH / screenW;
    return {
      width: minWidth,
      height: Math.round(minWidth * aspect)
    };
  }

  return {
    width: screenW,
    height: screenH
  };
}

const initialRes = getGameResolution();

const config: Phaser.Types.Core.GameConfig = {
  type: renderType,
  canvas: canvas,
  width: initialRes.width,
  height: initialRes.height,
  backgroundColor: '#0a0d14',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1.6 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: initialRes.width,
    height: initialRes.height
  },
  scene: [MainScene]
};

export const game = new Phaser.Game(config);
(window as any).game = game;

function getScene(): MainScene | null {
  return (game.scene.getScene('MainScene') as MainScene) || null;
}

window.addEventListener('resize', () => {
  syncMobileMode();
  const s = getScene();
  if (s) s.handleResize();
});

window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    syncMobileMode();
    const s = getScene();
    if (s) s.handleResize();
  }, 120);
});

function startGameWithScene() {
  try { soundFX.ensure(); } catch {}
  crazyGames.gameplayStart();
  const s = getScene();
  if (s && s.scene.isActive()) {
    s.startGame();
  } else {
    uiManager.setState('playing');
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const sceneInstance = getScene();
      if (sceneInstance && sceneInstance.scene.isActive()) {
        clearInterval(poll);
        sceneInstance.startGame();
      } else if (attempts > 30) {
        clearInterval(poll);
      }
    }, 50);
  }
}

// Global UI listeners attached immediately so buttons ALWAYS work
function initUI() {
  const btnPlay = document.getElementById('btn-play');
  if (btnPlay) {
    btnPlay.onclick = () => startGameWithScene();
  }

  const btnRestartCampaign = document.getElementById('btn-restart-campaign');
  if (btnRestartCampaign) {
    btnRestartCampaign.onclick = () => {
      const s = getScene();
      if (s) {
        soundFX.playBowDraw();
        s.campaignWave = 1;
        s.saveGameData();
        s.startGame('campaign');
      }
    };
  }

  const btn2P = document.getElementById('btn-2player');
  if (btn2P) {
    btn2P.onclick = () => startGameWithScene();
  }

  const cardCampaign = document.getElementById('card-mode-campaign');
  const cardEndless = document.getElementById('card-mode-endless');
  if (cardCampaign && cardEndless) {
    cardCampaign.onclick = () => {
      const s = getScene();
      if (s) {
        s.setGameMode('campaign');
      } else {
        cardCampaign.classList.add('active');
        cardEndless.classList.remove('active');
      }
    };
    cardEndless.onclick = () => {
      const s = getScene();
      if (s) {
        s.setGameMode('endless');
      } else {
        cardEndless.classList.add('active');
        cardCampaign.classList.remove('active');
      }
    };
  }

  const btnMenuUpgrades = document.getElementById('btn-menu-upgrades');
  if (btnMenuUpgrades) {
    btnMenuUpgrades.onclick = () => {
      const s = getScene();
      if (s) {
        s.openShopFromMenu();
      } else {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const sc = getScene();
          if (sc) {
            clearInterval(interval);
            sc.openShopFromMenu();
          } else if (attempts > 20) {
            clearInterval(interval);
          }
        }, 100);
      }
    };
  }

  const btnMenuWardrobe = document.getElementById('btn-menu-wardrobe');
  if (btnMenuWardrobe) {
    btnMenuWardrobe.onclick = () => {
      const s = getScene();
      if (s) {
        s.openWardrobeFromMenu();
      } else {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const sc = getScene();
          if (sc) {
            clearInterval(interval);
            sc.openWardrobeFromMenu();
          } else if (attempts > 20) {
            clearInterval(interval);
          }
        }, 100);
      }
    };
  }

  const btnWardrobeBack = document.getElementById('btn-wardrobe-back');
  if (btnWardrobeBack) {
    btnWardrobeBack.onclick = () => {
      const s = getScene();
      if (s) s.returnToMenu();
      else uiManager.setState('menu');
    };
  }

  const btnShopReturn = document.getElementById('btn-shop-return');
  if (btnShopReturn) {
    btnShopReturn.onclick = () => {
      const s = getScene();
      if (s) s.returnToMenu();
      else uiManager.setState('menu');
    };
  }


  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) {
    btnRetry.onclick = () => startGameWithScene();
  }

  const btnRewardedRevive = document.getElementById('btn-rewarded-revive');
  if (btnRewardedRevive) {
    btnRewardedRevive.onclick = () => {
      crazyGames.requestRewardedAd(() => {
        const s = getScene();
        if (s && s.player) {
          s.player.hp = Math.round(s.player.maxHP * 0.5);
          s.player.dead = false;
          if (s.tower && s.tower.hp <= 0) {
            s.tower.hp = Math.round(s.tower.maxHP * 0.4);
          }
          s.state = 'playing';
          uiManager.setState('playing');
          crazyGames.gameplayStart();
          s.spawnFloatingText('✨ HERO REVIVED (+50% HP)!', s.player.x, s.player.y - 40, '#2ecc71', 28);
        }
      });
    };
  }

  const btnDoubleSkulls = document.getElementById('btn-double-skulls');
  if (btnDoubleSkulls) {
    btnDoubleSkulls.onclick = () => {
      crazyGames.requestRewardedAd(() => {
        const s = getScene();
        if (s && s.player) {
          const bonus = Math.max(50, s.kills * 2);
          s.player.skulls += bonus;
          s.saveGameData();
          s.updateMenuSkullsUI();
          btnDoubleSkulls.style.display = 'none';
          s.spawnFloatingText(`💰 +${bonus} BONUS SKULLS!`, window.innerWidth / 2, window.innerHeight / 2, '#ffd700', 32);
        }
      });
    };
  }

  const btnMenu = document.getElementById('btn-menu');
  if (btnMenu) {
    btnMenu.onclick = () => {
      const s = getScene();
      if (s) s.returnToMenu();
      else uiManager.setState('menu');
    };
  }

  const btnVicMenu = document.getElementById('btn-vic-menu');
  if (btnVicMenu) {
    btnVicMenu.onclick = () => {
      const s = getScene();
      if (s) s.returnToMenu();
      else uiManager.setState('menu');
    };
  }

  const btnContinueEndless = document.getElementById('btn-continue-endless');
  if (btnContinueEndless) {
    btnContinueEndless.onclick = () => {
      const s = getScene();
      if (s) {
        s.gameMode = 'endless';
        if (s.player) {
          s.player.setEndlessMode(true);
        }
        s.openShop();
      }
    };
  }

  const btnNextWave = document.getElementById('btn-next-wave');
  if (btnNextWave) {
    btnNextWave.onclick = () => {
      const s = getScene();
      if (s) {
        if (s.gameMode === 'endless') {
          s.player.hp = Math.min(s.player.maxHP, s.player.hp + 30);
        } else {
          const healAmount = Math.max(75, Math.round(s.player.maxHP * 0.65));
          s.player.hp = Math.min(s.player.maxHP, s.player.hp + healAmount);
          if (s.tower) s.tower.repair(80);
        }
        s.state = 'playing';
        uiManager.setState('playing');
        s.startNextWave();
      }
    };
  }

  const btnHudPause = document.getElementById('btn-hud-pause');
  if (btnHudPause) {
    btnHudPause.onclick = () => {
      const s = getScene();
      if (s) s.togglePause();
    };
  }

  const btnPauseResume = document.getElementById('btn-pause-resume');
  if (btnPauseResume) {
    btnPauseResume.onclick = () => {
      const s = getScene();
      if (s) s.togglePause();
    };
  }

  const btnPauseRestart = document.getElementById('btn-pause-restart');
  if (btnPauseRestart) {
    btnPauseRestart.onclick = () => {
      const s = getScene();
      if (s) s.restartWave();
    };
  }

  const btnPauseMenu = document.getElementById('btn-pause-menu');
  if (btnPauseMenu) {
    btnPauseMenu.onclick = () => {
      const s = getScene();
      if (s) s.returnToMenu();
      else uiManager.setState('menu');
    };
  }

  const updateSoundUI = (on: boolean) => {
    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.innerHTML = `
        <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
          ${on ? '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>' : '<line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>'}
        </svg>
        <span id="sound-text">SOUND: ${on ? 'ON' : 'OFF'}</span>
      `;
    }
    const btnHudSound = document.getElementById('btn-hud-sound');
    if (btnHudSound) {
      btnHudSound.innerHTML = `
        <svg class="hud-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
          ${on ? '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>' : '<line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>'}
        </svg>
      `;
    }
  };

  const btnSound = document.getElementById('btn-sound');
  if (btnSound) {
    btnSound.onclick = () => {
      const on = soundFX.toggleMute();
      updateSoundUI(on);
    };
  }

  const btnHudSound = document.getElementById('btn-hud-sound');
  if (btnHudSound) {
    btnHudSound.onclick = () => {
      const on = soundFX.toggleMute();
      updateSoundUI(on);
    };
  }

  updateSoundUI(!soundFX.muted);

  window.addEventListener('keydown', e => {
    // Prevent iframe scrolling on game control keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      if (e.target === document.body || e.target === canvas) {
        e.preventDefault();
      }
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      const s = getScene();
      if (s && (s.state === 'playing' || s.state === 'pause')) {
        e.preventDefault();
        s.togglePause();
      }
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      const s = getScene();
      if (s && s.state === 'shop') {
        e.preventDefault();
        document.getElementById('btn-next-wave')?.click();
      }
    }
  }, { passive: false });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initUI(); initMenuParticles(); });
} else {
  initUI();
  initMenuParticles();
}

/* ── Floating ember particles for the menu background ── */
function initMenuParticles() {
  const container = document.getElementById('menu-particles');
  if (!container) return;
  const COLORS = ['#f5a62366', '#3ddc8444', '#ff6b6b33', '#ffd70044'];
  function spawnEmber() {
    const el = document.createElement('div');
    const size = 2 + Math.random() * 3;
    const x = Math.random() * 100;
    const dur = 6 + Math.random() * 8;
    const drift = -30 + Math.random() * 60;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    Object.assign(el.style, {
      position: 'absolute',
      bottom: '-10px',
      left: x + '%',
      width: size + 'px',
      height: size + 'px',
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 ${size * 2}px ${color}`,
      opacity: '0',
      pointerEvents: 'none',
      animation: `emberRise ${dur}s ease-out forwards`,
      '--drift': drift + 'px'
    } as any);
    container.appendChild(el);
    setTimeout(() => el.remove(), dur * 1000);
  }
  // Inject keyframe once
  const style = document.createElement('style');
  style.textContent = `
    @keyframes emberRise {
      0%   { transform: translateY(0) translateX(0); opacity: 0; }
      10%  { opacity: 0.8; }
      80%  { opacity: 0.4; }
      100% { transform: translateY(-100vh) translateX(var(--drift, 0px)); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  setInterval(spawnEmber, 300);
  // Spawn initial batch
  for (let i = 0; i < 8; i++) setTimeout(spawnEmber, i * 80);
}
