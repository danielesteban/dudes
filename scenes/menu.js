import Gameplay from '../core/gameplay.js';
import Billboard from '../renderables/billboard.js';
import UI from '../renderables/ui.js';

class Menu extends Gameplay {
  constructor(scene) {
    super(scene, {
      lightToggle: true,
      world: {
        width: 256,
        height: 96,
        depth: 256,
        seed: 123456,
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
      .add({ x: -9, y: 0, z: -13 });
    const billboard = new Billboard({
      x: billboardPos.x * world.scale,
      y: world.getHeight(billboardPos.x, billboardPos.z) * world.scale,
      z: billboardPos.z * world.scale,
    });
    this.add(billboard);

    billboardPos.x += 18;
    const buttons = [
      { route: '/sculpt', title: 'DudeBrush VR' },
      { route: '/party', title: 'Party' },
      { route: '/heli', title: 'Helicopter gameplay' },
      { route: '/pit', title: 'Pit worldgen' },
      { route: '/poop', title: 'Poop tech' },
      { route: '/debug', title: 'Engine debug' },
    ];
    const buttonHeight = (300 - 40) / buttons.length - 5;
    this.ui = new UI({
      position: {
        x: billboardPos.x * world.scale,
        y: world.getHeight(billboardPos.x, billboardPos.z) * world.scale - 2,
        z: billboardPos.z * world.scale + 0.125,
      },
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
        x: 50,
        y: 20 + (buttonHeight + 5) * (i + 0.5),
        font: '700 36px monospace',
        color: '#999',
        text: `${i + 1}`.padStart(2, '0'),
      })),
      styles: {
        font: '700 18px monospace',
        button: {
          hover: {
            textShadow: {
              blur: 4,
              color: 'rgba(0, 0, 0, .4)',
            },
          },
        },
      },
    });
    this.add(this.ui);

    this.updateRain(true);

    document.getElementById('welcome').classList.add('open');
  }

  onAnimationTick({ animation, camera, isXR }) {
    const { hasLoaded, player, ui } = this;
    if (!hasLoaded) {
      return;
    }
    super.onAnimationTick({ animation, camera, isXR });
    (isXR ? player.controllers : [player.desktop]).forEach(({
      buttons,
      hand,
      isLocked,
      pointer,
      raycaster,
    }) => {
      if ((isXR && !hand) || (!isXR && !isLocked)) {
        return;
      }
      const hit = raycaster.intersectObject(ui)[0] || false;
      if (!hit) {
        ui.resetHover();
        return;
      }
      if (isXR) {
        pointer.update({
          distance: hit.distance,
          origin: raycaster.ray.origin,
        });
      }
      hit.object.onPointer({
        isHover: isXR ? (
          !buttons.triggerDown
        ) : (
          !buttons.primaryDown && !buttons.tertiaryDown
        ),
        point: hit.point,
      });
    });
  }
}

export default Menu;
