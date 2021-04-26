import { Color, Group, Vector3 } from '../vendor/three.js';
import Dude from '../renderables/dude.js';
import Selected from '../renderables/selected.js';

class Dudes extends Group {
  constructor({
    count,
    spawn: { origin, radius },
    world,
    worldScale,
  }) {
    super();
    this.matrixAutoUpdate = false;
    this.auxVector = new Vector3();
    this.dudes = [];
    this.selectionMarker = new Selected();
    this.world = world;
    this.worldScale = worldScale;
    const spec = Dude.defaultSpec;
    for (let i = 0; i < count; i += 1) {
      const height = 1.4 + Math.random() * 0.6;
      const head = (0.75 + Math.random() * 0.25);
      const legs = (0.5 + Math.random() * 0.5);
      const torso = (3 - head - legs) * (0.5 + Math.random() * 0.5);
      const dude = new Dude({
        color: (new Color()).setHSL(
          Math.random(),
          0.5 + Math.random() * 0.25,
          0.5 + Math.random() * 0.25
        ),
        stamina: 0.75 + Math.random() * 0.5,
        height,
        waist: 0.3 + Math.random() * 0.3,
        torso: {
          width: spec.torso.width * (0.75 + Math.random() * 0.25),
          height: spec.torso.height * torso,
          depth: spec.torso.depth * (0.75 + Math.random() * 0.25),
        },
        head: {
          shape: Math.random() >= 0.5 ? 'cone' : 'box',
          width: spec.head.width * (0.75 + Math.random() * 0.25),
          height: spec.head.height * head,
          depth: spec.head.depth * (0.75 + Math.random() * 0.25),
        },
        legs: {
          ...spec.legs,
          height: spec.legs.height * legs,
        },
        arms: {
          ...spec.arms,
          height: spec.arms.height * (0.75 + Math.random() * 0.5),
        },
        hat: Math.random() >= 0.5 ? {
          ...spec.hat,
          height: spec.hat.height * (1 + Math.random()),
        } : false,
      });
      let spawn;
      while (!spawn) {
        spawn = world.findTarget({
          origin,
          radius,
          obstacles: this.computeObstacles(),
        });
      }
      dude.lighting.light = spawn[3] >> 8;
      dude.lighting.sunlight = spawn[3] & 0xFF;
      dude.position
        .set(spawn[0] + 0.5, spawn[1], spawn[2] + 0.5)
        .multiplyScalar(worldScale);
      dude.searchTimer = Math.random();
      dude.updateMatrixWorld();
      this.add(dude);
      this.add(dude.marker);
      this.dudes.push(dude);
    }
  }

  dispose() {
    const { dudes } = this;
    dudes.forEach((dude) => dude.dispose());
  }

  animate(animation, gazeAt) {
    const {
      dudes,
      selected,
      selectionMarker,
      world,
      worldScale: scale,
    } = this;
    selectionMarker.animate(animation);
    dudes.forEach((dude) => {
      dude.animate(animation, gazeAt);
      if (
        !dude.path && dude !== selected
      ) {
        if (dude.searchTimer) {
          dude.searchTimer = Math.max(dude.searchTimer - animation.delta, 0);
          return;
        }
        dude.searchTimer = 2 + Math.random();
        const obstacles = this.computeObstacles(dude);
        const origin = dude.position.clone().divideScalar(scale).floor();
        const target = world.findTarget({
          origin,
          radius: 64,
          obstacles,
        });
        if (!target) {
          return;
        }
        const path = world.findPath({
          from: origin,
          to: { x: target[0], y: target[1], z: target[2] },
          obstacles,
        });
        if (path.length <= 4) {
          return;
        }
        dude.setPath(path, scale);
      }
    });
  }

  computeObstacles(exclude) {
    const { auxVector: voxel, dudes, worldScale: scale } = this;
    return dudes.reduce((obstacles, dude) => {
      if (dude !== exclude) {
        for (let i = 0, l = (dude.path ? 2 : 1); i < l; i += 1) {
          voxel
            .copy(i === 0 ? dude.position : dude.path[dude.path.length - 1].position)
            .divideScalar(scale).floor();
          for (let y = 0; y < 4; y += 1) {
            obstacles.push({ x: voxel.x, y: voxel.y + y, z: voxel.z });
          }
        }
      }
      return obstacles;
    }, []);
  }

  revaluatePaths() {
    const { dudes, selected, world, worldScale: scale } = this;
    dudes.forEach((dude) => {
      if (!dude.path || dude.step >= dude.path.length - 2) {
        return;
      }
      const path = world.findPath({
        from: dude.path[dude.step].position.divideScalar(scale).floor(),
        to: dude.path[dude.path.length - 1].position.divideScalar(scale).floor(),
        obstacles: this.computeObstacles(dude),
      });
      if (path.length > 4) {
        dude.setPath(path, scale, dude === selected);
      } else {
        dude.onHit();
      }
    });
  }

  setDestination(dude, to) {
    const { world, worldScale: scale } = this;

    // This search should prolly be a method in the C implementation
    const test = (x, y, z) => (
      world.voxels.view[(z * world.width * world.height + y * world.width + x) * 6] !== 0
    );
    if (to.y > 0 && !test(to.x, to.y - 1, to.z)) {
      for (let y = to.y - 1; y >= 0; y -= 1) {
        if (y === 0 || test(to.x, y - 1, to.z)) {
          to.y = y;
          break;
        }
      }
    }

    const from = dude.position.clone().divideScalar(scale).floor();
    if (!from.equals(to)) {
      const path = world.findPath({
        from,
        to,
        obstacles: this.computeObstacles(dude),
      });
      if (path.length > 4) {
        dude.setPath(path, scale, true);
      }
    }
  }

  select(dude) {
    const { selectionMarker: marker } = this;
    this.selected = dude;
    marker.material.color.copy(dude.diffuse);
    marker.position.y = dude.physics.physics.height + 0.5;
    marker.updateMatrix();
    marker.visible = true;
    dude.add(marker);
  }
}

export default Dudes;
