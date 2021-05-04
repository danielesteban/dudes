import { Color, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';

class Game extends Gameplay {
  constructor(scene) {
    super(scene, {
      width: 160,
      height: 48,
      depth: 160,
    });

    const color = new Color();
    for (let i = 0, l = this.projectiles.count; i < l; i += 1) {
      this.projectiles.setColorAt(i, (
        color
          .setHex(0x7A5901)
          .offsetHSL(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
          )
          .convertSRGBToLinear()
      ));
    }

    const diffuse = new Color();
    const vertex = new Vector3();
    this.projectiles.onDudeContact = (contact) => {
      if (this.projectiles.destroyOnContact(contact)) {
        const dude = contact.triggerMesh.parent;
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
    };
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
        !isXR ? buttons.primaryDown : hand && buttons.triggerDown
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

export default Game;
