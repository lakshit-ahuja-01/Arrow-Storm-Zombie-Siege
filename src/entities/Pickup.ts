import Phaser from 'phaser';
import { soundFX } from '../systems/SoundFX';

export class Pickup {
  public scene: Phaser.Scene;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public type: 'skull' | 'apple';
  public value: number;
  public dead: boolean = false;
  public life: number = 0;
  public delay: number;

  constructor(scene: Phaser.Scene, x: number, y: number, type: 'skull' | 'apple' = 'skull', value: number = 1) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = type;
    this.value = value;
    const ang = -Math.PI * 0.8 + Math.random() * (Math.PI * 0.6);
    const spd = 200 + Math.random() * 250;
    this.vx = Math.cos(ang) * spd;
    this.vy = Math.sin(ang) * spd;
    this.delay = 0.2 + Math.random() * 0.15;
  }

  public update(dt: number, player: any): void {
    this.life += dt;
    if (this.life < this.delay) {
      this.vy += 1200 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }

    // Direct homing to player
    const targetX = player ? player.x : this.scene.cameras.main.width - 140;
    const targetY = player ? player.y - 40 : 32;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const d = Math.hypot(dx, dy);

    if (d < 45) {
      this.dead = true;
      this.collect(player);
      return;
    }

    const speed = 900;
    this.vx = (dx / d) * speed;
    this.vy = (dy / d) * speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  public collect(player: any): void {
    if (this.type === 'skull') {
      if (player) player.skulls += this.value;
      (this.scene as any).onSkullCollected?.(this.value);
      soundFX.playGemCollect();
      (this.scene as any).spawnFloatingText?.(`+${this.value} 💀`, this.x, this.y - 20, '#ffd700', 18);
    } else if (this.type === 'apple') {
      if (player) player.hp = Math.min(player.maxHP, player.hp + 25);
      soundFX.playGemCollect();
      (this.scene as any).spawnFloatingText?.('+25 HP ❤️', this.x, this.y - 20, '#2ecc71', 20);
    }
  }

  public render(g: Phaser.GameObjects.Graphics): void {
    if (this.type === 'skull') {
      g.fillStyle(0xf1c40f, 1);
      g.fillCircle(this.x, this.y, 8);
      g.fillStyle(0xd4ac0d, 1);
      g.fillCircle(this.x, this.y, 6);
    } else {
      g.fillStyle(0xe74c3c, 1);
      g.fillCircle(this.x, this.y, 9);
      g.fillStyle(0x2ecc71, 1);
      g.fillCircle(this.x, this.y - 9, 3);
    }
  }
}
