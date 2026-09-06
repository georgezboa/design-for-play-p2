import Phaser from 'phaser';
import { LANES, GRAVITY, MOVE } from './constants.js';
import { sfx } from './sfx.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, lane) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.lane = lane;
    this.laneScale = LANES[lane].scale;
    this.figureScale = 1.18;
    this.juiceX = 1;
    this.juiceY = 1;
    this.facing = 1;

    this.coyote = 0;
    this.jumpBuffer = 0;
    this.isJumping = false;
    this.transiting = false;
    this.frozen = false;
    this.invulnUntil = 0;
    this.wasOnGround = true;
    this.lastFallSpeed = 0;
    this.jumpAnticipating = false;
    this.jumpLaunchAt = 0;
    this.landingRecoverUntil = 0;
    this.landingFrameAt = 0;
    this.nextStrikeAt = 0;
    this.actionLockedUntil = 0;
    this.visualState = 'idle';

    this.setCollideWorldBounds(true);
    this.setDepth(LANES[lane].depth + 2);
    this.setTint(LANES[lane].figureTint);

    this.body.setMaxVelocity(MOVE.speedWalk, 1500);
    this.play('player-idle');
    this.applyScale();
  }

  applyScale() {
    this.setScale(
      this.laneScale * this.figureScale * this.juiceX,
      this.laneScale * this.figureScale * this.juiceY,
    );
    this.setFlipX(this.facing < 0);
  }

  /**
   * Squash-and-stretch pulse. Multiplies onto the current lane scale.
   * Only the previous juice tween is removed — killing every tween on the
   * player would also take out an in-flight lane transition, whose
   * onComplete is the only thing that clears `transiting`.
   */
  pulse(sx, sy, duration = 150) {
    if (this.juiceTween) this.juiceTween.remove();
    this.juiceX = sx;
    this.juiceY = sy;
    this.juiceTween = this.scene.tweens.add({
      targets: this,
      juiceX: 1,
      juiceY: 1,
      duration,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.juiceTween = null;
      },
    });
  }

  update(dt, input) {
    if (this.frozen) {
      this.setAccelerationX(0);
      this.setVelocityX(0);
      this.updateVisualAnimation(true);
      this.applyScale();
      return;
    }

    if (this.transiting) {
      // Safety net: a lane shift that loses its tween would otherwise strand
      // the player mid-transition with gravity off and input ignored.
      if (this.scene.time.now - this.transitStartedAt > MOVE.laneSwitchMs * 4) {
        this.finishLaneSwitch();
      }
      this.applyScale();
      return;
    }

    const body = this.body;
    const onGround = body.blocked.down || body.touching.down;

    // ------------------------------------------------------------ lane shift
    if (input.laneBack) this.switchLane(-1);
    else if (input.laneFront) this.switchLane(1);
    if (this.transiting) return;

    // ----------------------------------------------------------- horizontal
    const accel = onGround ? MOVE.accelGround : MOVE.accelAir;
    const targetMax = input.run ? MOVE.speedRun : MOVE.speedWalk;
    body.maxVelocity.x = Phaser.Math.Linear(body.maxVelocity.x, targetMax, 0.12);

    if (input.left && !input.right) {
      this.setAccelerationX(-accel);
      this.facing = -1;
    } else if (input.right && !input.left) {
      this.setAccelerationX(accel);
      this.facing = 1;
    } else {
      this.setAccelerationX(0);
      this.setDragX(onGround ? MOVE.dragGround : MOVE.dragAir);
    }

    // The hunter carries a cleaver; make it the primary answer to a beast,
    // rather than asking the player to land on its head like a mascot game.
    if (input.attackPressed) this.strike();

    // --------------------------------------------------------------- jumping
    if (onGround) this.coyote = MOVE.coyoteMs;
    else this.coyote -= dt;

    if (input.jumpPressed) this.jumpBuffer = MOVE.bufferMs;
    else this.jumpBuffer -= dt;

    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.jumpAnticipating) {
      this.jumpAnticipating = true;
      this.jumpLaunchAt = this.scene.time.now + 68;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.pulse(1.14, 0.78, 86);
    }

    if (this.jumpAnticipating && this.scene.time.now >= this.jumpLaunchAt) {
      this.setVelocityY(MOVE.jumpVelocity);
      this.jumpAnticipating = false;
      this.isJumping = true;
      this.pulse(0.8, 1.24, 170);
      sfx.jump();
    }

    // Variable jump height: let go early and the arc gets cut short.
    if (this.isJumping && !input.jumpHeld && body.velocity.y < 0) {
      this.setVelocityY(body.velocity.y * MOVE.jumpCutMultiplier);
      this.isJumping = false;
    }
    if (body.velocity.y >= 0) this.isJumping = false;

    // Float slightly at the apex, fall faster than you rose. This asymmetry is
    // most of what separates a "floaty" jump from one that feels good.
    let mult = 1;
    if (!onGround) {
      if (Math.abs(body.velocity.y) < MOVE.apexThreshold) mult = MOVE.apexGravityMult;
      else if (body.velocity.y > 0) mult = MOVE.fallGravityMult;
    }
    body.setGravityY(GRAVITY * (mult - 1));

    // --------------------------------------------------------------- landing
    if (onGround && !this.wasOnGround && this.lastFallSpeed > 60) {
      this.landingRecoverUntil = this.scene.time.now + 150;
      this.landingFrameAt = this.scene.time.now + 72;
      this.pulse(1.26, 0.76, 160);
      sfx.land();
    }
    this.wasOnGround = onGround;
    this.lastFallSpeed = body.velocity.y;

    // ------------------------------------------------------------- invuln fx
    if (this.scene.time.now < this.invulnUntil) {
      this.setAlpha(Math.floor(this.scene.time.now / 60) % 2 ? 0.35 : 1);
    } else if (this.alpha !== 1) {
      this.setAlpha(1);
    }

    this.updateVisualAnimation(onGround);
    this.applyScale();
  }

  updateVisualAnimation(onGround) {
    if (this.scene.time.now < this.actionLockedUntil) return;

    if (this.jumpAnticipating) {
      this.anims.stop();
      this.setTexture('player-jump-anticipation');
      this.visualState = 'jump-anticipation';
      return;
    }

    if (!onGround) {
      const texture = this.body.velocity.y < 30 ? 'player-jump' : 'player-fall';
      const state = texture === 'player-jump' ? 'jump' : 'fall';
      if (this.visualState !== state) {
        this.anims.stop();
        this.setTexture(texture);
        this.visualState = state;
      }
      return;
    }

    if (this.scene.time.now < this.landingRecoverUntil) {
      this.anims.stop();
      this.setTexture(
        this.scene.time.now < this.landingFrameAt ? 'player-land-0' : 'player-land-1',
      );
      this.visualState = 'land';
      return;
    }

    if (Math.abs(this.body.velocity.x) > 24) {
      this.play('player-walk', true);
      this.visualState = 'walk';
    } else {
      this.play('player-idle', true);
      this.visualState = 'idle';
    }
  }

  playInteraction() {
    this.setAccelerationX(0);
    this.setVelocityX(0);
    this.actionLockedUntil = this.scene.time.now + 430;
    this.play('player-interact', true);
    this.visualState = 'interact';
  }

  strike() {
    const now = this.scene.time.now;
    if (now < this.nextStrikeAt || this.transiting) return;

    this.nextStrikeAt = now + 290;
    this.pulse(1.14, 0.86, 110);
    this.scene.performStrike(this, this.facing);
    sfx.slash();
  }

  /** Map a y in one lane to the equivalent height above the other lane's floor. */
  laneTargetY(fromLane, toLane) {
    const a = LANES[fromLane];
    const b = LANES[toLane];
    const above = a.baseY - this.y;
    return b.baseY - above * (b.scale / a.scale);
  }

  /** dir: -1 = deeper into the scene, +1 = toward the camera. */
  switchLane(dir) {
    if (this.transiting) return;

    const target = this.lane + dir;
    if (target < 0 || target >= LANES.length) return;

    const targetY = this.laneTargetY(this.lane, target);
    if (!this.scene.canOccupyLane(this, target, this.x, targetY)) {
      sfx.blocked();
      this.scene.cameras.main.shake(90, 0.004);
      return;
    }

    const lane = LANES[target];
    this.transiting = true;
    this.transitStartedAt = this.scene.time.now;
    this.pendingLane = target;
    this.pendingY = targetY;
    this.body.allowGravity = false;
    this.setVelocityY(0);
    this.setAccelerationX(0);
    this.setTint(lane.figureTint);
    this.setDepth(lane.depth + 2);
    sfx.lane();

    this.laneTween = this.scene.tweens.add({
      targets: this,
      y: targetY,
      laneScale: lane.scale,
      duration: MOVE.laneSwitchMs,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.applyScale(),
      onComplete: () => this.finishLaneSwitch(),
    });
  }

  /** Commit a lane shift. Idempotent, so the safety net can call it too. */
  finishLaneSwitch() {
    if (!this.transiting) return;

    if (this.laneTween) {
      this.laneTween.remove();
      this.laneTween = null;
    }

    const target = this.pendingLane;
    this.lane = target;
    this.y = this.pendingY;
    this.laneScale = LANES[target].scale;
    this.transiting = false;
    this.body.allowGravity = true;
    this.coyote = 0;
    this.applyScale();
    this.scene.onLaneChanged(target);
  }

  /**
   * Scripted upward launch — springs, stomp bounces. Deliberately clears
   * `isJumping` so the variable-jump-height cut does not apply: the player
   * isn't holding jump during a launch, so treating it as a normal jump would
   * chop it to 42% the instant it starts.
   */
  launch(velocity) {
    this.setVelocityY(velocity);
    this.isJumping = false;
    this.jumpAnticipating = false;
    this.jumpLaunchAt = 0;
    this.landingRecoverUntil = 0;
    this.landingFrameAt = 0;
    this.coyote = 0;
  }

  hurt(fromX) {
    if (this.scene.time.now < this.invulnUntil || this.transiting) return false;
    this.invulnUntil = this.scene.time.now + MOVE.hurtInvulnMs;

    const away = this.x < fromX ? -1 : 1;
    this.setVelocityX(MOVE.hurtKnockX * away);
    this.setVelocityY(MOVE.hurtKnockY);
    this.pulse(1.3, 0.7, 200);
    sfx.hurt();
    return true;
  }

  resetTo(x, y, lane) {
    this.scene.tweens.killTweensOf(this);
    this.laneTween = null;
    this.juiceTween = null;

    this.lane = lane;
    this.laneScale = LANES[lane].scale;
    this.juiceX = 1;
    this.juiceY = 1;
    this.transiting = false;
    this.frozen = false;
    this.isJumping = false;
    this.jumpAnticipating = false;
    this.jumpLaunchAt = 0;
    this.landingRecoverUntil = 0;
    this.landingFrameAt = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.invulnUntil = this.scene.time.now + 700;
    this.nextStrikeAt = 0;
    this.actionLockedUntil = 0;
    this.visualState = 'idle';

    this.body.allowGravity = true;
    this.body.setGravityY(0);
    // body.reset() — not setPosition() — because it also clears the body's
    // previous position. Leaving `prev` stale makes the next physics step see
    // a huge delta and separation shoves the player off the respawn point.
    this.body.reset(x, y);
    this.setAccelerationX(0);
    this.setAlpha(1);
    this.setTint(LANES[lane].figureTint);
    this.setDepth(LANES[lane].depth + 2);
    this.play('player-idle', true);
    this.applyScale();
    this.scene.onLaneChanged(lane);
  }
}
