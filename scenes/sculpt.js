import { Euler, Vector3 } from '../vendor/three.js';
import VoxelWorld from '../core/voxels.js';
import ColorPicker from '../renderables/colorpicker.js';
import Model from './model.js';

class Sculpt extends Model {
  constructor(scene) {
    super(scene);

    this.voxel = new Vector3();
    this.lastVoxels = [new Vector3(), new Vector3()];

    this.picker = new ColorPicker({
      position: new Vector3(-0.02, -0.02, 0),
      rotation: new Euler(0, Math.PI * -0.5, Math.PI * 0.5),
      width: 0.3,
      height: 0.3,
    });
    this.brush.color = this.picker.color;
    this.player.attach(this.picker, 'left');

    this.world.chunks.scale.multiplyScalar(0.05);
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
      picker,
      voxel,
      world,
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
      if (hand.handedness === 'right') {
        const hit = raycaster.intersectObject(picker)[0] || false;
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
          brush.type = buttons.trigger ? 3 : 0;
          const noise = brush.color.avg * brush.noise;
          VoxelWorld.getBrush(brush).forEach(({ x, y, z }) => (
            world.update({
              x: voxel.x + x,
              y: voxel.y + y,
              z: voxel.z + z,
              type: brush.type,
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
