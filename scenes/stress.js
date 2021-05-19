import { Color, FogExp2, Group, Vector3 } from '../vendor/three.js';
import VoxelWorld from '../core/voxels.js';
import VoxelChunk from '../renderables/chunk.js';

class Stress extends Group {
  constructor(scene) {
    super();
    this.matrixAutoUpdate = false;

    this.background = scene.background = new Color(0);
    this.fog = scene.fog = new FogExp2(0, 0.005);
    this.player = scene.player;

    this.locomotion = {
      direction: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
    };

    this.brush = {
      color: new Color(),
      noise: 0.25,
      type: 1,
      shape: VoxelWorld.brushShapes.sphere,
      size: 3,
    };
    this.cursors = [...Array(4)].map(() => ({
      position: new Vector3(),
      direction: new Vector3(),
    }));
    this.voxel = new Vector3();
    this.timer = 0;

    this.world = new VoxelWorld({
      width: 64,
      height: 64,
      depth: 64,
      chunkSize: 64,
      onLoad: this.onLoad.bind(this),
    });

    scene.player.teleport({ x: -32, y: 32, z: 32 });
    scene.player.desktop.camera.rotation.set(Math.PI * -0.125, Math.PI * -0.25, 0, 'YXZ');
  }

  onLoad() {
    const { world } = this;

    this.mesh = new VoxelChunk({
      x: world.width * -0.5,
      y: 0,
      z: world.depth * -0.5,
      geometry: world.mesh(0, 0, 0),
      scale: this.world.scale,
    });
    this.add(this.mesh);

    this.updateLight(1);

    const loading = document.getElementById('loading');
    if (loading) {
      loading.parentNode.removeChild(loading);
    }

    this.hasLoaded = true;
  }

  onAnimationTick({ animation }) {
    const { brush, cursors, mesh, hasLoaded, voxel, world } = this;
    if (!hasLoaded) {
      return;
    }

    this.timer -= animation.delta;
    if (this.timer <= 0) {
      this.timer = 20;
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
      voxel.copy(position).floor();
      brush.color.setRGB(
        Math.random(),
        Math.random(),
        Math.random()
      );
      const noise = ((brush.color.r + brush.color.g + brush.color.b) / 3) * brush.noise;
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
    });

    mesh.update(world.mesh(0, 0, 0));
  }

  onLocomotionTick({ animation, camera, isXR }) {
    const {
      hasLoaded,
      locomotion: {
        direction,
        forward,
        right,
        worldUp,
      },
      player,
    } = this;
    if (!hasLoaded) {
      return;
    }
    if (isXR) {
      player.controllers.forEach(({ buttons, hand, worldspace }) => {
        if (
          hand && hand.handedness === 'left'
          && (buttons.leftwardsDown || buttons.rightwardsDown)
        ) {
          player.rotate(worldUp, Math.PI * 0.25 * (buttons.leftwardsDown ? 1 : -1));
        }
        if (
          hand && hand.handedness === 'right'
          && (
            buttons.backwards || buttons.backwardsUp
            || buttons.forwards || buttons.forwardsUp
            || buttons.leftwards || buttons.leftwardsUp
            || buttons.rightwards || buttons.rightwardsUp
          )
        ) {
          const speed = 6;
          player.move(
            direction
              .set(
                (buttons.leftwards || buttons.leftwardsUp) ? -1 : ((buttons.rightwards || buttons.rightwardsUp) ? 1 : 0),
                0,
                (buttons.backwards || buttons.backwardsUp) ? 1 : ((buttons.forwards || buttons.forwardsUp) ? -1 : 0),
              )
              .normalize()
              .applyQuaternion(worldspace.quaternion)
              .multiplyScalar(animation.delta * speed)
          );
        }
      });
    } else {
      const { desktop: { keyboard, isLocked, speed } } = player;
      if (
        isLocked
        && (
          keyboard.x !== 0
          || keyboard.y !== 0
          || keyboard.z !== 0
        )
      ) {
        camera.getWorldDirection(forward);
        right.crossVectors(worldUp, forward);
        player.move(
          direction
            .set(0, 0, 0)
            .addScaledVector(right, -keyboard.x)
            .addScaledVector(worldUp, keyboard.y)
            .addScaledVector(forward, keyboard.z)
            .normalize()
            .multiplyScalar(animation.delta * speed)
        );
      }
    }
  }

  updateLight(intensity) {
    const { background, fog } = this;
    const { material: { uniforms: voxels } } = VoxelChunk;
    this.light = intensity;
    background.setHex(0x226699).multiplyScalar(Math.max(intensity, 0.05));
    fog.color.copy(background);
    voxels.ambientIntensity.value = Math.max(Math.min(intensity, 0.7) / 0.7, 0.5) * 0.1;
    voxels.lightIntensity.value = Math.min(1.0 - Math.min(intensity, 0.5) * 2, 0.7);
    voxels.sunlightIntensity.value = Math.min(intensity, 0.7);
  }
}

export default Stress;
