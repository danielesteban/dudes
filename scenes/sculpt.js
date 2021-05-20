import { Euler, Group, Vector3 } from '../vendor/three.js';
import VoxelWorld from '../core/voxels.js';
import Brush from '../renderables/brush.js';
import ColorPicker from '../renderables/colorpicker.js';
import Lighting from '../renderables/lighting.js';
import Model from './model.js';
import VoxelChunk from '../renderables/chunk.js';

class Sculpt extends Model {
  constructor(scene) {
    super(scene);

    VoxelChunk.setupMaterial();

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

    this.world.chunks.position.set(0, -0.03125, 0);
    this.world.chunks.scale.multiplyScalar(0.03125);
    this.world.chunks.updateMatrix();
  }

  onLoad() {
    super.onLoad();
    const { world, mesh } = this;
    world.generateModel((x, y, z) => (
      (
        y === 0
        && x !== 0
        && x !== world.width - 1
        && z !== 0
        && z !== world.width - 1
      ) ? {
        type: 1,
        r: 0xFF - Math.random() * 0xAA,
        g: 0xFF - Math.random() * 0xAA,
        b: 0xFF - Math.random() * 0xAA,
      } : false
    ));
    mesh.update(world.mesh(0, 0, 0));
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
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
}

export default Sculpt;
