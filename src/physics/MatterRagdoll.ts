import Phaser from 'phaser';
import { renderArrowGraphic } from '../entities/Arrow';
import { HeroSkinId } from '../types';

export interface RagdollOptions {
  scale?: number;
  isZombie?: boolean;
  zombieType?: string;
  skinColor?: string;
  clothesColor?: string;
  isBloodMoon?: boolean;
}

export class MatterRagdoll {
  public scene: Phaser.Scene;
  public composite: MatterJS.CompositeType;
  public head: MatterJS.BodyType;
  public torso: MatterJS.BodyType;
  public leftUpperArm: MatterJS.BodyType;
  public leftForearm: MatterJS.BodyType;
  public rightUpperArm: MatterJS.BodyType;
  public rightForearm: MatterJS.BodyType;
  public leftThigh: MatterJS.BodyType;
  public leftCalf: MatterJS.BodyType;
  public rightThigh: MatterJS.BodyType;
  public rightCalf: MatterJS.BodyType;

  public neckConstraint: MatterJS.ConstraintType | null = null;
  public leftShoulderJoint: MatterJS.ConstraintType | null = null;
  public leftElbowJoint: MatterJS.ConstraintType | null = null;
  public rightShoulderJoint: MatterJS.ConstraintType | null = null;
  public rightElbowJoint: MatterJS.ConstraintType | null = null;
  public leftHipJoint: MatterJS.ConstraintType | null = null;
  public leftKneeJoint: MatterJS.ConstraintType | null = null;
  public rightHipJoint: MatterJS.ConstraintType | null = null;
  public rightKneeJoint: MatterJS.ConstraintType | null = null;
  public constraints: MatterJS.ConstraintType[] = [];

  public scale: number;
  public isZombie: boolean;
  public zombieType: string;
  public skinColor: string;
  public clothesColor: string;
  public isBloodMoon: boolean = false;

