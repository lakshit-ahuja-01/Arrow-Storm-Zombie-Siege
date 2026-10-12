import Phaser from 'phaser';
import { UpgradeItem, GameState } from '../types';
import { soundFX } from './SoundFX';
import { HERO_SKINS_CATALOG, HeroSkinDef } from './HeroSkinsCatalog';

export class UIManager {
  public currentCategory: string = 'all';
  public currentSort: string = 'default';
  public shopOpenedFromMenu: boolean = false;
  public shopOpenedFromGameOver: boolean = false;

  public setState(s: GameState): void {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const hud = document.getElementById('hud');
    const charge = document.getElementById('charge-indicator');

    if (s === 'menu') {
      document.getElementById('screen-menu')?.classList.add('active');
      hud?.classList.add('hidden');
      charge?.classList.add('hidden');
    } else if (s === 'playing') {
      hud?.classList.remove('hidden');
      charge?.classList.add('hidden');
      const btn = document.getElementById('btn-hud-pause');
      if (btn) {
        btn.innerHTML = `<svg class="hud-svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
      }
    } else if (s === 'shop') {
      document.getElementById('screen-shop')?.classList.add('active');
    } else if (s === 'pause') {
      document.getElementById('screen-pause')?.classList.add('active');
    } else if (s === 'gameover') {
      document.getElementById('screen-gameover')?.classList.add('active');
      hud?.classList.add('hidden');
    } else if (s === 'victory') {
      document.getElementById('screen-victory')?.classList.add('active');
      hud?.classList.add('hidden');

    } else if (s === 'wardrobe') {
      document.getElementById('screen-wardrobe')?.classList.add('active');
      hud?.classList.add('hidden');
      charge?.classList.add('hidden');
    }
  }

  public updateHUD(player: any, tower: any, wave: number, enemiesAlive: number, kills: number, gameMode: string = 'campaign'): void {
    if (player) {
      const hpFrac = Math.max(0, Math.min(1, player.hp / (player.maxHP || 1)));
      const fillEl = document.getElementById('health-fill-p1');
      const drainEl = document.getElementById('drain-fill-p1');
      const valEl = document.getElementById('hp-val-p1');
      if (fillEl) fillEl.style.width = `${hpFrac * 100}%`;
      if (drainEl) drainEl.style.width = `${hpFrac * 100}%`;
      if (valEl) valEl.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.maxHP}`;

      const isCharging = !!player.isCharging;
      const currentCost = isCharging && player.getCurrentStaminaCost ? player.getCurrentStaminaCost() : 0;
      const effectiveStamina = isCharging ? Math.max(0, (player.stamina ?? 100) - currentCost) : (player.stamina ?? 100);

      const staminaFrac = Math.max(0, Math.min(1, effectiveStamina / (player.maxStamina || 100)));
      const baseStaminaFrac = Math.max(0, Math.min(1, (player.stamina ?? 100) / (player.maxStamina || 100)));
      const sFill = document.getElementById('stamina-fill-p1');
      const sDrain = document.getElementById('stamina-drain-p1');
      const sVal = document.getElementById('stamina-val-p1');

      if (isCharging) {
        if (sFill) {
          sFill.style.width = `${staminaFrac * 100}%`;
          sFill.style.transition = 'width 0.04s linear';
        }
        if (sDrain) {
          sDrain.style.width = `${baseStaminaFrac * 100}%`;
          sDrain.style.background = 'rgba(255, 71, 87, 0.7)';
        }
        if (sVal) {
          sVal.innerHTML = `${Math.max(0, Math.round(effectiveStamina))} / ${player.maxStamina || 100} <span style="color: #ff6b6b; font-size: 11px; font-weight: 800;">(-${currentCost})</span>`;
        }
      } else {
        if (sFill) {
          sFill.style.width = `${staminaFrac * 100}%`;
          sFill.style.transition = 'width 0.15s ease-out';
        }
        if (sDrain) {
          sDrain.style.width = `${staminaFrac * 100}%`;
          sDrain.style.background = '';
        }
        if (sVal) sVal.textContent = `${Math.max(0, Math.round(player.stamina ?? 100))} / ${player.maxStamina || 100}`;
      }

      const gemCount = document.getElementById('gem-count');
      if (gemCount) gemCount.textContent = `${player.skulls}`;
      const mCount = document.getElementById('menu-skulls-count');
      if (mCount) mCount.textContent = `${player.skulls}`;
    }

    if (tower) {
      const towerFrac = Math.max(0, Math.min(1, tower.hp / (tower.maxHP || 1)));
      const towerBar = document.getElementById('health-fill-tower');
      const towerDrain = document.getElementById('drain-fill-tower');
      const towerVal = document.getElementById('hp-val-tower');
      if (towerBar) towerBar.style.width = `${towerFrac * 100}%`;
      if (towerDrain) towerDrain.style.width = `${towerFrac * 100}%`;
      if (towerVal) towerVal.textContent = `${Math.max(0, Math.round(tower.hp))} / ${tower.maxHP}`;
    }

    const mainScene = (window as any).game?.scene?.getScene('MainScene');
    const isBlood = mainScene?.isBloodMoon?.();
    const bloodTag = isBlood ? ` <span class="hud-mode-tag blood-moon-tag">🩸 BLOOD MOON • 3X SKULLS 💀</span>` : '';

    const waveNum = document.getElementById('wave-num');
    if (waveNum) {
      if (gameMode === 'campaign') {
        waveNum.innerHTML = `${wave} <span style="font-size: 13px; color: #a4b0be;">/ 20</span> <span class="hud-mode-tag">CAMPAIGN</span>${bloodTag}`;
      } else {
        waveNum.innerHTML = `${wave} <span class="hud-mode-tag endless">ENDLESS</span>${bloodTag}`;
      }
    }
    const enemyCount = document.getElementById('enemy-count');
    if (enemyCount) enemyCount.textContent = `${enemiesAlive}`;
    const killCount = document.getElementById('kill-count');
    if (killCount) killCount.textContent = `${kills}`;
  }

  public updateBossHUD(boss: any | null): void {
    const barEl = document.getElementById('boss-hud-bar');
    if (!barEl) return;
    if (!boss || boss.dead || boss.hp <= 0) {
      if (!barEl.classList.contains('hidden')) {
        barEl.classList.add('hidden');
      }
      return;
    }

    if (barEl.classList.contains('hidden')) {
      barEl.classList.remove('hidden');
    }

    const nameEl = document.getElementById('boss-hud-name');
    const badgeEl = document.getElementById('boss-hud-badge');
    const hpTextEl = document.getElementById('boss-hud-hp-text');
    const fillEl = document.getElementById('boss-hud-fill');
    const drainEl = document.getElementById('boss-hud-drain');

    let bossName = 'GARGANTUAR TITAN';
    let bossBadge = '👑 TITAN';
    if (boss.type === 'malakor') {
      bossName = 'MALAKOR ELDRITCH GOD TITAN';
      bossBadge = '👑 APEX SOVEREIGN';
    } else if (boss.type === 'reaper') {
      bossName = 'ABYSSAL LICH TITAN';
      bossBadge = '👑 VOID LICH';
    } else if (boss.type === 'voidknight') {
      bossName = 'VOID REVENANT WARMASTER';
      bossBadge = '💀 ELITE TITAN';
    } else if (boss.type === 'juggernaut') {
      bossName = 'DREAD JUGGERNAUT';
      bossBadge = '🛡️ VANGUARD';
    }

    if (nameEl) nameEl.textContent = bossName;
    if (badgeEl) badgeEl.textContent = bossBadge;

    const hpFrac = Math.max(0, Math.min(1, boss.hp / (boss.maxHP || 1)));
    const drainFrac = Math.max(0, Math.min(1, (boss.drainHp || boss.hp) / (boss.maxHP || 1)));

    if (fillEl) fillEl.style.width = `${hpFrac * 100}%`;
    if (drainEl) drainEl.style.width = `${drainFrac * 100}%`;
    if (hpTextEl) hpTextEl.textContent = `${Math.max(0, Math.round(boss.hp))} / ${boss.maxHP} HP`;
  }

  public showWaveAnnouncement(wave: number, title: string, desc: string, isBloodMoon?: boolean): void {
    const el = document.getElementById('wave-banner');
    if (!el) return;
    const nightEl = document.getElementById('wb-night');
    const titleEl = document.getElementById('wb-title');
    const descEl = document.getElementById('wb-desc');

    if (nightEl) {
      nightEl.textContent = isBloodMoon ? `NIGHT ${wave} • BLOOD MOON` : `NIGHT ${wave}`;
      nightEl.style.color = isBloodMoon ? '#ff4757' : '';
    }
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;

    if (isBloodMoon) {
      el.classList.add('blood-moon-banner');
    } else {
      el.classList.remove('blood-moon-banner');
    }

    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'bannerSwoop 3.0s cubic-bezier(0.16, 1, 0.3, 1) forwards';

    setTimeout(() => {
      el.classList.add('hidden');
    }, 3000);
  }

  public triggerDamageFlash(): void {
    const v = document.getElementById('damage-vignette');
    if (!v) return;
    v.classList.add('active');
    setTimeout(() => v.classList.remove('active'), 200);
  }

  private shopToastTimer: any = null;
  public showShopNotice(msg: string): void {
    const toast = document.getElementById('shop-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    if (this.shopToastTimer) clearTimeout(this.shopToastTimer);
    this.shopToastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  public getUpgradeCost(up: UpgradeItem, gameMode?: string): number {
    const mainScene = (window as any).game?.scene?.getScene('MainScene');
    const mode = gameMode || mainScene?.gameMode || 'campaign';
    const isEndless = mode === 'endless';

    // Multipliers:
    // Endless mode: slightly increased (1.25x base, 1 + level * 0.45)
    // Level-wise (Campaign) mode: majorly increased (2.2x base, 1 + level * 0.75) to make the game genuinely difficult!
    const baseMultiplier = isEndless ? 1.25 : 2.2;
    const levelScaling = isEndless ? 0.45 : 0.75;

    // Dedicated high-tier auto-turret pricing: 450 skulls base
    if (up.id === 'sentry') {
      const baseCost = 450;
      const levelScaling = isEndless ? 0.45 : 0.75;
      const finalCost = up.level && up.level > 0 ? baseCost * (1 + up.level * levelScaling) : baseCost;
      return Math.round(finalCost / 5) * 5;
    }

    let baseCost = up.cost * baseMultiplier;

    if (up.maxLevel && up.level && up.level > 0) {
      baseCost = baseCost * (1 + up.level * levelScaling);
    }

    return Math.max(10, Math.round(baseCost / 5) * 5);
  }

  public buildShop(upgrades: UpgradeItem[], player: any, tower: any, wave: number, onUpdate: () => void): void {
    const grid = document.getElementById('shop-items');
    if (!grid || !player) return;
    grid.innerHTML = '';

    const prevWaveEl = document.getElementById('shop-wave-prev');
    if (prevWaveEl) prevWaveEl.textContent = `${Math.max(1, wave)}`;
    const gemsEl = document.getElementById('shop-gems');
    if (gemsEl) gemsEl.textContent = `${player.skulls}`;

    const mainScene = (window as any).game?.scene?.getScene('MainScene');
    const isEndless = mainScene?.gameMode === 'endless';
    const subTitleEl = document.querySelector('.shop-subtitle');
    if (subTitleEl) {
      const modeTag = isEndless
        ? `<span class="hud-mode-tag endless">ENDLESS RUN • 2X DOUBLE SKULLS 💀</span>`
        : `<span class="hud-mode-tag" style="background:rgba(231,76,60,0.18);color:#ff6b6b;border-color:rgba(231,76,60,0.4)">HARDCORE CAMPAIGN • ELITE COSTS</span>`;

      if (this.shopOpenedFromGameOver) {
        subTitleEl.innerHTML = `Defeat Recovery: Invest gathered skulls into bows, ballistas & fortress HP to conquer Night <span id="shop-wave-prev">${Math.max(1, wave)}</span>! ${modeTag}`;
      } else if (this.shopOpenedFromMenu) {
        subTitleEl.innerHTML = `Fortify your hero archer and tower defenses with your gathered skulls. ${modeTag}`;
      } else {
        subTitleEl.innerHTML = `Night <span id="shop-wave-prev">${Math.max(1, wave)}</span> Cleared! Fortify your archer and tower defenses. ${modeTag}`;
      }
    }

    const returnBtn = document.getElementById('btn-shop-return');
    const nextBtn = document.getElementById('btn-next-wave');
    const nextBtnText = document.getElementById('btn-next-wave-text');
    const nextBtnKey = document.getElementById('btn-next-wave-key');

    if (this.shopOpenedFromGameOver) {
      if (returnBtn) {
        returnBtn.style.display = 'inline-flex';
        returnBtn.onclick = () => {
          this.setState('gameover');
          const gemsEl = document.getElementById('go-gems');
          if (gemsEl) gemsEl.textContent = `${player.skulls}`;
          const skullsHint = document.getElementById('go-alert-skulls');
          if (skullsHint) skullsHint.textContent = `💀 ${player.skulls} SKULLS READY`;
        };
      }
      if (nextBtn) {
        if (nextBtnText) nextBtnText.textContent = 'RETRY DEFENSE';
        if (nextBtnKey) nextBtnKey.style.display = 'inline-block';
        nextBtn.onclick = () => {
          this.shopOpenedFromGameOver = false;
          const s = (window as any).game?.scene?.getScene('MainScene');
          if (s) {
            s.startGame(s.gameMode);
          }
        };
      }
    } else if (this.shopOpenedFromMenu) {
      if (returnBtn) {
        returnBtn.style.display = 'inline-flex';
        returnBtn.onclick = () => {
          this.setState('menu');
          (player?.scene as any)?.updateMenuSkullsUI?.();
        };
      }
      if (nextBtn) {
        if (nextBtnText) nextBtnText.textContent = 'START DEFENSE';
        if (nextBtnKey) nextBtnKey.style.display = 'inline-block';
        nextBtn.onclick = () => {
          this.shopOpenedFromMenu = false;
          const s = (window as any).game?.scene?.getScene('MainScene');
          if (s) {
            s.startGame(s.gameMode);
          }
        };
      }
    } else {
      if (returnBtn) {
        returnBtn.style.display = 'inline-flex';
        returnBtn.onclick = () => {
          const s = (window as any).game?.scene?.getScene('MainScene');
          if (s) {
            s.returnToMenu();
          } else {
            this.setState('menu');
          }
        };
      }
      if (nextBtn) {
        const mainScene = (window as any).game?.scene?.getScene('MainScene');
        const isEndless = mainScene?.gameMode === 'endless' || player.isEndless;
        if (wave >= 20 && !isEndless) {
          if (nextBtnText) nextBtnText.textContent = 'CLAIM VICTORY';
          if (nextBtnKey) nextBtnKey.style.display = 'none';
          nextBtn.onclick = () => {
            if (mainScene) mainScene.showVictoryScreen();
          };
        } else {
          if (nextBtnText) nextBtnText.textContent = 'START NEXT NIGHT';
          if (nextBtnKey) nextBtnKey.style.display = 'inline-block';
          nextBtn.onclick = () => {
            const s = (window as any).game?.scene?.getScene('MainScene');
            if (s) {
              if (s.gameMode === 'endless') {
                s.player.hp = Math.min(s.player.maxHP, s.player.hp + 30);
              } else {
                const healAmount = Math.max(75, Math.round(s.player.maxHP * 0.65));
                s.player.hp = Math.min(s.player.maxHP, s.player.hp + healAmount);
                if (s.tower) s.tower.repair(80);
              }
              s.state = 'playing';
              this.setState('playing');
              s.startNextWave();
            }
          };
        }
      }
    }

    // Category Tabs
    const filterBtns = document.querySelectorAll('.shop-filter-btn');
    filterBtns.forEach(btn => {
      const el = btn as HTMLElement;
      el.classList.toggle('active', el.dataset.cat === this.currentCategory);
      el.onclick = () => {
        this.currentCategory = el.dataset.cat || 'all';
        this.buildShop(upgrades, player, tower, wave, onUpdate);
      };
    });

    // Sort Select
    const sortSelect = document.getElementById('shop-sort-select') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.value = this.currentSort;
      sortSelect.onchange = () => {
        this.currentSort = sortSelect.value;
        this.buildShop(upgrades, player, tower, wave, onUpdate);
      };
    }

    let itemsToShow = upgrades.slice();
    if (this.currentCategory !== 'all') {
      itemsToShow = itemsToShow.filter(u => u.category === this.currentCategory);
    }

    const renderCard = (up: UpgradeItem) => {
      const item = document.createElement('div');
      item.className = 'shop-item';

      const isBowCategory = up.category === 'bows';
      const bowId = (up.id === 'cryo' || up.id === 'ice') ? 'ice' : (up.id as any);
      const isSlot1 = isBowCategory && player.primaryBow === bowId;
      const isSlot2 = isBowCategory && player.secondaryBow === bowId;
      const isEquippedBow = isSlot1 || isSlot2;
      const isEquippedSpikes = up.id === 'spikes' && tower.hasSpikes;
      const isEquippedCaltrops = up.id === 'caltrops' && tower.hasCaltrops;
      const isEquippedTar = up.id === 'tarMoat' && tower.hasTarMoat;
      const isEquippedPitchPits = up.id === 'pitchPits' && tower.hasPitchPits;
      const isEquippedBarrels = up.id === 'gunpowderBarrels' && tower.hasGunpowderBarrels;
      const isEquippedSmoke = up.id === 'smokeScreen' && tower.hasSmokeScreen;
      const isFortressDefense = isEquippedSpikes || isEquippedCaltrops || isEquippedTar || isEquippedPitchPits || isEquippedBarrels || isEquippedSmoke;
      const isVolleyUnlocked = up.id === 'unlockVolley' && (!!up.bought || !!(player?.scene as any)?.hasVolleyUnlocked);
      const isFrostUnlocked = up.id === 'unlockFrostNova' && (!!up.bought || !!(player?.scene as any)?.hasFrostNovaUnlocked);
      const isOneTimeBought = !!up.oneTime && (!!up.bought || isVolleyUnlocked || isFrostUnlocked);
      const isEquipped = isEquippedBow || isFortressDefense || isOneTimeBought;
      const isMaxed = up.maxLevel ? (up.level || 0) >= up.maxLevel : false;
      const isChargeSkill = up.id === 'nukeStrike' || up.id === 'lightningStorm' || up.id === 'timeStop' || up.id === 'godMode';
      const charges = up.id === 'nukeStrike' ? (player.nukeCharges || 0)
                    : (up.id === 'lightningStorm' || up.id === 'timeStop') ? (player.lightningCharges || player.timeFreezeCharges || 0)
                    : up.id === 'godMode' ? (player.divineAegisCharges || 0)
                    : 0;

      const currentCost = this.getUpgradeCost(up);
      let canAfford = false;
      let actionHtml = '';

      const isVolleyLocked = up.id === 'volleyMastery' && !upgrades.find(u => u.id === 'unlockVolley')?.bought && !(player?.scene as any)?.hasVolleyUnlocked;
      const isFrostLocked = up.id === 'frostMastery' && !upgrades.find(u => u.id === 'unlockFrostNova')?.bought && !(player?.scene as any)?.hasFrostNovaUnlocked;
      const isMasteryLocked = isVolleyLocked || isFrostLocked;

      if (isBowCategory && up.bought) {
        // Dual Slot Equip Dock
        actionHtml = `
          <div class="shop-equip-slots">
            <button class="shop-slot-btn slot-1 ${isSlot1 ? 'equipped active' : ''}" type="button" title="Equip to Slot [1] Primary">
              ${isSlot1 ? '[1] PRIMARY' : 'SET [1]'}
            </button>
            <button class="shop-slot-btn slot-2 ${isSlot2 ? 'equipped active' : ''}" type="button" title="Equip to Slot [2] Secondary">
              ${isSlot2 ? '[2] SECONDARY' : 'SET [2]'}
            </button>
          </div>
        `;
      } else if (isFortressDefense) {
        actionHtml = `<button class="shop-buy-btn btn-equipped">DEPLOYED</button>`;
      } else if (isOneTimeBought) {
        actionHtml = `<button class="shop-buy-btn btn-equipped">UNLOCKED</button>`;
      } else if (isChargeSkill) {
        canAfford = player.skulls >= currentCost;
        actionHtml = `<button class="shop-buy-btn" ${!canAfford ? 'disabled' : ''}>+1 CHARGE (💀 ${currentCost})</button>`;
      } else if (isEquipped) {
        actionHtml = `<button class="shop-buy-btn btn-equipped">DEPLOYED</button>`;
      } else if (isMaxed) {
        actionHtml = `<button class="shop-buy-btn" disabled>MAX LEVEL</button>`;
      } else if (isMasteryLocked) {
        actionHtml = `<button class="shop-buy-btn" disabled style="opacity:0.6;font-size:12px;">🔒 REQUIRES UNLOCK</button>`;
      } else {
        canAfford = player.skulls >= currentCost;
        actionHtml = `<button class="shop-buy-btn" ${!canAfford ? 'disabled' : ''}>💀 ${currentCost}</button>`;
      }

      if (isEquipped) item.classList.add('equipped');
      if ((!canAfford || isMasteryLocked) && !isEquipped && !(isBowCategory && up.bought)) item.classList.add('disabled');

      const levelTag = isChargeSkill
        ? `<span class="shop-lvl-badge" style="background:rgba(245,166,35,0.22);color:#f5a623;border-color:rgba(245,166,35,0.5);">x${charges} Ready</span>`
        : (up.maxLevel ? `<span class="shop-lvl-badge">Lvl ${up.level || 0}/${up.maxLevel}</span>` : '');

      item.innerHTML = `
        <div class="shop-item-icon">${up.icon}</div>
        <div class="shop-item-content">
          <div class="shop-item-header">
            <div class="shop-item-name">${up.name}</div>
            ${levelTag}
          </div>
          <div class="shop-item-desc">${up.desc}${isVolleyLocked ? ' <span style="color:#ff6b6b;font-weight:700;">(Requires Volley Unlock)</span>' : ''}${isFrostLocked ? ' <span style="color:#ff6b6b;font-weight:700;">(Requires Frost Nova Unlock)</span>' : ''}</div>
          ${up.statLabel ? `<div class="shop-item-stat" style="font-size:11px;color:#f5a623;font-weight:700;margin-top:3px;">⚡ ${up.statLabel}</div>` : ''}
        </div>
        ${actionHtml}
      `;

      if (isBowCategory && up.bought) {
        const slot1Btn = item.querySelector('.shop-slot-btn.slot-1') as HTMLButtonElement;
        const slot2Btn = item.querySelector('.shop-slot-btn.slot-2') as HTMLButtonElement;
        if (slot1Btn) {
          slot1Btn.onclick = (e) => {
            e.stopPropagation();
            if (player.equipToSlot) {
              player.equipToSlot(1, bowId);
            } else {
              player.primaryBow = bowId;
              player.bowType = bowId;
            }
            soundFX.playBowDraw();
            this.showShopNotice(`🏹 Equipped ${up.name} to Slot [1] Primary!`);
            onUpdate();
            this.buildShop(upgrades, player, tower, wave, onUpdate);
          };
        }
        if (slot2Btn) {
          slot2Btn.onclick = (e) => {
            e.stopPropagation();
            if (player.equipToSlot) {
              player.equipToSlot(2, bowId);
            } else {
              player.secondaryBow = bowId;
              player.bowType = bowId;
            }
            soundFX.playBowDraw();
            this.showShopNotice(`🏹 Equipped ${up.name} to Slot [2] Secondary!`);
            onUpdate();
            this.buildShop(upgrades, player, tower, wave, onUpdate);
          };
        }
      }

      const performAction = () => {
        if (isBowCategory && up.bought) {
          const targetSlot: 1 | 2 = isSlot1 ? 2 : 1;
          if (player.equipToSlot) {
            player.equipToSlot(targetSlot, bowId);
          }
          soundFX.playBowDraw();
          this.showShopNotice(`🏹 Equipped ${up.name} to Slot [${targetSlot}]!`);
          onUpdate();
          this.buildShop(upgrades, player, tower, wave, onUpdate);
          return;
        }
        if (isEquipped) {
          this.showShopNotice('Already equipped and active!');
          return;
        }
        if (isMaxed) {
          this.showShopNotice('Max level reached!');
          return;
        }
        if (isMasteryLocked) {
          soundFX.playArmorHit();
          item.classList.remove('shop-item-shake');
          void item.offsetWidth;
          item.classList.add('shop-item-shake');
          this.showShopNotice(isVolleyLocked ? '🔒 Unlock Arrow Volley [F] (300 💀) first!' : '🔒 Unlock Glacial Frost Nova [E] (500 💀) first!');
          return;
        }
        if (canAfford) {
          player.skulls -= currentCost;
          up.apply(player, tower);
          up.bought = true;
          if (up.id === 'unlockVolley' && player?.scene) {
            (player.scene as any).hasVolleyUnlocked = true;
            (player.scene as any).updateSkillsHUD?.();
          } else if (up.id === 'unlockFrostNova' && player?.scene) {
            (player.scene as any).hasFrostNovaUnlocked = true;
            (player.scene as any).updateSkillsHUD?.();
          }
          if (isBowCategory) {
            const targetSlot: 1 | 2 = (player.primaryBow === 'normal' ? 1 : (player.secondaryBow === 'normal' ? 2 : (player.activeSlot || 1)));
            if (player.equipToSlot) {
              player.equipToSlot(targetSlot, bowId);
            } else {
              if (targetSlot === 1) player.primaryBow = bowId;
              else player.secondaryBow = bowId;
              player.bowType = bowId;
            }
            this.showShopNotice(`Unlocked ${up.name} (Assigned to Slot [${targetSlot}])!`);
          } else if (isChargeSkill) {
            const count = up.id === 'nukeStrike' ? player.nukeCharges : (up.id === 'lightningStorm' || up.id === 'timeStop') ? (player.lightningCharges || player.timeFreezeCharges || 0) : player.divineAegisCharges;
            this.showShopNotice(`Acquired ${up.name}! (x${count} Charges Ready)`);
          } else {
            this.showShopNotice(`Acquired ${up.name}!`);
          }
          if (up.maxLevel) up.level = (up.level || 0) + 1;
          soundFX.playGemCollect();
          onUpdate();
          this.buildShop(upgrades, player, tower, wave, onUpdate);
        } else {
          soundFX.playArmorHit();
          item.classList.remove('shop-item-shake');
          void item.offsetWidth;
          item.classList.add('shop-item-shake');
          this.showShopNotice(`⚠️ Need ${currentCost} Skulls! (You have ${player.skulls})`);
        }
      };

      item.style.cursor = 'pointer';
      item.onclick = (e) => {
        if ((e.target as HTMLElement)?.closest('.shop-buy-btn') || (e.target as HTMLElement)?.closest('.shop-slot-btn')) return;
        performAction();
      };
      const buyBtn = item.querySelector('.shop-buy-btn') as HTMLElement;
      if (buyBtn) {
        buyBtn.onclick = (e) => {
          e.stopPropagation();
          performAction();
        };
      }

      grid.appendChild(item);
    };

    // Sorting
    if (this.currentSort === 'cost-asc') {
      itemsToShow.sort((a, b) => this.getUpgradeCost(a) - this.getUpgradeCost(b));
      itemsToShow.forEach(renderCard);
    } else if (this.currentSort === 'cost-desc') {
      itemsToShow.sort((a, b) => this.getUpgradeCost(b) - this.getUpgradeCost(a));
      itemsToShow.forEach(renderCard);
    } else if (this.currentSort === 'name-asc') {
      itemsToShow.sort((a, b) => a.name.localeCompare(b.name));
      itemsToShow.forEach(renderCard);
    } else {
      // Default: By Criteria Groups
      if (this.currentCategory === 'all') {
        const groups = [
          { id: 'bows', title: 'Weapon Arsenal' },
          { id: 'archer', title: 'Hero Archer Perks' },
          { id: 'tower', title: 'Fortress Defenses & Traps' },
          { id: 'special', title: 'Elite Special Abilities' },
        ];
        groups.forEach(g => {
          const groupItems = itemsToShow.filter(u => u.category === g.id).sort((a, b) => this.getUpgradeCost(a) - this.getUpgradeCost(b));
          if (groupItems.length > 0) {
            const h = document.createElement('div');
            h.className = 'shop-section-title';
            h.textContent = g.title;
            grid.appendChild(h);
            groupItems.forEach(renderCard);
          }
        });
      } else {
        itemsToShow.sort((a, b) => this.getUpgradeCost(a) - this.getUpgradeCost(b));
        itemsToShow.forEach(renderCard);
      }
    }
  }

  public showWardrobeNotice(text: string): void {
    const toast = document.getElementById('wardrobe-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.remove('hidden');
    clearTimeout((this as any)._wardrobeToastTimeout);
    (this as any)._wardrobeToastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }

  public buildWardrobe(player: any, scene: any): void {
    const container = document.getElementById('wardrobe-items');
    if (!container) return;
    container.innerHTML = '';

    const skullsDisplay = document.getElementById('wardrobe-skulls');
    if (skullsDisplay) {
      skullsDisplay.textContent = `${player ? (player.skulls || 0) : (scene?.player?.skulls ?? 0)}`;
    }

    const unlockedSkins: string[] = scene?.unlockedSkins || ['default'];
    const currentSkin: string = player ? player.currentSkin : (scene?.currentSkin || 'default');

    HERO_SKINS_CATALOG.forEach((skin: HeroSkinDef) => {
      const isUnlocked = unlockedSkins.includes(skin.id) || skin.cost === 0;
      const isEquipped = currentSkin === skin.id;
      const playerSkulls = player ? (player.skulls || 0) : 0;
      const canAfford = playerSkulls >= skin.cost;

      const card = document.createElement('div');
      card.className = `wardrobe-card-item ${isEquipped ? 'equipped' : ''} ${!isUnlocked && !canAfford ? 'locked' : ''}`;
      card.style.setProperty('--skin-accent', skin.accentColor);

      let actionHtml = '';
      if (isEquipped) {
        actionHtml = `<button class="wardrobe-action-btn btn-equipped" type="button">EQUIPPED</button>`;
      } else if (isUnlocked) {
        actionHtml = `<button class="wardrobe-action-btn btn-equip" type="button">EQUIP SKIN</button>`;
      } else {
        actionHtml = `<button class="wardrobe-action-btn btn-unlock ${!canAfford ? 'disabled' : ''}" type="button" ${!canAfford ? 'disabled' : ''}>💀 ${skin.cost} SKULLS</button>`;
      }

      const tagsHtml = skin.tags.map(t => `<span class="wardrobe-tag">${t}</span>`).join('');

      card.innerHTML = `
        <div class="wardrobe-card-header">
          <div class="wardrobe-badge" style="border-color:${skin.accentColor}; box-shadow: 0 0 16px ${skin.accentColor}40;">
            <span class="wardrobe-icon">${skin.icon}</span>
          </div>
          <div class="wardrobe-title-box">
            <div class="wardrobe-theme-title" style="color:${skin.accentColor}">${skin.themeTitle}</div>
            <h3 class="wardrobe-skin-name">${skin.name}</h3>
          </div>
        </div>
        <p class="wardrobe-desc">${skin.desc}</p>
        <div class="wardrobe-tags-row">${tagsHtml}</div>
        <div class="wardrobe-action-box">
          ${actionHtml}
        </div>
      `;

      const handleAction = () => {
        if (isEquipped) {
          this.showWardrobeNotice(`${skin.name} is already equipped!`);
          return;
        }
        if (isUnlocked) {
          if (player && player.setSkin) {
            player.setSkin(skin.id);
          } else if (player) {
            player.currentSkin = skin.id;
          }
          if (scene) {
            scene.currentSkin = skin.id;
            scene.saveGameData?.();
          }
          soundFX.playBowDraw();
          this.showWardrobeNotice(`Equipped ${skin.name}!`);
          this.buildWardrobe(player, scene);
          return;
        }
        // Unlock Skin
        if (canAfford) {
          if (player) player.skulls -= skin.cost;
          if (scene && scene.unlockedSkins && !scene.unlockedSkins.includes(skin.id)) {
            scene.unlockedSkins.push(skin.id);
          }
          if (player && player.setSkin) {
            player.setSkin(skin.id);
          } else if (player) {
            player.currentSkin = skin.id;
          }
          if (scene) {
            scene.currentSkin = skin.id;
            scene.saveGameData?.();
            scene.updateMenuSkullsUI?.();
          }
          soundFX.playGemCollect();
          this.showWardrobeNotice(`Unlocked and Equipped ${skin.name}!`);
          this.buildWardrobe(player, scene);
        } else {
          soundFX.playArmorHit();
          card.classList.remove('shop-item-shake');
          void card.offsetWidth;
          card.classList.add('shop-item-shake');
          this.showWardrobeNotice(`⚠️ Need ${skin.cost} Skulls! (You have ${player ? (player.skulls || 0) : 0})`);
        }
      };

      card.onclick = (e: MouseEvent) => {
        handleAction();
      };

      container.appendChild(card);
    });
  }
}

export const uiManager = new UIManager();
