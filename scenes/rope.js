import { Color, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';
import VoxelWorld from '../core/voxels.js';
import Voxelizer from '../core/voxelizer.js';
import Ball from '../renderables/ball.js';
import Billboard from '../renderables/billboard.js';
import Box from '../renderables/box.js';
import Helicopter from '../renderables/helicopter.js';
import Rope from '../renderables/rope.js';

class Ropes extends Gameplay {
  constructor(scene, options) {
    super(scene, {
      generation: {
        seed: Math.floor(Math.random() * 2147483647),
        type: 1,
      },
      width: 256,
      height: 128,
      depth: 256,
    });

    this.helicopter = new Helicopter({
      sfx: scene.sfx,
      sound: '/sounds/engine.ogg',
    });
    this.player.add(this.helicopter);
    this.player.children[0].position.y = 1.25; // HACK!
    this.player.cursor.classList.remove('enabled');
    this.view = Ropes.views.firstPerson;
    if (options.view === 'thirdpersonhack') {
      // Legacy sponsors link
      this.updateView(Ropes.views.thirdPerson);
    }
    this.voxelizer = new Voxelizer({
      maxWidth: 32,
      maxHeight: 32,
      maxDepth: 32,
    });

    const explosionOrigin = new Vector3();
    const explosionBrush = {
      color: new Color(),
      noise: 0,
      type: 0,
      shape: VoxelWorld.brushShapes.sphere,
      size: 3,
    };
    this.projectiles.onDudeContact = ({ mesh, triggerMesh: dude, position }) => {
      if (dude.isFalling) {
        if (mesh.isChunk) {
          this.spawnExplosion(position, dude.marker.material.color);
          this.resetDude(dude, position);
        }
        return;
      }
      if (!mesh.isHook || mesh.hookedDude) {
        return;
      }
      this.spawnExplosion(position, mesh.material.color);
      this.updateVoxel(
        explosionBrush,
        explosionOrigin
          .copy(position)
          .divideScalar(this.world.scale)
          .floor()
      );
      this.hookDude(dude, mesh);
    };
  }

  onLoad() {
    const { physics, player, voxelizer, world } = this;
    super.onLoad();
    const billboardPos = player.position
      .clone()
      .divideScalar(world.scale)
      .floor()
      .add({ x: 0, y: 0, z: -31 });
    this.billboard = new Billboard({
      x: billboardPos.x * world.scale,
      y: world.heightmap.view[billboardPos.z * world.width + billboardPos.x] * world.scale,
      z: billboardPos.z * world.scale,
    });
    player.move({ x: 0.5, y: 8, z: 32 });
    this.add(this.billboard);
    this.helicopter.voxelize(voxelizer)
      .then(() => {
        this.hooks = [-0.625, 0.625].map((x) => {
          const anchor = new Box(0.25, 0.5, 0.25);
          anchor.position.set(x, 0.75, 0.75);
          anchor.visible = false;
          const ball = new Ball();
          ball.isHook = true;
          const options = {
            anchorA: ball,
            anchorB: anchor,
            length: 10,
            segments: 12,
          };
          this.helicopter.add(anchor);
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
          return ball;
        });
        this.updateLight(this.light);
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
    let unhookDudes;
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
      unhookDudes = controllerL.buttons.triggerDown || controllerR.buttons.triggerDown;
    } else {
      movement.copy(player.desktop.keyboard);
      unhookDudes = player.desktop.buttons.primaryDown || player.desktop.buttons.tertiaryDown;
    }
    player.getWorldDirection(forward);
    if (
      (forward.y > -0.3 || movement.z > 0) && (forward.y < 0.3 || movement.z < 0)
      && (movement.x !== 0 || movement.z !== 0)
    ) {
      right.crossVectors(worldUp, forward);
      helicopter.localToWorld(pivot.copy(helicopter.cockpit.position).add({ x: 0, y: 0.5, z: 0.5 }));
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
    if (unhookDudes) {
      this.unhookDudes();
    }
    if (player.desktop.buttons.viewDown) {
      const { views } = Ropes;
      this.updateView(
        this.view === views.firstPerson ? views.thirdPerson : views.firstPerson
      );
    }
  }

  hookDude(dude, hook) {
    const { physics } = this;
    delete dude.path;
    dude.searchEnabled = false;
    dude.position.copy(hook.position).add({ x: 0, y: -0.3 - dude.physics[0].height, z: 0 });
    dude.skeleton.bones[dude.constructor.bones.head].rotation.set(0, 0, 0);
    dude.setAction(dude.actions.fly);
    physics.removeMesh(dude);
    physics.addMesh(dude, { mass: 1 });
    dude.constraint = physics.addConstraint(hook, 0, {
      type: 'p2p',
      mesh: dude,
      pivotInA: { x: 0, y: -0.3, z: 0 },
      pivotInB: { x: 0, y: dude.physics[0].height, z: 0 },
    });
    hook.hookedDude = dude;
  }

  unhookDudes() {
    const { hooks, physics } = this;
    hooks.forEach((hook) => {
      if (!hook.hookedDude) {
        return;
      }
      const { hookedDude: dude } = hook;
      delete hook.hookedDude;
      physics.removeConstraint(dude.constraint);
      delete dude.constraint;
      dude.isFalling = true;
      physics.getBody(dude).flags.isTrigger = true;
    });
  }

  resetDude(dude, contact) {
    const { physics } = this;
    dude.isFalling = false;
    dude.searchEnabled = true;
    dude.searchTimer = Math.random();
    dude.position.copy(contact);
    dude.position.y = Math.round(dude.position.y);
    dude.rotation.set(0, 0, 0);
    dude.updateMatrixWorld();
    dude.setAction(dude.actions.idle);
    physics.removeMesh(dude);
    physics.addMesh(dude, { isKinematic: true, isTrigger: true });
  }

  resumeAudio() {
    const { helicopter } = this;
    super.resumeAudio();
    helicopter.resumeAudio();
  }

  updateLight(intensity) {
    const { rope } = this;
    super.updateLight(intensity);
    if (!rope) {
      return;
    }
    Ball.material.color.setHex(0x999933).multiplyScalar(Math.max(intensity, 0.1));
    Rope.material.uniforms.diffuse.value.setHex(0x999933).multiplyScalar(Math.max(intensity, 0.1));
  }

  updateView(view) {
    const { helicopter, player } = this;
    const { views } = Ropes;
    if (view === this.view) {
      return;
    }
    const { aux: { pivot: offset } } = helicopter;
    offset.set(1.25, 1.5, 5);
    if (view === views.thirdPerson) {
      offset.negate();
    }
    helicopter.position.add(offset);
    player.move(offset.applyQuaternion(player.quaternion).negate());
    this.view = view;
  }
}

Ropes.views = {
  firstPerson: 0,
  thirdPerson: 1,
};

export default Ropes;
