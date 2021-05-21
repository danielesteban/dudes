import { Color, Vector3 } from '../vendor/three.js';
import Gameplay from '../core/gameplay.js';
import VoxelWorld from '../core/voxels.js';

class Stress extends Gameplay {
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
        spawn: { count: 0 },
      },
      physics: false,
      world: {
        width: 64,
        height: 64,
        depth: 64,
        generator: 'blank',
        scale: 0.5,
        seaLevel: 0,
      },
    });
    this.brush = {
      color: new Color(),
      noise: 0.25,
      type: 3,
      shape: VoxelWorld.brushShapes.sphere,
      size: 3,
    };
    this.cursors = [...Array(4)].map(() => ({
      position: new Vector3(),
      direction: new Vector3(),
    }));
    this.voxel = new Vector3();
    this.timer = 0;
  }

  onLoad() {
    const { player } = this;
    super.onLoad();
    player.teleport({ x: -16, y: 32, z: 48 });
    player.desktop.camera.rotation.set(Math.PI * -0.15, Math.PI * -0.25, 0, 'YXZ');
  }

  onAnimationTick({ animation, camera, isXR }) {
    const { brush, cursors, hasLoaded, voxel, world } = this;
    if (!hasLoaded) {
      return;
    }
    super.onAnimationTick({ animation, camera, isXR });
    this.timer -= animation.delta;
    if (this.timer <= 0) {
      this.timer = 20;
      world.generate();
      this.remesh();
      cursors.forEach(({ position, direction }) => {
        position.set(
          brush.size + Math.random() * (world.width - brush.size - 1),
          brush.size + Math.random() * (world.height - brush.size - 1),
          brush.size + Math.random() * (world.depth - brush.size - 1)
        );
        direction.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );
      });
    }
    cursors.forEach(({ position, direction }) => {
      direction.x += Math.random() - 0.5;
      direction.y += Math.random() - 0.5;
      direction.z += Math.random() - 0.5;
      direction.normalize();
      position.addScaledVector(direction, 2);
      position.x = Math.min(Math.max(position.x, brush.size), world.width - brush.size - 1);
      position.y = Math.min(Math.max(position.y, brush.size), world.height - brush.size - 1);
      position.z = Math.min(Math.max(position.z, brush.size), world.depth - brush.size - 1);
      brush.color.setRGB(
        Math.random(),
        Math.random(),
        Math.random()
      );
      this.updateVoxel(brush, voxel.copy(position).floor());
    });
  }
}

export default Stress;
