import { Box3, Color, Quaternion, Vector3 } from '../vendor/three.js';
import Voxelizer from '../core/voxelizer.js';
import VoxelWorld from '../core/voxels.js';
import Ball from '../renderables/ball.js';
import Box from '../renderables/box.js';
import Helicopter from '../renderables/helicopter.js';
import Rope from '../renderables/rope.js';
import Party from './party.js';

class HeliParty extends Party {
  constructor(scene) {
    const dudesAtParty = 6;
    const dudesPerBuilding = 3;
    const explosionBrush = {
      color: new Color(),
      noise: 0,
      type: 0,
      shape: VoxelWorld.brushShapes.sphere,
      size: 3,
    };
    const explosionOrigin = new Vector3();
    const floorNormal = new Vector3(0, -1, 0);

    super(scene, {
      dudesAtParty,
      dudesPerBuilding,
      onDudesContact: ({ mesh, triggerMesh: dude, position, normal }) => {
        if (dude.isFalling) {
          if (mesh.isChunk && floorNormal.dot(normal) > 0) {
            this.spawnExplosion(position, dude.color);
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
      },
    });
    this.thumbsDown.enabled = false;
    this.time = 0;

    this.helicopter = new Helicopter({
      instruments: [
        { id: 'chilling', color: '#966', value: dudesPerBuilding * 8 },
        { id: 'vibing', color: '#696', value: dudesAtParty },
        { id: 'time', color: '#669', value: 0 },
      ],
      sfx: scene.sfx,
      sound: '/sounds/engine.ogg',
    });

    this.voxelizer = new Voxelizer({
      maxWidth: 32,
      maxHeight: 32,
      maxDepth: 32,
    });

    this.player.add(this.helicopter);
    this.player.desktop.camera.rotation.x = Math.PI * -0.1; // HACK!
    this.view = HeliParty.views.firstPerson;
    this.updateView(HeliParty.views.thirdPerson);
  }

  onLoad() {
    const { physics, player, voxelizer } = this;
    super.onLoad();
    player.move({ x: 0, y: 8, z: 24 });
    this.helicopter.voxelize(voxelizer)
      .then(() => {
        this.helicopter.cockpit.children.forEach(({ collider }) => {
          if (collider) {
            collider.updateWorldMatrix(true, false);
            physics.addMesh(collider, { isKinematic: true });
          }
        });
        this.hooks = [-0.625, 0.625].map((x) => {
          const anchor = new Box(0.25, 0.5, 0.25);
          anchor.position.set(x, 0.625, 1.125);
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
          physics.addMesh(anchor, { isKinematic: true });
          physics.addMesh(ball, { mass: 10, angularFactor: { x: 0, y: 0, z: 0 }, disableDeactivation: true });
          physics.addRope(rope, options);
          this.add(ball);
          this.add(rope);
          return ball;
        });
        this.updateLights(this.lights.light.state, this.lights.sunlight.state);
        const box = new Box3();
        box.setFromObject(this.helicopter);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());
        this.helicopter.collider = {
          shape: 'box',
          width: size.x,
          height: size.y,
          depth: size.z,
          origin: center.sub(this.helicopter.getWorldPosition(size)),
          position: new Vector3(),
          rotation: new Quaternion(),
        };
      });
  }

  onAnimationTick({ animation, camera, isXR }) {
    const { hasLoaded, helicopter, view } = this;
    if (!hasLoaded) {
      return;
    }
    super.onAnimationTick({ animation, camera, isXR });
    helicopter.instruments.setValue(
      'time',
      `${`${Math.floor(this.time / 60)}`.padStart(2, '0')}:${`${Math.floor(this.time % 60)}`.padStart(2, '0')}`
    );
    helicopter.animate(animation);
    if (view === HeliParty.views.thirdPerson) {
      helicopter.instruments.position.copy(helicopter.aux.pivot.set(0, -1, 0.5).unproject(camera));
      camera.getWorldQuaternion(helicopter.instruments.quaternion);
      helicopter.instruments.updateMatrix();
    }
  }

  onLocomotionTick({ animation, camera, isXR }) {
    const {
      hasLoaded,
      helicopter,
      physics,
      player,
      view,
    } = this;
    if (!hasLoaded || !helicopter.cockpit) {
      return;
    }
    const { pivot, movement } = helicopter.aux;
    const {
      vectorA: direction,
      vectorB: right,
      vectorC: forward,
      worldUp,
    } = player.aux;
    let switchView;
    let unhookDudes;
    if (isXR) {
      const controllerL = player.controllers.find(({ hand }) => hand && hand.handedness === 'left');
      const controllerR = player.controllers.find(({ hand }) => hand && hand.handedness === 'right');
      if (!controllerL || !controllerR) {
        return;
      }
      movement.set(
        controllerR.joystick.x,
        controllerL.joystick.y,
        -controllerR.joystick.y
      );
      switchView = controllerL.buttons.primaryDown || controllerR.buttons.primaryDown;
      unhookDudes = controllerL.buttons.triggerDown || controllerR.buttons.triggerDown;
    } else {
      if (!player.desktop.isLocked) {
        return;
      }
      movement.copy(player.desktop.keyboard);
      switchView = player.desktop.buttons.viewDown;
      unhookDudes = player.desktop.buttons.primaryDown || player.desktop.buttons.tertiaryDown;
    }

    if (view === HeliParty.views.party) {
      super.onLocomotionTick({ animation, camera, isXR });
    } else {
      player.getWorldDirection(forward);
      helicopter.localToWorld(pivot.set(0, 2.5, 1.25));
      if (
        (movement.z < 0 && forward.y > -0.3)
        || (movement.z > 0 && forward.y < 0.3)
      ) {
        right.crossVectors(worldUp, forward);
        player.rotate(right, movement.z * animation.delta * -0.125, pivot);
      }
      if (movement.x !== 0) {
        player.rotate(worldUp, movement.x * animation.delta * -0.3, pivot);
      }
      helicopter.acceleration.z = -forward.y * 0.5;
      helicopter.velocity.z = helicopter.velocity.z * 0.95 + helicopter.acceleration.z;
      forward.y = 0;
      forward.normalize();
      helicopter.acceleration.y = movement.y * 0.5;
      helicopter.velocity.y = helicopter.velocity.y * 0.8 + helicopter.acceleration.y;
      if (helicopter.velocity.y !== 0) {
        helicopter.localToWorld(helicopter.collider.position.copy(helicopter.collider.origin));
        helicopter.getWorldQuaternion(helicopter.collider.rotation);
        player.move(
          direction.copy(worldUp).multiplyScalar(animation.delta * helicopter.velocity.y),
          physics,
          helicopter.collider
        );
      }
      if (helicopter.velocity.z !== 0) {
        helicopter.localToWorld(helicopter.collider.position.copy(helicopter.collider.origin));
        helicopter.getWorldQuaternion(helicopter.collider.rotation);
        player.move(
          direction.copy(forward).multiplyScalar(animation.delta * helicopter.velocity.z),
          physics,
          helicopter.collider
        );
      }
    }

    if (unhookDudes) {
      this.unhookDudes();
    }

    const { views } = HeliParty;
    if (switchView) {
      let next;
      if (view === views.firstPerson) {
        next = isXR ? views.party : views.thirdPerson;
      } else if (view === views.thirdPerson) {
        next = views.party;
      } else {
        next = views.firstPerson;
      }
      this.updateView(next);
    }
  }

  onUnload() {
    const { helicopter, player } = this;
    super.onUnload();
    player.remove(helicopter);
  }

  onXR() {
    this.updateView(HeliParty.views.firstPerson);
  }

  hookDude(dude, hook) {
    const { physics } = this;
    delete dude.path;
    delete dude.revaluate;
    dude.searchEnabled = false;
    dude.position.copy(hook.position).add({ x: 0, y: -0.3 - dude.physics[0].height, z: 0 });
    dude.skeleton.bones[dude.constructor.bones.head].rotation.set(0, 0, 0);
    dude.lighting.light = 0;
    dude.lighting.sunlight = 0xFF;
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
    const { helicopter: { instruments }, partyOrigin, physics, world } = this;
    dude.isFalling = false;
    dude.searchEnabled = true;
    dude.searchTimer = Math.random();
    dude.position.copy(contact);
    dude.position.y = Math.round(dude.position.y);
    dude.rotation.set(0, 0, 0);
    dude.updateMatrixWorld();
    const light = world.getLight(
      Math.floor(dude.position.x / world.scale),
      Math.floor(dude.position.y / world.scale) + 1,
      Math.floor(dude.position.z / world.scale)
    );
    dude.lighting.light = light >> 8;
    dude.lighting.sunlight = light & 0xFF;
    physics.removeMesh(dude);
    if (dude.position.y >= partyOrigin.y - 1) {
      delete dude.onContact;
      dude.minSearchTime = 5;
      dude.maxSearchTime = 20;
      dude.searchTimer = dude.maxSearchTime * Math.random();
      const moves = [dude.actions.danceA, dude.actions.danceB, dude.actions.danceC];
      dude.onDestination = () => dude.setIdleAction(
        moves[Math.floor(Math.random() * moves.length)]
      );
      dude.onDestination();
      instruments.setValue('chilling', instruments.getValue('chilling') - 1);
      instruments.setValue('vibing', instruments.getValue('vibing') + 1);
    }
    dude.setAction(dude.idleAction);
    physics.addMesh(dude, { isKinematic: true, isTrigger: !!dude.onContact });
  }

  resumeAudio() {
    const { helicopter } = this;
    super.resumeAudio();
    helicopter.resumeAudio();
  }

  updateLights(light, sunlight) {
    const { hooks } = this;
    super.updateLights(light, sunlight);
    if (!hooks) {
      return;
    }
    Ball.material.color.setHex(0x999933).multiplyScalar(Math.max(sunlight, 0.1));
    Rope.material.uniforms.diffuse.value.setHex(0x999933).multiplyScalar(Math.max(sunlight, 0.1));
  }

  updateView(view) {
    const { helicopter, partyOrigin, player } = this;
    const { views } = HeliParty;
    if (view === this.view) {
      return;
    }
    const { instruments } = helicopter;
    player.desktop.camera.position.y = view === views.firstPerson ? 1.25 : 1.6; // HACK!
    if (view === views.thirdPerson) {
      instruments.scale.setScalar(0.25);
      this.add(instruments);
    } else {
      instruments.position.copy(instruments.origin);
      instruments.rotation.set(0, 0, 0);
      instruments.scale.setScalar(1);
      helicopter.add(instruments);
    }
    instruments.updateMatrix();
    if (this.view === views.party) {
      // HACK!
      player.move({
        x: helicopter.position.x - player.position.x,
        y: helicopter.position.y - player.position.y,
        z: helicopter.position.z - player.position.z,
      });
      player.updateMatrixWorld();
      player.worldToLocal(helicopter.position);
      player.quaternion.copy(helicopter.quaternion);
      player.add(helicopter);
      helicopter.rotation.set(0, 0, 0);
      this.view = views.firstPerson;
      return;
    }
    if (view === views.party) {
      // HACK Again!
      helicopter.getWorldPosition(helicopter.position);
      helicopter.getWorldQuaternion(helicopter.quaternion);
      this.add(helicopter);
      player.move({
        x: partyOrigin.x - player.position.x,
        y: partyOrigin.y + 2 - player.position.y,
        z: partyOrigin.z + 8.5 - player.position.z,
      });
      player.rotation.set(0, 0, 0);
      this.view = views.party;
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

HeliParty.views = {
  firstPerson: 0,
  thirdPerson: 1,
  party: 2,
};

export default HeliParty;
