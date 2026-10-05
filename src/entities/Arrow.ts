import Phaser from 'phaser';
import { BowType } from '../types';

export interface ArrowOptions {
  damage?: number;
  type?: BowType;
  bonusPierce?: number;
  isPrimaryStorm?: boolean;
}

export class Arrow {
  public scene: Phaser.Scene;
  public body: MatterJS.BodyType;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public damage: number;
  public type: BowType;
  public owner: string;

  public dead: boolean = false;
  public stuck: boolean = false;
  public stuckAngle: number = 0;
  public wobble: number = 0;
  public pierceCount: number;
  public bounceCount: number = 0;
  public isPrimaryStorm: boolean = false;
  public hitEntities: Set<any> = new Set();
  public trail: Array<{ x: number; y: number }> = [];
  public sawAngle: number = 0;
  public prevX: number;
  public prevY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, owner: string, opts: ArrowOptions = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = vx;
    this.vy = vy;
    this.owner = owner;
    this.damage = opts.damage ?? 30;
    this.type = opts.type ?? 'normal';
    this.isPrimaryStorm = !!opts.isPrimaryStorm;

    // Only dedicated siege weapons pierce multiple targets:
    // Ballista (5), Holy Radiant (4), Buzzsaw (3), Ricochet (3 bounces)
    // ALL other arrows (fire, normal, ice, triple, viper, tesla, homing, storm, cluster, blackhole) are strictly single-target!
    const isDedicatedPierce = opts.type === 'ballista' || opts.type === 'holy' || opts.type === 'buzzsaw';
    if (isDedicatedPierce) {
      const basePierce = opts.type === 'ballista' ? 5 : opts.type === 'holy' ? 4 : 3;
      this.pierceCount = basePierce + (opts.bonusPierce || 0);
    } else if (opts.type === 'ricochet') {
      this.pierceCount = 3;
    } else {
      this.pierceCount = 1;
    }

    const matter = scene.matter;
    this.body = matter.bodies.circle(x, y, 8, {
      isSensor: true,
      ignoreGravity: true,
      frictionAir: 0,
      label: 'arrow'
    });
    scene.matter.world.add(this.body as any);
  }

  public get angle(): number {
    return Math.atan2(this.vy, this.vx);
  }

  public update(dt: number, groundY: number, tower: any): void {
    if (this.stuck) {
      this.trail = [];
      if (this.wobble > 0) this.wobble -= dt;
      return;
    }

    this.prevX = this.x;
    this.prevY = this.y;

    // Record trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 14) this.trail.shift();

    if (this.type === 'buzzsaw') {
      this.sawAngle += dt * 35;
    }

    // Homing Seeker steering physics: curves smoothly toward nearest live undead in front
    if (this.type === 'homing' && !this.stuck && this.owner === 'player1') {
      const zList = (this.scene as any).zombies || [];
      let closestZ: any = null;
      let closestDist = 600;
      for (const z of zList) {
        if (z.dead) continue;
        if (z.x < this.x - 30) continue; // Must be in front of the arrow
        const d = Phaser.Math.Distance.Between(this.x, this.y, z.x, z.y - 35 * z.scale);
        if (d < closestDist) {
          closestDist = d;
          closestZ = z;
        }
      }
      if (closestZ) {
        const targetAng = Phaser.Math.Angle.Between(this.x, this.y, closestZ.x, closestZ.y - 35 * closestZ.scale);
        const curAng = Math.atan2(this.vy, this.vx);
        const curSpd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const newAng = Phaser.Math.Angle.RotateTo(curAng, targetAng, 4.2 * dt);
        this.vx = Math.cos(newAng) * curSpd;
        this.vy = Math.sin(newAng) * curSpd;
      }
    }

    // Ballistic trajectory physics: 800 px/s² gravity matches aim prediction arc exactly
    this.vy += 800 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.scene.matter.body.setPosition(this.body, { x: this.x, y: this.y });
    this.scene.matter.body.setVelocity(this.body, { x: this.vx / 60, y: this.vy / 60 });

    // Off-screen check
    const cam = this.scene.cameras.main;
    if (this.x < -100 || this.x > cam.width + 120 || this.y > cam.height + 100) {
      if (this.isPrimaryStorm) {
        this.checkTriggerStormRain(Math.min(this.x, cam.width - 50));
      }
      this.dead = true;
    }

    // Ground or Tower Deck collision (only enemy projectiles can hit tower deck)
    const onTower = (this.owner !== 'player1' && tower && this.x >= tower.x - tower.width / 2 && this.x <= tower.x + tower.width / 2 && this.y >= tower.topY && this.y <= tower.topY + 18);
    if (this.y >= groundY || onTower) {
      this.y = onTower ? tower.topY + 2 : groundY;
      this.stuck = true;
      this.stuckAngle = this.angle;
      this.wobble = 0.45;
      this.trail = []; // Never leave long frozen trail marks on ground!
      this.scene.matter.body.setPosition(this.body, { x: this.x, y: this.y });

      if (this.type === 'cluster') {
        (this.scene as any).spawnExplosion?.(this.x, this.y, 140);
        this.dead = true;
      } else if (this.type === 'fire') {
        (this.scene as any).checkFireGroundPitchIgnition?.(this.x, this.y);
      } else if (this.type === 'blackhole') {
        (this.scene as any).spawnBlackHole?.(this.x, this.y);
        this.dead = true;
      } else if (this.type === 'storm') {
        (this.scene as any).spawnStormImpactGround?.(this.x, this.y, this.damage);
        this.checkTriggerStormRain(this.x);
        this.dead = true;
      }
    }
  }

  public checkTriggerStormRain(impactX?: number): void {
    if (this.isPrimaryStorm) {
      this.isPrimaryStorm = false;
      const x = impactX !== undefined ? impactX : this.x;
      (this.scene as any).triggerStormRainOnImpact?.(x, this.damage, this.pierceCount);
    }
  }

  public destroy(): void {
    this.scene.matter.world.remove(this.body as any);
  }

  public render(g: Phaser.GameObjects.Graphics): void {
    const trailColors: Record<string, number> = {
      fire: 0xff4757,
      ice: 0x00d2d3,
      tesla: 0x00f2fe,
      viper: 0x2ed573,
      ballista: 0xced6e0,
      blackhole: 0xa29bfe,
      holy: 0xffd700,
      cluster: 0xffa502,
      buzzsaw: 0xbdc3c7,
      homing: 0xc084fc,
      storm: 0x00d2d3,
      ricochet: 0xf39c12,
      triple: 0xf1c40f
    };
    const trailCol = trailColors[this.type] || 0xf39c12;

    // Glowing flight trail - ONLY when flying, never left on the ground
    if (!this.stuck && this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const a = (i / this.trail.length) * 0.75;
        const w = (this.type === 'ballista' ? 6.5 : 3.5) * a;
        g.lineStyle(w, trailCol, a);
        g.lineBetween(this.trail[i].x, this.trail[i].y, this.trail[i + 1].x, this.trail[i + 1].y);

        // Extra element particles in trail while flying
        if (this.type === 'fire' && i % 3 === 0) {
          g.fillStyle(0xffa502, a * 0.8);
          g.fillCircle(this.trail[i].x + (Math.sin(i * 9) * 3), this.trail[i].y + (Math.cos(i * 7) * 3), 2.5);
        } else if (this.type === 'ice' && i % 3 === 0) {
          g.fillStyle(0xffffff, a * 0.6);
          g.fillCircle(this.trail[i].x, this.trail[i].y, 2.2);
        } else if (this.type === 'tesla' && i % 2 === 0) {
          g.lineStyle(1.5, 0xffffff, a);
          g.lineBetween(
            this.trail[i].x, this.trail[i].y,
            this.trail[i].x + (Math.sin(i * 13) * 6), this.trail[i].y + (Math.cos(i * 11) * 6)
          );
        } else if (this.type === 'viper' && i % 2 === 0) {
          // Bubbling corrosive acid drops
          g.fillStyle(0x2ed573, a * 0.85);
          g.fillCircle(this.trail[i].x, this.trail[i].y + 1, 2.8);
          g.fillStyle(0xa8ff78, a * 0.9);
          g.fillCircle(this.trail[i].x - 1, this.trail[i].y, 1.4);
        } else if (this.type === 'homing' && i % 2 === 0) {
          // Arcane seeker trail
          g.fillStyle(0xd946ef, a * 0.85);
          g.fillCircle(this.trail[i].x + Math.sin(i * 7) * 4, this.trail[i].y + Math.cos(i * 5) * 4, 2.4);
          g.fillStyle(0xffffff, a * 0.9);
          g.fillCircle(this.trail[i].x, this.trail[i].y, 1.2);
        } else if (this.type === 'holy' && i % 2 === 0) {
          // Heavenly radiant rays
          g.fillStyle(0xfff200, a * 0.9);
          g.fillCircle(this.trail[i].x, this.trail[i].y, 2.5);
          g.lineStyle(1.4, 0xffffff, a);
          g.lineBetween(this.trail[i].x - 3, this.trail[i].y, this.trail[i].x + 3, this.trail[i].y);
          g.lineBetween(this.trail[i].x, this.trail[i].y - 3, this.trail[i].x, this.trail[i].y + 3);
        } else if (this.type === 'cluster' && i % 2 === 0) {
          // Gunpowder smoke and ember sparks
          g.fillStyle(0x57606f, a * 0.6);
          g.fillCircle(this.trail[i].x + Math.sin(i * 8) * 3, this.trail[i].y - 2, 3.2);
          g.fillStyle(0xffa502, a * 0.95);
          g.fillCircle(this.trail[i].x, this.trail[i].y, 1.6);
        } else if (this.type === 'ballista' && i % 3 === 0) {
          // Sonic cavitation white rings
          g.lineStyle(1.6, 0xffffff, a * 0.8);
          g.strokeCircle(this.trail[i].x, this.trail[i].y, 4.5);
        }
      }
    }

    let drawAng = this.stuck ? this.stuckAngle : this.angle;
    if (this.stuck && this.wobble > 0) {
      drawAng += Math.sin(this.wobble * 45) * this.wobble * 0.35;
    }

    const cos = Math.cos(drawAng);
    const sin = Math.sin(drawAng);
    const perpX = -sin;
    const perpY = cos;

    const len = this.type === 'ballista' ? 56 : 40;
    const tailX = this.x - cos * (len / 2);
    const tailY = this.y - sin * (len / 2);
    const tipX = this.x + cos * (len / 2);
    const tipY = this.y + sin * (len / 2);

    renderArrowGraphic(g, tailX, tailY, tipX, tipY, drawAng, this.type, {
      owner: this.owner,
      sawAngle: this.sawAngle,
      isStuck: this.stuck
    });
  }
}

