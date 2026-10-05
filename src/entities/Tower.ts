import Phaser from 'phaser';
import { soundFX } from '../systems/SoundFX';

export class Tower {
  public scene: Phaser.Scene;
  public width: number = 140;
  public height: number = 115;
  public maxHP: number = 360;
  public hp: number = 360;

  public hasSpikes: boolean = false;
  public hasCaltrops: boolean = false;
  public hasTarMoat: boolean = false;
  public hasPitchPits: boolean = false;
  public hasGunpowderBarrels: boolean = false;
  public sentryLevel: number = 0;
  public sentryTimer: number = 0;
  public hasBanner: boolean = false;
  public bannerLevel: number = 0;
  public bannerRegenTimer: number = 0;
  public damageReduction: number = 0;
  public hpRegen: number = 0;
  public hpRegenTimer: number = 0;
  public hasTrebuchet: boolean = false;
  public trebuchetTimer: number = 0;
  public hasSmokeScreen: boolean = false;

  private _customX: number | null = null;
  public get x(): number {
    if (this._customX !== null) return this._customX;
    return Math.max(90, this.scene.cameras.main.width * 0.16);
  }
  public set x(val: number) {
    this._customX = val;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public get groundY(): number {
    return this.scene.cameras.main.height * 0.72;
  }

  public get topY(): number {
    return this.groundY - this.height;
  }

  public invincible: boolean = false;

  public takeDamage(amount: number): void {
    if (this.invincible || amount <= 0) return;
    const dr = Math.min(0.80, this.damageReduction || 0);
    const reducedAmount = Math.max(1, amount * (1 - dr));
    this.hp = Math.max(0, this.hp - reducedAmount);
    if ((this.scene as any).onTowerDamage) {
      (this.scene as any).onTowerDamage(reducedAmount);
    }
  }

  public repair(amount: number): void {
    this.hp = Math.min(this.maxHP, this.hp + amount);
    if ((this.scene as any).spawnFloatingText) {
      (this.scene as any).spawnFloatingText(`+${amount} TOWER HP 🛡️`, this.x, this.topY - 30, '#2ecc71', 22);
    }
  }

  public update(dt: number, enemies: any[], arrows: any[]): void {
    // 1. Rooftop Auto-Crossbow Turret auto-firing
    if (this.sentryLevel > 0) {
      this.sentryTimer -= dt;
      if (this.sentryTimer <= 0) {
        this.sentryTimer = Math.max(0.65, 1.3 - this.sentryLevel * 0.22);
        const sx = this.x + this.width / 2 + 5;
        const sy = this.topY - 40;

        let target: any = null;
        let minDist = 999999;
        for (const z of enemies) {
          if (!z.dead && z.x > sx) {
            const d = Phaser.Math.Distance.Between(sx, sy, z.x, z.y);
            if (d < minDist) {
              minDist = d;
              target = z;
            }
          }
        }

        if (target && (this.scene as any).spawnSentryArrow) {
          (this.scene as any).spawnSentryArrow(sx, sy, target.x, target.y - 40, 26 + this.sentryLevel * 12);
        }
      }
    }

    // 2. War Banner HP Regeneration
    if (this.hasBanner) {
      this.bannerRegenTimer -= dt;
      if (this.bannerRegenTimer <= 0) {
        this.bannerRegenTimer = 4.0;
        if (this.hp < this.maxHP) {
          const heal = 12 * (this.bannerLevel || 1);
          this.hp = Math.min(this.maxHP, this.hp + heal);
          if ((this.scene as any).spawnFloatingText) {
            (this.scene as any).spawnFloatingText(`+${heal} 🏰`, this.x + 30, this.topY - 20, '#2ecc71', 18);
          }
        }
      }
    }

    // 3. Holy Healing Shrine Passive HP Regeneration
    if (this.hpRegen > 0 && this.hp < this.maxHP) {
      this.hpRegenTimer -= dt;
      if (this.hpRegenTimer <= 0) {
        this.hpRegenTimer = 1.0;
        this.repair(this.hpRegen);
      }
    }

    // 4. Siege Trebuchet (Launches heavy explosive boulder every 4s)
    if (this.hasTrebuchet) {
      this.trebuchetTimer -= dt;
      if (this.trebuchetTimer <= 0) {
        this.trebuchetTimer = 4.0;
        let bestTarget: any = null;
        let minDist = 999999;
        for (const z of enemies) {
          if (!z.dead && z.x > this.x + 90) {
            const d = z.x - this.x;
            if (d < minDist) {
              minDist = d;
              bestTarget = z;
            }
          }
        }
        if (bestTarget && (this.scene as any).spawnExplosion) {
          const tx = bestTarget.x;
          const ty = bestTarget.y - 10;
          (this.scene as any).spawnExplosion(tx, ty, 110);
          soundFX.playExplosion();
          (this.scene as any).shakeScreen?.(6, 0.2);
          (this.scene as any).spawnFloatingText?.('⚔️ TREBUCHET IMPACT! -90 AOE', tx, ty - 45, '#e67e22', 20);
          for (const z of enemies) {
            if (!z.dead) {
              const dist = Phaser.Math.Distance.Between(tx, ty, z.x, z.y - 25 * z.scale);
              if (dist <= 110) {
                z.takeDamage(90, 80, -60, false, 'torso');
              }
            }
          }
        }
      }
    }
  }

  public render(g: Phaser.GameObjects.Graphics): void {
    const tx = this.x;
    const ty = this.topY;
    const gy = this.groundY;
    const w = this.width;

    // 1. Caltrops Field
    if (this.hasCaltrops) {
      const frontX = tx + w / 2 + 20;
      g.lineStyle(2.2, 0xbdc3c7, 1);
      for (let c = 0; c < 12; c++) {
        const cx = frontX + c * 12 + ((c % 2) * 5);
        const cy = gy - 2;
        g.lineBetween(cx - 5, cy, cx, cy - 9);
        g.lineBetween(cx, cy - 9, cx + 5, cy);
        g.lineBetween(cx, cy - 9, cx, cy);
      }
    }

    // 2. Flaming Tar Trench
    if (this.hasTarMoat) {
      const pitX = tx + w / 2 + 8;
      const pitW = 95;
      g.fillStyle(0x140c06, 1);
      g.fillRect(pitX, gy - 3, pitW, 9);
      g.fillStyle(0xd35400, 1);
      g.fillRect(pitX + 4, gy - 2, pitW - 8, 5);

      // Flickering fiery tongues
      g.fillStyle(0xe74c3c, 0.9);
      for (let f = 0; f < 6; f++) {
        const fx = pitX + 8 + f * 15;
        const fh = 9 + Math.sin(Date.now() * 0.014 + f * 1.5) * 6;
        g.fillTriangle(fx - 4, gy, fx, gy - fh, fx + 4, gy);
      }
    }

    // 3. Timber Pillars & Cross Braces
    g.fillStyle(0x2d1806, 1);
    g.fillRect(tx - w / 2 + 8, ty + 12, 18, gy - ty - 12);
    g.fillRect(tx + w / 2 - 26, ty + 12, 18, gy - ty - 12);
    g.fillRect(tx - 9, ty + 12, 18, gy - ty - 12);

    g.lineStyle(9, 0x1e0e03, 1);
    g.lineBetween(tx - w / 2 + 16, ty + 24, tx + w / 2 - 16, gy);
    g.lineBetween(tx + w / 2 - 16, ty + 24, tx - w / 2 + 16, gy);

    // 4. Barricade Spikes
    g.fillStyle(this.hasSpikes ? 0x7f8c8d : 0x4a2810, 1);
    for (let i = 0; i < 4; i++) {
      const sy = gy - 15 - i * 16;
      g.fillTriangle(tx + w / 2 - 10, sy, tx + w / 2 + (this.hasSpikes ? 32 : 24), sy + 6, tx + w / 2 - 10, sy + 12);
      if (this.hasSpikes) {
        g.lineStyle(1.5, 0xbdc3c7, 1);
        g.strokeTriangle(tx + w / 2 - 10, sy, tx + w / 2 + 32, sy + 6, tx + w / 2 - 10, sy + 12);
      }
    }

    // 5. Wooden Deck Platform
    g.fillStyle(0x4a2810, 1);
    g.fillRect(tx - w / 2 - 12, ty, w + 24, 16);
    g.fillStyle(0x6b3c1b, 1);
    g.fillRect(tx - w / 2 - 12, ty, w + 24, 4);

    // Deck planks
    g.lineStyle(2, 0x1e0e03, 1);
    for (let x = tx - w / 2; x < tx + w / 2; x += 22) {
      g.lineBetween(x, ty, x, ty + 16);
    }

    // Defensive Railing
    g.fillStyle(0x3a1f0a, 1);
    g.fillRect(tx - w / 2 - 8, ty - 32, 10, 32);
    g.fillRect(tx + w / 2 - 2, ty - 32, 10, 32);
    g.fillRect(tx - w / 2 - 10, ty - 36, w + 20, 8);

    // 6. Rooftop Auto-Crossbow Turret
    if (this.sentryLevel > 0) {
      const sentryX = tx + w / 2 - 4;
      const sentryY = ty - 42;
      g.lineStyle(3.5, 0x2c3e50, 1);
      g.lineBetween(sentryX - 8, ty - 32, sentryX, sentryY);
      g.lineBetween(sentryX + 8, ty - 32, sentryX, sentryY);

      g.fillStyle(0x7f8c8d, 1);
      g.fillRect(sentryX - 6, sentryY - 3, 22, 6);
      g.lineStyle(3, 0xf39c12, 1);
      g.lineBetween(sentryX + 10, sentryY - 14, sentryX + 4, sentryY);
      g.lineBetween(sentryX + 4, sentryY, sentryX + 10, sentryY + 14);
      g.fillStyle(0xff4757, 1);
      g.fillCircle(sentryX + 16, sentryY, 2.5);
    }

    // 7. War Banner of Valor
    if (this.hasBanner) {
      const poleX = tx - w / 2 + 6;
      const poleY = ty - 68;
      g.lineStyle(3.5, 0xd4ac0d, 1);
      g.lineBetween(poleX, ty, poleX, poleY);
      g.fillStyle(0xf1c40f, 1);
      g.fillCircle(poleX, poleY, 4);

      const flap = Math.sin(Date.now() * 0.007) * 7;
      g.fillStyle(0xc0392b, 1);
      g.fillTriangle(poleX, poleY + 4, poleX + 32 + flap, poleY + 12, poleX, poleY + 24);
      g.fillStyle(0xf1c40f, 1);
      g.fillCircle(poleX + 14, poleY + 14, 3.5);
    }

    // Fortress Torch
    const torchX = tx - w / 2 - 16;
    const torchY = ty - 14;
    g.fillStyle(0x8b5a2b, 1);
    g.fillRect(torchX - 3, torchY, 6, 22);
    g.fillStyle(0xffa502, 0.9);
    g.fillCircle(torchX, torchY - 8 + Math.sin(Date.now() * 0.012) * 2, 7);

    // 8. Defensive Smoke Screen Cloud
    if (this.hasSmokeScreen) {
      const smokeX = tx + w / 2 + 10;
      const t = Date.now() * 0.001;
      g.fillStyle(0x718093, 0.22);
      for (let s = 0; s < 5; s++) {
        const sx = smokeX + s * 45 + Math.sin(t * 1.5 + s) * 12;
        const sy = gy - 20 + Math.cos(t * 1.2 + s) * 8;
        g.fillCircle(sx, sy, 28 + s * 4);
      }
    }

    // 9. Reinforced Iron Gate Bands
    if (this.damageReduction > 0) {
      g.fillStyle(0x576574, 1);
      g.fillRect(tx - w / 2 + 4, ty + 24, w - 8, 8);
      g.fillRect(tx - w / 2 + 4, gy - 28, w - 8, 8);
      g.lineStyle(1.5, 0x8395a7, 1);
      g.strokeRect(tx - w / 2 + 4, ty + 24, w - 8, 8);
      g.strokeRect(tx - w / 2 + 4, gy - 28, w - 8, 8);
      // Iron Rivets
      g.fillStyle(0xc8d6e5, 1);
      for (let rx = tx - w / 2 + 14; rx < tx + w / 2 - 10; rx += 24) {
        g.fillCircle(rx, ty + 28, 2);
        g.fillCircle(rx, gy - 24, 2);
      }
    }

    // 10. Holy Healing Shrine Relic Pedestal
    if (this.hpRegen > 0) {
      const sx = tx - w / 2 + 24;
      const sy = ty - 26;
      // Pedestal
      g.fillStyle(0x2f3640, 1);
      g.fillRect(sx - 7, sy + 6, 14, 20);
      g.fillStyle(0xdcdde1, 1);
      g.fillRect(sx - 9, sy + 4, 18, 4);
      // Glowing emerald cross
      const pulse = 0.75 + Math.sin(Date.now() * 0.006) * 0.25;
      g.fillStyle(0x2ecc71, pulse);
      g.fillRect(sx - 2, sy - 8, 4, 14);
      g.fillRect(sx - 7, sy - 4, 14, 4);
      g.fillStyle(0x55efc4, pulse * 0.5);
      g.fillCircle(sx, sy - 1, 9);
    }

    // 11. Siege Trebuchet Mounted on Tower Scaffolding
    if (this.hasTrebuchet) {
      const bx = tx - w / 2 + 12;
      const by = ty - 40;
      // Wooden A-Frame Base
      g.lineStyle(4, 0x4a2810, 1);
      g.lineBetween(bx - 12, ty, bx, by);
      g.lineBetween(bx + 12, ty, bx, by);
      g.lineBetween(bx - 10, ty - 12, bx + 10, ty - 12);
      // Trebuchet Beam
      g.lineStyle(3.5, 0x6b3c1b, 1);
      g.lineBetween(bx - 14, by + 12, bx + 22, by - 16);
      // Heavy Counterweight Box
      g.fillStyle(0x2d1806, 1);
      g.fillRect(bx - 19, by + 8, 10, 10);
      g.lineStyle(1.5, 0x718093, 1);
      g.strokeRect(bx - 19, by + 8, 10, 10);
      // Stone Boulder ready in sling
      g.fillStyle(0x95a5a6, 1);
      g.fillCircle(bx + 20, by - 14, 4.5);
    }
  }
}
