import { Color, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';

class Poop extends Gameplay {
  constructor(scene) {
    const diffuse = new Color();
    const vertex = new Vector3();

    super(scene, {
      dudes: {
        onContact: (contact) => {
          if (this.projectiles.destroyOnContact(contact)) {
            const dude = contact.triggerMesh;
            this.projectiles.getColorAt(contact.instance, diffuse);
            const color = dude.geometry.getAttribute('color');
            const position = dude.geometry.getAttribute('position');
            const skinIndex = dude.geometry.getAttribute('skinIndex');
            for (let i = 0, l = position.count; i < l; i += 1) {
              vertex.fromBufferAttribute(position, i).applyMatrix4(
                dude.skeleton.bones[skinIndex.getX(i)].matrixWorld
              );
              if (vertex.distanceTo(contact.position) <= 0.5) {
                const n = 1 - Math.random() * 0.15;
                color.setXYZ(i, diffuse.r * n, diffuse.g * n, diffuse.b * n);
              }
            }
            color.needsUpdate = true;
            dude.onHit();
          }
        },
      },
      projectiles: true,
      lightToggle: true,
      rainToggle: true,
      world: {
        width: 256,
        height: 96,
        depth: 256,
      },
    });

    for (let i = 0, l = this.projectiles.count; i < l; i += 1) {
      this.projectiles.setColorAt(i, (
        diffuse
          .setHex(0x7A5901)
          .offsetHSL(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
          )
          .convertSRGBToLinear()
      ));
    }
  }

  onAnimationTick({ animation, camera, isXR }) {
    if (!this.hasLoaded) {
      return;
    }
    super.onAnimationTick({ animation, camera, isXR });
    const {
      player,
    } = this;
    (isXR ? player.controllers : [player.desktop]).forEach(({
      buttons,
      hand,
      raycaster,
    }) => {
      if (
        !isXR ? (buttons.primaryDown || buttons.tertiaryDown) : hand && buttons.triggerDown
      ) {
        const { origin, direction } = raycaster.ray;
        const position = origin
          .clone()
          .addScaledVector(direction, 0.5);
        const impulse = direction.clone().multiplyScalar(24);
        this.spawnProjectile(position, impulse);
      }
    });
  }
}

Poop.showInMenu = 'Poop tech';

export default Poop;
