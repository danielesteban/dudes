import { Color, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';
import VoxelWorld from '../core/voxels.js';
import Billboard from '../renderables/billboard.js';

class Debug extends Gameplay {
  constructor(scene, options) {
    const explosionBrush = {
      color: new Color(),
      noise: 0,
      type: 0,
      shape: VoxelWorld.brushShapes.sphere,
      size: 3,
    };
    const explosionOrigin = new Vector3();

    super(scene, {
      dudes: {
        onContact: (contact) => {
          if (this.projectiles.destroyOnContact(contact)) {
            contact.triggerMesh.onHit();
          }
        },
        ...(options && options.dudes ? { ...options.dudes } : {}),
      },
      projectiles: true,
      lightToggle: true,
      rainToggle: true,
      world: {
        width: 400,
        height: 96,
        depth: 400,
        generator: 'debugCity',
        seed: 987654321,
        onContact: (contact) => {
          if (this.projectiles.destroyOnContact(contact)) {
            this.updateVoxel(
              explosionBrush,
              explosionOrigin
                .copy(contact.position)
                .divideScalar(this.world.scale)
                .addScaledVector(contact.normal, 0.5 * this.world.scale)
                .floor()
            );
          }
        },
        ...(options && options.world ? { ...options.world } : {}),
      },
    });

    this.brush = {
      color: new Color(),
      noise: 0.15,
      type: 3,
      shape: VoxelWorld.brushShapes.box,
      size: 1,
    };

    Promise.all([...Array(5)].map(() => (
      scene.sfx.load('/sounds/plop.ogg')
        .then((sound) => {
          sound.filter = sound.context.createBiquadFilter();
          sound.setFilter(sound.filter);
          sound.setRefDistance(8);
          this.add(sound);
          return sound;
        })
    ))).then((sfx) => { this.plops = sfx; });
  }

  onLoad() {
    const { player, world } = this;
    super.onLoad();
    const billboardPos = player.position
      .clone()
      .divideScalar(world.scale)
      .floor()
      .add({ x: 0, y: 0, z: -31 });
    const billboard = new Billboard({
      x: billboardPos.x * world.scale,
      y: world.getHeight(billboardPos.x, billboardPos.z) * world.scale,
      z: billboardPos.z * world.scale,
    });
    this.add(billboard);
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
      brush,
      dudes,
      hasLoaded,
      physics,
      player,
      plops,
      world,
    } = this;
    if (!hasLoaded) {
      return;
    }
    super.onAnimationTick({ animation, camera, isXR });
    if (!isXR) {
      const { buttons, raycaster } = player.desktop;
      if (dudes.selected && buttons.primaryDown) {
        const hit = physics.raycast(raycaster.ray.origin, raycaster.ray.direction);
        if (hit) {
          dudes.setDestination(
            dudes.selected,
            hit.point
              .divideScalar(world.scale)
              .addScaledVector(hit.normal, 0.25)
              .floor()
          );
          return;
        }
      }
      if (buttons.secondaryDown) {
        const hit = physics.raycast(raycaster.ray.origin, raycaster.ray.direction, 4);
        if (hit) {
          dudes.select(hit.object);
          return;
        }
        if (dudes.selected) {
          dudes.unselect();
          return;
        }
      }
    }
    (isXR ? player.controllers : [player.desktop]).forEach(({
      buttons,
      hand,
      pointer,
      raycaster,
    }) => {
      if (
        isXR ? (
          hand && buttons.triggerDown
        ) : (
          buttons.tertiaryDown
        )
      ) {
        const { origin, direction } = raycaster.ray;
        const position = origin
          .clone()
          .addScaledVector(direction, 0.5);
        const impulse = direction.clone().multiplyScalar(24);
        this.spawnProjectile(position, impulse);
        return;
      }
      if (isXR && hand && (buttons.primary || buttons.primaryUp)) {
        const hit = physics.raycast(raycaster.ray.origin, raycaster.ray.direction);
        if (hit) {
          pointer.update({
            distance: hit.distance,
            origin: raycaster.ray.origin,
            target: hit,
          });
        }
      }
      const isPlacing = isXR ? (
        hand && pointer.visible && hand.handedness === 'right' && buttons.primaryUp
      ) : (
        buttons.primaryDown
      );
      const isRemoving = isXR ? (
        hand && pointer.visible && hand.handedness === 'left' && buttons.primaryUp
      ) : (
        buttons.secondaryDown
      );
      if (isPlacing || isRemoving) {
        const hit = isXR ? pointer.target : (
          physics.raycast(raycaster.ray.origin, raycaster.ray.direction)
        );
        if (!hit) {
          return;
        }
        if (plops) {
          const sound = plops.find(({ isPlaying }) => (!isPlaying));
          if (sound && sound.context.state === 'running') {
            sound.filter.type = isRemoving ? 'highpass' : 'lowpass';
            sound.filter.frequency.value = (Math.random() + 0.5) * 1000;
            sound.position.copy(hit.point);
            sound.play();
          }
        }
        brush.color.setRGB(Math.random(), Math.random(), Math.random());
        this.updateVoxel(
          {
            ...brush,
            type: isRemoving ? 0 : brush.type,
          },
          hit.point
            .divideScalar(world.scale)
            .addScaledVector(hit.normal, isRemoving ? -0.25 : 0.25)
            .floor()
        );
      }
    });
  }
}

export default Debug;
