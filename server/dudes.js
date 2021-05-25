const { hsl2Rgb } = require('colorsys');
const { v4: uuid } = require('uuid');

class Dudes {
  constructor(server, options) {
    this.dudes = [];
    this.maxDudes = options.maxDudes || 32;
    this.minDistance = options.minDistance || 16;
    this.searchRadius = options.searchRadius || 64;
    this.spawnOrigin = (
      options.spawnOrigin
      || {
        x: server.world.width * 0.5,
        y: server.world.getHeight(server.world.width * 0.5, server.world.depth * 0.5) + 1,
        z: server.world.depth * 0.5,
      }
    );
    this.spawnRadius = options.spawnRadius || 64;
    this.server = server;
    this.isPaused = true;
  }

  resume() {
    this.pause();
    this.time = Date.now();
    this.interval = setInterval(this.animate.bind(this), 1000 / 30);
    this.isPaused = false;
  }

  pause() {
    clearInterval(this.interval);
    this.isPaused = true;
  }

  animate() {
    const { dudes, searchRadius, server } = this;
    const now = Date.now();
    const delta = (now - this.time) / 1000;
    this.time = now;
    this.spawn();
    dudes.forEach((dude) => {
      if (dude.path) {
        dude.interpolation += (
          delta * dude.speed * (dude.path[dude.step].y !== dude.path[dude.step + 1].y ? 0.6 : 1)
        );
        if (dude.interpolation >= 1) {
          dude.interpolation = 0;
          dude.step += 1;
          dude.position = dude.path[dude.step];
          if (dude.step >= dude.path.length - 1) {
            delete dude.path;
          }
        }
      }
      if (!dude.searchEnabled || dude.path || dude.selected) {
        return;
      }
      if (dude.searchTimer) {
        dude.searchTimer = Math.max(dude.searchTimer - delta, 0);
        return;
      }
      dude.searchTimer = (
        dude.minSearchTime + (dude.maxSearchTime - dude.minSearchTime) * Math.random()
      );
      const target = server.world.findTarget({
        height: 4,
        origin: dude.position,
        radius: searchRadius,
        obstacles: this.computeObstacles(dude),
      });
      if (!target) {
        return;
      }
      const path = server.world.findPath({
        height: 4,
        from: dude.position,
        to: { x: target[0], y: target[1], z: target[2] },
        obstacles: this.computeObstacles(dude),
      });
      if (path.length <= 4) {
        return;
      }
      dude.path = [dude.position];
      for (let i = 4, l = path.length; i < l; i += 4) {
        dude.path.push({
          x: path[i],
          y: path[i + 1],
          z: path[i + 2],
        });
      }
      dude.interpolation = 0;
      dude.step = 0;
      server.broadcast({
        type: 'TARGET',
        id: dude.id,
        voxel: dude.path[dude.path.length - 1],
      });
    });
  }

  setDestination(dude, target) {
    const { server } = this;

    const ground = server.world.findGround({
      avoidTrees: false,
      height: 4,
      voxel: target,
    });
    if (ground === 0) {
      return;
    }
    target.y = ground + 1;
    const path = server.world.findPath({
      height: 4,
      from: dude.position,
      to: target,
      obstacles: this.computeObstacles(dude),
    });
    if (path.length <= 4) {
      return;
    }
    dude.path = [dude.position];
    for (let i = 4, l = path.length; i < l; i += 4) {
      dude.path.push({
        x: path[i],
        y: path[i + 1],
        z: path[i + 2],
      });
    }
    dude.interpolation = 0;
    dude.step = 0;
    server.broadcast({
      type: 'TARGET',
      id: dude.id,
      voxel: dude.path[dude.path.length - 1],
    });
  }

  computeObstacles(exclude) {
    const { dudes, server } = this;
    return (obstacles) => dudes.forEach((dude) => {
      if (dude === exclude) {
        return;
      }
      for (let i = 0, l = (dude.path ? 2 : 1); i < l; i += 1) {
        const position = i === 0 ? dude.position : dude.path[dude.path.length - 1];
        for (let y = 0; y < 4; y += 1) {
          if (
            position.x < 0 || position.x >= server.world.width
            || (position.y + y) < 0 || (position.y + y) >= server.world.height
            || position.z < 0 || position.z >= server.world.depth
          ) {
            return;
          }
          obstacles[
            position.z * server.world.width * server.world.height
            + (position.y + y) * server.world.width
            + position.x
          ] = 1;
        }
      }
    }, []);
  }

