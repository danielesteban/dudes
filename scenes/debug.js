import { Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';

class Debug extends Gameplay {
  constructor(world) {
    super(world);
    this.projectiles.onColliderContact = (contact) => {
      if (this.projectiles.destroyOnContact(contact)) {
        this.update({
          brush: {
            ...this.brush,
            type: 0,
            shape: Gameplay.brushShapes.sphere,
            size: 3,
          },
          voxel: (new Vector3()).copy(contact.position)
            .divideScalar(this.worldScale)
            .addScaledVector(contact.normal, 0.5 * this.worldScale)
            .floor(),
        });
      }
    };
    this.projectiles.onDudeContact = (contact) => {
      if (this.projectiles.destroyOnContact(contact)) {
        contact.triggerMesh.parent.onHit();
      }
    };
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
      brush,
      dudes,
      hasLoaded,
      physics,
      player,
      plops,
      worldScale: scale,
    } = this;
    if (!hasLoaded) {
      return;
    }
    super.onAnimationTick({ animation, camera, isXR });
    if (!isXR) {
      const { buttons, raycaster } = player.desktop;
      if (dudes.selected && buttons.primaryDown) {
        const hit = physics.raycast(raycaster.ray.origin, raycaster.ray.direction);
        if (!hit) {
          return;
        }
        dudes.setDestination(
          dudes.selected,
          hit.point
            .divideScalar(scale)
            .addScaledVector(hit.normal, 0.25)
            .floor()
        );
      }
      if (buttons.secondaryDown) {
        const hit = physics.raycast(raycaster.ray.origin, raycaster.ray.direction, 4);
        if (hit) {
          dudes.select(hit.object.parent);
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
      if (isXR && hand) {
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
        hand && pointer.visible && hand.handedness === 'right' && buttons.primaryDown
      ) : (
        buttons.primaryDown
      );
      const isRemoving = isXR ? (
        hand && pointer.visible && hand.handedness === 'left' && buttons.primaryDown
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
        this.update({
          brush: {
            ...brush,
            ...(isRemoving ? { type: 0 } : {}),
          },
          voxel: hit.point
            .divideScalar(scale)
            .addScaledVector(hit.normal, isRemoving ? -0.25 : 0.25)
            .floor(),
        });
      }
    });
  }
}

export default Debug;
