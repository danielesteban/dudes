import { Euler, Group, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';
import Brush from '../renderables/ui/brush.js';
import ColorPicker from '../renderables/ui/colorpicker.js';
import Settings from '../renderables/ui/settings.js';

class Sculpt extends Gameplay {
  constructor(scene) {
    super(scene, {
      ambient: {
        range: { from: 0, to: 128 },
        sounds: [
          {
            url: '/sounds/forest.ogg',
            from: -0.25,
            to: 1.5,
          },
          {
            url: '/sounds/sea.ogg',
            from: -1.5,
            to: 0.25,
          },
        ],
      },
      dudes: {
        searchRadius: 32,
        spawn: { count: 0 },
      },
      physics: false,
      world: {
        width: 128,
        height: 64,
        depth: 128,
        generator: 'blank',
        scale: 0.03125,
      },
    });
    this.lights.light.target = 1;
    this.player.cursor.classList.remove('enabled');

    this.voxel = new Vector3();
    this.lastVoxels = [new Vector3(), new Vector3()];

    this.brush = new Brush({
      position: new Vector3(-0.05, -0.02, 0.02),
      rotation: new Euler(0, Math.PI / -3, 0),
      width: 0.2,
      height: 0.2,
    });
    this.picker = new ColorPicker({
      position: new Vector3(0.05, -0.02, 0.02),
      rotation: new Euler(0, Math.PI / 3, 0),
      width: 0.2,
      height: 0.2,
    });
    this.settings = new Settings({
      position: new Vector3(0, -0.02, -0.2 / 3),
      rotation: new Euler(0, Math.PI, 0),
      width: 0.2,
      height: 0.2,
      lights: this.lights,
    });
    this.brush.color = this.picker.color;
    const ui = new Group();
    ui.rotation.set(Math.PI / -3, 0, 0);
    ui.updateMatrix();
    ui.matrixAutoUpdate = false;
    ui.add(this.brush);
    ui.add(this.picker);
    ui.add(this.settings);
    this.player.attach(ui, 'left');
    this.ui = ui;

    Promise.all([...Array(5)].map(() => (
      scene.sfx.load('/sounds/plop.ogg')
        .then((sound) => {
          sound.filter = sound.context.createBiquadFilter();
          sound.setFilter(sound.filter);
          sound.setRefDistance(8);
          this.add(sound);
          return sound;
        })
    ))).then((sfx) => {
      this.plops = sfx;
      this.plopTimer = 0;
    });
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
      dudes,
      hasLoaded,
      lastVoxels,
      player,
      plops,
      settings,
      voxel,
      world,
      ui,
    } = this;
    if (!hasLoaded) {
      return;
    }
    super.onAnimationTick({ animation, camera, isXR });
    if (settings.spawnDudes) {
      this.spawn();
    } else if (dudes.dudes.length) {
      dudes.dudes.forEach((dude) => {
        dudes.remove(dude);
        dude.dispose();
      });
      dudes.dudes.length = 0;
    }
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
        voxel
          .copy(raycaster.ray.origin)
          .divideScalar(world.scale)
          .floor();
        if (!voxel.equals(lastVoxels[i])) {
          lastVoxels[i].copy(voxel);
          const isPlacing = buttons.trigger;
          if (plops && this.plopTimer <= animation.time) {
            const sound = plops.find(({ isPlaying }) => (!isPlaying));
            if (sound && sound.context.state === 'running') {
              sound.filter.type = isPlacing ? 'lowpass' : 'highpass';
              sound.filter.frequency.value = (Math.random() + 0.5) * 1000;
              sound.position.copy(raycaster.ray.origin);
              sound.play();
              this.plopTimer = animation.time + 0.05;
            }
          }
          this.updateVoxel(
            {
              ...brush,
              type: buttons.trigger ? brush.type : 0,
            },
            voxel
          );
        }
      }
    });
  }

  onLocomotionTick({ animation, camera, isXR }) {
    const { hasLoaded, player } = this;
    if (!hasLoaded) {
      return;
    }
    player.onLocomotionTick({
      animation,
      camera,
      isXR,
      movementScale: 1 / 3,
    });
    if (player.position.y < 0) {
      player.move({ x: 0, y: -player.position.y, z: 0 });
    }
  }

  spawn() {
    const { dudes, world } = this;
    const cap = 32;
    const distance = 16;
    const aux = new Vector3();
    const dude = new Vector3();
    if (dudes.dudes.length >= cap) {
      // TODO: Try to despawn some here
      return;
    }
    dudes.spawn({
      attempts: 1,
      count: 1,
      check: (spawn) => {
        aux.set(spawn[0], spawn[1], spawn[2]);
        let isValid = true;
        for (let d = 0, l = dudes.dudes.length; d < l; d += 1) {
          const { position } = dudes.dudes[d];
          if (dude.copy(position).divideScalar(world.scale).floor().distanceTo(aux) < distance) {
            isValid = false;
            break;
          }
        }
        return isValid;
      },
      origin: {
        x: world.width * 0.5,
        y: world.height * 0.5,
        z: world.depth * 0.5,
      },
      radius: Math.max(
        world.width,
        world.height,
        world.depth
      ) * 0.5,
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
    const { dudes, settings, world } = this;
    const reader = new FileReader();
    reader.onload = () => {
      world.load(new Uint8Array(reader.result))
        .then(() => {
          if (settings.spawnDudes) {
            dudes.dudes.forEach((dude) => {
              dudes.remove(dude);
              dude.dispose();
            });
            dudes.dudes.length = 0;
          }
          this.remesh();
        })
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
