import { Color, FogExp2, Group } from '../vendor/three.js';
import Ambient from '../core/ambient.js';
import VoxelWorld from '../core/voxels.js';
import VoxelChunk from '../renderables/chunk.js';

class Model extends Group {
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

    this.world = new VoxelWorld({
      width: 64,
      height: 64,
      depth: 64,
      chunkSize: 64,
      scale: 1,
      onLoad: this.onLoad.bind(this),
    });
  }

  onLoad() {
    const { player, world } = this;

    player.teleport({ x: 0, y: 0, z: 0 });

    this.mesh = new VoxelChunk({
      x: world.width * -0.5,
      y: 0,
      z: world.depth * -0.5,
      geometry: world.mesh(0, 0, 0),
      scale: this.world.scale,
    });
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
    const { ambient, hasLoaded } = this;
    if (!hasLoaded) {
      return;
    }
    ambient.animate(animation);
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

export default Model;
