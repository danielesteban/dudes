import Gameplay from '../core/gameplay.js';
import Billboard from '../renderables/billboard.js';
import UI from '../renderables/ui.js';

class Menu extends Gameplay {
  constructor(scene) {
    super(scene, {
      lightToggle: true,
      rainToggle: true,
      world: {
        width: 256,
        height: 96,
        depth: 256,
        seed: 4321,
        generator: 'menu',
      },
    });
    this.router = scene.router;
  }

  onLoad() {
    const { player, router, world } = this;
    super.onLoad();

    const billboardPos = player.position
      .clone()
      .divideScalar(world.scale)
      .floor()
      .add({ x: -10, y: 0, z: -14 });
    const billboard = new Billboard({
      x: billboardPos.x * world.scale,
      y: world.getHeight(billboardPos.x, billboardPos.z) * world.scale,
      z: billboardPos.z * world.scale,
    });
    this.add(billboard);

    billboardPos.x += 20;
    const buttons = [
      { route: '/heli', title: 'Helicopter gameplay' },
      { route: '/party', title: 'Party' },
      { route: '/poop', title: 'Poop tech' },
      { route: '/debug', title: 'Engine debug' },
    ];
    const buttonHeight = (300 - 40) / buttons.length - 5;
    this.ui = new UI({
      width: 6,
      height: 4,
      textureWidth: 450,
      textureHeight: 300,
      buttons: buttons.map(({ route, title }, i) => ({
        x: 20,
        y: 20 + (buttonHeight + 5) * i,
        width: 410,
        height: buttonHeight,
        label: title,
        onPointer: () => router.push(route),
      })),
      labels: buttons.map((v, i) => ({
        x: 20 + (buttonHeight + 5) * 0.5,
        y: 20 + (buttonHeight + 5) * (i + 0.5),
        font: '700 36px monospace',
        color: '#666',
        text: `${i + 1}`.padStart(2, '0'),
      })),
      styles: {
        font: '700 18px monospace',
      },
      origin: {
        x: billboardPos.x * world.scale,
        y: world.getHeight(billboardPos.x, billboardPos.z) * world.scale - 2,
        z: billboardPos.z * world.scale + 0.125,
      },
    });
    this.add(this.ui);

    document.getElementById('welcome').classList.add('open');
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
      pointer,
      raycaster,
    }) => {
      if (isXR && hand) {
        const hit = raycaster.intersectObject(this.ui)[0] || false;
        if (hit) {
          pointer.update({
            distance: hit.distance,
            origin: raycaster.ray.origin,
            target: hit,
          });
        }
      }
      if (
        isXR ? (hand && buttons.triggerDown) : (buttons.primaryDown || buttons.tertiaryDown)
      ) {
        const hit = isXR ? pointer.target : (
          raycaster.intersectObject(this.ui)[0]
        );
        if (hit) {
          hit.object.onPointer(hit.point);
        }
      }
    });
  }
}

export default Menu;
