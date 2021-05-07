import { Color, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';
import VoxelWorld from '../core/voxels.js';
import Billboard from '../renderables/billboard.js';

class Debug extends Gameplay {
  constructor(scene) {
    super(scene, {
      width: 400,
      height: 96,
      depth: 400,
      seed: 970297029704,
    });
    const explosionOrigin = new Vector3();
    const explosionBrush = {
      color: new Color(),
      noise: 0,
      type: 0,
      shape: VoxelWorld.brushShapes.sphere,
      size: 3,
    };
    this.projectiles.onColliderContact = (contact) => {
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
    };
    this.projectiles.onDudeContact = (contact) => {
      if (this.projectiles.destroyOnContact(contact)) {
        contact.triggerMesh.onHit();
      }
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
    const { world, player } = this;
    super.onLoad();
    const billboardPos = player.position
      .clone()
      .divideScalar(world.scale)
      .floor()
      .add({ x: 0, y: 0, z: -23 });
    this.billboard = new Billboard({
      x: billboardPos.x * world.scale,
      y: world.heightmap.view[billboardPos.z * world.width + billboardPos.x] * world.scale,
      z: billboardPos.z * world.scale,
    });
    this.add(this.billboard);
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
      billboard,
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
    billboard.animate(animation);
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
          // This should prolly be in a "deslect" method in the Dudes class
          dudes.selected.remove(dudes.selectionMarker);
          delete dudes.selected;
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
        if (pointer.visible) {
          return;
        }
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
        world.brush.color.setRGB(Math.random(), Math.random(), Math.random());
        this.updateVoxel(
          {
            ...world.brush,
            ...(isRemoving ? { type: 0 } : {}),
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