  revaluatePaths() {
    const { dudes, server } = this;
    dudes.forEach((dude) => {
      if (!dude.path || dude.step >= dude.path.length - 2) {
        return;
      }
      const path = server.world.findPath({
        height: 4,
        from: dude.path[dude.step],
        to: dude.path[dude.path.length - 1],
        obstacles: this.computeObstacles(dude),
      });
      if (path.length > 4) {
        dude.path = [dude.position];
        for (let i = 4, l = path.length; i < l; i += 4) {
          dude.path.push({
            x: path[i],
            y: path[i + 1],
            z: path[i + 2],
          });
        }
        dude.interpolation = 0;
        dude.step = 0;
      } else {
        delete dude.path;
      }
    });
  }

  spawn() {
    const {
      dudes,
      maxDudes,
      minDistance,
      server,
      spawnOrigin,
      spawnRadius,
    } = this;
    if (dudes.length >= maxDudes) {
      // TODO: Try to despawn some here
      return;
    }
    const target = server.world.findTarget({
      height: 4,
      origin: spawnOrigin,
      radius: spawnRadius,
      obstacles: this.computeObstacles(),
    });
    if (!target) {
      return;
    }
    const position = { x: target[0], y: target[1], z: target[2] };
    let isValid = true;
    for (let d = 0, l = dudes.length; d < l; d += 1) {
      const { position: dude } = dudes[d];
      if (
        Math.sqrt(
          (position.x - dude.x) ** 2 + (position.y - dude.y) ** 2 + (position.z - dude.z) ** 2
        ) < minDistance
      ) {
        isValid = false;
        break;
      }
    }
    if (!isValid) {
      return;
    }
    const primary = hsl2Rgb(
      Math.random() * 360,
      (0.5 + Math.random() * 0.25) * 100,
      (0.25 + Math.random() * 0.25) * 100
    );
    const secondary = hsl2Rgb(
      Math.random() * 360,
      (0.5 + Math.random() * 0.25) * 100,
      (0.5 + Math.random() * 0.25) * 100
    );
    const skin = hsl2Rgb(
      Math.random() * 360,
      (0.5 + Math.random() * 0.25) * 100,
      (0.25 + Math.random() * 0.5) * 100
    );
    const height = 1.4 + Math.random() * 0.6;
    const head = (0.75 + Math.random() * 0.25);
    const legs = (0.5 + Math.random() * 0.5);
    const torso = (3 - head - legs) * (0.5 + Math.random() * 0.5);
    const stamina = 0.75 + Math.random() * 0.5;
    const dude = {
      id: uuid(),
      position,
      primary: (primary.r << 16) | (primary.g << 8) | primary.b,
      secondary: (secondary.r << 16) | (secondary.g << 8) | secondary.b,
      skin: (skin.r << 16) | (skin.g << 8) | skin.b,
      stamina,
      height,
      waist: 0.3 + Math.random() * 0.3,
      torsoWidth: 0.75 + Math.random() * 0.25,
      torsoHeight: torso,
      torsoDepth: 0.75 + Math.random() * 0.25,
      headShape: Math.random() >= 0.5 ? 1 : 0,
      headWidth: 0.75 + Math.random() * 0.25,
      headHeight: head,
      headDepth: 0.75 + Math.random() * 0.25,
      legsHeight: legs,
      armsHeight: 0.75 + Math.random() * 0.5,
      hat: Math.random() >= 0.5 ? (1 + Math.random()) : 0,
      selected: 0,
      speed: 4 * stamina,
      searchEnabled: true,
      searchTimer: Math.random(),
      minSearchTime: 2,
      maxSearchTime: 4,
    };
    dudes.push(dude);
    server.broadcast({
      type: 'SPAWN',
      dudes: [dude],
    });
  }
}

module.exports = Dudes;
