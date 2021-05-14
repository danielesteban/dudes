import { Box3, Color, Quaternion, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';
import Music from '../core/music.js';
import Voxelizer from '../core/voxelizer.js';
import VoxelWorld from '../core/voxels.js';
import Billboard from '../renderables/billboard.js';
import Ball from '../renderables/ball.js';
import Box from '../renderables/box.js';
import Dude from '../renderables/dude.js';
import Helicopter from '../renderables/helicopter.js';
import Rope from '../renderables/rope.js';

class Party extends Gameplay {
  constructor(scene) {
    const buildings = (3 * 3) - 1;
    const dudesPerBuilding = 3;
    const dudesAtParty = 6;
    const explosionOrigin = new Vector3();
    const explosionBrush = {
      color: new Color(),
      noise: 0,
      type: 0,
      shape: VoxelWorld.brushShapes.sphere,
      size: 3,
    };
    const floorNormal = new Vector3(0, -1, 0);

    super(scene, {
      dudes: {
        count: dudesPerBuilding * buildings + dudesAtParty,
        onContact: ({ mesh, triggerMesh: dude, position, normal }) => {
          if (dude.isFalling) {
            if (mesh.isChunk && floorNormal.dot(normal) > 0) {
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
        },
        searchRadius: 10,
        spawn: {
          algorithm: (i) => {
            const { world } = this;
            if (i >= dudesPerBuilding * buildings) {
              const angle = Math.PI * Math.random();
              const dist = 4 + Math.random() * 12;
              const x = world.width * 0.5 + Math.floor(Math.cos(angle) * dist);
              const z = world.depth * 0.5 + Math.floor(Math.sin(angle) * dist);
              const y = world.getHeight(x, z) + 1;
              return [x, y, z];
            }
            let building = Math.floor(i / dudesPerBuilding);
            if (building > 3) building += 1;
            const x = world.width * 0.5 - 60 + Math.floor(building % 3) * 40 + 10 + Math.floor(Math.random() * 21);
            const z = world.depth * 0.5 - 60 + Math.floor(building / 3) * 40 + 10 + Math.floor(Math.random() * 21);
            const y = world.getHeight(x, z) + 1;
            return [x, y, z];
          },
        },
      },
      rainToggle: true,
      world: {
        generation: {
          seed: Math.floor(Math.random() * 2147483647),
          type: 1,
        },
        width: 192,
        height: 128,
        depth: 192,
      },
    });

    this.helicopter = new Helicopter({
      instruments: [
        { id: 'chilling', color: '#966', value: dudesPerBuilding * buildings },
        { id: 'vibing', color: '#696', value: dudesAtParty },
        { id: 'time', color: '#669', value: 0 },
      ],
      sfx: scene.sfx,
      sound: '/sounds/engine.ogg',
    });
    this.player.add(this.helicopter);

    this.dayDuration = 120;
    this.time = 0;

    this.player.cursor.classList.remove('enabled');
    this.player.children[0].position.y = 1.25; // HACK!
    this.player.children[0].rotation.x = Math.PI * -0.1; // HACK!
    this.view = Party.views.firstPerson;
    if (!navigator.userAgent.includes('Quest')) {
      this.updateView(Party.views.thirdPerson);
    }

    this.voxelizer = new Voxelizer({
      maxWidth: 32,
      maxHeight: 32,
      maxDepth: 32,
    });
  }

  onLoad() {
    const { physics, player, voxelizer, world } = this;
    super.onLoad();

    this.partyOrigin = player.position.clone();
    player.move({ x: 0, y: 8, z: 24 });

    const billboardPos = this.partyOrigin
      .clone()
      .divideScalar(world.scale)
      .floor()
      .add({ x: 0, y: 0, z: -17 });
    const billboard = new Billboard({
      x: billboardPos.x * world.scale,
      y: world.getHeight(billboardPos.x, billboardPos.z) * world.scale,
      z: billboardPos.z * world.scale,
    });
    this.add(billboard);

    this.dudes.dudes.forEach((dude) => {
      if (dude.position.y >= this.partyOrigin.y - 1) {
        dude.rotation.y += Math.PI * (0.5 + Math.random());
        dude.minSearchTime = 10;
        dude.maxSearchTime = 20;
        dude.searchTimer = (
          dude.minSearchTime + (dude.maxSearchTime - dude.minSearchTime) * Math.random()
        );
        delete dude.onContact;
        dude.setIdleAction(dude.actions.dance);
        physics.getBody(dude).flags.isTrigger = false;
      }
    });

    {
      const spec = Dude.defaultSpec;
      const height = 2.5;
      const head = 1;
      const legs = 1;
      const torso = 1;
      const waist = 0.5;
      const dude = new Dude({
        colors: {
          primary: (new Color()).setHSL(
            Math.random(),
            0.5 + Math.random() * 0.25,
            0.25 + Math.random() * 0.25
          ),
          secondary: (new Color()).setHSL(
            Math.random(),
            0.5 + Math.random() * 0.25,
            0.5 + Math.random() * 0.25
          ),
          skin: (new Color()).setHSL(
            Math.random(),
            0.5 + Math.random() * 0.25,
            0.25 + Math.random() * 0.5
          ),
        },
        stamina: 1,
        height,
        waist,
        torso: {
          width: spec.torso.width,
          height: spec.torso.height * torso,
          depth: spec.torso.depth * 1.5,
        },
        head: {
          shape: 'box',
          width: spec.head.width,
          height: spec.head.height * head,
          depth: spec.head.depth,
        },
        legs: {
          ...spec.legs,
          height: spec.legs.height * legs,
        },
        arms: {
          ...spec.arms,
          height: spec.arms.height,
        },
        hat: {
          ...spec.hat,
          width: spec.hat.width * 3,
          height: spec.hat.height * 4,
          offsetY: spec.hat.offsetY * 0.5,
        },
      });
      dude.position.copy(this.partyOrigin).add({ x: 0, y: 0, z: -5.75 });
      dude.position.y = (world.getHeight(
        Math.floor(dude.position.x / world.scale),
        Math.floor(dude.position.z / world.scale)
      ) + 1) * world.scale;
      dude.updateMatrixWorld();
      dude.setAction(dude.actions.hype);
      const light = world.getLight(
        Math.floor(dude.position.x / world.scale),
        Math.floor(dude.position.y / world.scale) + 1,
        Math.floor(dude.position.z / world.scale)
      );
      dude.lighting.light = light >> 8;
      dude.lighting.sunlight = light & 0xFF;
      this.mainDude = dude;
      this.add(this.mainDude);
    }

    this.music = new Music(player.head);
    this.music.speakers.forEach((speaker, channel) => {
      speaker.position.copy(this.partyOrigin).add({ x: channel === 0 ? -8 : 8, y: 4, z: -8 });
      this.add(speaker);
    });

    document.getElementById('welcome').classList.add('open');

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

  onUnload() {
    const { music } = this;
    super.onUnload();
    music.dispose();
  }

  onAnimationTick({ animation, camera, isXR }) {
    const { dayDuration, hasLoaded, helicopter, mainDude, view } = this;
    if (!hasLoaded) {
      return;
    }
    this.time += animation.delta;
    const dayTime = (this.time % dayDuration) / dayDuration;
    this.targetLight = 1 - ((dayTime > 0.5 ? 1 - dayTime : dayTime) * 2);
    super.onAnimationTick({ animation, camera, isXR });
    helicopter.instruments.setValue(
      'time',
      `${`${Math.floor(this.time / 60)}`.padStart(2, '0')}:${`${Math.floor(this.time % 60)}`.padStart(2, '0')}`
    );
    helicopter.animate(animation);
    if (view === Party.views.thirdPerson) {
      helicopter.instruments.position.copy(helicopter.aux.pivot.set(0, -1, 0.5).unproject(camera));
      camera.getWorldQuaternion(helicopter.instruments.quaternion);
      helicopter.instruments.updateMatrix();
    }
    mainDude.animate(animation);
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
      physics,
      player,
      view,
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

    if (view !== Party.views.party) {
      player.getWorldDirection(forward);
      helicopter.localToWorld(pivot.copy(helicopter.cockpit.position).add({ x: 0, y: 0.5, z: 0.5 }));
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

    const { views } = Party;
    if (player.desktop.buttons.viewDown) {
      let next;
      if (view === views.firstPerson) {
        next = views.thirdPerson;
      } else if (view === views.thirdPerson) {
        next = views.party;
      } else {
        next = views.firstPerson;
      }
      this.updateView(next);
    }
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
      dude.minSearchTime = 10;
      dude.maxSearchTime = 20;
      dude.setIdleAction(dude.actions.dance);
      instruments.setValue('chilling', instruments.getValue('chilling') - 1);
      instruments.setValue('vibing', instruments.getValue('vibing') + 1);
    }
    dude.setAction(dude.idleAction);
    physics.addMesh(dude, { isKinematic: true, isTrigger: !!dude.onContact });
  }

  resumeAudio() {
    const { helicopter, music } = this;
    super.resumeAudio();
    helicopter.resumeAudio();
    if (music) {
      music.resume();
    }
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
    const { helicopter, partyOrigin, player } = this;
    const { views } = Party;
    if (view === this.view) {
      return;
    }
    const { instruments } = helicopter;
    player.children[0].position.y = view === views.firstPerson ? 1.25 : 1.6; // HACK!
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
        y: partyOrigin.y + 0.5 - player.position.y,
        z: partyOrigin.z + 4.5 - player.position.z,
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

Party.views = {
  firstPerson: 0,
  thirdPerson: 1,
  party: 2,
};

export default Party;
