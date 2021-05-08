import { Color, Matrix4, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';
import VoxelWorld from '../core/voxels.js';
import Voxelizer from '../core/voxelizer.js';
import Ball from '../renderables/ball.js';
import Box from '../renderables/box.js';
import Helicopter from '../renderables/helicopter.js';
import Rope from '../renderables/rope.js';

class Ropes extends Gameplay {
  constructor(scene, options) {
    super(scene, {
      width: 160,
      height: 96,
      depth: 160,
    });

    this.anchor = new Box();
    this.anchor.position.set(0, 0.625, 1.12);
    const ball = new Ball();
    this.ball = ball;
    this.helicopter = new Helicopter({
      sfx: scene.sfx,
      sound: '/sounds/engine.ogg',
      voxelizer: new Voxelizer({
        maxWidth: 32,
        maxHeight: 32,
        maxDepth: 32,
      }),
    });
    if (options.view === 'thirdpersonhack') {
      this.helicopter.position.set(-0.5, -3, -3);
    }
    this.helicopter.add(this.anchor);
    this.player.add(this.helicopter);

    const explosionOrigin = new Vector3();
    const explosionBrush = {
      color: new Color(),
      noise: 0,
      type: 0,
      shape: VoxelWorld.brushShapes.sphere,
      size: 3,
    };
    const inverse = new Matrix4();
    this.projectiles.onDudeContact = ({ mesh, triggerMesh: dude, normal, position }) => {
      if (mesh !== ball) {
        return;
      }
      this.spawnExplosion(position, ball.material.color);
      this.updateVoxel(
        explosionBrush,
        explosionOrigin
          .copy(position)
          .divideScalar(this.world.scale)
          .addScaledVector(normal, 0.5 * this.world.scale)
          .floor()
      );
      dude.searchEnabled = false;
      dude.position.copy(ball.position).add({ x: 0, y: -0.5 - dude.physics[0].height, z: 0 });
      dude.skeleton.bones[dude.constructor.bones.head].rotation.set(0, 0, 0);
      dude.setAction(dude.actions.fly);
      this.physics.removeMesh(dude);
      this.physics.addMesh(dude, { mass: 1 });
      dude.constraint = this.physics.addConstraint(ball, 0, {
        type: 'p2p',
        mesh: dude,
        pivotInA: this.helicopter.aux.pivot
          .copy(position)
          .applyMatrix4(inverse.copy(ball.matrixWorld).invert()),
        pivotInB: { x: 0, y: dude.physics[0].height, z: 0 },
      });
    };
  }

  onLoad() {
    const { physics, player } = this;
    super.onLoad();
    player.move({ x: 0.5, y: 15, z: 5 });
    this.helicopter.voxelize()
      .then(() => {
        const { anchor, ball } = this;
        const options = {
          anchorA: ball,
          anchorB: anchor,
          length: 10,
          segments: 12,
        };
        anchor.getWorldPosition(ball.position).add({ x: 0, y: -options.length, z: 0 });
        options.origin = ball.position;
        const rope = new Rope(options);
        this.rope = rope;
        this.helicopter.cockpit.children.forEach(({ collider }) => {
          if (collider) {
            collider.updateWorldMatrix(true, false);
            physics.addMesh(collider, { isKinematic: true });
          }
        });
        physics.addMesh(anchor, { isKinematic: true });
        physics.addMesh(ball, { mass: 10, angularFactor: { x: 0, y: 0, z: 0 } });
        physics.addRope(rope, options);
        this.add(ball);
        this.add(rope);
      });
  }

  onAnimationTick({ animation, camera, isXR }) {
    const { hasLoaded, helicopter } = this;
    if (!hasLoaded) {
      return;
    }
    super.onAnimationTick({ animation, camera, isXR });
    helicopter.animate(animation);
  }

  onLocomotionTick({ animation, isXR }) {
    const {
      hasLoaded,
      helicopter,
      locomotion: {
        direction,
        forward,
        right,
        worldUp,
      },
      // physics,
      player,
    } = this;
    if (!hasLoaded || !helicopter.cockpit) {
      return;
    }
    const { pivot, movement } = helicopter.aux;
    if (isXR) {
      const controllerL = player.controllers.find(({ hand }) => hand && hand.handedness === 'left');
      const controllerR = player.controllers.find(({ hand }) => hand && hand.handedness === 'right');
      if (!controllerL || !controllerR) {
        return;
      }
      movement.set(
        controllerR.joystick.x,
        controllerL.buttons.primary ? 1 : (controllerR.buttons.primary ? -1 : 0),
        -controllerR.joystick.y
      );
    } else {
      movement.copy(player.desktop.keyboard);
    }
    player.getWorldDirection(forward);
    if (
      (forward.y > -0.3 || movement.z > 0) && (forward.y < 0.3 || movement.z < 0)
      && (movement.x !== 0 || movement.z !== 0)
    ) {
      right.crossVectors(worldUp, forward);
      helicopter.localToWorld(pivot.copy(helicopter.cockpit.position));
      if (movement.z !== 0) {
        player.rotate(right, movement.z * animation.delta * -0.125, pivot);
      }
      if (movement.x !== 0) {
        player.rotate(worldUp, movement.x * animation.delta * -0.25, pivot);
      }
    }
    helicopter.acceleration.z = -forward.y * 0.5;
    helicopter.velocity.z = Math.min(Math.max(helicopter.velocity.z * 0.95 + helicopter.acceleration.z, -3), 3);
    forward.y = 0;
    forward.normalize();

    helicopter.acceleration.y = movement.y * 0.1;
    helicopter.velocity.y = Math.min(Math.max(helicopter.velocity.y * 0.9 + helicopter.acceleration.y, -3), 3);
    if (helicopter.velocity.y !== 0) {
      player.move(
        direction.copy(worldUp).multiplyScalar(animation.delta * helicopter.velocity.y),
        // physics
      );
    }
    if (helicopter.velocity.z) {
      player.move(
        direction.copy(forward).multiplyScalar(animation.delta * helicopter.velocity.z),
        // physics
      );
    }
  }

  resumeAudio() {
    const { helicopter } = this;
    super.resumeAudio();
    helicopter.resumeAudio();
  }

  updateLight(intensity) {
    const { rope } = this;
    super.updateLight(intensity);
    Box.material.color.setHex(0x999933).multiplyScalar(Math.max(intensity, 0.1));
    Ball.material.color.setHex(0x999933).multiplyScalar(Math.max(intensity, 0.1));
    if (rope) {
      Rope.material.color.setHex(0x999933).multiplyScalar(Math.max(intensity, 0.1));
    }
  }
}

export default Ropes;