export interface RenderArrowGraphicOptions {
  owner?: string;
  scale?: number;
  sawAngle?: number;
  isStuck?: boolean;
}

/**
 * High-fidelity Vector Arrow Renderer
 * Renders stylized vector arrows matching reference art:
 * - 2-tone faceted broadheads with center spine and dark borders (Image 1 & 2)
 * - Ornate grooved collar rings / ferrules (Image 3)
 * - Aerodynamic chevron-notched fletchings (Image 1 & 2)
 * - Specification-based elemental tip effects (fire flame tongues, cold ice frost vapor & crystals, crackling lightning needles, bubbling toxic acid, holy sunbeams, etc.)
 */
export function renderArrowGraphic(
  g: Phaser.GameObjects.Graphics,
  tailX: number,
  tailY: number,
  tipX: number,
  tipY: number,
  drawAng: number,
  type: string,
  opts: RenderArrowGraphicOptions = {}
): void {
  const s = opts.scale ?? 1;
  const cos = Math.cos(drawAng);
  const sin = Math.sin(drawAng);
  const perpX = -sin;
  const perpY = cos;
  const time = Date.now() * 0.01;
  const isStuck = opts.isStuck ?? false;
  const sawAngle = opts.sawAngle ?? (time * 1.5);
  const isEnemy = opts.owner === 'enemy';

  // ══════════════════════════════════════════════════════════════════
  // 1. BUZZSAW ARROW (Card 9: Spinning Serrated Sawblade)
  // ══════════════════════════════════════════════════════════════════
  if (type === 'buzzsaw') {
    const headBaseX = tipX - cos * 10 * s;
    const headBaseY = tipY - sin * 10 * s;

    // Industrial Gunmetal Shaft
    g.lineStyle(3.5 * s, 0x57606f, 1);
    g.lineBetween(tailX, tailY, headBaseX, headBaseY);

    // Collar rings
    g.lineStyle(1.8 * s, 0xa4b0be, 1);
    g.lineBetween(headBaseX - perpX * 3 * s, headBaseY - perpY * 3 * s, headBaseX + perpX * 3 * s, headBaseY + perpY * 3 * s);

    // Chevron Industrial Fletching
    const fletchLen = 11 * s;
    const fletchW = 6 * s;
    const notchDepth = 4 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    g.fillStyle(0xe74c3c, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);
    g.fillStyle(0xc0392b, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);
    g.lineStyle(1.6 * s, 0x2f3542, 1);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, notchX, notchY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, notchX, notchY);

    // Spinning Sawblade Disc
    const sawR = 12 * s;
    g.fillStyle(0xdcdde1, 1);
    g.fillCircle(tipX, tipY, sawR);
    g.lineStyle(2 * s, 0x2f3640, 1);
    g.strokeCircle(tipX, tipY, sawR);

    // 8 Serrated Spinning Teeth
    const numTeeth = 8;
    for (let t = 0; t < numTeeth; t++) {
      const ta = sawAngle + (t * Math.PI * 2) / numTeeth;
      g.fillStyle(0x718093, 1);
      g.fillTriangle(
        tipX + Math.cos(ta) * sawR, tipY + Math.sin(ta) * sawR,
        tipX + Math.cos(ta + 0.3) * (sawR + 5 * s), tipY + Math.sin(ta + 0.3) * (sawR + 5 * s),
        tipX + Math.cos(ta + 0.48) * sawR, tipY + Math.sin(ta + 0.48) * sawR
      );
    }
    // Brass central rivet
    g.fillStyle(0xf39c12, 1);
    g.fillCircle(tipX, tipY, 3.5 * s);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(tipX - 1 * s, tipY - 1 * s, 1.2 * s);

    // Tip Friction Sparks
    if (!isStuck) {
      for (let sp = 0; sp < 3; sp++) {
        const spa = drawAng + (Math.random() - 0.5) * 1.2;
        const spDist = (sawR + 2 + Math.random() * 6) * s;
        g.fillStyle(Math.random() < 0.5 ? 0xffeb3b : 0xffffff, 0.9);
        g.fillCircle(tipX + Math.cos(spa) * spDist, tipY + Math.sin(spa) * spDist, 1.5 * s);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 2. BALLISTA HARPOON (Card 10: Heavy Siege Warhead Bolt)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'ballista') {
    const headLen = 18 * s;
    const halfW = 10 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;

    // Heavy Ironwood Shaft
    g.lineStyle(5.5 * s, 0x2f3542, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Steel Core Reinforcement Line
    g.lineStyle(2 * s, 0x718093, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Sculpted Steel Rings (Image 3 ferrule rings)
    for (let r = 1; r <= 3; r++) {
      const rx = baseX - cos * (r * 3.5 * s);
      const ry = baseY - sin * (r * 3.5 * s);
      g.lineStyle(2.5 * s, 0xa4b0be, 1);
      g.lineBetween(rx - perpX * 4 * s, ry - perpY * 4 * s, rx + perpX * 4 * s, ry + perpY * 4 * s);
    }

    // Heavy Barbed Faceted Steel Harpoon Head
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Upper lit facet
    g.fillStyle(0xf1f2f6, 1);
    g.fillTriangle(tipX + cos * 4 * s, tipY + sin * 4 * s, baseX, baseY, topBarbX, topBarbY);
    // Lower shadow facet
    g.fillStyle(0x747d8c, 1);
    g.fillTriangle(tipX + cos * 4 * s, tipY + sin * 4 * s, baseX, baseY, botBarbX, botBarbY);

    // Recurve Reverse Barb Hooks (Image 3 anatomy)
    g.lineStyle(2.8 * s, 0x2f3542, 1);
    g.lineBetween(topBarbX, topBarbY, topBarbX - cos * 6 * s + perpX * 4 * s, topBarbY - sin * 6 * s + perpY * 4 * s);
    g.lineBetween(botBarbX, botBarbY, botBarbX - cos * 6 * s - perpX * 4 * s, botBarbY - sin * 6 * s - perpY * 4 * s);

    // Harpoon Head Border & Spine
    g.lineStyle(2 * s, 0x2f3542, 1);
    g.lineBetween(tipX + cos * 4 * s, tipY + sin * 4 * s, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX + cos * 4 * s, tipY + sin * 4 * s);
    g.lineBetween(tipX + cos * 4 * s, tipY + sin * 4 * s, baseX, baseY);

    // Heavy Ballista Vanes
    const fFrontX = tailX + cos * 15 * s;
    const fFrontY = tailY + sin * 15 * s;
    g.fillStyle(0x57606f, 1);
    g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX + perpX * 9 * s, tailY + perpY * 9 * s);
    g.fillStyle(0x2f3542, 1);
    g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX - perpX * 9 * s, tailY - perpY * 9 * s);

    // Ballista Tip Wind Cones
    if (!isStuck) {
      g.lineStyle(1.8 * s, 0xffffff, 0.7);
      g.lineBetween(tipX + cos * 6 * s, tipY + sin * 6 * s, tipX - cos * 8 * s - perpX * 8 * s, tipY - sin * 8 * s - perpY * 8 * s);
      g.lineBetween(tipX + cos * 6 * s, tipY + sin * 6 * s, tipX - cos * 8 * s + perpX * 8 * s, tipY - sin * 8 * s + perpY * 8 * s);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 3. FIRE ARROW (Card 2: Faceted Magma Head & Real Animated Flame Tip)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'fire') {
    const headLen = 13 * s;
    const halfW = 6.5 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Charred Obsidian Shaft
    g.lineStyle(3.4 * s, 0x2d1115, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Glowing Magma Seam down shaft
    g.lineStyle(1.4 * s, 0xff4757, 0.85);
    g.lineBetween(tailX + cos * 6 * s, tailY + sin * 6 * s, baseX - cos * 4 * s, baseY - sin * 4 * s);

    // Forged Brass Ferrule Rings (Image 3 style)
    g.lineStyle(2 * s, 0xe67e22, 1);
    g.lineBetween(baseX - cos * 2 * s - perpX * 3 * s, baseY - sin * 2 * s - perpY * 3 * s, baseX - cos * 2 * s + perpX * 3 * s, baseY - sin * 2 * s + perpY * 3 * s);
    g.lineStyle(1.5 * s, 0xf39c12, 1);
    g.lineBetween(baseX - cos * 5 * s - perpX * 2.5 * s, baseY - sin * 5 * s - perpY * 2.5 * s, baseX - cos * 5 * s + perpX * 2.5 * s, baseY - sin * 5 * s + perpY * 2.5 * s);

    // Faceted Ruby/Magma Broadhead (Image 1 faceted geometry)
    g.fillStyle(0xff6b6b, 1); // Upper bright facet
    g.fillTriangle(tipX, tipY, baseX, baseY, topBarbX, topBarbY);
    g.fillStyle(0xd63031, 1); // Lower shadow facet
    g.fillTriangle(tipX, tipY, baseX, baseY, botBarbX, botBarbY);

    // Crisp charred dark border & spine
    g.lineStyle(1.8 * s, 0x2d1115, 1);
    g.lineBetween(tipX, tipY, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX, tipY);
    g.lineStyle(1.5 * s, 0xffd32a, 0.9);
    g.lineBetween(tipX, tipY, baseX, baseY);

    // Flame-Shaped Chevron Fletching (Image 1 chevron style)
    const fletchLen = 11 * s;
    const fletchW = 6.2 * s;
    const notchDepth = 4 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    g.fillStyle(0xff4757, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);
    g.fillStyle(0xc0392b, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);
    g.lineStyle(1.6 * s, 0x2d1115, 1);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, notchX, notchY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, notchX, notchY);

    // ─────────────────────────────────────────────────────────────
    // ELEMENTAL SPECIFICATION: VIBRANT ANIMATED FIRE AT THE TIP!
    // ─────────────────────────────────────────────────────────────
    const flk1 = Math.sin(time * 7) * 2.5 * s;
    const flk2 = Math.cos(time * 9) * 2 * s;

    // Ambient Warm Heat Halo around head
    g.fillStyle(0xff4757, 0.35);
    g.fillCircle(tipX, tipY, 11 * s);

    // Outer Red Flame Tongue licking forward from tip
    g.fillStyle(0xff4757, 0.85);
    g.fillTriangle(
      tipX + cos * (14 * s + flk1), tipY + sin * (14 * s + flk1),
      tipX - cos * 7 * s - perpX * (6.5 * s + flk2), tipY - sin * 7 * s - perpY * (6.5 * s + flk2),
      tipX - cos * 7 * s + perpX * (6.5 * s - flk2), tipY - sin * 7 * s + perpY * (6.5 * s - flk2)
    );

    // Inner Blazing Orange Flame Tongue
    g.fillStyle(0xffa502, 0.95);
    g.fillTriangle(
      tipX + cos * (9 * s + flk2), tipY + sin * (9 * s + flk2),
      tipX - cos * 4 * s - perpX * 4 * s, tipY - sin * 4 * s - perpY * 4 * s,
      tipX - cos * 4 * s + perpX * 4 * s, tipY - sin * 4 * s + perpY * 4 * s
    );

    // Incandescent Core Yellow-White Tip
    g.fillStyle(0xfff200, 1);
    g.fillTriangle(
      tipX + cos * 4 * s, tipY + sin * 4 * s,
      tipX - cos * 2 * s - perpX * 2 * s, tipY - sin * 2 * s - perpY * 2 * s,
      tipX - cos * 2 * s + perpX * 2 * s, tipY - sin * 2 * s + perpY * 2 * s
    );

    // Flying Burning Ember Sparks dancing around tip
    for (let sp = 0; sp < 4; sp++) {
      const spX = tipX + Math.sin(time * 6 + sp * 1.7) * 6 * s - cos * (sp * 3 * s);
      const spY = tipY + Math.cos(time * 5 + sp * 1.9) * 6 * s - sin * (sp * 3 * s);
      g.fillStyle(sp % 2 === 0 ? 0xffeb3b : 0xff4757, 0.95);
      g.fillCircle(spX, spY, (1.6 + (sp % 2) * 0.8) * s);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. ICE / FROST ARROW (Matching Reference Image 2!)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'ice') {
    const headLen = 14 * s;
    const halfW = 6.5 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Glacial Dark Midnight Shaft (Image 2 style)
    g.lineStyle(3.4 * s, 0x102a45, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Frost crystalline core glow
    g.lineStyle(1.4 * s, 0x00d2d3, 0.85);
    g.lineBetween(tailX + cos * 6 * s, tailY + sin * 6 * s, baseX - cos * 4 * s, baseY - sin * 4 * s);

    // Frosted Silver Collar Rings (Image 3 touch)
    g.lineStyle(2 * s, 0x74b9ff, 1);
    g.lineBetween(baseX - cos * 2 * s - perpX * 3 * s, baseY - sin * 2 * s - perpY * 3 * s, baseX - cos * 2 * s + perpX * 3 * s, baseY - sin * 2 * s + perpY * 3 * s);
    g.lineStyle(1.5 * s, 0xe0ffff, 1);
    g.lineBetween(baseX - cos * 5 * s - perpX * 2.5 * s, baseY - sin * 5 * s - perpY * 2.5 * s, baseX - cos * 5 * s + perpX * 2.5 * s, baseY - sin * 5 * s + perpY * 2.5 * s);

    // Faceted Crystalline Ice Prism Head (Image 2 anatomy)
    g.fillStyle(0xe0ffff, 1); // Upper bright snow-white facet
    g.fillTriangle(tipX, tipY, baseX, baseY, topBarbX, topBarbY);
    g.fillStyle(0x00d2d3, 1); // Lower glacial cyan facet
    g.fillTriangle(tipX, tipY, baseX, baseY, botBarbX, botBarbY);

    // Deep frost border & spine
    g.lineStyle(1.8 * s, 0x0abde3, 1);
    g.lineBetween(tipX, tipY, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX, tipY);
    g.lineStyle(1.4 * s, 0xffffff, 0.95);
    g.lineBetween(tipX, tipY, baseX, baseY);

    // Multi-Petal Frost Fletching (Image 2 anatomy: curved cyan plumes)
    const fletchLen = 12 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;

    // Cyan base plume
    g.fillStyle(0x00d2d3, 1);
    g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX + perpX * 6.5 * s, tailY + perpY * 6.5 * s);
    g.fillStyle(0x0984e3, 1);
    g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX - perpX * 6.5 * s, tailY - perpY * 6.5 * s);

    // Secondary flared icy petal (Image 2 style)
    g.fillStyle(0x48dbfb, 0.9);
    g.fillTriangle(
      tailX + cos * 3 * s, tailY + sin * 3 * s,
      fFrontX + cos * 2 * s, fFrontY + sin * 2 * s,
      tailX + cos * 2 * s + perpX * 8.5 * s, tailY + sin * 2 * s + perpY * 8.5 * s
    );
    g.fillTriangle(
      tailX + cos * 3 * s, tailY + sin * 3 * s,
      fFrontX + cos * 2 * s, fFrontY + sin * 2 * s,
      tailX + cos * 2 * s - perpX * 8.5 * s, tailY + sin * 2 * s - perpY * 8.5 * s
    );

    // Dark border on vanes
    g.lineStyle(1.5 * s, 0x102a45, 1);
    g.lineBetween(tailX + perpX * 8.5 * s, tailY + perpY * 8.5 * s, fFrontX, fFrontY);
    g.lineBetween(tailX - perpX * 8.5 * s, tailY - perpY * 8.5 * s, fFrontX, fFrontY);

    // ─────────────────────────────────────────────────────────────
    // ELEMENTAL SPECIFICATION: BILLOWING COLD FROST MIST & CRYSTALS AT TIP!
    // ─────────────────────────────────────────────────────────────
    // Billowing Soft Cold Frost Vapor / Mist Cloud
    const mistR = (9.5 + Math.sin(time * 3) * 2.5) * s;
    g.fillStyle(0x00d2d3, 0.28);
    g.fillCircle(tipX, tipY, mistR);
    g.fillStyle(0xffffff, 0.32);
    g.fillCircle(tipX + cos * 2 * s, tipY + sin * 2 * s, mistR * 0.55);

    // Branching Snowflake Crystal Spikes extending from the tip
    g.lineStyle(1.8 * s, 0xffffff, 0.95);
    for (let i = -1; i <= 1; i++) {
      const branchAng = drawAng + i * 0.55;
      const bLen = (9 + Math.abs(i) * -2 + Math.sin(time * 4 + i) * 1.5) * s;
      const bx = tipX + Math.cos(branchAng) * bLen;
      const by = tipY + Math.sin(branchAng) * bLen;
      g.lineBetween(tipX, tipY, bx, by);

      // Sub-needles on crystal branch
      const subX = tipX + Math.cos(branchAng) * (bLen * 0.6);
      const subY = tipY + Math.sin(branchAng) * (bLen * 0.6);
      g.lineBetween(subX, subY, subX + perpX * (2.2 * s), subY + perpY * (2.2 * s));
      g.lineBetween(subX, subY, subX - perpX * (2.2 * s), subY - perpY * (2.2 * s));
    }

    // 4-Point Diamond Sparkle Star at apex (Image 2 style)
    g.fillStyle(0xffffff, 1);
    g.fillCircle(tipX, tipY, 2.5 * s);
    g.lineStyle(1.4 * s, 0xffffff, 0.95);
    g.lineBetween(tipX - perpX * 4 * s, tipY - perpY * 4 * s, tipX + perpX * 4 * s, tipY + perpY * 4 * s);
    g.lineBetween(tipX - cos * 4 * s, tipY - sin * 4 * s, tipX + cos * 4 * s, tipY + sin * 4 * s);

    // Drifting Frost Motes
    for (let sm = 0; sm < 3; sm++) {
      const sx = tipX - cos * (sm * 5 * s) + perpX * (Math.sin(time * 3 + sm * 2) * 5 * s);
      const sy = tipY - sin * (sm * 5 * s) + perpY * (Math.sin(time * 3 + sm * 2) * 5 * s);
      g.fillStyle(0xdff9fb, 0.85);
      g.fillCircle(sx, sy, 1.8 * s);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 5. THUNDER / TESLA ARROW (Card 8: Crackling Lightning Needles at Tip)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'tesla') {
    const headLen = 14 * s;
    const halfW = 6.5 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // High-Voltage Storm Slate Shaft
    g.lineStyle(3.4 * s, 0x192a56, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Pulsing Cyan Energy Core
    g.lineStyle(1.6 * s, 0x00f2fe, 0.9);
    g.lineBetween(tailX + cos * 5 * s, tailY + sin * 5 * s, baseX - cos * 3 * s, baseY - sin * 3 * s);

    // Electric Ferrule Rings
    g.lineStyle(2 * s, 0x4facfe, 1);
    g.lineBetween(baseX - cos * 2 * s - perpX * 3 * s, baseY - sin * 2 * s - perpY * 3 * s, baseX - cos * 2 * s + perpX * 3 * s, baseY - sin * 2 * s + perpY * 3 * s);

    // Faceted Storm-Diamond Head
    g.fillStyle(0xffffff, 1); // Upper pure white facet
    g.fillTriangle(tipX, tipY, baseX, baseY, topBarbX, topBarbY);
    g.fillStyle(0x00bcd4, 1); // Lower electric cyan facet
    g.fillTriangle(tipX, tipY, baseX, baseY, botBarbX, botBarbY);

    // Dark border & electric spine
    g.lineStyle(1.8 * s, 0x192a56, 1);
    g.lineBetween(tipX, tipY, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX, tipY);
    g.lineStyle(1.6 * s, 0x00f2fe, 1);
    g.lineBetween(tipX, tipY, baseX, baseY);

    // Neon Electric Chevron Fletching
    const fletchLen = 11 * s;
    const fletchW = 6 * s;
    const notchDepth = 4 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    g.fillStyle(0x00f2fe, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);
    g.fillStyle(0x0984e3, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);
    g.lineStyle(1.6 * s, 0x192a56, 1);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, notchX, notchY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, notchX, notchY);

    // ─────────────────────────────────────────────────────────────
    // ELEMENTAL SPECIFICATION: CRACKLING LIGHTNING NEEDLES AT THE TIP!
    // ─────────────────────────────────────────────────────────────
    // Electric Plasma Ball Halo
    g.fillStyle(0x00f2fe, 0.45);
    g.fillCircle(tipX, tipY, 8.5 * s);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(tipX, tipY, 4 * s);

    // Crackling High-Voltage Electric Needle Sparks snapping from tip
    for (let arc = 0; arc < 4; arc++) {
      const arcAng = drawAng + (Math.sin(time * 14 + arc * 2.3) * 0.9);
      const totalLen = (11 + ((arc * 7) % 5)) * s;
      const midLen = totalLen * 0.5;
      const zig = (arc % 2 === 0 ? 1 : -1) * (3.5 * s);
      const jx = tipX + Math.cos(arcAng) * midLen + perpX * zig;
      const jy = tipY + Math.sin(arcAng) * midLen + perpY * zig;
      const ex = tipX + Math.cos(arcAng) * totalLen;
      const ey = tipY + Math.sin(arcAng) * totalLen;

      // Outer cyan flash
      g.lineStyle(2.2 * s, 0x00f2fe, 0.85);
      g.lineBetween(tipX, tipY, jx, jy);
      g.lineBetween(jx, jy, ex, ey);

      // Core pure white filament
      g.lineStyle(1.1 * s, 0xffffff, 1);
      g.lineBetween(tipX, tipY, jx, jy);
      g.lineBetween(jx, jy, ex, ey);
    }
    // Electric white apex spark
    g.fillStyle(0xffffff, 1);
    g.fillCircle(tipX, tipY, 2.5 * s);
  }

  // ══════════════════════════════════════════════════════════════════
  // 5B. TEMPEST / STORM RAIN ARROW (Crackling Sky-Barrage Javelin)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'storm') {
    const headLen = 15 * s;
    const halfW = 7 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Dark Tempest Storm-Slate Shaft
    g.lineStyle(3.5 * s, 0x130f40, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Crackling Azure Lightning Core down shaft
    g.lineStyle(1.8 * s, 0x00d2d3, 0.95);
    g.lineBetween(tailX + cos * 5 * s, tailY + sin * 5 * s, baseX - cos * 3 * s, baseY - sin * 3 * s);

    // Cloud-Steel Ferrule Rings
    g.lineStyle(2.2 * s, 0x5352ed, 1);
    g.lineBetween(baseX - cos * 2 * s - perpX * 3.5 * s, baseY - sin * 2 * s - perpY * 3.5 * s, baseX - cos * 2 * s + perpX * 3.5 * s, baseY - sin * 2 * s + perpY * 3.5 * s);

    // Faceted Thunderhead Broadhead
    g.fillStyle(0x70a1ff, 1); // Upper bright storm facet
    g.fillTriangle(tipX + cos * 2 * s, tipY + sin * 2 * s, baseX, baseY, topBarbX, topBarbY);
    g.fillStyle(0x1e90ff, 1); // Lower deep thunder facet
    g.fillTriangle(tipX + cos * 2 * s, tipY + sin * 2 * s, baseX, baseY, botBarbX, botBarbY);

    g.lineStyle(1.8 * s, 0x130f40, 1);
    g.lineBetween(tipX + cos * 2 * s, tipY + sin * 2 * s, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX + cos * 2 * s, tipY + sin * 2 * s);
    g.lineStyle(1.6 * s, 0xffffff, 1);
    g.lineBetween(tipX + cos * 2 * s, tipY + sin * 2 * s, baseX, baseY);

    // Tempest Azure Vanes
    const fletchLen = 12 * s;
    const fletchW = 6.5 * s;
    const notchDepth = 4.5 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    g.fillStyle(0x70a1ff, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);
    g.fillStyle(0x3742fa, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);

    // Tempest Rain & Lightning Motes at tip
    g.fillStyle(0x70a1ff, 0.45);
    g.fillCircle(tipX, tipY, 9 * s);
    for (let r = 0; r < 4; r++) {
      const rx = tipX - cos * (r * 4 * s) + perpX * (Math.sin(time * 8 + r) * 6 * s);
      const ry = tipY - sin * (r * 4 * s) + perpY * (Math.sin(time * 8 + r) * 6 * s);
      g.fillStyle(r % 2 === 0 ? 0xffffff : 0x00d2d3, 0.9);
      g.fillCircle(rx, ry, (1.8 + (r % 2) * 0.8) * s);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 6. VIPER / POISON ARROW (Card 6: Bubbling Toxic Acid Droplet at Tip)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'viper') {
    const headLen = 13 * s;
    const halfW = 6.5 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Venomous Dark Forest Shaft
    g.lineStyle(3.4 * s, 0x0f2b1d, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Glowing Toxic Seam
    g.lineStyle(1.4 * s, 0x2ed573, 0.85);
    g.lineBetween(tailX + cos * 6 * s, tailY + sin * 6 * s, baseX - cos * 4 * s, baseY - sin * 4 * s);

    // Acid Ferrule Rings
    g.lineStyle(2 * s, 0x2ed573, 1);
    g.lineBetween(baseX - cos * 2 * s - perpX * 3 * s, baseY - sin * 2 * s - perpY * 3 * s, baseX - cos * 2 * s + perpX * 3 * s, baseY - sin * 2 * s + perpY * 3 * s);

    // Faceted Acid-Dipped Broadhead
    g.fillStyle(0x7bed9f, 1); // Upper bright lime facet
    g.fillTriangle(tipX, tipY, baseX, baseY, topBarbX, topBarbY);
    g.fillStyle(0x10ac84, 1); // Lower deep emerald facet
    g.fillTriangle(tipX, tipY, baseX, baseY, botBarbX, botBarbY);

    // Dark venom border & spine
    g.lineStyle(1.8 * s, 0x0f2b1d, 1);
    g.lineBetween(tipX, tipY, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX, tipY);
    g.lineStyle(1.4 * s, 0x2ed573, 0.95);
    g.lineBetween(tipX, tipY, baseX, baseY);

    // Toxic Chevron Fletching
    const fletchLen = 11 * s;
    const fletchW = 6 * s;
    const notchDepth = 4 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    g.fillStyle(0x2ed573, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);
    g.fillStyle(0x10ac84, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);
    g.lineStyle(1.6 * s, 0x0f2b1d, 1);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, notchX, notchY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, notchX, notchY);

    // ─────────────────────────────────────────────────────────────
    // ELEMENTAL SPECIFICATION: SIZZLING TOXIC ACID BUBBLING AT TIP!
    // ─────────────────────────────────────────────────────────────
    // Toxic Biohazard Aura
    g.fillStyle(0x2ed573, 0.35);
    g.fillCircle(tipX, tipY, 8 * s);

    // Caustic Venom Droplet swelling at needle point
    const dropR = (3.2 + Math.sin(time * 5) * 0.8) * s;
    g.fillStyle(0x2ed573, 0.95);
    g.fillCircle(tipX + cos * 2 * s, tipY + sin * 2 * s, dropR);
    g.fillStyle(0xa8ff78, 1);
    g.fillCircle(tipX + cos * 2 * s - perpX * 1 * s, tipY + sin * 2 * s - perpY * 1 * s, dropR * 0.45);

    // Rising Acid Fizz Bubbles popping around tip
    for (let b = 0; b < 3; b++) {
      const bx = tipX - cos * ((b + 1) * 3 * s) + perpX * (Math.sin(time * 4 + b * 2) * 5 * s);
      const by = tipY - sin * ((b + 1) * 3 * s) + perpY * (Math.sin(time * 4 + b * 2) * 5 * s);
      g.fillStyle(0x7bed9f, 0.85);
      g.fillCircle(bx, by, (1.6 + (b % 2) * 0.6) * s);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 7. HOLY ARROW (Card 5: Matching Reference Image 3!)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'holy') {
    const headLen = 15 * s;
    const halfW = 7 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Ornate Polished Gold Shaft (Image 3 style)
    g.lineStyle(3.5 * s, 0xd4ac0d, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // 3 Sculpted Golden Bead Rings behind broadhead (Image 3 ferrule rings!)
    for (let ring = 1; ring <= 3; ring++) {
      const rx = baseX - cos * (ring * 3 * s);
      const ry = baseY - sin * (ring * 3 * s);
      g.lineStyle(2.4 * s, 0xf1c40f, 1);
      g.lineBetween(rx - perpX * 3.5 * s, ry - perpY * 3.5 * s, rx + perpX * 3.5 * s, ry + perpY * 3.5 * s);
      g.lineStyle(1.2 * s, 0xffffff, 0.8);
      g.lineBetween(rx - perpX * 1.5 * s, ry - perpY * 1.5 * s, rx + perpX * 1.5 * s, ry + perpY * 1.5 * s);
    }

    // 2 Sculpted Golden Rings near fletching (Image 3)
    const fRingX = tailX + cos * 14 * s;
    const fRingY = tailY + sin * 14 * s;
    g.lineStyle(2.2 * s, 0xf1c40f, 1);
    g.lineBetween(fRingX - perpX * 3 * s, fRingY - perpY * 3 * s, fRingX + perpX * 3 * s, fRingY + perpY * 3 * s);

    // Sculpted Winged Golden Broadhead with Recurve Barbs (Image 3 anatomy)
    g.fillStyle(0xfff8c4, 1); // Upper champagne gold facet
    g.fillTriangle(tipX + cos * 2 * s, tipY + sin * 2 * s, baseX, baseY, topBarbX, topBarbY);
    g.fillStyle(0xd4ac0d, 1); // Lower deep gold facet
    g.fillTriangle(tipX + cos * 2 * s, tipY + sin * 2 * s, baseX, baseY, botBarbX, botBarbY);

    // Recurve Wing Barbs curving forward (Image 3 style)
    g.lineStyle(2.2 * s, 0xf39c12, 1);
    g.lineBetween(topBarbX, topBarbY, topBarbX + cos * 3.5 * s + perpX * 2.5 * s, topBarbY + sin * 3.5 * s + perpY * 2.5 * s);
    g.lineBetween(botBarbX, botBarbY, botBarbX + cos * 3.5 * s - perpX * 2.5 * s, botBarbY + sin * 3.5 * s - perpY * 2.5 * s);

    // Antique bronze border & golden spine
    g.lineStyle(1.8 * s, 0x78350f, 1);
    g.lineBetween(tipX + cos * 2 * s, tipY + sin * 2 * s, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX + cos * 2 * s, tipY + sin * 2 * s);
    g.lineStyle(1.6 * s, 0xfff9e6, 0.95);
    g.lineBetween(tipX + cos * 2 * s, tipY + sin * 2 * s, baseX, baseY);

    // Sculpted Golden Feather Vanes (Image 3 fletchings)
    const fletchLen = 12 * s;
    const fletchW = 6.5 * s;
    const notchDepth = 4 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    g.fillStyle(0xffd700, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);
    g.fillStyle(0xd4ac0d, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);
    g.lineStyle(1.6 * s, 0x78350f, 1);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, notchX, notchY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, notchX, notchY);

    // ─────────────────────────────────────────────────────────────
    // ELEMENTAL SPECIFICATION: DAZZLING HOLY SUNBEAM RAYS AT TIP!
    // ─────────────────────────────────────────────────────────────
    // Divine Golden Light Halo
    g.fillStyle(0xfffa65, 0.4);
    g.fillCircle(tipX, tipY, 8.5 * s);

    // 8-Point Golden Celestial Sunburst Rays radiating from apex
    const numRays = 8;
    for (let r = 0; r < numRays; r++) {
      const ra = (r * Math.PI * 2) / numRays + time * 1.5;
      const rLen = (r % 2 === 0 ? 9.5 : 5) * s;
      g.lineStyle(1.8 * s, 0xffd700, 0.95);
      g.lineBetween(tipX, tipY, tipX + Math.cos(ra) * rLen, tipY + Math.sin(ra) * rLen);
      g.lineStyle(1.0 * s, 0xffffff, 1);
      g.lineBetween(tipX, tipY, tipX + Math.cos(ra) * (rLen * 0.5), tipY + Math.sin(ra) * (rLen * 0.5));
    }
    // Blinding divine white core
    g.fillStyle(0xffffff, 1);
    g.fillCircle(tipX, tipY, 2.8 * s);
  }

  // ══════════════════════════════════════════════════════════════════
  // 8. CLUSTER / BOMB ARROW (Card 7: Round Iron Warhead with Burning Fuse)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'cluster') {
    const bombCenterX = tipX - cos * 7 * s;
    const bombCenterY = tipY - sin * 7 * s;
    const bombR = 7.5 * s;

    // Heavy Bronze-Iron Shaft
    g.lineStyle(3.5 * s, 0x4b382a, 1);
    g.lineBetween(tailX, tailY, bombCenterX, bombCenterY);

    // Orange Alert Chevron Fletching
    const fletchLen = 11 * s;
    const fletchW = 6 * s;
    const notchDepth = 4 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    g.fillStyle(0xf59e0b, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);
    g.fillStyle(0xb45309, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);
    g.lineStyle(1.6 * s, 0x2f3640, 1);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, notchX, notchY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, notchX, notchY);

    // Spherical Demolition Bomb Warhead
    g.fillStyle(0x2f3640, 1);
    g.fillCircle(bombCenterX, bombCenterY, bombR);
    g.lineStyle(1.8 * s, 0x718093, 1);
    g.strokeCircle(bombCenterX, bombCenterY, bombR);

    // Red Hazard Stripe
    g.lineStyle(2.2 * s, 0xe74c3c, 1);
    g.lineBetween(bombCenterX - perpX * (bombR - 1), bombCenterY - perpY * (bombR - 1), bombCenterX + perpX * (bombR - 1), bombCenterY + perpY * (bombR - 1));

    // Steel Penetrator Cone Nose
    g.fillStyle(0xdcdde1, 1);
    g.fillTriangle(tipX + cos * 3 * s, tipY + sin * 3 * s, bombCenterX - perpX * 4 * s, bombCenterY - perpY * 4 * s, bombCenterX + perpX * 4 * s, bombCenterY + perpY * 4 * s);

    // ─────────────────────────────────────────────────────────────
    // ELEMENTAL SPECIFICATION: BURNING PYROTECHNIC SPARK FUSE AT TIP!
    // ─────────────────────────────────────────────────────────────
    const fuseX = bombCenterX + perpX * (bombR + 3 * s);
    const fuseY = bombCenterY + perpY * (bombR + 3 * s);
    g.lineStyle(1.6 * s, 0xd2b48c, 1);
    g.lineBetween(bombCenterX, bombCenterY, fuseX, fuseY);

    // Violent pyrotechnic firework sparks
    for (let fsp = 0; fsp < 3; fsp++) {
      const fspCol = fsp === 0 ? 0xffeb3b : fsp === 1 ? 0xff4757 : 0xffa502;
      const offX = (Math.random() - 0.5) * 5 * s;
      const offY = (Math.random() - 0.5) * 5 * s;
      g.fillStyle(fspCol, 1);
      g.fillCircle(fuseX + offX, fuseY + offY, (2 + Math.random() * 1.5) * s);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 9. BLACKHOLE ARROW (Card 12: Void Singularity & Accretion Ring)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'blackhole') {
    const orbX = tipX - cos * 4 * s;
    const orbY = tipY - sin * 4 * s;

    // Deep Void Shaft
    g.lineStyle(3.4 * s, 0x1e152a, 1);
    g.lineBetween(tailX, tailY, orbX, orbY);

    // Cosmic Fletchings
    const fletchLen = 11 * s;
    const fletchW = 6 * s;
    const notchDepth = 4 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    g.fillStyle(0xa29bfe, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);
    g.fillStyle(0x6c5ce7, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);

    // Singularity Core Sphere at Tip
    g.fillStyle(0x000000, 1);
    g.fillCircle(orbX, orbY, 6.5 * s);
    g.lineStyle(2 * s, 0xa29bfe, 0.95);
    g.strokeCircle(orbX, orbY, 6.5 * s);

    // Orbiting Accretion Disk Light Motes
    for (let m = 0; m < 3; m++) {
      const ma = time * 4 + (m * Math.PI * 2) / 3;
      g.fillStyle(0xdff9fb, 1);
      g.fillCircle(orbX + Math.cos(ma) * 8.5 * s, orbY + Math.sin(ma) * 8.5 * s, 1.8 * s);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 11. HOMING SEEKER ARROW (Arcane Ocular Seeker with Target Lock Rings)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'homing') {
    const headLen = 14 * s;
    const halfW = 6.5 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Mystic Deep Amethyst Shaft
    g.lineStyle(3.4 * s, 0x240046, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Glowing Arcane Rune Channel down shaft
    g.lineStyle(1.5 * s, 0xd946ef, 0.9);
    g.lineBetween(tailX + cos * 5 * s, tailY + sin * 5 * s, baseX - cos * 3 * s, baseY - sin * 3 * s);

    // Runic Ferrule Rings
    g.lineStyle(2 * s, 0xa855f7, 1);
    g.lineBetween(baseX - cos * 2 * s - perpX * 3 * s, baseY - sin * 2 * s - perpY * 3 * s, baseX - cos * 2 * s + perpX * 3 * s, baseY - sin * 2 * s + perpY * 3 * s);
    g.lineStyle(1.4 * s, 0xf0abfc, 1);
    g.lineBetween(baseX - cos * 5 * s - perpX * 2.5 * s, baseY - sin * 5 * s - perpY * 2.5 * s, baseX - cos * 5 * s + perpX * 2.5 * s, baseY - sin * 5 * s + perpY * 2.5 * s);

    // Faceted Arcane Broadhead
    g.fillStyle(0xf0abfc, 1); // Upper bright lilac facet
    g.fillTriangle(tipX, tipY, baseX, baseY, topBarbX, topBarbY);
    g.fillStyle(0x9333ea, 1); // Lower deep violet facet
    g.fillTriangle(tipX, tipY, baseX, baseY, botBarbX, botBarbY);

    // Dark border & glowing spine
    g.lineStyle(1.8 * s, 0x240046, 1);
    g.lineBetween(tipX, tipY, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX, tipY);
    g.lineStyle(1.5 * s, 0xffffff, 0.95);
    g.lineBetween(tipX, tipY, baseX, baseY);

    // Arcane Chevron Fletching
    const fletchLen = 11 * s;
    const fletchW = 6.2 * s;
    const notchDepth = 4 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    g.fillStyle(0xd946ef, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);
    g.fillStyle(0x7e22ce, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);
    g.lineStyle(1.6 * s, 0x240046, 1);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, notchX, notchY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, notchX, notchY);

    // ─────────────────────────────────────────────────────────────
    // ELEMENTAL SPECIFICATION: HOLOGRAPHIC TARGET LOCK RINGS & OCULAR EYE AT TIP!
    // ─────────────────────────────────────────────────────────────
    // Pulsing Violet Seeker Aura
    const pulseR = (9 + Math.sin(time * 6) * 3) * s;
    g.fillStyle(0xd946ef, 0.35);
    g.fillCircle(tipX, tipY, pulseR);

    // "All-Seeing Seeker Eye" Gem at tip apex
    g.fillStyle(0x7e22ce, 1);
    g.fillCircle(tipX + cos * 2 * s, tipY + sin * 2 * s, 3.5 * s);
    g.fillStyle(0x00f2fe, 1); // Glowing cyan pupil/iris
    g.fillCircle(tipX + cos * 2 * s, tipY + sin * 2 * s, 2 * s);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(tipX + cos * 2 * s - perpX * 0.8 * s, tipY + sin * 2 * s - perpY * 0.8 * s, 0.8 * s);

    // Holographic Target Lock Crosshair ahead of the tip
    if (!isStuck) {
      const lockDist = 12 * s;
      const targetX = tipX + cos * lockDist;
      const targetY = tipY + sin * lockDist;
      const reticleR = 6 * s;

      // Pulsing lock ring
      g.lineStyle(1.5 * s, 0xd946ef, 0.85);
      g.strokeCircle(targetX, targetY, reticleR);

      // 4 Crosshair Tick Marks
      g.lineStyle(1.6 * s, 0x00f2fe, 0.95);
      g.lineBetween(targetX - perpX * (reticleR + 2 * s), targetY - perpY * (reticleR + 2 * s), targetX - perpX * (reticleR - 1.5 * s), targetY - perpY * (reticleR - 1.5 * s));
      g.lineBetween(targetX + perpX * (reticleR + 2 * s), targetY + perpY * (reticleR + 2 * s), targetX + perpX * (reticleR - 1.5 * s), targetY + perpY * (reticleR - 1.5 * s));
      g.lineBetween(targetX - cos * (reticleR + 2 * s), targetY - sin * (reticleR + 2 * s), targetX - cos * (reticleR - 1.5 * s), targetY - sin * (reticleR - 1.5 * s));
      g.lineBetween(targetX + cos * (reticleR + 2 * s), targetY + sin * (reticleR + 2 * s), targetX + cos * (reticleR - 1.5 * s), targetY + sin * (reticleR - 1.5 * s));
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 12A. RICOCHET BOUNCER ARROW (Reflective Chrome-Gold Kinetic Gyro)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'ricochet') {
    const headLen = 13 * s;
    const halfW = 7 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Chrome Tungsten Shaft
    g.lineStyle(3.4 * s, 0x2c3e50, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Reflective Gold Inlay
    g.lineStyle(1.8 * s, 0xf39c12, 1);
    g.lineBetween(tailX + cos * 4 * s, tailY + sin * 4 * s, baseX - cos * 3 * s, baseY - sin * 3 * s);

    // Dual Angled Deflection Kinetic Head
    g.fillStyle(0xf1c40f, 1); // Upper gold facet
    g.fillTriangle(tipX + cos * 3 * s, tipY + sin * 3 * s, baseX, baseY, topBarbX, topBarbY);
    g.fillStyle(0xd35400, 1); // Lower amber shadow facet
    g.fillTriangle(tipX + cos * 3 * s, tipY + sin * 3 * s, baseX, baseY, botBarbX, botBarbY);

    g.lineStyle(1.8 * s, 0x2c3e50, 1);
    g.lineBetween(tipX + cos * 3 * s, tipY + sin * 3 * s, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX + cos * 3 * s, tipY + sin * 3 * s);

    // Gyro Deflection Ring behind tip
    g.lineStyle(2 * s, 0xffa502, 0.9);
    g.strokeCircle(baseX, baseY, 5 * s);

    // Amber Aerodynamic Swept Vanes
    const fFrontX = tailX + cos * 12 * s;
    const fFrontY = tailY + sin * 12 * s;
    g.fillStyle(0xf39c12, 1);
    g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX + perpX * 7 * s, tailY + perpY * 7 * s);
    g.fillStyle(0xe67e22, 1);
    g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX - perpX * 7 * s, tailY - perpY * 7 * s);

    // Kinetic Reflection Sparks at tip
    g.fillStyle(0xfff200, 0.95);
    g.fillCircle(tipX + cos * 3 * s, tipY + sin * 3 * s, 2.5 * s);
    for (let sp = 0; sp < 3; sp++) {
      const spAng = time * 6 + (sp * Math.PI * 2) / 3;
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(tipX + Math.cos(spAng) * 6 * s, tipY + Math.sin(spAng) * 6 * s, 1.5 * s);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 12B. TRIPLE MULTISHOT ARROW (Gilded Trident Broadhead)
  // ══════════════════════════════════════════════════════════════════
  else if (type === 'triple') {
    const headLen = 14 * s;
    const halfW = 8 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Gilded Mahogany Shaft
    g.lineStyle(3.4 * s, 0x4a121a, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Gold core line
    g.lineStyle(1.5 * s, 0xffd700, 0.9);
    g.lineBetween(tailX + cos * 5 * s, tailY + sin * 5 * s, baseX - cos * 3 * s, baseY - sin * 3 * s);

    // 3-Prong Trident Head (Central Spear + 2 Flanking Barbs)
    g.fillStyle(0xfff8c4, 1);
    g.fillTriangle(tipX + cos * 4 * s, tipY + sin * 4 * s, baseX, baseY, topBarbX, topBarbY);
    g.fillStyle(0xd4ac0d, 1);
    g.fillTriangle(tipX + cos * 4 * s, tipY + sin * 4 * s, baseX, baseY, botBarbX, botBarbY);

    // Twin Flanking Trident Tips
    g.fillStyle(0xffd700, 1);
    g.fillTriangle(topBarbX + cos * 4 * s, topBarbY + sin * 4 * s, topBarbX - cos * 3 * s, topBarbY - sin * 3 * s, topBarbX + perpX * 3 * s, topBarbY + perpY * 3 * s);
    g.fillTriangle(botBarbX + cos * 4 * s, botBarbY + sin * 4 * s, botBarbX - cos * 3 * s, botBarbY - sin * 3 * s, botBarbX - perpX * 3 * s, botBarbY - perpY * 3 * s);

    // Golden Chevron Vanes
    const fFrontX = tailX + cos * 11 * s;
    const fFrontY = tailY + sin * 11 * s;
    g.fillStyle(0xffd700, 1);
    g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX + perpX * 6.5 * s, tailY + perpY * 6.5 * s);
    g.fillStyle(0xb7791f, 1);
    g.fillTriangle(tailX, tailY, fFrontX, fFrontY, tailX - perpX * 6.5 * s, tailY - perpY * 6.5 * s);

    // Twin energy streaks
    g.fillStyle(0xffffff, 1);
    g.fillCircle(tipX + cos * 4 * s, tipY + sin * 4 * s, 2.2 * s);
  }

  // ══════════════════════════════════════════════════════════════════
  // 12C. CLASSIC / STARTER ARROW
  // (1:1 Exact Match to Reference Image 1!)
  // ══════════════════════════════════════════════════════════════════
  else {
    const headLen = isStuck ? 6 * s : 9.5 * s;
    const halfW = isStuck ? 3.2 * s : 4.4 * s;
    const baseX = tipX - cos * headLen;
    const baseY = tipY - sin * headLen;
    const topBarbX = baseX + perpX * halfW;
    const topBarbY = baseY + perpY * halfW;
    const botBarbX = baseX - perpX * halfW;
    const botBarbY = baseY - perpY * halfW;

    // Dark Sleek Charcoal Shaft (#1e272e)
    g.lineStyle(2.8 * s, 0x1e272e, 1);
    g.lineBetween(tailX, tailY, baseX, baseY);

    // Metallic Ferrule / Collar Rings behind head
    g.lineStyle(1.8 * s, 0x718093, 1);
    g.lineBetween(baseX - cos * 2 * s - perpX * 2.2 * s, baseY - sin * 2 * s - perpY * 2.2 * s, baseX - cos * 2 * s + perpX * 2.2 * s, baseY - sin * 2 * s + perpY * 2.2 * s);

    // Faceted Razor Steel Broadhead (Polished Silver Steel & Shadow Gunmetal, NOT stark white!)
    // Upper / Lit Half: Polished Silver Steel
    g.fillStyle(0xdcdde1, 1);
    g.fillTriangle(tipX, tipY, baseX, baseY, topBarbX, topBarbY);

    // Lower / Shadow Half: Dark Gunmetal Steel
    g.fillStyle(0x57606f, 1);
    g.fillTriangle(tipX, tipY, baseX, baseY, botBarbX, botBarbY);

    // Center divider spine line
    g.lineStyle(1.4 * s, 0x1e272e, 1);
    g.lineBetween(tipX, tipY, baseX, baseY);

    // Outer Crisp Dark Outline framing broadhead
    g.lineBetween(tipX, tipY, topBarbX, topBarbY);
    g.lineBetween(topBarbX, topBarbY, baseX, baseY);
    g.lineBetween(baseX, baseY, botBarbX, botBarbY);
    g.lineBetween(botBarbX, botBarbY, tipX, tipY);

    // Chevron-Notched Fletching (Image 1 1:1 match!)
    const fletchLen = 11 * s;
    const fletchW = 6 * s;
    const notchDepth = 4 * s;
    const fFrontX = tailX + cos * fletchLen;
    const fFrontY = tailY + sin * fletchLen;
    const notchX = tailX + cos * notchDepth;
    const notchY = tailY + sin * notchDepth;

    // Vane colors: Crimson Red (#e74c3c) for player, bone/red for enemy
    const topVaneCol = isEnemy ? 0xdcdde1 : 0xe74c3c;
    const botVaneCol = isEnemy ? 0x718093 : 0xc0392b;

    // Top Vane
    g.fillStyle(topVaneCol, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX + perpX * fletchW, tailY + perpY * fletchW);

    // Bottom Vane
    g.fillStyle(botVaneCol, 1);
    g.fillTriangle(notchX, notchY, fFrontX, fFrontY, tailX - perpX * fletchW, tailY - perpY * fletchW);

    // Dark Border framing fletchings (Image 1)
    g.lineStyle(1.6 * s, 0x1e272e, 1);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, fFrontX, fFrontY);
    g.lineBetween(tailX + perpX * fletchW, tailY + perpY * fletchW, notchX, notchY);
    g.lineBetween(tailX - perpX * fletchW, tailY - perpY * fletchW, notchX, notchY);
    g.lineBetween(tailX, tailY, notchX, notchY);

    // Center shaft line running through nock
    g.lineStyle(2.5 * s, 0x1e272e, 1);
    g.lineBetween(tailX, tailY, fFrontX, fFrontY);

    // ─────────────────────────────────────────────────────────────
    // ELEMENTAL SPECIFICATION: SHARP STEEL GLEAM GLINT AT APEX!
    // ─────────────────────────────────────────────────────────────
    const glint = Math.sin(time * 4) * 0.5 + 0.5;
    g.fillStyle(0xffffff, 0.7 + glint * 0.3);
    g.fillCircle(tipX, tipY, 2 * s);
    g.lineStyle(1.2 * s, 0xffffff, 0.6 + glint * 0.4);
    g.lineBetween(tipX - perpX * 3.5 * s, tipY - perpY * 3.5 * s, tipX + perpX * 3.5 * s, tipY + perpY * 3.5 * s);
    g.lineBetween(tipX - cos * 3.5 * s, tipY - sin * 3.5 * s, tipX + cos * 3.5 * s, tipY + sin * 3.5 * s);
  }
}