  public decapitated: boolean = false;
  public isLeftLegSevered: boolean = false;
  public isRightLegSevered: boolean = false;
  public isLeftArmSevered: boolean = false;
  public isRightArmSevered: boolean = false;
  public dead: boolean = false;
  public aimAngle: number = 0;
  public bowDrawFrac: number = 0;
  public faceDir: number = 1;
  public walkCycle: number = 0;
  public hasHead: boolean = true;
  public hasTorso: boolean = true;
  public hasLeftArm: boolean = true;
  public hasRightArm: boolean = true;
  public hasLeftLeg: boolean = true;
  public hasRightLeg: boolean = true;
  public isCrawling: boolean = false;
  public isAttacking: boolean = false;
  public attackPhase: number = 0;
  public isQueued: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: RagdollOptions = {}) {
    this.scene = scene;
    const matter = scene.matter;
    const s = opts.scale || 1.0;
    this.scale = s;
    this.isZombie = opts.isZombie || false;
    this.zombieType = opts.zombieType || 'walker';
    this.isBloodMoon = opts.isBloodMoon || false;
    this.skinColor = opts.skinColor || (this.isZombie ? '#4e6d3c' : '#e0a96d');
    this.clothesColor = opts.clothesColor || (this.isZombie ? '#353b48' : '#1e4d2b');
    this.walkCycle = Math.random() * 10;

    const group = matter.world.nextGroup(true); // Don't collide within self

    const defaultPartOpts: any = {
      collisionFilter: { group, category: 1, mask: 0xFFFFFFFF },
      friction: 0.85,
      restitution: 0.15,
      density: 0.002,
      isStatic: true
    };

    // 1. Create Rigid Bodies for Limbs
    this.head = matter.bodies.circle(x, y - 62 * s, 14 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_head'
    });

    this.torso = matter.bodies.rectangle(x, y - 32 * s, 16 * s, 36 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_torso'
    });

    // Arms
    this.leftUpperArm = matter.bodies.rectangle(x - 10 * s, y - 40 * s, 7 * s, 18 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_limb'
    });
    this.leftForearm = matter.bodies.rectangle(x - 10 * s, y - 24 * s, 6 * s, 18 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_limb'
    });

    this.rightUpperArm = matter.bodies.rectangle(x + 10 * s, y - 40 * s, 7 * s, 18 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_limb'
    });
    this.rightForearm = matter.bodies.rectangle(x + 10 * s, y - 24 * s, 6 * s, 18 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_limb'
    });

    // Legs
    this.leftThigh = matter.bodies.rectangle(x - 6 * s, y - 8 * s, 8 * s, 22 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_limb'
    });
    this.leftCalf = matter.bodies.rectangle(x - 6 * s, y + 14 * s, 7 * s, 22 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_limb'
    });

    this.rightThigh = matter.bodies.rectangle(x + 6 * s, y - 8 * s, 8 * s, 22 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_limb'
    });
    this.rightCalf = matter.bodies.rectangle(x + 6 * s, y + 14 * s, 7 * s, 22 * s, {
      ...defaultPartOpts,
      label: 'ragdoll_limb'
    });

    // 2. Connect Pin Constraints (Joints)
    const addJoint = (bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType, pointA: { x: number; y: number }, pointB: { x: number; y: number }, stiffness: number = 0.9) => {
      const c = matter.add.constraint(bodyA as any, bodyB as any, 0, stiffness, {
        pointA,
        pointB,
        damping: 0.1
      }) as unknown as MatterJS.ConstraintType;
      this.constraints.push(c);
      return c;
    };

    // Neck
    this.neckConstraint = addJoint(this.head, this.torso, { x: 0, y: 12 * s }, { x: 0, y: -18 * s }, 0.92);

    // Left Arm
    this.leftShoulderJoint = addJoint(this.torso, this.leftUpperArm, { x: -8 * s, y: -14 * s }, { x: 0, y: -8 * s }, 0.85);
    this.leftElbowJoint = addJoint(this.leftUpperArm, this.leftForearm, { x: 0, y: 8 * s }, { x: 0, y: -8 * s }, 0.85);

    // Right Arm
    this.rightShoulderJoint = addJoint(this.torso, this.rightUpperArm, { x: 8 * s, y: -14 * s }, { x: 0, y: -8 * s }, 0.85);
    this.rightElbowJoint = addJoint(this.rightUpperArm, this.rightForearm, { x: 0, y: 8 * s }, { x: 0, y: -8 * s }, 0.85);

    // Left Leg
    this.leftHipJoint = addJoint(this.torso, this.leftThigh, { x: -5 * s, y: 18 * s }, { x: 0, y: -10 * s }, 0.88);
    this.leftKneeJoint = addJoint(this.leftThigh, this.leftCalf, { x: 0, y: 10 * s }, { x: 0, y: -10 * s }, 0.88);

    // Right Leg
    this.rightHipJoint = addJoint(this.torso, this.rightThigh, { x: 5 * s, y: 18 * s }, { x: 0, y: -10 * s }, 0.88);
    this.rightKneeJoint = addJoint(this.rightThigh, this.rightCalf, { x: 0, y: 10 * s }, { x: 0, y: -10 * s }, 0.88);

    // Add all to a Matter composite and register into the physics world
    this.composite = matter.composite.create();
    const parts = [
      this.head,
      this.torso,
      this.leftUpperArm,
      this.leftForearm,
      this.rightUpperArm,
      this.rightForearm,
      this.leftThigh,
      this.leftCalf,
      this.rightThigh,
      this.rightCalf
    ];
    parts.forEach(p => (matter.composite as any).add(this.composite, p));
    matter.world.add(this.composite);
  }

  public setPosition(x: number, y: number, state?: { isAttacking?: boolean; attackPhase?: number; isQueued?: boolean; speedMult?: number }): void {
    const s = this.scale;
    const matter = this.scene.matter;

    if (this.dead) return; // Physics engine handles ragdoll body when dead

    if (state) {
      if (state.isAttacking !== undefined) this.isAttacking = state.isAttacking;
      if (state.attackPhase !== undefined) this.attackPhase = state.attackPhase;
      if (state.isQueued !== undefined) this.isQueued = state.isQueued;
    }

    if (this.isZombie) {
      if (this.isCrawling) {
        // ── Prone Crawler: Pulling itself across the dirt or clawing up at barricade ──
        if (this.isAttacking) {
          const clawPhase = this.attackPhase * Math.PI * 2;
          const torsoX = x + this.faceDir * 4 * s;
          const torsoY = y - 12 * s;
          matter.body.setPosition(this.torso, { x: torsoX, y: torsoY });
          matter.body.setPosition(this.head, {
            x: x + this.faceDir * 14 * s,
            y: y - 22 * s + Math.sin(clawPhase) * 3 * s
          });

          const strikeL = Math.sin(clawPhase) * 10 * s;
          const strikeR = -Math.sin(clawPhase) * 10 * s;
          const handLX = torsoX + this.faceDir * (18 * s + strikeL);
          const handLY = y - 8 * s + Math.cos(clawPhase) * 6 * s;
          const handRX = torsoX + this.faceDir * (18 * s + strikeR);
          const handRY = y - 8 * s - Math.cos(clawPhase) * 6 * s;

          matter.body.setPosition(this.leftUpperArm, { x: (torsoX + handLX) * 0.5, y: y - 10 * s });
          matter.body.setPosition(this.leftForearm, { x: handLX, y: handLY });
          matter.body.setPosition(this.rightUpperArm, { x: (torsoX + handRX) * 0.5, y: y - 10 * s });
          matter.body.setPosition(this.rightForearm, { x: handRX, y: handRY });

          matter.body.setPosition(this.leftThigh, { x: x - this.faceDir * 8 * s, y: y - 6 * s });
          matter.body.setPosition(this.leftCalf, { x: x - this.faceDir * 14 * s, y: y - 4 * s });
          matter.body.setPosition(this.rightThigh, { x: x - this.faceDir * 8 * s, y: y - 6 * s });
          matter.body.setPosition(this.rightCalf, { x: x - this.faceDir * 14 * s, y: y - 4 * s });
        } else {
          const speedFactor = (state?.speedMult !== undefined) ? Math.max(0.2, state.speedMult) : 1.0;
          this.walkCycle += 0.09 * speedFactor;
          const crawlPhase = this.walkCycle * 2.2;
          const pullL = Math.sin(crawlPhase) * 14 * s;
          const pullR = -Math.sin(crawlPhase) * 14 * s;

          // Torso flat on the ground
          const torsoX = x + this.faceDir * 2 * s;
          const torsoY = y - 10 * s;
          matter.body.setPosition(this.torso, { x: torsoX, y: torsoY });

          // Head dragging near ground, facing forward
          matter.body.setPosition(this.head, {
            x: x + this.faceDir * 18 * s,
            y: y - 18 * s + Math.sin(crawlPhase) * 2 * s
          });

          // Crawling arms clawing forward along ground
          const handLX = torsoX + this.faceDir * (18 * s + pullL);
          const handLY = y - 3 * s;
          const handRX = torsoX + this.faceDir * (18 * s + pullR);
          const handRY = y - 3 * s;

          matter.body.setPosition(this.leftUpperArm, { x: (torsoX + handLX) * 0.5, y: y - 6 * s });
          matter.body.setPosition(this.leftForearm, { x: handLX, y: handLY });
          matter.body.setPosition(this.rightUpperArm, { x: (torsoX + handRX) * 0.5, y: y - 6 * s });
          matter.body.setPosition(this.rightForearm, { x: handRX, y: handRY });

          // Severed stumps dragging behind
          matter.body.setPosition(this.leftThigh, { x: x - this.faceDir * 8 * s, y: y - 6 * s });
          matter.body.setPosition(this.leftCalf, { x: x - this.faceDir * 14 * s, y: y - 4 * s });
          matter.body.setPosition(this.rightThigh, { x: x - this.faceDir * 8 * s, y: y - 6 * s });
          matter.body.setPosition(this.rightCalf, { x: x - this.faceDir * 14 * s, y: y - 4 * s });
        }
      } else if (!this.hasLeftLeg || !this.hasRightLeg) {
        // ── 1-Leg Amputee Limping & Hopping ──
        this.walkCycle += 0.07;
        const hopBob = Math.abs(Math.sin(this.walkCycle * 2.5)) * 9 * s;
        const legStride = Math.sin(this.walkCycle) * 12 * s;

        const torsoX = x + this.faceDir * 4 * s;
        const torsoY = y - 32 * s - hopBob;
        matter.body.setPosition(this.torso, { x: torsoX, y: torsoY });
        matter.body.setPosition(this.head, {
          x: x + this.faceDir * 6 * s,
          y: y - 62 * s - hopBob * 1.2
        });

        // Arms hanging naturally with bent elbows to balance, swinging with hopping cadence
        const reachL = Math.sin(this.walkCycle) * 4 * s;
        const reachR = Math.cos(this.walkCycle) * 4 * s;
        const ampShoulderY = torsoY - 12 * s;
        const ampShoulderLX = torsoX - this.faceDir * 2 * s;
        const ampShoulderRX = torsoX + this.faceDir * 3 * s;

        const leftElbowX = ampShoulderLX + this.faceDir * (8 * s + reachL * 0.7);
        const leftElbowY = ampShoulderY + 11 * s;
        const handLX = leftElbowX + this.faceDir * (9 * s);
        const handLY = leftElbowY + 8 * s + reachL * 0.5;

        const rightElbowX = ampShoulderRX + this.faceDir * (9 * s + reachR * 0.7);
        const rightElbowY = ampShoulderY + 10 * s;
        const handRX = rightElbowX + this.faceDir * (10 * s);
        const handRY = rightElbowY + 7 * s + reachR * 0.5;

        matter.body.setPosition(this.leftUpperArm, { x: leftElbowX, y: leftElbowY });
        matter.body.setPosition(this.leftForearm, { x: handLX, y: handLY });
        matter.body.setPosition(this.rightUpperArm, { x: rightElbowX, y: rightElbowY });
        matter.body.setPosition(this.rightForearm, { x: handRX, y: handRY });

        // Intact leg steps, severed stump stays tucked
        if (this.hasLeftLeg) {
          matter.body.setPosition(this.leftThigh, { x: x - 5 * s + legStride * 0.5, y: y - 8 * s });
          matter.body.setPosition(this.leftCalf, { x: x - 5 * s + legStride, y: y + 14 * s });
          matter.body.setPosition(this.rightThigh, { x: torsoX, y: torsoY + 12 * s });
          matter.body.setPosition(this.rightCalf, { x: torsoX, y: torsoY + 18 * s });
        } else {
          matter.body.setPosition(this.rightThigh, { x: x + 5 * s + legStride * 0.5, y: y - 8 * s });
          matter.body.setPosition(this.rightCalf, { x: x + 5 * s + legStride, y: y + 14 * s });
          matter.body.setPosition(this.leftThigh, { x: torsoX, y: torsoY + 12 * s });
          matter.body.setPosition(this.leftCalf, { x: torsoX, y: torsoY + 18 * s });
        }
      } else {
        // ── Normal 2-Legged Shambling Walk / Barricade Attack / Waiting Queue ──
        let handLX: number;
        let handLY: number;
        let handRX: number;
        let handRY: number;
        let leftElbowX: number;
        let leftElbowY: number;
        let rightElbowX: number;
        let rightElbowY: number;

        if (this.isAttacking) {
          // ── Ferocious Barricade Assault (Anticipation, Impact Slash & Snap Bite) ──
          const cycle = this.attackPhase; // 0 to 1
          const strikeCycle = (cycle * 2) % 1; // 2 strikes per cycle (alternating hands)
          const isRightStrike = cycle < 0.5;

          // Deep predatory lunge into barricade with torso twist
          const lunge = Math.sin(cycle * Math.PI * 2);
          const torsoLeanX = x + this.faceDir * (11 * s + lunge * 2 * s);
          const torsoLeanY = y - 31 * s;
          matter.body.setPosition(this.torso, { x: torsoLeanX, y: torsoLeanY });

          // Snapping jaws chomping forward at the barricade
          const biteSnap = Math.abs(Math.sin(cycle * Math.PI * 4)) * 3 * s;
          matter.body.setPosition(this.head, {
            x: torsoLeanX + this.faceDir * (8 * s + biteSnap),
            y: torsoLeanY - 26 * s + Math.sin(cycle * Math.PI * 2) * 2 * s
          });

          // Planted feet in wide aggressive assault stance
          matter.body.setPosition(this.leftThigh, { x: x - this.faceDir * 7 * s, y: y - 8 * s });
          matter.body.setPosition(this.leftCalf, { x: x - this.faceDir * 11 * s, y: y + 14 * s });
          matter.body.setPosition(this.rightThigh, { x: x + this.faceDir * 6 * s, y: y - 7 * s });
          matter.body.setPosition(this.rightCalf, { x: x + this.faceDir * 10 * s, y: y + 14 * s });

          const atkShoulderLX = torsoLeanX - this.faceDir * 2 * s;
          const atkShoulderRX = torsoLeanX + this.faceDir * 3 * s;
          const atkShoulderY = torsoLeanY - 12 * s;

          // Compute individual arm kinematics: Windup -> Explosive Impact Slash -> Drag Recovery
          if (isRightStrike) {
            // Right arm is striking
            if (strikeCycle < 0.35) {
              // Windup: claw raised high near shoulder
              const w = strikeCycle / 0.35;
              rightElbowX = atkShoulderRX + this.faceDir * (6 * s - w * 2 * s);
              rightElbowY = atkShoulderY - 4 * s - w * 6 * s;
              handRX = rightElbowX + this.faceDir * (6 * s);
              handRY = rightElbowY - 8 * s;
            } else if (strikeCycle < 0.75) {
              // Violent forward & downward slash into barricade wood
              const st = (strikeCycle - 0.35) / 0.40;
              rightElbowX = atkShoulderRX + this.faceDir * (12 * s + st * 3 * s);
              rightElbowY = atkShoulderY + 2 * s + st * 6 * s;
              handRX = rightElbowX + this.faceDir * (13 * s + st * 4 * s);
              handRY = rightElbowY + 5 * s + st * 10 * s;
            } else {
              // Drag recovery
              const ret = (strikeCycle - 0.75) / 0.25;
              rightElbowX = atkShoulderRX + this.faceDir * (15 * s - ret * 5 * s);
              rightElbowY = atkShoulderY + 8 * s - ret * 3 * s;
              handRX = rightElbowX + this.faceDir * (17 * s - ret * 7 * s);
              handRY = rightElbowY + 15 * s - ret * 8 * s;
            }

            // Left claw holds poised ready guard near chest
            const lIdle = Math.sin(cycle * Math.PI * 4) * 1.5 * s;
            leftElbowX = atkShoulderLX + this.faceDir * (6 * s);
            leftElbowY = atkShoulderY + 9 * s + lIdle;
            handLX = leftElbowX + this.faceDir * (7 * s);
            handLY = leftElbowY + 4 * s + lIdle;
          } else {
            // Left arm is striking
            if (strikeCycle < 0.35) {
              // Windup: left claw raised high
              const w = strikeCycle / 0.35;
              leftElbowX = atkShoulderLX + this.faceDir * (6 * s - w * 2 * s);
              leftElbowY = atkShoulderY - 4 * s - w * 6 * s;
              handLX = leftElbowX + this.faceDir * (6 * s);
              handLY = leftElbowY - 8 * s;
            } else if (strikeCycle < 0.75) {
              // Violent downward slash
              const st = (strikeCycle - 0.35) / 0.40;
              leftElbowX = atkShoulderLX + this.faceDir * (12 * s + st * 3 * s);
              leftElbowY = atkShoulderY + 2 * s + st * 6 * s;
              handLX = leftElbowX + this.faceDir * (13 * s + st * 4 * s);
              handLY = leftElbowY + 5 * s + st * 10 * s;
            } else {
              // Drag recovery
              const ret = (strikeCycle - 0.75) / 0.25;
              leftElbowX = atkShoulderLX + this.faceDir * (15 * s - ret * 5 * s);
              leftElbowY = atkShoulderY + 8 * s - ret * 3 * s;
              handLX = leftElbowX + this.faceDir * (17 * s - ret * 7 * s);
              handLY = leftElbowY + 15 * s - ret * 8 * s;
            }

            // Right claw holds poised ready guard
            const rIdle = Math.sin(cycle * Math.PI * 4) * 1.5 * s;
            rightElbowX = atkShoulderRX + this.faceDir * (6 * s);
            rightElbowY = atkShoulderY + 9 * s + rIdle;
            handRX = rightElbowX + this.faceDir * (7 * s);
            handRY = rightElbowY + 4 * s + rIdle;
          }
        } else if (this.isQueued) {
          // ── Waiting in Queue: Agitated, twitching undead posture ──
          this.walkCycle += 0.035;
          const snarlBob = Math.sin(this.walkCycle * 2.5) * 1.5 * s;
          const torsoX = x + this.faceDir * 4 * s;
          const torsoY = y - 32 * s + snarlBob;
          matter.body.setPosition(this.torso, { x: torsoX, y: torsoY });
          matter.body.setPosition(this.head, {
            x: torsoX + this.faceDir * 6 * s,
            y: torsoY - 26 * s + snarlBob * 1.2
          });

          const qShoulderLX = torsoX - this.faceDir * 2 * s;
          const qShoulderRX = torsoX + this.faceDir * 3 * s;
          const qShoulderY = torsoY - 12 * s;

          // Arms held close to chest, claws twitching defensively
          const twitchL = Math.sin(this.walkCycle * 3.5) * 1.5 * s;
          const twitchR = Math.cos(this.walkCycle * 3.5) * 1.5 * s;

          leftElbowX = qShoulderLX + this.faceDir * 4 * s;
          leftElbowY = qShoulderY + 11 * s;
          handLX = leftElbowX + this.faceDir * (6 * s) + twitchL;
          handLY = leftElbowY + 2 * s + twitchL * 0.5;

          rightElbowX = qShoulderRX + this.faceDir * 5 * s;
          rightElbowY = qShoulderY + 11 * s;
          handRX = rightElbowX + this.faceDir * (7 * s) + twitchR;
          handRY = rightElbowY + 1 * s + twitchR * 0.5;

          // Restless shuffling feet
          const shuffle = Math.sin(this.walkCycle * 2) * 4 * s;
          matter.body.setPosition(this.leftThigh, { x: x - 5 * s + shuffle * 0.5, y: y - 8 * s });
          matter.body.setPosition(this.leftCalf, { x: x - 5 * s + shuffle, y: y + 14 * s });
          matter.body.setPosition(this.rightThigh, { x: x + 5 * s - shuffle * 0.5, y: y - 8 * s });
          matter.body.setPosition(this.rightCalf, { x: x + 5 * s - shuffle, y: y + 14 * s });
        } else {
          // ── Authentic Shambling Undead Walk (Hunched Spine, Lurching Drag, Heavy Trailing Arms) ──
          const speedFactor = (state?.speedMult !== undefined) ? Math.max(0.2, state.speedMult) : 1.0;
          this.walkCycle += 0.075 * (this.zombieType === 'crawler' ? 1.7 : 1.0) * speedFactor;

          // Rhythmic lurch: down-pose weight drop on contact step
          const bob = Math.sin(this.walkCycle * 2) * 2.6 * s;
          const shambleTilt = Math.sin(this.walkCycle) * 3.0 * s;

          // Hunched-over forward predatory posture
          const torsoX = x + this.faceDir * 7 * s;
          const torsoY = y - 31 * s + bob;
          matter.body.setPosition(this.torso, { x: torsoX, y: torsoY });

          // Decayed drooping head thrust forward ahead of chest with loose neck sway
          matter.body.setPosition(this.head, {
            x: torsoX + this.faceDir * 7 * s + shambleTilt * 0.5,
            y: torsoY - 26 * s + Math.cos(this.walkCycle * 2) * 1.5 * s
          });

          // Asymmetrical decayed shoulders (one shoulder hangs slightly lower)
          const wShoulderLX = torsoX - this.faceDir * 3 * s;
          const wShoulderLY = torsoY - 11 * s;
          const wShoulderRX = torsoX + this.faceDir * 3 * s;
          const wShoulderRY = torsoY - 13 * s;

          // Heavy pendulum arms with overlapping action (wrists lag behind elbows)
          const armSwing = Math.sin(this.walkCycle) * 5.0 * s;
          const wristLag = Math.sin(this.walkCycle - 0.45) * 4.5 * s;

          // Foreground Right Arm (dangles forward-down with natural gravity and loose elbow)
          rightElbowX = wShoulderRX + this.faceDir * (6 * s + armSwing * 0.6);
          rightElbowY = wShoulderRY + 12 * s;
          handRX = rightElbowX + this.faceDir * (5 * s + wristLag * 0.6);
          handRY = rightElbowY + 9 * s;

          // Background Left Arm (asymmetrical sway, trailing behind)
          leftElbowX = wShoulderLX + this.faceDir * (4 * s - armSwing * 0.6);
          leftElbowY = wShoulderLY + 13 * s;
          handLX = leftElbowX + this.faceDir * (4 * s - wristLag * 0.6);
          handLY = leftElbowY + 10 * s;

          // Asymmetrical shuffling stride: one lead step, one slight dragging limp
          const leadStep = Math.sin(this.walkCycle) * 11 * s;
          const dragStep = -Math.sin(this.walkCycle + 0.25) * 9 * s;

          matter.body.setPosition(this.leftThigh, { x: x - 4 * s + dragStep * 0.5, y: y - 8 * s });
          matter.body.setPosition(this.leftCalf, { x: x - 4 * s + dragStep, y: y + 14 * s });
          matter.body.setPosition(this.rightThigh, { x: x + 4 * s + leadStep * 0.5, y: y - 8 * s });
          matter.body.setPosition(this.rightCalf, { x: x + 4 * s + leadStep, y: y + 14 * s });
        }

        matter.body.setPosition(this.leftUpperArm, { x: leftElbowX, y: leftElbowY });
        matter.body.setPosition(this.leftForearm, { x: handLX, y: handLY });
        matter.body.setPosition(this.rightUpperArm, { x: rightElbowX, y: rightElbowY });
        matter.body.setPosition(this.rightForearm, { x: handRX, y: handRY });
      }
    } else {
      // ── Athletic Hero Archer Kinematics (Full-Body Dynamic Aiming & Draw Tension) ──
      const ang = this.aimAngle;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const drawTension = this.bowDrawFrac; // 0 to 1

      // Dynamic weight shift: archer leans back into draw when aiming high, leans forward when aiming low
      const aimLeanX = -cosA * (3.5 * s) + (this.faceDir * 2 * s);
      const aimLeanY = sinA * (2.0 * s) + (drawTension * 1.5 * s); // Sinks slightly into stance under draw weight

      // Torso dynamic positioning
      const torsoX = x + aimLeanX;
      const torsoY = y - 32 * s + aimLeanY;
      matter.body.setPosition(this.torso, { x: torsoX, y: torsoY });

      // Head tracks along arrow sightline with focused archer aim
      const headX = torsoX + cosA * (4.5 * s);
      const headY = torsoY - 30 * s + sinA * (2.5 * s);
      matter.body.setPosition(this.head, { x: headX, y: headY });

      // Shoulders move with the athletic torso
      const shoulderX = torsoX + cosA * (5 * s) - sinA * (2 * s);
      const shoulderY = torsoY - 12 * s + sinA * (5 * s) + cosA * (2 * s);

      // Bow arm: Extends firmly along the aimline toward the bow riser
      const bowArmLen = 35 * s;
      const bowHandX = shoulderX + cosA * bowArmLen;
      const bowHandY = shoulderY + sinA * bowArmLen;

      matter.body.setPosition(this.leftUpperArm, {
        x: shoulderX + cosA * (bowArmLen * 0.46),
        y: shoulderY + sinA * (bowArmLen * 0.46)
      });
      matter.body.setPosition(this.leftForearm, { x: bowHandX, y: bowHandY });

      // Drawing arm: Pulls string back toward archer's jaw / anchor point
      const maxPull = 25 * s;
      const pullback = drawTension * maxPull;
      const drawHandX = bowHandX - cosA * (pullback + 14 * s);
      const drawHandY = bowHandY - sinA * (pullback + 14 * s);

      // Drawing elbow elevates high and pulls back in classic high-anchor archery form
      const elbowBack = 12 * s + drawTension * 6 * s;
      const elbowElev = 10 * s - sinA * 5 * s;
      const drawElbowX = shoulderX - cosA * elbowBack + sinA * elbowElev;
      const drawElbowY = shoulderY - sinA * elbowBack - cosA * elbowElev;

      matter.body.setPosition(this.rightUpperArm, { x: drawElbowX, y: drawElbowY });
      matter.body.setPosition(this.rightForearm, { x: drawHandX, y: drawHandY });

      // Athletic grounded archer stance with weight distribution
      const backLegBrace = drawTension * 2 * s;
      matter.body.setPosition(this.leftThigh, { x: x - 8 * s - backLegBrace, y: y - 8 * s + aimLeanY * 0.5 });
      matter.body.setPosition(this.leftCalf, { x: x - 12 * s - backLegBrace, y: y + 14 * s });
      matter.body.setPosition(this.rightThigh, { x: x + 6 * s + cosA * 2 * s, y: y - 8 * s + aimLeanY * 0.5 });
      matter.body.setPosition(this.rightCalf, { x: x + 9 * s + cosA * 2 * s, y: y + 14 * s });
    }
  }

  public applyImpulse(impulseX: number, impulseY: number): void {
    const matter = this.scene.matter;
    matter.body.applyForce(this.torso, this.torso.position, { x: impulseX * 0.001, y: impulseY * 0.001 });
  }

  public decapitate(impulseX: number, impulseY: number): void {
    if (this.decapitated) return;
    this.decapitated = true;
    if (this.neckConstraint) {
      this.scene.matter.world.removeConstraint(this.neckConstraint as any);
      this.neckConstraint = null;
    }
    const matter = this.scene.matter;
    matter.body.applyForce(this.head, this.head.position, {
      x: impulseX * 0.002,
      y: impulseY * 0.002
    });
    matter.body.setAngularVelocity(this.head, (Math.random() - 0.5) * 0.5);
  }

  public destroy(): void {
    try {
      if (this.neckConstraint) {
        this.scene.matter.world.removeConstraint(this.neckConstraint as any);
        this.neckConstraint = null;
      }
      if (this.constraints && this.constraints.length > 0) {
        for (const c of this.constraints) {
          try {
            this.scene.matter.world.removeConstraint(c as any);
          } catch (e) {}
        }
        this.constraints = [];
      }
      const parts = [
        this.head,
        this.torso,
        this.leftUpperArm,
        this.leftForearm,
        this.rightUpperArm,
        this.rightForearm,
        this.leftThigh,
        this.leftCalf,
        this.rightThigh,
        this.rightCalf
      ];
      for (const p of parts) {
        if (p) {
          try {
            this.scene.matter.world.remove(p as any);
          } catch (e) {}
        }
      }
      if (this.composite) {
        try {
          this.scene.matter.world.remove(this.composite as any);
        } catch (e) {}
      }
    } catch (err) {}
  }

  public shatterPart(area: 'head' | 'torso' | 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm', impulseX: number, impulseY: number): void {
    const matter = this.scene.matter;
    const safeRemoveConstraint = (c: MatterJS.ConstraintType | null) => {
      if (!c) return;
      try {
        matter.world.removeConstraint(c as any);
        if (this.composite) {
          (matter.composite as any).remove(this.composite, c);
        }
        const idx = this.constraints.indexOf(c);
        if (idx !== -1) this.constraints.splice(idx, 1);
      } catch (e) {}
    };

    if (area === 'head') {
      this.hasHead = true;
      this.decapitated = true;
      safeRemoveConstraint(this.neckConstraint);
      this.neckConstraint = null;

      if (this.head) {
        matter.body.setStatic(this.head, false);
        this.head.friction = 0.85;
        this.head.frictionAir = 0.02;
        this.head.restitution = 0.35;
        matter.body.applyForce(this.head, this.head.position, {
          x: impulseX * 0.0012 + (Math.random() - 0.5) * 0.002,
          y: impulseY * 0.0012 - 0.003 - Math.random() * 0.003
        });
        matter.body.setAngularVelocity(this.head, (Math.random() - 0.5) * 0.25);
      }
    } else if (area === 'leftLeg') {
      this.hasLeftLeg = true;
      this.isLeftLegSevered = true;
      safeRemoveConstraint(this.leftHipJoint);
      this.leftHipJoint = null;

      const legParts = [this.leftThigh, this.leftCalf].filter(Boolean);
      for (const p of legParts) {
        matter.body.setStatic(p, false);
        p.friction = 0.88;
        p.frictionAir = 0.022;
        p.restitution = 0.18;
        matter.body.applyForce(p, p.position, {
          x: impulseX * 0.0008 + (Math.random() - 0.5) * 0.002,
          y: impulseY * 0.0008 - 0.002 - Math.random() * 0.002
        });
        matter.body.setAngularVelocity(p, (Math.random() - 0.5) * 0.18);
      }
    } else if (area === 'rightLeg') {
      this.hasRightLeg = true;
      this.isRightLegSevered = true;
      safeRemoveConstraint(this.rightHipJoint);
      this.rightHipJoint = null;

      const legParts = [this.rightThigh, this.rightCalf].filter(Boolean);
      for (const p of legParts) {
        matter.body.setStatic(p, false);
        p.friction = 0.88;
        p.frictionAir = 0.022;
        p.restitution = 0.18;
        matter.body.applyForce(p, p.position, {
          x: impulseX * 0.0008 + (Math.random() - 0.5) * 0.002,
          y: impulseY * 0.0008 - 0.002 - Math.random() * 0.002
        });
        matter.body.setAngularVelocity(p, (Math.random() - 0.5) * 0.18);
      }
    } else if (area === 'leftArm') {
      this.hasLeftArm = true;
      this.isLeftArmSevered = true;
      safeRemoveConstraint(this.leftShoulderJoint);
      this.leftShoulderJoint = null;

      const armParts = [this.leftUpperArm, this.leftForearm].filter(Boolean);
      for (const p of armParts) {
        matter.body.setStatic(p, false);
        p.friction = 0.85;
        p.frictionAir = 0.022;
        p.restitution = 0.2;
        matter.body.applyForce(p, p.position, {
          x: impulseX * 0.0008 + (Math.random() - 0.5) * 0.002,
          y: impulseY * 0.0008 - 0.0025
        });
        matter.body.setAngularVelocity(p, (Math.random() - 0.5) * 0.2);
      }
    } else if (area === 'rightArm') {
      this.hasRightArm = true;
      this.isRightArmSevered = true;
      safeRemoveConstraint(this.rightShoulderJoint);
      this.rightShoulderJoint = null;

      const armParts = [this.rightUpperArm, this.rightForearm].filter(Boolean);
      for (const p of armParts) {
        matter.body.setStatic(p, false);
        p.friction = 0.85;
        p.frictionAir = 0.022;
        p.restitution = 0.2;
        matter.body.applyForce(p, p.position, {
          x: impulseX * 0.0008 + (Math.random() - 0.5) * 0.002,
          y: impulseY * 0.0008 - 0.0025
        });
        matter.body.setAngularVelocity(p, (Math.random() - 0.5) * 0.2);
      }
    } else if (area === 'torso') {
      this.hasTorso = true;
      this.decapitated = true;
      this.isLeftArmSevered = true;
      this.isRightArmSevered = true;
      this.isLeftLegSevered = true;
      this.isRightLegSevered = true;

      safeRemoveConstraint(this.neckConstraint);
      safeRemoveConstraint(this.leftShoulderJoint);
      safeRemoveConstraint(this.rightShoulderJoint);
      safeRemoveConstraint(this.leftHipJoint);
      safeRemoveConstraint(this.rightHipJoint);
      this.neckConstraint = null;
      this.leftShoulderJoint = null;
      this.rightShoulderJoint = null;
      this.leftHipJoint = null;
      this.rightHipJoint = null;

      const allParts = [
        this.head, this.torso,
        this.leftUpperArm, this.leftForearm,
        this.rightUpperArm, this.rightForearm,
        this.leftThigh, this.leftCalf,
        this.rightThigh, this.rightCalf
      ].filter(Boolean) as MatterJS.BodyType[];

      for (const p of allParts) {
        matter.body.setStatic(p, false);
        p.friction = 0.85;
        p.frictionAir = 0.022;
        matter.body.applyForce(p, p.position, {
          x: (impulseX * 0.0009 + (Math.random() - 0.5) * 0.003),
          y: (impulseY * 0.0009 - 0.002 - Math.random() * 0.003)
        });
        matter.body.setAngularVelocity(p, (Math.random() - 0.5) * 0.2);
      }
    }
  }

  public shatterAll(): void {
    const matter = this.scene.matter;
    this.hasHead = true;
    this.hasTorso = true;
    this.hasLeftArm = true;
    this.hasRightArm = true;
    this.hasLeftLeg = true;
    this.hasRightLeg = true;
    this.decapitated = true;
    this.isLeftArmSevered = true;
    this.isRightArmSevered = true;
    this.isLeftLegSevered = true;
    this.isRightLegSevered = true;

    for (const c of [...this.constraints]) {
      try {
        matter.world.removeConstraint(c as any);
        if (this.composite) (matter.composite as any).remove(this.composite, c);
      } catch (e) {}
    }
    this.constraints = [];
    this.neckConstraint = null;
    this.leftShoulderJoint = null;
    this.leftElbowJoint = null;
    this.rightShoulderJoint = null;
    this.rightElbowJoint = null;
    this.leftHipJoint = null;
    this.leftKneeJoint = null;
    this.rightHipJoint = null;
    this.rightKneeJoint = null;

    const bodies = [
      this.head, this.torso,
      this.leftUpperArm, this.leftForearm,
      this.rightUpperArm, this.rightForearm,
      this.leftThigh, this.leftCalf,
      this.rightThigh, this.rightCalf
    ].filter(Boolean) as MatterJS.BodyType[];

    for (const b of bodies) {
      matter.body.setStatic(b, false);
      b.friction = 0.85;
      b.frictionAir = 0.02;
      b.restitution = 0.25;

      const ang = Math.random() * Math.PI * 2;
      const forceMag = 0.002 + Math.random() * 0.004;
      matter.body.applyForce(b, b.position, {
        x: Math.cos(ang) * forceMag + (Math.random() - 0.5) * 0.001,
        y: -Math.abs(Math.sin(ang)) * forceMag - 0.002
      });
      matter.body.setAngularVelocity(b, (Math.random() - 0.5) * 0.22);
    }
  }

  public relaxForDeath(impulseX: number, impulseY: number): void {
    const matter = this.scene.matter;
    const parts = [
      this.head,
      this.torso,
      this.leftUpperArm,
      this.leftForearm,
      this.rightUpperArm,
      this.rightForearm,
      this.leftThigh,
      this.leftCalf,
      this.rightThigh,
      this.rightCalf
    ].filter(Boolean) as MatterJS.BodyType[];

    for (const p of parts) {
      matter.body.setStatic(p, false);
      p.friction = 0.88;
      p.frictionAir = 0.022;
      p.restitution = 0.14;

      matter.body.applyForce(p, p.position, {
        x: impulseX * 0.0006 + (Math.random() - 0.5) * 0.0004,
        y: impulseY * 0.0006 + 0.0008
      });
      matter.body.setAngularVelocity(p, (Math.random() - 0.5) * 0.12);
    }

    for (const c of this.constraints) {
      if (c) {
        c.stiffness = 0.35;
        c.damping = 0.1;
      }
    }
  }

  public setHighFrictionForDeath(): void {
    this.relaxForDeath(0, 0);
  }

  public lockStatic(): void {
    // Body never freezes static; naturally settles with ground collision
    this.relaxForDeath(0, 0);
  }

  public renderGraphics(g: Phaser.GameObjects.Graphics, opts: {
    isHero?: boolean;
    heroSkin?: HeroSkinId;
    bowType?: string;
    hitFlash?: boolean;
    isFrozen?: boolean;
    isBurning?: boolean;
    isPoisoned?: boolean;
    isHoly?: boolean;
    isCharred?: boolean;
    alpha?: number;
  } = {}): void {
    const s = this.scale;
    const globalAlpha = opts.alpha !== undefined ? Math.max(0, Math.min(1, opts.alpha)) : 1.0;
    if (globalAlpha <= 0) return;

    const heroSkin = opts.heroSkin || 'default';
    const isFlash = opts.hitFlash || false;
    let skinCol = isFlash ? 0xffffff : Phaser.Display.Color.HexStringToColor(this.skinColor).color;
    let clothCol = isFlash ? 0xffffff : Phaser.Display.Color.HexStringToColor(this.clothesColor).color;
    let outlineCol = isFlash ? 0xffffff : (this.isZombie ? 0x0f1a09 : 0x0a1408);

    if (opts.isHero) {
      if (heroSkin === 'shadow_assassin') {
        skinCol = isFlash ? 0xffffff : 0x2c2c3e; // Shadow stealth tone
        clothCol = isFlash ? 0xffffff : 0x12121a; // Midnight obsidian
        outlineCol = isFlash ? 0xffffff : 0x08080c;
      } else if (heroSkin === 'cyberpunk') {
        skinCol = isFlash ? 0xffffff : 0xf1c40f;
        clothCol = isFlash ? 0xffffff : 0x0f172a; // Deep tech carbon
        outlineCol = isFlash ? 0xffffff : 0x00f2fe; // Neon cyan outline!
      } else if (heroSkin === 'valkyrie') {
        skinCol = isFlash ? 0xffffff : 0xffeaa7;
        clothCol = isFlash ? 0xffffff : 0xffffff; // Pristine holy white & gold
        outlineCol = isFlash ? 0xffffff : 0xd4af37; // Royal gold
      } else if (heroSkin === 'skeleton') {
        skinCol = isFlash ? 0xffffff : 0xecf0f1; // Pure bleached bone!
        clothCol = isFlash ? 0xffffff : 0x2d3436; // Crypt shroud
        outlineCol = isFlash ? 0xffffff : 0x111116;
      }
    }

    if (opts.isFrozen) {
      skinCol = isFlash ? 0xffffff : 0x74b9ff;
      clothCol = isFlash ? 0xffffff : 0x0984e3;
      outlineCol = isFlash ? 0xffffff : 0x00d2d3;
    } else if (opts.isBurning || opts.isCharred) {
      skinCol = isFlash ? 0xffffff : 0x221115;
      clothCol = isFlash ? 0xffffff : 0x180d10;
      outlineCol = isFlash ? 0xffffff : 0xeb4d4b;
    } else if (opts.isHoly) {
      skinCol = isFlash ? 0xffffff : 0xfffa65;
      clothCol = isFlash ? 0xffffff : 0xffeaa7;
      outlineCol = isFlash ? 0xffffff : 0xf1c40f;
    } else if (opts.isPoisoned) {
      skinCol = isFlash ? 0xffffff : 0x2ed573;
      clothCol = isFlash ? 0xffffff : 0x10ac84;
      outlineCol = isFlash ? 0xffffff : 0x0f2b1d;
    }

    const tp = this.hasTorso && this.torso ? this.torso.position : (this.hasLeftLeg && this.leftThigh ? this.leftThigh.position : (this.hasRightLeg && this.rightThigh ? this.rightThigh.position : { x: 0, y: 0 }));
    const hp = this.hasHead && this.head ? this.head.position : { x: tp.x, y: tp.y - 30 * s };

    // Helper to draw bone limb with smooth outline & joints
    const drawLimb = (bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType, width: number, color: number) => {
      if (!bodyA || !bodyB) return;
      g.lineStyle(width + 2.5 * s, outlineCol, 0.85 * globalAlpha);
      g.lineBetween(bodyA.position.x, bodyA.position.y, bodyB.position.x, bodyB.position.y);
      g.lineStyle(width, color, 1 * globalAlpha);
      g.lineBetween(bodyA.position.x, bodyA.position.y, bodyB.position.x, bodyB.position.y);
      // Joint circle
      g.fillStyle(color, 1 * globalAlpha);
      g.fillCircle(bodyA.position.x, bodyA.position.y, width * 0.5);
      g.fillCircle(bodyB.position.x, bodyB.position.y, width * 0.45);
    };

    // ═════════════════════════════════════════════
    // 1. HERO CAPE & QUIVER
    // ═════════════════════════════════════════════
    if (opts.isHero && !this.dead && this.hasTorso) {
      const capeWave = Math.sin(Date.now() * 0.007) * 12;

      if (heroSkin === 'shadow_assassin') {
        // 🥷 SHADOW ASSASSIN: Black Hooded Cloak with Ragged Shadows & Violet Runes
        g.fillStyle(0x060608, 0.95 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 36 * s + capeWave, tp.y + 48 * s,
          tp.x - 8 * s + capeWave * 0.8, tp.y + 44 * s
        );
        g.fillStyle(0x13131d, 1 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 28 * s + capeWave * 0.7, tp.y + 38 * s,
          tp.x - 4 * s, tp.y + 34 * s
        );
        g.lineStyle(1.8 * s, 0xa855f7, 0.9 * globalAlpha);
        g.lineBetween(tp.x - 4 * s, tp.y - 18 * s, tp.x - 28 * s + capeWave * 0.7, tp.y + 38 * s);

        // Obsidian Quiver with Violet Straps
        g.fillStyle(0x12121a, 1 * globalAlpha);
        g.fillRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);
        g.lineStyle(1.5, 0xa855f7, 0.9 * globalAlpha);
        g.strokeRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);

        // Violet-fletched shadowy dark arrows
        g.fillStyle(0xa855f7, 1 * globalAlpha);
        for (let qi = -1; qi <= 1; qi++) {
          g.fillTriangle(
            tp.x + qi * 3.5 * s - 12 * s, tp.y - 24 * s,
            tp.x + qi * 3.5 * s - 15 * s, tp.y - 33 * s,
            tp.x + qi * 3.5 * s - 9 * s, tp.y - 33 * s
          );
        }
      } else if (heroSkin === 'cyberpunk') {
        // ⚡ CYBERPUNK RANGER: Neon Hardlight Cape / Energy Scarf
        g.fillStyle(0x0a0f1d, 0.95 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 34 * s + capeWave, tp.y + 46 * s,
          tp.x - 8 * s + capeWave * 0.8, tp.y + 42 * s
        );
        g.fillStyle(0x0f2942, 1 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 26 * s + capeWave * 0.7, tp.y + 36 * s,
          tp.x - 4 * s, tp.y + 32 * s
        );
        g.lineStyle(2.2 * s, 0x00f2fe, 1 * globalAlpha);
        g.lineBetween(tp.x - 4 * s, tp.y - 18 * s, tp.x - 26 * s + capeWave * 0.7, tp.y + 36 * s);
        g.lineStyle(1.6 * s, 0xff007f, 0.85 * globalAlpha);
        g.lineBetween(tp.x - 4 * s, tp.y - 14 * s, tp.x - 18 * s + capeWave * 0.7, tp.y + 30 * s);

        // High-Tech Cyber Quiver
        g.fillStyle(0x0f172a, 1 * globalAlpha);
        g.fillRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);
        g.lineStyle(1.8, 0x00f2fe, 0.95 * globalAlpha);
        g.strokeRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);

        // Glowing neon energy fletchings
        g.fillStyle(0x00f2fe, 1 * globalAlpha);
        for (let qi = -1; qi <= 1; qi++) {
          g.fillTriangle(
            tp.x + qi * 3.5 * s - 12 * s, tp.y - 24 * s,
            tp.x + qi * 3.5 * s - 15 * s, tp.y - 33 * s,
            tp.x + qi * 3.5 * s - 9 * s, tp.y - 33 * s
          );
        }
      } else if (heroSkin === 'valkyrie') {
        // 🪽 VALKYRIE HUNTER: Glowing Holy Cape & Radiant Gilded Quiver
        const holyGlow = Math.sin(Date.now() * 0.009) * 0.15 + 0.85;
        g.fillStyle(0xd4af37, 0.9 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 36 * s + capeWave, tp.y + 48 * s,
          tp.x - 8 * s + capeWave * 0.8, tp.y + 44 * s
        );
        g.fillStyle(0xfffdf0, 1 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 28 * s + capeWave * 0.7, tp.y + 38 * s,
          tp.x - 4 * s, tp.y + 34 * s
        );
        g.lineStyle(2.4 * s, 0xffd700, holyGlow * globalAlpha);
        g.lineBetween(tp.x - 4 * s, tp.y - 18 * s, tp.x - 28 * s + capeWave * 0.7, tp.y + 38 * s);

        // Floating Holy Sparkles
        g.fillStyle(0xfff200, 0.85 * holyGlow * globalAlpha);
        g.fillCircle(tp.x - 30 * s + capeWave, tp.y + 42 * s, 2 * s);
        g.fillCircle(tp.x - 18 * s + capeWave * 0.8, tp.y + 48 * s, 1.6 * s);

        // Gilded Angelic Quiver
        g.fillStyle(0xffd700, 1 * globalAlpha);
        g.fillRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);
        g.lineStyle(1.6, 0xfffdf0, 0.95 * globalAlpha);
        g.strokeRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);

        // Golden feathered divine arrows
        g.fillStyle(0xfffdf0, 1 * globalAlpha);
        for (let qi = -1; qi <= 1; qi++) {
          g.fillTriangle(
            tp.x + qi * 3.5 * s - 12 * s, tp.y - 24 * s,
            tp.x + qi * 3.5 * s - 15 * s, tp.y - 33 * s,
            tp.x + qi * 3.5 * s - 9 * s, tp.y - 33 * s
          );
        }
      } else if (heroSkin === 'skeleton') {
        // 💀 UNDEAD SKELETON: Tattered Grave Shroud / Crypt Cloak
        g.fillStyle(0x181a1f, 0.9 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 34 * s + capeWave, tp.y + 46 * s,
          tp.x - 8 * s + capeWave * 0.8, tp.y + 42 * s
        );
        g.fillStyle(0x2f3640, 1 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 26 * s + capeWave * 0.7, tp.y + 36 * s,
          tp.x - 4 * s, tp.y + 32 * s
        );
        g.lineStyle(1.8 * s, 0x718093, 0.8 * globalAlpha);
        g.lineBetween(tp.x - 4 * s, tp.y - 18 * s, tp.x - 26 * s + capeWave * 0.7, tp.y + 36 * s);

        // Ancient Crypt Bone Quiver
        g.fillStyle(0xecf0f1, 1 * globalAlpha);
        g.fillRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);
        g.lineStyle(1.5, 0x2f3640, 0.9 * globalAlpha);
        g.strokeRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);

        // Skeletal bone arrows
        g.fillStyle(0xecf0f1, 1 * globalAlpha);
        for (let qi = -1; qi <= 1; qi++) {
          g.fillTriangle(
            tp.x + qi * 3.5 * s - 12 * s, tp.y - 24 * s,
            tp.x + qi * 3.5 * s - 15 * s, tp.y - 33 * s,
            tp.x + qi * 3.5 * s - 9 * s, tp.y - 33 * s
          );
        }
      } else {
        // Classic Forest Warden Emerald Cloak
        g.fillStyle(0x0c2413, 0.9 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 34 * s + capeWave, tp.y + 46 * s,
          tp.x - 8 * s + capeWave * 0.8, tp.y + 42 * s
        );
        g.fillStyle(0x1e4d2b, 1 * globalAlpha);
        g.fillTriangle(
          tp.x - 4 * s, tp.y - 18 * s,
          tp.x - 26 * s + capeWave * 0.7, tp.y + 36 * s,
          tp.x - 4 * s, tp.y + 32 * s
        );
        g.lineStyle(1.8 * s, 0xf1c40f, 0.8 * globalAlpha);
        g.lineBetween(tp.x - 4 * s, tp.y - 18 * s, tp.x - 26 * s + capeWave * 0.7, tp.y + 36 * s);

        g.fillStyle(0x4a2e18, 1 * globalAlpha);
        g.fillRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);
        g.lineStyle(1.5, 0x2d1b0e, 0.9 * globalAlpha);
        g.strokeRoundedRect(tp.x - 17 * s, tp.y - 24 * s, 10 * s, 30 * s, 3);

        g.fillStyle(0xf1c40f, 1 * globalAlpha);
        for (let qi = -1; qi <= 1; qi++) {
          g.fillTriangle(
            tp.x + qi * 3.5 * s - 12 * s, tp.y - 24 * s,
            tp.x + qi * 3.5 * s - 15 * s, tp.y - 33 * s,
            tp.x + qi * 3.5 * s - 9 * s, tp.y - 33 * s
          );
        }
      }
    }

    // ═════════════════════════════════════════════
    // 2. LEGS & SEVERED STUMPS
    // ═════════════════════════════════════════════
    const legW = (this.zombieType === 'boss' || this.zombieType === 'reaper' || this.zombieType === 'juggernaut') ? 14 * s : (this.zombieType === 'bloater' || this.zombieType === 'centurion' || this.zombieType === 'berserker' || this.zombieType === 'pyro') ? 11 * s : (this.zombieType === 'skeleton' || this.zombieType === 'stalker') ? 6 * s : 8.5 * s;

    if (opts.isHero) {
      if (this.hasLeftLeg && this.hasTorso) {
        drawLimb(this.torso, this.leftThigh, legW, clothCol);
        drawLimb(this.leftThigh, this.leftCalf, legW - 1, skinCol);
      }
      if (this.hasRightLeg && this.hasTorso) {
        drawLimb(this.torso, this.rightThigh, legW, clothCol);
        drawLimb(this.rightThigh, this.rightCalf, legW - 1, skinCol);
      }
    } else {
      // Zombie Left Leg
      const isLeftLegAttached = this.hasLeftLeg && this.hasTorso && this.leftHipJoint !== null && !this.isLeftLegSevered && !this.isCrawling;
      if (isLeftLegAttached) {
        drawLimb(this.torso, this.leftThigh, legW, clothCol);
        drawLimb(this.leftThigh, this.leftCalf, legW - 1, skinCol);
      } else {
        if (this.hasLeftLeg && this.leftThigh && this.leftCalf) {
          // Detached severed left leg tumbling freely on floor
          drawLimb(this.leftThigh, this.leftCalf, legW - 1, skinCol);
          g.fillStyle(0x5a0008, 1 * globalAlpha);
          g.fillCircle(this.leftThigh.position.x, this.leftThigh.position.y, 4 * s);
          g.fillStyle(0x8c7863, 1 * globalAlpha);
          g.fillRect(this.leftThigh.position.x - 1.5 * s, this.leftThigh.position.y - 1.5 * s, 3 * s, 3 * s);
          g.fillStyle(0x3a0005, 1 * globalAlpha);
          g.fillRect(this.leftThigh.position.x - 0.7 * s, this.leftThigh.position.y - 0.7 * s, 1.4 * s, 1.4 * s);
        }
        if (this.hasTorso && (!isLeftLegAttached || this.isLeftLegSevered || this.leftHipJoint === null || !this.hasLeftLeg)) {
          // Severed Left Stump with bone fragment & dripping blood on torso
          const stumpX = tp.x - 5 * s;
          const stumpY = tp.y + 12 * s;
          const isAcid = this.zombieType === 'bloater' || this.zombieType === 'slobber';
          const bloodCol = isAcid ? 0x27ae60 : 0x7a0008;
          g.fillStyle(0x3d0008, 1 * globalAlpha);
          g.fillCircle(stumpX, stumpY, 4.5 * s);
          g.fillStyle(0x8c7863, 1 * globalAlpha);
          g.fillRect(stumpX - 1.2 * s, stumpY, 2.4 * s, 5 * s);
          g.fillStyle(0x3a0005, 1 * globalAlpha);
          g.fillRect(stumpX - 0.6 * s, stumpY + 1 * s, 1.2 * s, 3 * s);
          g.fillStyle(bloodCol, 0.85 * globalAlpha);
          g.fillCircle(stumpX, stumpY + 8 * s, 2.5 * s);
        }
      }

      // Zombie Right Leg
      const isRightLegAttached = this.hasRightLeg && this.hasTorso && this.rightHipJoint !== null && !this.isRightLegSevered && !this.isCrawling;
      if (isRightLegAttached) {
        drawLimb(this.torso, this.rightThigh, legW, clothCol);
        drawLimb(this.rightThigh, this.rightCalf, legW - 1, skinCol);
      } else {
        if (this.hasRightLeg && this.rightThigh && this.rightCalf) {
          // Detached severed right leg tumbling freely on floor
          drawLimb(this.rightThigh, this.rightCalf, legW - 1, skinCol);
          g.fillStyle(0x5a0008, 1 * globalAlpha);
          g.fillCircle(this.rightThigh.position.x, this.rightThigh.position.y, 4 * s);
          g.fillStyle(0x8c7863, 1 * globalAlpha);
          g.fillRect(this.rightThigh.position.x - 1.5 * s, this.rightThigh.position.y - 1.5 * s, 3 * s, 3 * s);
          g.fillStyle(0x3a0005, 1 * globalAlpha);
          g.fillRect(this.rightThigh.position.x - 0.7 * s, this.rightThigh.position.y - 0.7 * s, 1.4 * s, 1.4 * s);
        }
        if (this.hasTorso && (!isRightLegAttached || this.isRightLegSevered || this.rightHipJoint === null || !this.hasRightLeg)) {
          // Severed Right Stump on torso
          const stumpX = tp.x + 5 * s;
          const stumpY = tp.y + 12 * s;
          const isAcid = this.zombieType === 'bloater' || this.zombieType === 'slobber';
          const bloodCol = isAcid ? 0x27ae60 : 0x7a0008;
          g.fillStyle(0x3d0008, 1 * globalAlpha);
          g.fillCircle(stumpX, stumpY, 4.5 * s);
          g.fillStyle(0x8c7863, 1 * globalAlpha);
          g.fillRect(stumpX - 1.2 * s, stumpY, 2.4 * s, 5 * s);
          g.fillStyle(0x3a0005, 1 * globalAlpha);
          g.fillRect(stumpX - 0.6 * s, stumpY + 1 * s, 1.2 * s, 3 * s);
          g.fillStyle(bloodCol, 0.85 * globalAlpha);
          g.fillCircle(stumpX, stumpY + 8 * s, 2.5 * s);
        }
      }

      // Crawler blood drag streak on ground
      if (this.isCrawling && this.hasTorso && !this.dead) {
        g.fillStyle(0x350000, 0.7 * globalAlpha);
        g.fillRoundedRect(tp.x - 22 * s, tp.y + 4 * s, 32 * s, 5 * s, 2);
      }
    }

    // Tattered zombie pants hems & scraped knee joints
    if (this.isZombie && this.hasTorso) {
      if (this.hasLeftLeg && this.leftThigh && this.leftCalf) {
        g.fillStyle(clothCol, 1 * globalAlpha);
        const kneeLX = this.leftThigh.position.x;
        const kneeLY = (this.leftThigh.position.y + this.leftCalf.position.y) * 0.5;
        for (let j = -2; j <= 2; j++) {
          g.fillTriangle(
            kneeLX + j * 3 * s, kneeLY - 2 * s,
            kneeLX + j * 3 * s - 1.8 * s, kneeLY + 4 * s,
            kneeLX + j * 3 * s + 1.8 * s, kneeLY + 4 * s
          );
        }
        // Subtle scraped knee abrasion flush inside limb
        g.lineStyle(1.4 * s, 0x3d0008, 0.75 * globalAlpha);
        g.lineBetween(kneeLX - 1.5 * s, kneeLY - 0.5 * s, kneeLX + 1.5 * s, kneeLY + 0.5 * s);
      }
      if (this.hasRightLeg && this.rightThigh && this.rightCalf) {
        g.fillStyle(clothCol, 1 * globalAlpha);
        const kneeRX = this.rightThigh.position.x;
        const kneeRY = (this.rightThigh.position.y + this.rightCalf.position.y) * 0.5;
        for (let j = -2; j <= 2; j++) {
          g.fillTriangle(
            kneeRX + j * 3 * s, kneeRY - 2 * s,
            kneeRX + j * 3 * s - 1.8 * s, kneeRY + 4 * s,
            kneeRX + j * 3 * s + 1.8 * s, kneeRY + 4 * s
          );
        }
        // Subtle scraped knee abrasion flush inside limb
        g.lineStyle(1.4 * s, 0x3d0008, 0.75 * globalAlpha);
        g.lineBetween(kneeRX - 1.5 * s, kneeRY - 0.5 * s, kneeRX + 1.5 * s, kneeRY + 0.5 * s);
      }
    }

    // ═════════════════════════════════════════════
    // 3. TORSO
    // ═════════════════════════════════════════════
    if (this.hasTorso) {
      const torsoW = (this.zombieType === 'juggernaut') ? 28 * s : (this.zombieType === 'bloater' || this.zombieType === 'reaper') ? 26 * s : (this.zombieType === 'boss') ? 24 * s : (this.zombieType === 'pyro') ? 20 * s : (this.zombieType === 'stalker') ? 13 * s : 15 * s;
      const torsoH = (this.zombieType === 'reaper') ? 48 * s : (this.zombieType === 'boss' || this.zombieType === 'juggernaut') ? 46 * s : (this.zombieType === 'bloater') ? 44 * s : (this.zombieType === 'pyro') ? 38 * s : (this.zombieType === 'stalker') ? 32 * s : 35 * s;

      // Torso outline & base fill
      g.lineStyle(2.5 * s, outlineCol, 0.85 * globalAlpha);
      g.strokeRoundedRect(tp.x - torsoW / 2, tp.y - torsoH / 2, torsoW, torsoH, 4);
      g.fillStyle(clothCol, 1 * globalAlpha);
      g.fillRoundedRect(tp.x - torsoW / 2, tp.y - torsoH / 2, torsoW, torsoH, 4);

      if (this.isZombie) {
        // Red fleshy wound on torso
        g.fillStyle(0x7a000d, 0.9 * globalAlpha);
        g.fillCircle(tp.x + 2 * s, tp.y + 4 * s, 4.8 * s);
        g.fillCircle(tp.x - 2 * s, tp.y + 3 * s, 4.0 * s);

        // Exposed white ribs inside the wound
        g.lineStyle(1.8 * s, 0xded6c7, 1 * globalAlpha);
        g.lineBetween(tp.x - 3 * s, tp.y + 2 * s, tp.x + 3 * s, tp.y + 2 * s);
        g.lineBetween(tp.x - 3 * s, tp.y + 5 * s, tp.x + 3 * s, tp.y + 5 * s);

        // Clean, shredded bottom hemline of zombie shirt
        const hemY = tp.y + torsoH * 0.5;
        g.fillStyle(clothCol, 1 * globalAlpha);
        for (let j = -2; j <= 2; j++) {
          const hx = tp.x + j * 3.5 * s;
          const hLen = (2.5 + (Math.abs(j) % 2) * 2.5) * s;
          g.fillTriangle(hx - 1.8 * s, hemY, hx + 1.8 * s, hemY, hx, hemY + hLen);
        }

        // Dried coagulated arterial stains along the shirt hem
        g.fillStyle(0x350808, 0.7 * globalAlpha);
        g.fillCircle(tp.x + 2 * s, tp.y + 6 * s, 2.5 * s);
        g.fillStyle(0x5a000a, 0.65 * globalAlpha);
        g.fillCircle(tp.x - 3 * s, tp.y + 7 * s, 2.0 * s);

        // Bloater giant bulging toxic belly
        if (this.zombieType === 'bloater') {
          const pulse = Math.sin(Date.now() * 0.008) * 2 * s;
          g.fillStyle(0x27ae60, 0.75 * globalAlpha);
          g.fillCircle(tp.x, tp.y + 10 * s, 22 * s + pulse);
          g.lineStyle(2.5 * s, 0x1b7943, 0.9 * globalAlpha);
          g.strokeCircle(tp.x, tp.y + 10 * s, 22 * s + pulse);

          // Toxic bubbling blisters
          g.fillStyle(0xf1c40f, 0.85 * globalAlpha);
          g.fillCircle(tp.x - 7 * s, tp.y + 6 * s, 4.5 * s);
          // Dark necro veins branching on belly
          g.lineStyle(1.2 * s, 0x0f381e, 0.8 * globalAlpha);
          g.lineBetween(tp.x - 6 * s, tp.y + 5 * s, tp.x, tp.y + 10 * s);
          g.lineBetween(tp.x, tp.y + 10 * s, tp.x + 7 * s, tp.y + 11 * s);
        }
      } else {
        if (heroSkin === 'shadow_assassin') {
          // 🥷 SHADOW ASSASSIN: Obsidian Cuirass & Crossed Dagger Straps
          g.fillStyle(0x14141e, 0.95 * globalAlpha);
          g.fillRect(tp.x - torsoW / 2 + 2 * s, tp.y - torsoH / 2 + 4 * s, torsoW - 4 * s, 16 * s);
          g.lineStyle(1.8 * s, 0x2c2c3e, 0.9 * globalAlpha);
          g.lineBetween(tp.x - torsoW / 2 + 3 * s, tp.y - torsoH / 2 + 4 * s, tp.x + torsoW / 2 - 3 * s, tp.y + 6 * s);
          g.lineBetween(tp.x + torsoW / 2 - 3 * s, tp.y - torsoH / 2 + 4 * s, tp.x - torsoW / 2 + 3 * s, tp.y + 6 * s);
          g.fillStyle(0xa855f7, 1 * globalAlpha);
          g.fillCircle(tp.x, tp.y - 2 * s, 3.2 * s);
        } else if (heroSkin === 'cyberpunk') {
          // ⚡ CYBERPUNK RANGER: Carbon Techwear Vest & Glowing Arc Reactor
          g.fillStyle(0x0f172a, 1 * globalAlpha);
          g.fillRect(tp.x - torsoW / 2 + 2 * s, tp.y - torsoH / 2 + 4 * s, torsoW - 4 * s, 16 * s);
          g.lineStyle(1.4 * s, 0x00f2fe, 0.95 * globalAlpha);
          g.lineBetween(tp.x - 5 * s, tp.y - 8 * s, tp.x - 5 * s, tp.y + 4 * s);
          g.lineBetween(tp.x + 5 * s, tp.y - 8 * s, tp.x + 5 * s, tp.y + 4 * s);
          const corePulse = Math.sin(Date.now() * 0.012) * 0.5 + 2.6;
          g.fillStyle(0x00f2fe, 1 * globalAlpha);
          g.fillCircle(tp.x, tp.y - 2 * s, corePulse * s);
          g.fillStyle(0xffffff, 1 * globalAlpha);
          g.fillCircle(tp.x, tp.y - 2 * s, 1.2 * s);
        } else if (heroSkin === 'valkyrie') {
          // 🪽 VALKYRIE HUNTER: Gilded Battle Cuirass & Sapphire Gem
          g.fillStyle(0xffd700, 1 * globalAlpha);
          g.fillRect(tp.x - torsoW / 2 + 2 * s, tp.y - torsoH / 2 + 4 * s, torsoW - 4 * s, 16 * s);
          g.lineStyle(1.8 * s, 0xfffdf0, 0.95 * globalAlpha);
          g.strokeRect(tp.x - torsoW / 2 + 2 * s, tp.y - torsoH / 2 + 4 * s, torsoW - 4 * s, 16 * s);
          g.fillStyle(0x00d2d3, 1 * globalAlpha);
          g.fillTriangle(
            tp.x, tp.y - 10 * s,
            tp.x - 4 * s, tp.y,
            tp.x + 4 * s, tp.y
          );
        } else if (heroSkin === 'skeleton') {
          // 💀 UNDEAD SKELETON: Exposed Skeletal Ribcage & Vertebrae
          g.fillStyle(0x111116, 0.95 * globalAlpha);
          g.fillRect(tp.x - torsoW / 2 + 2 * s, tp.y - torsoH / 2 + 4 * s, torsoW - 4 * s, 16 * s);
          g.lineStyle(2.0 * s, 0xecf0f1, 1 * globalAlpha);
          for (let ri = -2; ri <= 2; ri++) {
            g.lineBetween(tp.x - 5 * s, tp.y + ri * 3 * s, tp.x + 5 * s, tp.y + ri * 3 * s);
          }
          g.lineStyle(2.4 * s, 0xdfe6e9, 1 * globalAlpha);
          g.lineBetween(tp.x, tp.y - 8 * s, tp.x, tp.y + 8 * s);
        } else {
          // Classic Hero: Forest-Green Tunic & Reinforced Leather Cuirass
          g.fillStyle(0x1e392a, 0.95 * globalAlpha); // Forest tunic
          g.fillRect(tp.x - torsoW / 2 + 1 * s, tp.y - torsoH / 2 + 3 * s, torsoW - 2 * s, 18 * s);
          g.fillStyle(0x3e2723, 1 * globalAlpha); // Hardened leather cuirass
          g.fillRect(tp.x - torsoW / 2 + 2.5 * s, tp.y - torsoH / 2 + 5 * s, torsoW - 5 * s, 14 * s);
          // Diagonal leather quiver baldric strap with gleaming brass buckle
          g.lineStyle(2.6 * s, 0x27190c, 1 * globalAlpha);
          g.lineBetween(tp.x - 6 * s, tp.y - 12 * s, tp.x + 6 * s, tp.y + 6 * s);
          g.fillStyle(0xf1c40f, 1 * globalAlpha);
          g.fillCircle(tp.x, tp.y - 3 * s, 2.2 * s); // Polished brass buckle
          g.fillStyle(0xffffff, 0.8 * globalAlpha);
          g.fillCircle(tp.x - 0.7 * s, tp.y - 3.7 * s, 0.9 * s); // Metallic gleam
          // Gold chevron hero crest
          g.fillStyle(0xd4af37, 1 * globalAlpha);
          g.fillTriangle(
            tp.x, tp.y - 10 * s,
            tp.x - 3.5 * s, tp.y - 5 * s,
            tp.x + 3.5 * s, tp.y - 5 * s
          );
        }
      }
    }

    // ═════════════════════════════════════════════
    // 4. ARMS
    // ═════════════════════════════════════════════
    const armW = (this.zombieType === 'juggernaut') ? 14 * s : (this.zombieType === 'boss' || this.zombieType === 'reaper') ? 13 * s : (this.zombieType === 'bloater') ? 10 * s : (this.zombieType === 'pyro') ? 9 * s : (this.zombieType === 'stalker' || this.zombieType === 'phantom') ? 6.5 * s : 7.5 * s;

    // Helper to draw bone limb segment between two arbitrary points with joints
    const drawArmSegment = (x1: number, y1: number, x2: number, y2: number, width: number, color: number) => {
      g.lineStyle(width + 2.5 * s, outlineCol, 0.85 * globalAlpha);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(width, color, 1 * globalAlpha);
      g.lineBetween(x1, y1, x2, y2);
      g.fillStyle(color, 1 * globalAlpha);
      g.fillCircle(x1, y1, width * 0.5);
      g.fillCircle(x2, y2, width * 0.45);
    };

    // Calculate shoulder anchors on torso (collarbone level, NEVER belly)
    let shoulderLX = tp.x - 4 * s;
    let shoulderLY = tp.y - 12 * s;
    let shoulderRX = tp.x + 4 * s;
    let shoulderRY = tp.y - 12 * s;

    if (this.dead && this.torso) {
      const cosT = Math.cos(this.torso.angle);
      const sinT = Math.sin(this.torso.angle);
      shoulderLX = tp.x + (-6 * s * cosT - (-12 * s) * sinT);
      shoulderLY = tp.y + (-6 * s * sinT + (-12 * s) * cosT);
      shoulderRX = tp.x + (6 * s * cosT - (-12 * s) * sinT);
      shoulderRY = tp.y + (6 * s * sinT + (-12 * s) * cosT);
    } else if (this.isZombie) {
      if (this.isCrawling) {
        shoulderLX = tp.x + this.faceDir * 6 * s;
        shoulderLY = tp.y - 2 * s;
        shoulderRX = tp.x + this.faceDir * 6 * s;
        shoulderRY = tp.y + 2 * s;
      } else {
        shoulderLX = tp.x - this.faceDir * 2 * s;
        shoulderLY = tp.y - 12 * s;
        shoulderRX = tp.x + this.faceDir * 3 * s;
        shoulderRY = tp.y - 12 * s;
      }
    } else {
      shoulderLX = tp.x + 4 * s;
      shoulderLY = tp.y - 12 * s;
      shoulderRX = tp.x + 4 * s;
      shoulderRY = tp.y - 12 * s;
    }

    if (this.isZombie) {
      const drawZombieHand = (hx: number, hy: number, ex: number, ey: number) => {
        const dX = hx - ex;
        const dY = hy - ey;
        const armAng = Math.hypot(dX, dY) > 0.01 ? Math.atan2(dY, dX) : (this.faceDir > 0 ? 0 : Math.PI);

        const palmR = Math.max(3.2 * s, armW * 0.44);

        // Clean rounded palm matching stickman ragdoll anatomy
        g.fillStyle(outlineCol, 0.9 * globalAlpha);
        g.fillCircle(hx, hy, palmR + 1.2 * s);
        g.fillStyle(skinCol, 1 * globalAlpha);
        g.fillCircle(hx, hy, palmR);

        // Compact thumb
        const thumbAng = armAng + 0.52;
        const tRootX = hx + Math.cos(thumbAng) * (palmR * 0.7);
        const tRootY = hy + Math.sin(thumbAng) * (palmR * 0.7);
        const tTipX = tRootX + Math.cos(thumbAng + 0.15) * (2.8 * s);
        const tTipY = tRootY + Math.sin(thumbAng + 0.15) * (2.8 * s);

        g.lineStyle(1.8 * s, outlineCol, 0.9 * globalAlpha);
        g.lineBetween(tRootX, tRootY, tTipX, tTipY);
        g.lineStyle(1.3 * s, skinCol, 1 * globalAlpha);
        g.lineBetween(tRootX, tRootY, tTipX, tTipY);
        g.fillStyle(0x0e1713, 1 * globalAlpha);
        g.fillCircle(tTipX, tTipY, 0.9 * s);

        // 3 predatory claws clustered along reach direction with subtle blood tips
        for (let i = -1; i <= 1; i++) {
          const fAng = armAng + i * 0.22;
          const rootX = hx + Math.cos(fAng) * (palmR * 0.75);
          const rootY = hy + Math.sin(fAng) * (palmR * 0.75);
          const tipX = rootX + Math.cos(fAng - 0.08) * (3.4 * s);
          const tipY = rootY + Math.sin(fAng - 0.08) * (3.4 * s);

          g.lineStyle(1.8 * s, outlineCol, 0.9 * globalAlpha);
          g.lineBetween(rootX, rootY, tipX, tipY);
          g.lineStyle(1.3 * s, skinCol, 1 * globalAlpha);
          g.lineBetween(rootX, rootY, tipX, tipY);
          g.fillStyle(0x0e1713, 1 * globalAlpha);
          g.fillCircle(tipX, tipY, 0.9 * s);
          // Subtle dried blood tip on claws
          g.fillStyle(0x6b000a, 0.85 * globalAlpha);
          g.fillCircle(tipX + Math.cos(fAng - 0.08) * 0.5 * s, tipY + Math.sin(fAng - 0.08) * 0.5 * s, 0.5 * s);
        }
      };

      // Left Arm
      const isLeftArmAttached = this.hasLeftArm && this.hasTorso && this.leftShoulderJoint !== null && !this.isLeftArmSevered;
      if (isLeftArmAttached) {
        drawArmSegment(shoulderLX, shoulderLY, this.leftUpperArm.position.x, this.leftUpperArm.position.y, armW, skinCol);
        drawArmSegment(this.leftUpperArm.position.x, this.leftUpperArm.position.y, this.leftForearm.position.x, this.leftForearm.position.y, armW - 1, skinCol);
        drawZombieHand(this.leftForearm.position.x, this.leftForearm.position.y, this.leftUpperArm.position.x, this.leftUpperArm.position.y);
      } else {
        if (this.hasLeftArm && this.leftUpperArm && this.leftForearm) {
          // Detached severed left arm tumbling on floor
          drawArmSegment(this.leftUpperArm.position.x, this.leftUpperArm.position.y, this.leftForearm.position.x, this.leftForearm.position.y, armW - 1, skinCol);
          drawZombieHand(this.leftForearm.position.x, this.leftForearm.position.y, this.leftUpperArm.position.x, this.leftUpperArm.position.y);
          g.fillStyle(0x5a0008, 1 * globalAlpha);
          g.fillCircle(this.leftUpperArm.position.x, this.leftUpperArm.position.y, 4 * s);
          g.fillStyle(0x8c7863, 1 * globalAlpha);
          g.fillCircle(this.leftUpperArm.position.x, this.leftUpperArm.position.y, 1.8 * s);
          g.fillStyle(0x3a0005, 1 * globalAlpha);
          g.fillCircle(this.leftUpperArm.position.x, this.leftUpperArm.position.y, 0.8 * s);
        }
        if (this.hasTorso && (!isLeftArmAttached || this.isLeftArmSevered || this.leftShoulderJoint === null)) {
          // Severed shoulder socket on torso
          g.fillStyle(0x3d0008, 1 * globalAlpha);
          g.fillCircle(shoulderLX, shoulderLY, 4 * s);
          g.fillStyle(0x8c7863, 1 * globalAlpha);
          g.fillCircle(shoulderLX, shoulderLY, 1.6 * s);
        }
      }

      // Right Arm
      const isRightArmAttached = this.hasRightArm && this.hasTorso && this.rightShoulderJoint !== null && !this.isRightArmSevered;
      if (isRightArmAttached) {
        drawArmSegment(shoulderRX, shoulderRY, this.rightUpperArm.position.x, this.rightUpperArm.position.y, armW, skinCol);
        drawArmSegment(this.rightUpperArm.position.x, this.rightUpperArm.position.y, this.rightForearm.position.x, this.rightForearm.position.y, armW - 1, skinCol);
        drawZombieHand(this.rightForearm.position.x, this.rightForearm.position.y, this.rightUpperArm.position.x, this.rightUpperArm.position.y);
      } else {
        if (this.hasRightArm && this.rightUpperArm && this.rightForearm) {
          // Detached severed right arm tumbling on floor
          drawArmSegment(this.rightUpperArm.position.x, this.rightUpperArm.position.y, this.rightForearm.position.x, this.rightForearm.position.y, armW - 1, skinCol);
          drawZombieHand(this.rightForearm.position.x, this.rightForearm.position.y, this.rightUpperArm.position.x, this.rightUpperArm.position.y);
          g.fillStyle(0x5a0008, 1 * globalAlpha);
          g.fillCircle(this.rightUpperArm.position.x, this.rightUpperArm.position.y, 4 * s);
          g.fillStyle(0x8c7863, 1 * globalAlpha);
          g.fillCircle(this.rightUpperArm.position.x, this.rightUpperArm.position.y, 1.8 * s);
          g.fillStyle(0x3a0005, 1 * globalAlpha);
          g.fillCircle(this.rightUpperArm.position.x, this.rightUpperArm.position.y, 0.8 * s);
        }
        if (this.hasTorso && (!isRightArmAttached || this.isRightArmSevered || this.rightShoulderJoint === null)) {
          // Severed shoulder socket on torso
          g.fillStyle(0x3d0008, 1 * globalAlpha);
          g.fillCircle(shoulderRX, shoulderRY, 4 * s);
          g.fillStyle(0x8c7863, 1 * globalAlpha);
          g.fillCircle(shoulderRX, shoulderRY, 1.6 * s);
        }
      }
    } else {
      // Helper to draw realistic archer's leather glove with grip fingers
      const drawHeroHand = (hx: number, hy: number, ex: number, ey: number, isBowGrip: boolean) => {
        const dX = hx - ex;
        const dY = hy - ey;
        const armAng = Math.hypot(dX, dY) > 0.01 ? Math.atan2(dY, dX) : 0;
        const gloveCol = 0x3e2723; // Rich deep leather
        const stitchCol = 0x8d6e63; // Fine stitching
        const brassCol = 0xd4af37;  // Polished brass rivet
        const ux = Math.cos(armAng);
        const uy = Math.sin(armAng);
        const px = -uy;
        const py = ux;

        // Leather wrist bracer cuff
        g.lineStyle(6.5 * s, gloveCol, 1 * globalAlpha);
        g.lineBetween(hx - ux * 3 * s, hy - uy * 3 * s, hx + ux * 2 * s, hy + uy * 2 * s);
        g.lineStyle(1.5 * s, stitchCol, 0.8 * globalAlpha);
        g.lineBetween(hx - ux * 2 * s + px * 2.5 * s, hy - uy * 2 * s + py * 2.5 * s, hx - ux * 2 * s - px * 2.5 * s, hy - uy * 2 * s - py * 2.5 * s);

        // Leather palm & knuckle guard
        g.fillStyle(gloveCol, 1 * globalAlpha);
        g.fillCircle(hx + ux * 2 * s, hy + uy * 2 * s, 4.2 * s);

        // Brass bracer rivet
        g.fillStyle(brassCol, 1 * globalAlpha);
        g.fillCircle(hx - ux * 1.5 * s, hy - uy * 1.5 * s, 1.3 * s);

        if (isBowGrip) {
          // Left hand: firm grip wrapped around bow riser with visible thumb and curved leather fingers
          const kx = hx + ux * 3 * s;
          const ky = hy + uy * 3 * s;
          // Thumb locking over grip
          g.lineStyle(2.5 * s, gloveCol, 1 * globalAlpha);
          g.lineBetween(kx - px * 2 * s, ky - py * 2 * s, kx + ux * 3 * s - px * 1 * s, ky + uy * 3 * s - py * 1 * s);
          // 3 gripped fingers curled around riser
          for (let f = -1; f <= 1; f++) {
            const fx = kx + px * (f * 2.2 * s);
            const fy = ky + py * (f * 2.2 * s);
            g.lineStyle(2.4 * s, gloveCol, 1 * globalAlpha);
            g.lineBetween(fx, fy, fx + ux * 4 * s, fy + uy * 4 * s);
            g.fillStyle(stitchCol, 1 * globalAlpha);
            g.fillCircle(fx + ux * 4 * s, fy + uy * 4 * s, 1.2 * s);
          }
        } else {
          // Right hand: 3-finger Mediterranean draw on bowstring
          const kx = hx + ux * 2.5 * s;
          const ky = hy + uy * 2.5 * s;
          for (let f = -1; f <= 1; f++) {
            const fx = kx + px * (f * 2.0 * s);
            const fy = ky + py * (f * 2.0 * s);
            // Finger hooked over string
            g.lineStyle(2.2 * s, gloveCol, 1 * globalAlpha);
            g.lineBetween(fx, fy, fx + ux * 3.5 * s, fy + uy * 3.5 * s);
            g.fillStyle(brassCol, 0.9 * globalAlpha);
            g.fillCircle(fx + ux * 3.5 * s, fy + uy * 3.5 * s, 1.1 * s);
          }
        }
      };

      // For Hero: Left arm holds bow forward; Right arm draws string back
      if (this.hasLeftArm && this.hasTorso) {
        drawArmSegment(shoulderLX, shoulderLY, this.leftUpperArm.position.x, this.leftUpperArm.position.y, armW, skinCol);
        drawArmSegment(this.leftUpperArm.position.x, this.leftUpperArm.position.y, this.leftForearm.position.x, this.leftForearm.position.y, armW - 1, skinCol);
        drawHeroHand(this.leftForearm.position.x, this.leftForearm.position.y, this.leftUpperArm.position.x, this.leftUpperArm.position.y, true);
      }

      if (this.hasRightArm && this.hasTorso) {
        drawArmSegment(shoulderRX, shoulderRY, this.rightUpperArm.position.x, this.rightUpperArm.position.y, armW, skinCol);
        drawArmSegment(this.rightUpperArm.position.x, this.rightUpperArm.position.y, this.rightForearm.position.x, this.rightForearm.position.y, armW - 1, skinCol);
        drawHeroHand(this.rightForearm.position.x, this.rightForearm.position.y, this.rightUpperArm.position.x, this.rightUpperArm.position.y, false);
      }
    }

    // ═════════════════════════════════════════════
    // 5. HEAD & FACIAL EXPRESSION
    // ═════════════════════════════════════════════
    const headR = (this.zombieType === 'reaper') ? 23 * s : (this.zombieType === 'boss') ? 21 * s : (this.zombieType === 'juggernaut') ? 20 * s : (this.zombieType === 'bloater') ? 18 * s : (this.zombieType === 'pyro') ? 16 * s : (this.zombieType === 'stalker') ? 13 * s : 14.5 * s;

    if (this.hasHead) {
      const isDetached = this.decapitated || !this.hasTorso;

      if (!isDetached && !this.dead) {
        // Normal Alive Head
        g.lineStyle(2.5 * s, outlineCol, 0.85 * globalAlpha);
        g.strokeCircle(hp.x, hp.y, headR);
        g.fillStyle(skinCol, 1 * globalAlpha);
        g.fillCircle(hp.x, hp.y, headR);

        if (this.isZombie) {
          // Dark angled furrowed eyebrow
          g.lineStyle(2.0 * s, 0x192a10, 0.95 * globalAlpha);
          g.lineBetween(hp.x - this.faceDir * 2 * s, hp.y - 7.5 * s, hp.x + this.faceDir * 4 * s, hp.y - 4.5 * s);

          // Rotting zombie skull eye socket
          const eyeX = hp.x + this.faceDir * 3.8 * s;
          const eyeY = hp.y - 2 * s;
          g.fillStyle(0x192a10, 0.95 * globalAlpha);
          g.fillCircle(eyeX, eyeY, 5.2 * s);

          // Glowing eerie undead eye (Golden outer iris, red inner iris, black center)
          g.fillStyle(0xf9ca24, 1 * globalAlpha);
          g.fillCircle(eyeX + this.faceDir * 1 * s, eyeY, 3.4 * s);
          g.fillStyle(0xe74c3c, 1 * globalAlpha);
          g.fillCircle(eyeX + this.faceDir * 1.5 * s, eyeY, 2.0 * s);
          g.fillStyle(0x000000, 1 * globalAlpha);
          g.fillCircle(eyeX + this.faceDir * 1.8 * s, eyeY, 1.1 * s);

          // Gaping undead mouth with jagged bloody teeth!
          const mouthX = hp.x + this.faceDir * 4.8 * s;
          const mouthY = hp.y + 6 * s;
          g.fillStyle(0x350000, 1 * globalAlpha);
          g.fillEllipse(mouthX, mouthY, 5 * s, 3.5 * s);

          // Sharp jagged white zombie teeth hanging down
          g.fillStyle(0xf1f2f6, 1 * globalAlpha);
          for (let t = -1; t <= 1; t++) {
            g.fillTriangle(
              mouthX + t * 2.5 * s - 1.2 * s, mouthY - 3 * s,
              mouthX + t * 2.5 * s + 1.2 * s, mouthY - 3 * s,
              mouthX + t * 2.5 * s, mouthY
            );
          }

          // Toxic green drool drip
          g.fillStyle(0x2ed573, 0.95 * globalAlpha);
          g.fillCircle(mouthX + this.faceDir * 1.5 * s, mouthY + 5 * s, 2.0 * s);
        } else {
          if (heroSkin === 'shadow_assassin') {
            // 🥷 SHADOW ASSASSIN: Black Hooded Cowl & Glowing Violet Eyes
            g.fillStyle(0x12121a, 1 * globalAlpha);
            g.fillCircle(hp.x - 2 * s, hp.y - 5 * s, 17 * s);
            g.lineStyle(3 * s, 0x08080c, 1 * globalAlpha);
            g.lineBetween(hp.x - 14 * s, hp.y + 1 * s, hp.x + 8 * s, hp.y - 8 * s);

            // Lower face assassin ninja mask
            g.fillStyle(0x1a1a26, 1 * globalAlpha);
            g.fillRoundedRect(hp.x - 2 * s, hp.y + 2 * s, 12 * s, 10 * s, 3);

            // Glowing Violet Eyes with trailing ethereal smoke wisps
            const eyeX = hp.x + this.faceDir * 5 * s;
            const eyeY = hp.y - 2 * s;
            const smokePulse = Math.sin(Date.now() * 0.01) * 2 * s;

            // Violet aura & smoke wisps
            g.fillStyle(0xa855f7, 0.45 * globalAlpha);
            g.fillCircle(eyeX - this.faceDir * 3 * s, eyeY + smokePulse, 5 * s);
            g.fillStyle(0x7c3aed, 0.85 * globalAlpha);
            g.fillCircle(eyeX, eyeY, 4.2 * s);
            // Searing violet iris
            g.fillStyle(0xc084fc, 1 * globalAlpha);
            g.fillCircle(eyeX + this.faceDir * 1 * s, eyeY, 2.8 * s);
            // White-hot pupil core
            g.fillStyle(0xffffff, 1 * globalAlpha);
            g.fillCircle(eyeX + this.faceDir * 1.5 * s, eyeY, 1.4 * s);
          } else if (heroSkin === 'cyberpunk') {
            // ⚡ CYBERPUNK RANGER: Neon Cyber-Visor & Holographic HUD
            g.fillStyle(0x111827, 1 * globalAlpha);
            g.fillCircle(hp.x - 2 * s, hp.y - 6 * s, 16 * s);

            // Glowing Neon Cyber-Visor across eyes
            const visorW = 16 * s;
            const visorH = 7 * s;
            const vx = hp.x + this.faceDir * 4 * s - visorW * 0.4;
            const vy = hp.y - 5 * s;

            // Neon cyan visor body
            g.fillStyle(0x00f2fe, 0.95 * globalAlpha);
            g.fillRoundedRect(vx, vy, visorW, visorH, 2.5);

            // Outer Neon Magenta accent bracket
            g.lineStyle(1.8 * s, 0xff007f, 1 * globalAlpha);
            g.strokeRoundedRect(vx - 1, vy - 1, visorW + 2, visorH + 2, 3);

            // Animated Digital HUD Scanline
            const scanlineY = vy + (Math.sin(Date.now() * 0.018) * 0.5 + 0.5) * (visorH - 2);
            g.lineStyle(1.4 * s, 0xffffff, 1 * globalAlpha);
            g.lineBetween(vx + 1, scanlineY, vx + visorW - 1, scanlineY);

            // Tech ear comms receiver
            g.fillStyle(0xff007f, 1 * globalAlpha);
            g.fillCircle(hp.x - 5 * s, hp.y - 2 * s, 3.2 * s);
          } else if (heroSkin === 'valkyrie') {
            // 🪽 VALKYRIE HUNTER: Golden Winged Helmet & Celestial Blue Eyes
            // Golden blonde hair locks
            g.fillStyle(0xf1c40f, 1 * globalAlpha);
            g.fillCircle(hp.x - 2 * s, hp.y + 4 * s, 14 * s);

            // Gleaming Golden Valkyrie Helmet Crown
            g.fillStyle(0xffd700, 1 * globalAlpha);
            g.fillCircle(hp.x - 1 * s, hp.y - 7 * s, 16.5 * s);
            g.lineStyle(2.0 * s, 0xfffdf0, 0.95 * globalAlpha);
            g.strokeCircle(hp.x - 1 * s, hp.y - 7 * s, 16.5 * s);

            // Majestic White & Gold Wings Sprouting from Sides of Helmet
            const wingFlap = Math.sin(Date.now() * 0.006) * 1.5 * s;
            for (let wi = 0; wi < 3; wi++) {
              g.fillStyle(0xffffff, 1 * globalAlpha);
              g.fillTriangle(
                hp.x - 2 * s, hp.y - 12 * s + wi * 3 * s,
                hp.x - 18 * s - wi * 4 * s, hp.y - 24 * s + wi * 5 * s + wingFlap,
                hp.x - 8 * s, hp.y - 6 * s + wi * 3 * s
              );
              g.lineStyle(1.5 * s, 0xffd700, 1 * globalAlpha);
              g.strokeTriangle(
                hp.x - 2 * s, hp.y - 12 * s + wi * 3 * s,
                hp.x - 18 * s - wi * 4 * s, hp.y - 24 * s + wi * 5 * s + wingFlap,
                hp.x - 8 * s, hp.y - 6 * s + wi * 3 * s
              );
            }

            // Sapphire forehead gem
            g.fillStyle(0x00d2d3, 1 * globalAlpha);
            g.fillCircle(hp.x + this.faceDir * 4 * s, hp.y - 10 * s, 2.5 * s);

            // Celestial Glowing Blue Eyes
            const eyeX = hp.x + this.faceDir * 5 * s;
            const eyeY = hp.y - 2 * s;
            g.fillStyle(0xffffff, 1 * globalAlpha);
            g.fillCircle(eyeX, eyeY, 4.2 * s);
            g.fillStyle(0x00d2d3, 1 * globalAlpha);
            g.fillCircle(eyeX + this.faceDir * 1.5 * s, eyeY, 2.6 * s);
            g.fillStyle(0xffffff, 0.9 * globalAlpha);
            g.fillCircle(eyeX + this.faceDir * 2 * s, eyeY - 1 * s, 1.2 * s);
          } else if (heroSkin === 'skeleton') {
            // 💀 UNDEAD SKELETON: Skeletal Skull, Grinning Teeth & Spectral Soul Eyes
            g.lineStyle(2.5 * s, 0x111116, 0.95 * globalAlpha);
            g.strokeCircle(hp.x, hp.y, headR);
            g.fillStyle(0xecf0f1, 1 * globalAlpha);
            g.fillCircle(hp.x, hp.y, headR);

            // Dark sunken eye sockets
            const eyeX = hp.x + this.faceDir * 4.5 * s;
            const eyeY = hp.y - 2 * s;
            g.fillStyle(0x000000, 1 * globalAlpha);
            g.fillCircle(eyeX, eyeY, 4.5 * s);

            // Burning Spectral Soul Flames in Eyes
            const soulPulse = Math.sin(Date.now() * 0.012) * 0.8 * s;
            g.fillStyle(0x00f2fe, 0.9 * globalAlpha);
            g.fillCircle(eyeX + this.faceDir * 1 * s, eyeY, 3.0 * s + soulPulse);
            g.fillStyle(0xffffff, 1 * globalAlpha);
            g.fillCircle(eyeX + this.faceDir * 1.5 * s, eyeY, 1.4 * s);

            // Triangular skeletal nasal cavity
            g.fillStyle(0x111116, 1 * globalAlpha);
            g.fillTriangle(
              hp.x + this.faceDir * 4 * s, hp.y + 1 * s,
              hp.x + this.faceDir * 2.5 * s, hp.y + 4 * s,
              hp.x + this.faceDir * 5.5 * s, hp.y + 4 * s
            );

            // Grinning Skeletal Teeth
            const mouthX = hp.x + this.faceDir * 4 * s;
            const mouthY = hp.y + 7 * s;
            g.lineStyle(1.6 * s, 0x111116, 1 * globalAlpha);
            g.lineBetween(mouthX - 5 * s, mouthY, mouthX + 5 * s, mouthY);
            for (let ti = -2; ti <= 2; ti++) {
              g.lineBetween(mouthX + ti * 2 * s, mouthY - 2.5 * s, mouthX + ti * 2 * s, mouthY + 2.5 * s);
            }
          } else {
            // Classic Hero Ranger Hood & Feathered Archer Cap
            const eyeX = hp.x + this.faceDir * 5 * s;
            const eyeY = hp.y - 2 * s;

            // Eye Sclera (Almond-shaped archer eye with draw squint)
            const isAiming = this.bowDrawFrac > 0.2;
            const eyeH = isAiming ? 3.0 * s : 4.5 * s; // Squints when drawing bow!
            g.fillStyle(0xffffff, 1 * globalAlpha);
            g.fillEllipse(eyeX, eyeY, 4.4 * s, eyeH);

            // Pupil dynamically tracks along aim line (aimAngle)
            const cosAim = Math.cos(this.aimAngle);
            const sinAim = Math.sin(this.aimAngle);
            const pupilX = eyeX + cosAim * (1.6 * s);
            const pupilY = eyeY + sinAim * (1.0 * s);

            // Emerald Iris
            g.fillStyle(0x27ae60, 1 * globalAlpha);
            g.fillCircle(pupilX, pupilY, 2.4 * s);
            // Crisp Black Pupil
            g.fillStyle(0x0a1408, 1 * globalAlpha);
            g.fillCircle(pupilX + cosAim * 0.5 * s, pupilY + sinAim * 0.5 * s, 1.3 * s);
            // Catchlight gleam
            g.fillStyle(0xffffff, 0.9 * globalAlpha);
            g.fillCircle(pupilX - 0.7 * s, pupilY - 0.7 * s, 0.8 * s);

            // Archer Cap (Forest-green with golden trim band)
            g.fillStyle(0x194d29, 1 * globalAlpha);
            g.fillCircle(hp.x - 2 * s, hp.y - 5 * s, 16.5 * s);
            g.lineStyle(2.5 * s, 0xf1c40f, 0.95 * globalAlpha);
            g.lineBetween(hp.x - 14 * s, hp.y + 2 * s, hp.x + 8 * s, hp.y - 9 * s);

            // Flowing Emerald Archer Feather (ripples in the wind)
            const featherWave = Math.sin(Date.now() * 0.007) * 2.5 * s;
            g.fillStyle(0x2ecc71, 1 * globalAlpha);
            g.fillTriangle(
              hp.x - 5 * s, hp.y - 14 * s,
              hp.x - 22 * s, hp.y - 26 * s + featherWave,
              hp.x - 9 * s, hp.y - 12 * s
            );
            g.lineStyle(1.6 * s, 0xd4af37, 0.95 * globalAlpha);
            g.lineBetween(hp.x - 7 * s, hp.y - 13 * s, hp.x - 22 * s, hp.y - 26 * s + featherWave);
            // Golden Cap Brooch Pin
            g.fillStyle(0xf1c40f, 1 * globalAlpha);
            g.fillCircle(hp.x - 7 * s, hp.y - 13 * s, 2 * s);
          }
        }
      } else {
        // DEAD HEAD: Severed / Decapitated / Dead corpse face with X eyes
        // Dead head base circle
        g.lineStyle(2.5 * s, outlineCol, 0.85 * globalAlpha);
        g.strokeCircle(hp.x, hp.y, headR);
        g.fillStyle(skinCol, 1 * globalAlpha);
        g.fillCircle(hp.x, hp.y, headR);

        // Dead 'X' Eyes
        const eyeX = hp.x + this.faceDir * 4 * s;
        const eyeY = hp.y - 2 * s;
        g.lineStyle(2.4 * s, this.isZombie ? 0x8b0000 : 0x2c3e50, 1 * globalAlpha);
        g.lineBetween(eyeX - 4 * s, eyeY - 4 * s, eyeX + 4 * s, eyeY + 4 * s);
        g.lineBetween(eyeX + 4 * s, eyeY - 4 * s, eyeX - 4 * s, eyeY + 4 * s);

        // Slackened dead mouth
        g.fillStyle(0x220000, 0.9 * globalAlpha);
        g.fillEllipse(hp.x + this.faceDir * 4 * s, hp.y + 6 * s, 4.5 * s, 2.8 * s);

        if (isDetached) {
          // Severed neck gore at base of head with cervical vertebrae bone fragment
          const isAcid = this.zombieType === 'bloater' || this.zombieType === 'slobber';
          const goreCol = isAcid ? 0x27ae60 : (this.isZombie ? 0x8b0000 : 0xb71540);
          g.fillStyle(0x2a0005, 1 * globalAlpha);
          g.fillEllipse(hp.x, hp.y + headR * 0.85, 7 * s, 3.5 * s);

          // Protruding white cervical vertebrae fragment
          g.fillStyle(0xded6c7, 1 * globalAlpha);
          g.fillRect(hp.x - 1.5 * s, hp.y + headR * 0.85, 3 * s, 4 * s);
          g.fillStyle(0x1a0003, 1 * globalAlpha);
          g.fillCircle(hp.x, hp.y + headR * 0.85 + 3.2 * s, 0.9 * s); // Spinal canal hole

          // Hanging shredded muscle tendons & dripping gore droplets
          g.fillStyle(goreCol, 0.85 * globalAlpha);
          for (let bi = 0; bi < 4; bi++) {
            const dropX = hp.x + (bi - 1.5) * 3 * s;
            const dropY = hp.y + headR + (bi % 2) * 3 * s + 2 * s;
            g.fillCircle(dropX, dropY, (2.4 - (bi % 2) * 0.7) * s);
            g.lineStyle(1.0 * s, goreCol, 0.75 * globalAlpha);
            g.lineBetween(dropX, hp.y + headR * 0.85, dropX, dropY);
          }
        }
      }
    }

    // Visceral Decapitated Neck Stump Gore on Torso
    if (this.hasTorso && (this.decapitated || !this.hasHead || this.neckConstraint === null)) {
      const isAcid = this.zombieType === 'bloater' || this.zombieType === 'slobber';
      const bloodColor = isAcid ? 0x2ed573 : (this.isZombie ? 0x8b0000 : 0xb71540);
      const darkMeat = isAcid ? 0x145a32 : 0x3d0008;
      const boneTone = 0x8c7863; // weathered vertebra bone, NOT stark white!

      // Ragged torn fleshy rim
      g.fillStyle(darkMeat, 0.95 * globalAlpha);
      g.fillEllipse(tp.x, tp.y - 18 * s, 8 * s, 4 * s);

      // Exposed fractured cervical vertebra bone stump
      g.fillStyle(boneTone, 0.95 * globalAlpha);
      g.fillCircle(tp.x, tp.y - 18 * s, 2.4 * s);
      g.fillStyle(0x3a0005, 0.95 * globalAlpha);
      g.fillCircle(tp.x, tp.y - 18 * s, 1.1 * s); // Marrow canal

      // Arterial blood fountain droplets
      for (let bi = 0; bi < 4; bi++) {
        g.fillStyle(bloodColor, (0.95 - bi * 0.2) * globalAlpha);
        g.fillCircle(tp.x + (bi - 1.5) * 2.2 * s, tp.y - (19 + bi * 3) * s, (3.2 - bi * 0.6) * s);
      }
    }

    // ═════════════════════════════════════════════
    // 6. HERO RECURVE BOW & ELEMENTAL EFFECTS
    // ═════════════════════════════════════════════
    if (opts.isHero && !this.dead) {
      this.drawHeroBow(g, opts.bowType || 'normal', heroSkin);
    }
  }

  private drawHeroBow(g: Phaser.GameObjects.Graphics, bowType: string, heroSkin: string = 'default'): void {
    const s = this.scale;
    const ang = this.aimAngle;
    const pullback = this.bowDrawFrac * 24 * s;

    const colors: Record<string, number> = {
      fire: 0xff4757,
      ice: 0x00d2d3,
      tesla: 0xa29bfe,
      viper: 0x2ed573,
      ballista: 0xced6e0,
      blackhole: 0x9b59b6,
      holy: 0xf9ca24,
      cluster: 0xffa502,
      buzzsaw: 0xbdc3c7,
      homing: 0xc084fc,
      storm: 0x00d2d3,
      ricochet: 0xf39c12,
      triple: 0xf1c40f
    };
    const runeCol = colors[bowType] || 0xf5a623;

    // Bow Grip Center is at the forward hand
    const shoulderX = this.torso.position.x + 4 * s;
    const shoulderY = this.torso.position.y - 12 * s;
    const bowArmLen = 34 * s;
    const handX = shoulderX + Math.cos(ang) * bowArmLen;
    const handY = shoulderY + Math.sin(ang) * bowArmLen;

    // ── Authentic Recurve Bow Anatomy (Riser, Working Limbs, Recurve Tips & Nocks) ──
    const bowHeight = 60 * s;
    const halfH = bowHeight * 0.5;
    const flex = this.bowDrawFrac * 10 * s; // Limbs compress inward as string is drawn
    const perpAng = ang + Math.PI / 2;
    const cosP = Math.cos(perpAng);
    const sinP = Math.sin(perpAng);
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);

    // 1. Recurve Horn Tips (hook forward at the tips)
    const topTipX = handX + cosP * halfH - cosA * flex + cosP * 2 * s;
    const topTipY = handY + sinP * halfH - sinA * flex + sinP * 2 * s;
    const botTipX = handX - cosP * halfH - cosA * flex - cosP * 2 * s;
    const botTipY = handY - sinP * halfH - sinA * flex - sinP * 2 * s;

    // 2. Working Limb Mid-Points (bulge outwards in graceful archer curve)
    const topMidX = handX + cosP * (halfH * 0.62) + cosA * (6 * s - flex * 0.4);
    const topMidY = handY + sinP * (halfH * 0.62) + sinA * (6 * s - flex * 0.4);
    const botMidX = handX - cosP * (halfH * 0.62) + cosA * (6 * s - flex * 0.4);
    const botMidY = handY - sinP * (halfH * 0.62) + sinA * (6 * s - flex * 0.4);

    // 3. Riser Limb Pockets (where limbs meet the central handle)
    const riserLen = 14 * s;
    const topRiserX = handX + cosP * (riserLen * 0.5);
    const topRiserY = handY + sinP * (riserLen * 0.5);
    const botRiserX = handX - cosP * (riserLen * 0.5);
    const botRiserY = handY - sinP * (riserLen * 0.5);

    // 4. String Nock Point (drawn back by the drawing hand)
    const nockX = handX - cosA * (pullback + 14 * s);
    const nockY = handY - sinA * (pullback + 14 * s);

    // ── Outer Heavy Shadow / Contrast Rim ──
    g.lineStyle(6.5 * s, 0x0f0b07, 0.95);
    g.lineBetween(topTipX, topTipY, topMidX, topMidY);
    g.lineBetween(topMidX, topMidY, topRiserX, topRiserY);
    g.lineBetween(topRiserX, topRiserY, botRiserX, botRiserY);
    g.lineBetween(botRiserX, botRiserY, botMidX, botMidY);
    g.lineBetween(botMidX, botMidY, botTipX, botTipY);

    // ── Sculpted Recurve Limbs (Customized by Skin) ──
    const limbCol = heroSkin === 'skeleton' ? 0xecf0f1 : (heroSkin === 'valkyrie' ? 0xffd700 : (heroSkin === 'shadow_assassin' ? 0x14141e : (heroSkin === 'cyberpunk' ? 0x0f172a : 0x78350f)));
    g.lineStyle(4.5 * s, limbCol, 1);
    g.lineBetween(topTipX, topTipY, topMidX, topMidY);
    g.lineBetween(topMidX, topMidY, topRiserX, topRiserY);
    g.lineBetween(botRiserX, botRiserY, botMidX, botMidY);
    g.lineBetween(botMidX, botMidY, botTipX, botTipY);

    // Inner limb laminate highlight
    const lamCol = heroSkin === 'skeleton' ? 0xdfe6e9 : (heroSkin === 'valkyrie' ? 0xfffdf0 : (heroSkin === 'shadow_assassin' ? 0x7c3aed : (heroSkin === 'cyberpunk' ? 0x00f2fe : 0xd97706)));
    g.lineStyle(2.0 * s, lamCol, 0.95);
    g.lineBetween(topTipX, topTipY, topMidX, topMidY);
    g.lineBetween(topMidX, topMidY, topRiserX, topRiserY);
    g.lineBetween(botRiserX, botRiserY, botMidX, botMidY);
    g.lineBetween(botMidX, botMidY, botTipX, botTipY);

    // ── Ergonomic Carved Riser & Wrapped Leather Grip ──
    g.lineStyle(6.5 * s, 0x27190c, 1);
    g.lineBetween(topRiserX, topRiserY, botRiserX, botRiserY);
    // Leather grip wrap
    g.lineStyle(4.5 * s, 0x4a2e18, 1);
    g.lineBetween(topRiserX, topRiserY, botRiserX, botRiserY);
    // Gold/brass winding rings on grip
    g.lineStyle(1.8 * s, 0xd4af37, 0.9);
    for (let ri = -2; ri <= 2; ri++) {
      const rx = handX + cosP * (ri * 2.5 * s);
      const ry = handY + sinP * (ri * 2.5 * s);
      g.lineBetween(rx - cosA * 2.5 * s, ry - sinA * 2.5 * s, rx + cosA * 2.5 * s, ry + sinA * 2.5 * s);
    }

    // ── Metallic Horn Limb Tips & String Grooves ──
    const hornCol = heroSkin === 'cyberpunk' ? 0x00f2fe : (heroSkin === 'shadow_assassin' ? 0xa855f7 : (heroSkin === 'skeleton' ? 0x718093 : 0xf1c40f));
    g.fillStyle(hornCol, 1);
    g.fillCircle(topTipX, topTipY, 2.8 * s);
    g.fillCircle(botTipX, botTipY, 2.8 * s);

    // ── Elemental Power Core Gem at Riser Shelf ──
    // Outer elemental radiance
    g.fillStyle(runeCol, 0.3 + this.bowDrawFrac * 0.4);
    g.fillCircle(handX, handY, (8 + this.bowDrawFrac * 4) * s);
    // Prismatic gemstone
    g.fillStyle(runeCol, 1);
    g.fillCircle(handX, handY, 5 * s);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(handX - cosA * 1.5 * s - cosP * 1.5 * s, handY - sinA * 1.5 * s - sinP * 1.5 * s, 1.8 * s);

    // ── Skin-Specific Bow Enhancements ──
    if (heroSkin === 'cyberpunk') {
      // ⚡ CYBERPUNK: High-Tech Pulleys & Laser Targeting Beam
      const holoPulse = Math.sin(Date.now() * 0.015) * 0.2 + 0.8;
      // Compound bow cams/pulleys at tips
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(topTipX, topTipY, 4 * s);
      g.fillCircle(botTipX, botTipY, 4 * s);
      g.lineStyle(1.8 * s, 0x00f2fe, 1);
      g.strokeCircle(topTipX, topTipY, 4 * s);
      g.strokeCircle(botTipX, botTipY, 4 * s);

      // Searing Red Laser Sight Beam along aim vector
      if (this.bowDrawFrac > 0.1) {
        g.lineStyle(1.6 * s, 0xff0055, 0.75 * holoPulse);
        g.lineBetween(handX, handY, handX + cosA * 300 * s, handY + sinA * 300 * s);
      }
    } else if (heroSkin === 'valkyrie') {
      // 🪽 VALKYRIE: Sculpted Holy Feathers on Bow Limbs
      const holyGlow = Math.sin(Date.now() * 0.008) * 0.2 + 0.8;
      g.fillStyle(0xffffff, 0.95);
      for (let f = 1; f <= 3; f++) {
        const fxT = handX + cosP * (f * 8 * s);
        const fyT = handY + sinP * (f * 8 * s);
        g.fillTriangle(fxT, fyT, fxT - cosA * 8 * s, fyT - sinA * 8 * s, fxT + cosP * 4 * s, fyT + sinP * 4 * s);
        const fxB = handX - cosP * (f * 8 * s);
        const fyB = handY - sinP * (f * 8 * s);
        g.fillTriangle(fxB, fyB, fxB - cosA * 8 * s, fyB - sinA * 8 * s, fxB - cosP * 4 * s, fyB - sinP * 4 * s);
      }
      g.lineStyle(6 * s, 0xffd700, 0.3 * holyGlow);
      g.lineBetween(topTipX, topTipY, handX, handY);
      g.lineBetween(handX, handY, botTipX, botTipY);
    } else if (heroSkin === 'shadow_assassin') {
      // 🥷 SHADOW ASSASSIN: Whispering Void Runes
      const shadowPulse = Math.sin(Date.now() * 0.01) * 0.15 + 0.85;
      g.lineStyle(7 * s, 0xa855f7, 0.35 * shadowPulse);
      g.lineBetween(topTipX, topTipY, handX, handY);
      g.lineBetween(handX, handY, botTipX, botTipY);
    } else if (heroSkin === 'skeleton') {
      // 💀 UNDEAD SKELETON: Ancient Dragon Vertebra Nodes
      g.fillStyle(0xecf0f1, 1);
      g.fillCircle(topMidX, topMidY, 3.5 * s);
      g.fillCircle(botMidX, botMidY, 3.5 * s);
      g.lineStyle(1.5 * s, 0x00f2fe, 0.4);
      g.strokeCircle(topMidX, topMidY, 5 * s);
      g.strokeCircle(botMidX, botMidY, 5 * s);
    }

    // ── Double-Spun Bowstring with Central Serving & Brass Nock Beads ──
    const stringCol = heroSkin === 'cyberpunk' ? 0x00f2fe : (heroSkin === 'shadow_assassin' ? 0xd8b4fe : 0xffffff);
    g.lineStyle(2.2, stringCol, 0.95);
    g.lineBetween(topTipX, topTipY, nockX, nockY);
    g.lineBetween(nockX, nockY, botTipX, botTipY);
    // Brass nocking point indicators
    g.fillStyle(0xf1c40f, 1);
    g.fillCircle(nockX + cosP * 2 * s, nockY + sinP * 2 * s, 1.4 * s);
    g.fillCircle(nockX - cosP * 2 * s, nockY - sinP * 2 * s, 1.4 * s);

    // ── Nocked Glowing Arrow (Visible when aiming/charging) ──
    if (this.bowDrawFrac > 0.05) {
      const arrowLen = (bowType === 'ballista' ? 54 : 42) * s;
      const arrowTipX = nockX + Math.cos(ang) * arrowLen;
      const arrowTipY = nockY + Math.sin(ang) * arrowLen;

      renderArrowGraphic(g, nockX, nockY, arrowTipX, arrowTipY, ang, bowType, {
        scale: s,
        sawAngle: Date.now() * 0.015,
        isStuck: false,
        owner: 'player'
      });
    }
  }
}
