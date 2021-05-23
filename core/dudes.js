import { Color, Group, Sphere, Vector3 } from '../vendor/three.js';
import Dude from '../renderables/dude.js';
import Selected from '../renderables/selected.js';
import Marker from '../renderables/marker.js';

class Dudes extends Group {
  constructor({
    onContact,
    searchRadius,
    spawn,
    world,
  }) {
    super();
    this.matrixAutoUpdate = false;
    this.aux = {
      vector: new Vector3(),
      sphere: new Sphere(),
    };
    this.dudes = [];
    this.onContact = onContact;
    this.searchRadius = searchRadius;
    this.selectionMarker = new Selected();
    this.targetMarker = new Marker();
    this.add(this.targetMarker);
    this.world = world;
    this.spawn(spawn);
  }

  dispose() {
    const { dudes } = this;
    dudes.forEach((dude) => dude.dispose());
  }

  animate(animation, gazeAt) {
    const {
      dudes,
      searchRadius,
      selected,
      selectionMarker,
      targetMarker,
      world,
    } = this;
    selectionMarker.animate(animation);
    targetMarker.animate(animation);
    dudes.forEach((dude) => {
      dude.animate(animation, gazeAt);
      if (
        dude.searchEnabled && !dude.path && dude !== selected
      ) {
        if (dude.searchTimer) {
          dude.searchTimer = Math.max(dude.searchTimer - animation.delta, 0);
          return;
        }
        dude.searchTimer = (
          dude.minSearchTime + (dude.maxSearchTime - dude.minSearchTime) * Math.random()
        );
        const obstacles = this.computeObstacles(dude);
        const origin = dude.position.clone().divideScalar(world.scale).floor();
        const target = world.findTarget({
          height: 4,
          origin,
          radius: searchRadius,
          obstacles,
        });
        if (!target) {
          return;
        }
        const path = world.findPath({
          height: 4,
          from: origin,
          to: { x: target[0], y: target[1], z: target[2] },
          obstacles,
        });
        if (path.length <= 4) {
          return;
        }
        dude.setPath(path, world.scale);
      }
    });
  }

  computeObstacles(exclude) {
    const { aux: { vector: voxel }, dudes, world } = this;
    return (obstacles) => dudes.forEach((dude) => {
      if (dude === exclude) {
        return;
      }
      for (let i = 0, l = (dude.path ? 2 : 1); i < l; i += 1) {
        voxel
          .copy(i === 0 ? dude.position : dude.path[dude.path.length - 1].position)
          .divideScalar(world.scale).floor();
        for (let y = 0; y < 4; y += 1) {
          if (
            voxel.x < 0 || voxel.x >= world.width
            || voxel.y < 0 || y >= world.height
            || voxel.z < 0 || voxel.z >= world.depth
          ) {
            return;
          }
          obstacles[voxel.z * world.width * world.height + voxel.y * world.width + voxel.x] = 1;
          voxel.y += 1;
        }
      }
    }, []);
  }

  getAtPoint(point) {
    const { aux: { sphere: bounds }, dudes } = this;
    for (let i = 0, l = dudes.length; i < l; i += 1) {
      const dude = dudes[i];
      if (
        bounds
          .copy(dude.geometry.boundingSphere)
          .applyMatrix4(dude.matrixWorld)
          .containsPoint(point)
      ) {
        return dude;
      }
    }
    return false;
  }

  revaluatePaths() {
    const { dudes, selected, targetMarker: marker, world } = this;
    dudes.forEach((dude) => {
      if (!dude.path || dude.step >= dude.path.length - 2) {
        let update = !dude.path ? dude : dude.path[dude.path.length - 1];
        const light = world.getLight(
          Math.floor(update.position.x / world.scale),
          Math.floor(update.position.y / world.scale) + 1,
          Math.floor(update.position.z / world.scale)
        );
        if (!dude.path) update = update.lighting;
        update.light = light >> 8;
        update.sunlight = light & 0xFF;
        return;
      }
      dude.revaluate = () => {
        const path = world.findPath({
          height: 4,
          from: dude.path[dude.step].position.divideScalar(world.scale).floor(),
          to: dude.path[dude.path.length - 1].position.divideScalar(world.scale).floor(),
          obstacles: this.computeObstacles(dude),
        });
        if (path.length > 4) {
          dude.setPath(path, world.scale, dude === selected ? marker : false);
        } else {
          dude.onHit();
        }
      };
    });
  }

