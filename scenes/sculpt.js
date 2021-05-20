import { Color, Euler, FogExp2, Group, Vector3 } from '../vendor/three.js';
import Ambient from '../core/ambient.js';
import VoxelWorld from '../core/voxels.js';
import Brush from '../renderables/brush.js';
import ColorPicker from '../renderables/colorpicker.js';
import Lighting from '../renderables/lighting.js';
import VoxelChunk from '../renderables/chunk.js';

class Sculpt extends Group {
  constructor(scene) {
    super();
    this.matrixAutoUpdate = false;

    this.background = scene.background = new Color(0);
    this.fog = scene.fog = new FogExp2(0, 0.005);
    this.player = scene.player;

    this.ambient = new Ambient({
      anchor: this.player.head,
      isRunning: this.player.head.context.state === 'running',
      range: { from: 0, to: 128 },
      sounds: [
        {
          url: '/sounds/forest.ogg',
          from: -0.5,
          to: 1.5,
        },
      ],
    });

    this.voxel = new Vector3();
    this.lastVoxels = [new Vector3(), new Vector3()];

    this.brush = new Brush({
      position: new Vector3(-0.05, -0.02, 0.02),
      rotation: new Euler(0, Math.PI / -3, 0),
      width: 0.2,
      height: 0.2,
    });
    VoxelChunk.setupMaterial();
    this.lighting = new Lighting({
      position: new Vector3(0, -0.02, -0.2 / 3),
      rotation: new Euler(0, Math.PI, 0),
      width: 0.2,
      height: 0.2,
      fog: this.fog,
      background: this.background,
      voxels: VoxelChunk.material.uniforms,
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

    this.world = new VoxelWorld({
      width: 64,
      height: 64,
      depth: 64,
      chunkSize: 64,
      generator: 'blank',
      scale: 1,
      seaLevel: 0,
      onLoad: this.onLoad.bind(this),
    });
    this.world.chunks.position.set(0, -0.03125, 0);
    this.world.chunks.scale.multiplyScalar(0.03125);
    this.world.chunks.updateMatrix();

    this.player.teleport({ x: 0, y: 0, z: 0 });
  }

  onLoad() {
    const { world } = this;

    world.generate();
    this.mesh = new VoxelChunk({
      x: world.width * -0.5,
      y: 0,
      z: world.depth * -0.5,
      geometry: world.mesh(0, 0, 0),
      scale: this.world.scale,
    });
    this.mesh.update(world.mesh(0, 0, 0));
    world.chunks.add(this.mesh);
    this.add(world.chunks);

    const loading = document.getElementById('loading');
    if (loading) {
      loading.parentNode.removeChild(loading);
    }

    this.hasLoaded = true;
  }

  onUnload() {
    const { ambient } = this;
    ambient.dispose();
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
      ambient,
      brush,
      hasLoaded,
      lastVoxels,
      mesh,
      player,
      voxel,
      world,
      ui,
    } = this;
    if (!hasLoaded) {
      return;
    }
    ambient.animate(animation);
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
        mesh
          .worldToLocal(voxel.copy(raycaster.ray.origin))
          .floor();
        if (!voxel.equals(lastVoxels[i])) {
          lastVoxels[i].copy(voxel);
          const type = buttons.trigger ? brush.type : 0;
          const noise = brush.color.avg * brush.noise;
          VoxelWorld.getBrush(brush).forEach(({ x, y, z }) => (
            world.update({
              x: voxel.x + x,
              y: voxel.y + y,
              z: voxel.z + z,
              type,
              r: Math.min(Math.max((brush.color.r + (Math.random() - 0.5) * noise) * 0xFF, 0), 0xFF),
              g: Math.min(Math.max((brush.color.g + (Math.random() - 0.5) * noise) * 0xFF, 0), 0xFF),
              b: Math.min(Math.max((brush.color.b + (Math.random() - 0.5) * noise) * 0xFF, 0), 0xFF),
            })
          ));
          mesh.update(world.mesh(0, 0, 0));
        }
      }
    });
  }

  onLocomotionTick({ animation, camera, isXR }) {
    const { hasLoaded, player } = this;
    if (!hasLoaded) {
      return;
    }
    player.onLocomotionTick({ animation, camera, isXR });
    if (player.position.y < 0) {
      player.move({ x: 0, y: -player.position.y, z: 0 });
    }
  }

  resumeAudio() {
    const { ambient } = this;
    ambient.resume();
  }
}

export default Sculpt;
