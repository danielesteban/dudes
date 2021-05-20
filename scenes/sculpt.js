import { Euler, Group, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';
import Brush from '../renderables/brush.js';
import ColorPicker from '../renderables/colorpicker.js';
import Lighting from '../renderables/lighting.js';

class Sculpt extends Gameplay {
  constructor(scene) {
    super(scene, {
      ambient: {
        range: { from: 0, to: 128 },
        sounds: [
          {
            url: '/sounds/forest.ogg',
            from: -0.5,
            to: 1.5,
          },
        ],
      },
      dudes: {
        count: 0,
      },
      physics: false,
      world: {
        width: 128,
        height: 64,
        depth: 128,
        generator: 'blank',
        scale: 0.03125,
        seaLevel: 0,
      },
    });
    this.lights.light.target = 1;

    this.voxel = new Vector3();
    this.lastVoxels = [new Vector3(), new Vector3()];

    this.brush = new Brush({
      position: new Vector3(-0.05, -0.02, 0.02),
      rotation: new Euler(0, Math.PI / -3, 0),
      width: 0.2,
      height: 0.2,
    });
    this.lighting = new Lighting({
      position: new Vector3(0, -0.02, -0.2 / 3),
      rotation: new Euler(0, Math.PI, 0),
      width: 0.2,
      height: 0.2,
      lights: this.lights,
    });
    this.picker = new ColorPicker({
      position: new Vector3(0.05, -0.02, 0.02),
      rotation: new Euler(0, Math.PI / 3, 0),
      width: 0.2,
      height: 0.2,
    });
    this.brush.color = this.picker.color;
    const ui = new Group();
    ui.rotation.set(Math.PI / -3, 0, 0);
    ui.updateMatrix();
    ui.matrixAutoUpdate = false;
    ui.add(this.brush);
    ui.add(this.lighting);
    ui.add(this.picker);
    this.player.attach(ui, 'left');
    this.ui = ui;
  }

  onLoad() {
    super.onLoad();

    const downloader = document.createElement('a');
    downloader.style.display = 'none';
    document.body.appendChild(downloader);
    this.downloader = downloader;

    const loader = document.createElement('input');
    loader.type = 'file';
    loader.accept = '.blocks';
    loader.onchange = ({ target: { files: [file] } }) => this.load(file);
    loader.style.display = 'none';
    document.body.appendChild(loader);

    this.onDragOver = this.onDragOver.bind(this);
    document.addEventListener('dragover', this.onDragOver, false);
    this.onDrop = this.onDrop.bind(this);
    document.addEventListener('drop', this.onDrop, false);

    const tools = document.createElement('div');
    tools.className = 'tools';
    [
      ['Load', () => loader.click()],
      ['Save', () => this.save()],
    ].forEach(([label, action]) => {
      const button = document.createElement('button');
      button.innerText = label;
      button.onclick = action;
      tools.appendChild(button);
    });
    document.body.appendChild(tools);
    this.tools = tools;
  }

  onUnload() {
    const { downloader, tools } = this;
    super.onUnload();
    document.body.removeChild(downloader);
    document.body.removeChild(tools);
    document.removeEventListener('dragover', this.onDragOver);
    document.removeEventListener('drop', this.onDrop);
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
      brush,
      hasLoaded,
      lastVoxels,
      player,
      voxel,
      world,
      ui,
    } = this;
    if (!hasLoaded) {
      return;
    }
    super.onAnimationTick({ animation, camera, isXR });
    if (!isXR) {
      return;
    }
    player.controllers.forEach(({
      buttons,
      hand,
      pointer,
      raycaster,
    }, i) => {
      if (!hand) {
        return;
      }
      if (
        hand.handedness === 'left'
        && (buttons.forwards || buttons.backwards)
      ) {
        ui.rotation.y += animation.delta * 5 * (buttons.forwards ? -1 : 1);
        ui.updateMatrix();
      }
      if (hand.handedness === 'left' && buttons.primaryDown) {
        ui.visible = !ui.visible;
      }
      if (hand.handedness === 'right' && ui.visible) {
        const hit = raycaster.intersectObjects(ui.children)[0] || false;
        if (hit) {
          pointer.update({
            distance: hit.distance,
            origin: raycaster.ray.origin,
          });
          if (buttons.triggerDown) {
            hit.object.onPointer({
              enabled: true,
              point: hit.point,
            });
          }
          return;
        }
      }
      if (buttons.gripDown || buttons.triggerDown) {
        lastVoxels[i].set(-1, -1, -1);
      }
      if (buttons.grip || buttons.trigger) {
        if (!voxel.equals(lastVoxels[i])) {
          lastVoxels[i].copy(voxel);
          this.updateVoxel(
            {
              ...brush,
              type: buttons.trigger ? brush.type : 0,
            },
            voxel
              .copy(raycaster.ray.origin)
              .divideScalar(world.scale)
              .floor()
          );
        }
      }
    });
  }

  onDragOver(e) {
    e.preventDefault();
  }

  onDrop(e) {
    e.preventDefault();
    const [file] = e.dataTransfer.files;
    if (file && file.name.lastIndexOf('.blocks') === file.name.length - 7) {
      this.load(file);
    }
  }

  load(file) {
    const { world } = this;
    const reader = new FileReader();
    reader.onload = () => {
      world.load(new Uint8Array(reader.result))
        .then(() => this.remesh())
        .catch((e) => console.error(e));
    };
    reader.readAsArrayBuffer(file);
  }

  save() {
    const { world, downloader } = this;
    world.save()
      .then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        downloader.download = `${Date.now()}.blocks`;
        downloader.href = URL.createObjectURL(blob);
        downloader.click();
      });
  }
}

export default Sculpt;