  select(dude) {
    const { selectionMarker: marker } = this;
    this.selected = dude;
    marker.material.color.copy(dude.color);
    marker.position.y = dude.physics[0].height + 0.5;
    marker.updateMatrix();
    marker.visible = true;
    dude.add(marker);
  }

  unselect() {
    const { selected, selectionMarker: marker } = this;
    if (selected) {
      selected.remove(marker);
      delete this.selected;
    }
  }

  setDestination(dude, to) {
    const { targetMarker: marker, world } = this;

    const ground = world.findGround(to);
    if (ground === 0) {
      return;
    }
    to.y = ground + 1;
    const from = dude.position.clone().divideScalar(world.scale).floor();
    if (from.equals(to)) {
      return;
    }
    const path = world.findPath({
      height: 4,
      from,
      to,
      obstacles: this.computeObstacles(dude),
    });
    if (path.length <= 4) {
      return;
    }
    dude.setPath(path, world.scale, marker);
  }

  spawn({
    algorithm,
    attempts = Infinity,
    check,
    count,
    origin,
    radius,
  }) {
    const { dudes, world } = this;
    const spec = Dude.defaultSpec;
    for (let i = 0; i < count; i += 1) {
      const height = 1.4 + Math.random() * 0.6;
      const head = (0.75 + Math.random() * 0.25);
      const legs = (0.5 + Math.random() * 0.5);
      const torso = (3 - head - legs) * (0.5 + Math.random() * 0.5);
      const dude = new Dude({
        colors: {
          primary: (new Color()).setHSL(
            Math.random(),
            0.5 + Math.random() * 0.25,
            0.25 + Math.random() * 0.25
          ),
          secondary: (new Color()).setHSL(
            Math.random(),
            0.5 + Math.random() * 0.25,
            0.5 + Math.random() * 0.25
          ),
          skin: (new Color()).setHSL(
            Math.random(),
            0.5 + Math.random() * 0.25,
            0.25 + Math.random() * 0.5
          ),
        },
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
      let attempt = 0;
      let spawn;
      if (algorithm) {
        while (!spawn) {
          if (attempt >= attempts) {
            return;
          }
          spawn = algorithm(i);
          for (let d = 0, l = dudes.length; d < l; d += 1) {
            const { position } = dudes[d];
            if (
              Math.floor(position.x / world.scale) === spawn[0]
              && Math.floor(position.y / world.scale) === spawn[1]
              && Math.floor(position.z / world.scale) === spawn[2]
            ) {
              spawn = false;
              break;
            }
          }
          if (check && !check(spawn)) {
            spawn = false;
          }
          attempt += 1;
        }
      } else {
        while (!spawn) {
          if (attempt >= attempts) {
            return;
          }
          spawn = world.findTarget({
            height: 4,
            origin,
            radius,
            obstacles: this.computeObstacles(),
          });
          if (check && !check(spawn)) {
            spawn = false;
          }
          attempt += 1;
        }
      }
      const light = world.getLight(spawn[0], spawn[1] + 1, spawn[2]);
      dude.lighting.light = light >> 8;
      dude.lighting.sunlight = light & 0xFF;
      dude.position
        .set(spawn[0] + 0.5, spawn[1], spawn[2] + 0.5)
        .multiplyScalar(world.scale);
      dude.scale.setScalar(world.scale * 2);
      dude.searchEnabled = true;
      dude.searchTimer = Math.random();
      dude.minSearchTime = 2;
      dude.maxSearchTime = 4;
      dude.updateMatrixWorld();
      this.add(dude);
      dudes.push(dude);
    }
  }
}

export default Dudes;
