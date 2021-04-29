import { Color, FogExp2, Group, Matrix4, Vector3 } from '../vendor/three.js';
import Ambient from './ambient.js';
import Dudes from './dudes.js';
import VoxelWorld from './voxels.js';
import Birds from '../renderables/birds.js';
import Bodies from '../renderables/bodies.js';
import Dome from '../renderables/dome.js';
import Clouds from '../renderables/clouds.js';
import Dude from '../renderables/dude.js';
import Explosion from '../renderables/explosion.js';
import Ocean from '../renderables/ocean.js';
import Rain from '../renderables/rain.js';
import Spheres from '../renderables/spheres.js';
import Starfield from '../renderables/starfield.js';
import VoxelChunk from '../renderables/chunk.js';

class Gameplay extends Group {
  constructor(world) {
    super();
    this.matrixAutoUpdate = false;

    this.background = world.background = new Color(0);
    this.fog = world.fog = new FogExp2(0, 0.005);
    this.player = world.player;

    this.ambient = new Ambient({
      anchor: this.player.head,
      isRunning: this.player.head.context.state === 'running',
      range: { from: 0, to: 64 },
      sounds: [
        {
          url: '/sounds/sea.ogg',
          from: -0.5,
          to: 0.25,
        },
        {
          url: '/sounds/forest.ogg',
          from: 0,
          to: 0.75,
        },
        {
          url: '/sounds/wind.ogg',
          from: 0.5,
          to: 1.5,
        },
        {
          url: 'sounds/rain.ogg',
          enabled: false,
        },
      ],
    });
    this.brush = {
      color: new Color(0xAAAAAA),
      noise: 0.15,
      shape: Gameplay.brushShapes.box,
      size: 1,
      type: 3,
    };
    this.locomotion = {
      direction: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
    };
    this.light = 0;
    this.targetLight = 1;
    this.seed = 735794906;
    this.meshes = [];
    this.worldScale = 0.5;
    this.voxels = new Group();
    this.voxels.matrixAutoUpdate = false;

    this.explosions = [...Array(50)].map(() => {
      const explosion = new Explosion({ sfx: world.sfx });
      this.add(explosion);
      return explosion;
    });

    this.projectile = 0;
    this.projectiles = new Spheres({
      count: 50,
      sfx: world.sfx,
      sound: '/sounds/shot.ogg',
    });
    {
      const matrix = new Matrix4();
      const color = new Color();
      const vector = new Vector3();
      for (let i = 0; i < this.projectiles.count; i += 1) {
        matrix.setPosition(0, 0.2, -1000 - i);
        this.projectiles.setMatrixAt(i, matrix);
      }
      this.projectiles.destroyOnContact = ({ mesh, instance: projectile, position }) => {
        if (mesh !== this.projectiles) {
          return false;
        }
        this.spawnExplosion(position, this.projectiles.getColorAt(projectile, color));
        this.physics.setTransform(
          this.projectiles,
          projectile,
          vector.set(0, 0.2, -1000 - projectile)
        );
        return true;
      };
    }

    Promise.all([...Array(5)].map(() => (
      world.sfx.load('/sounds/plop.ogg')
        .then((sound) => {
          sound.filter = sound.context.createBiquadFilter();
          sound.setFilter(sound.filter);
          sound.setRefDistance(8);
          this.add(sound);
          return sound;
        })
    ))).then((sfx) => { this.plops = sfx; });

    {
      const toggle = document.getElementById('light');
      [...toggle.getElementsByTagName('svg')].forEach((svg, i) => {
        const target = i === 0 ? 1 : 0;
        svg.addEventListener('click', () => {
          if (this.light !== this.targetLight) {
            return;
          }
          this.targetLight = target;
          toggle.className = target >= 0.5 ? 'day' : 'night';
        }, false);
      });
    }

    {
      const toggle = document.getElementById('rain');
      toggle.addEventListener('click', () => {
        if (!this.rain) return;
        this.updateRain(!this.rain.visible);
        toggle.className = this.rain.visible ? 'enabled' : '';
      }, false);
    }

    Promise.all([
      world.getPhysics(),
      new Promise((resolve) => {
        const voxels = new VoxelWorld({
          width: 384,
          height: 96,
          depth: 384,
          onLoad: () => resolve(voxels),
        });
      }),
    ])
      .then(([physics, world]) => {
        this.physics = physics;
        this.world = world;
        this.onLoad();
      });
  }

  onLoad() {
    const {
      meshes,
      physics,
      player,
      projectiles,
      seed,
      voxels,
      world,
      worldScale: scale,
    } = this;

    world.generate(seed);
    const spawn = new Vector3(
      Math.floor(world.width * 0.5),
      0,
      Math.floor(world.depth * 0.49)
    );
    spawn
      .add({
        x: 0.5,
        y: world.heightmap.view[spawn.z * world.width + spawn.x] + 1,
        z: 0.5,
      })
      .multiplyScalar(scale);
    spawn.y = Math.max(3, spawn.y);
    player.teleport(spawn);

    const origin = { x: world.width * 0.5 * scale, z: world.depth * 0.5 * scale };
    this.birds = new Birds({ anchor: player });
    this.clouds = new Clouds(origin);
    const dome = new Dome(origin);
    this.dudes = new Dudes({
      count: 32,
      spawn: {
        origin: spawn.clone().divideScalar(scale).floor(),
        radius: 64,
      },
      world,
      worldScale: scale,
    });
    const ocean = new Ocean({
      ...origin,
      y: 3.2,
    });
    this.rain = new Rain({ anchor: this.player, world, worldScale: scale });
    const starfield = new Starfield(origin);

    this.add(voxels);
    this.add(this.dudes);
    this.add(projectiles);
    this.add(this.clouds);
    this.add(this.rain);
    this.add(starfield);
    this.add(dome);
    this.add(this.birds);
    this.add(ocean);

    this.chunks = {
      x: world.width / world.chunkSize,
      y: world.height / world.chunkSize,
      z: world.depth / world.chunkSize,
    };
    for (let z = 0; z < this.chunks.z; z += 1) {
      for (let y = 0; y < this.chunks.y; y += 1) {
        for (let x = 0; x < this.chunks.x; x += 1) {
          const chunk = new VoxelChunk({
            x: x * world.chunkSize,
            y: y * world.chunkSize,
            z: z * world.chunkSize,
            geometry: world.mesh(x, y, z),
            scale,
          });
          chunk.collider = new Group();
          chunk.collider.matrixAutoUpdate = false;
          chunk.collider.position.copy(chunk.position);
          chunk.collider.physics = [];
          if (projectiles.onColliderContact) {
            chunk.collider.onContact = projectiles.onColliderContact;
          }
          meshes.push(chunk);
          if (chunk.geometry.getIndex() !== null) {
            voxels.add(chunk);
            this.updateCollider(chunk.collider, world.colliders(x, y, z), true);
          }
        }
      }
    }

    this.dudes.dudes.forEach((dude) => {
      if (projectiles.onDudeContact) {
        dude.physics.onContact = projectiles.onDudeContact;
      }
      physics.addMesh(dude.physics, { isKinematic: true, isTrigger: !!dude.physics.onContact });
    });
    physics.addMesh(projectiles, { mass: 1 });

    const loading = document.getElementById('loading');
    if (loading) {
      loading.parentNode.removeChild(loading);
    }

    this.hasLoaded = true;
  }

  onUnload() {
    const {
      ambient,
      birds,
      dudes,
      rain,
    } = this;
    ambient.dispose();
    birds.dispose();
    dudes.dispose();
    rain.dispose();
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
      ambient,
      birds,
      clouds,
      dudes,
      explosions,
      hasLoaded,
      light,
      player,
      rain,
      targetLight,
    } = this;
    if (!hasLoaded) {
      return;
    }
    this.onLocomotion({ animation, camera, isXR });
    ambient.animate(animation);
    birds.animate(animation);
    clouds.animate(animation);
    dudes.animate(animation, player.head.position);
    explosions.forEach((explosion) => explosion.animate(animation));
    Ocean.animate(animation);
    rain.animate(animation);
    if (light !== targetLight) {
      this.updateLight(
        light + Math.min(Math.max(targetLight - light, -animation.delta), animation.delta)
      );
    }
  }

  onLocomotion({ animation, camera, isXR }) {
    const {
      locomotion: {
        direction,
        forward,
        right,
        worldUp,
      },
      physics,
      player,
    } = this;
    if (isXR) {
      player.controllers.forEach(({ buttons, hand, worldspace }) => {
        if (
          hand && hand.handedness === 'left'
          && (buttons.leftwardsDown || buttons.rightwardsDown)
        ) {
          player.rotate(
            Math.PI * 0.25 * (buttons.leftwardsDown ? 1 : -1)
          );
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
              .multiplyScalar(animation.delta * speed),
            physics
          );
        }
      });
    } else {
      const { desktop: { keyboard, speed } } = player;
      if (
        keyboard.x !== 0
        || keyboard.y !== 0
        || keyboard.z !== 0
      ) {
        camera.getWorldDirection(forward);
        right.crossVectors(forward, worldUp);
        player.move(
          direction
            .set(0, 0, 0)
            .addScaledVector(right, keyboard.x)
            .addScaledVector(worldUp, keyboard.y)
            .addScaledVector(forward, keyboard.z)
            .normalize()
            .multiplyScalar(animation.delta * speed),
          physics
        );
      }
    }
    if (player.position.y < 3) {
      player.move({ x: 0, y: 3 - player.position.y, z: 0 });
    }
  }

  resumeAudio() {
    const { ambient } = this;
    ambient.resume();
  }

  spawnExplosion(position, color, scale = 0.5) {
    const { explosions } = this;
    const explosion = explosions.find(({ sound, visible }) => (
      !visible && (!sound || !sound.isPlaying)
    ));
    if (explosion) {
      explosion.detonate({
        color,
        filter: 'highpass',
        position,
        scale,
      });
    }
  }

  spawnProjectile(position, impulse) {
    const { physics, projectile, projectiles } = this;
    if (!this.physics) {
      return;
    }
    this.projectile = (this.projectile + 1) % projectiles.count;
    physics.setTransform(projectiles, projectile, position);
    physics.applyImpulse(projectiles, projectile, impulse);
    projectiles.playSound(position);
  }

  update({ brush, voxel }) {
    const {
      chunks,
      meshes,
      dudes,
      voxels,
      world,
    } = this;
    const noise = ((brush.color.r + brush.color.g + brush.color.b) / 3) * brush.noise;
    Gameplay.getBrush(brush).forEach(({ x, y, z }) => (
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
    const chunkX = Math.floor(voxel.x / world.chunkSize);
    const chunkY = Math.floor(voxel.y / world.chunkSize);
    const chunkZ = Math.floor(voxel.z / world.chunkSize);
    const topY = Math.min(chunkY + 1, chunks.y - 1);
    Gameplay.chunkNeighbors.forEach((neighbor) => {
      const x = chunkX + neighbor.x;
      const z = chunkZ + neighbor.z;
      if (x < 0 || x >= chunks.x || z < 0 || z >= chunks.z) {
        return;
      }
      for (let y = 0; y <= topY; y += 1) {
        const mesh = meshes[z * chunks.x * chunks.y + y * chunks.x + x];
        const geometry = world.mesh(x, y, z);
        if (geometry.indices.length > 0) {
          mesh.update(geometry);
          if (Math.abs(chunkY - y) <= 1) {
            this.updateCollider(
              mesh.collider,
              world.colliders(x, y, z),
              x === chunkX && y === chunkY && z === chunkZ
            );
          }
          if (!mesh.parent) voxels.add(mesh);
        } else if (mesh.parent) {
          voxels.remove(mesh);
          this.updateCollider(mesh.collider, []);
        }
      }
    });
    dudes.revaluatePaths();
    // this.physics.wakeAll();
  }

  updateCollider(collider, boxes, force) {
    const { physics, worldScale: scale } = this;
    if (!force && collider.physics.length === boxes.length / 6) {
      // This is kind of a hack.
      // It will cause bugs since it could happen that the volume changed
      // but the count of resulting boxes is the same.
      // I need to think of a safer way to optimize this.
      return;
    }
    if (collider.physics.length) {
      physics.removeMesh(collider);
      collider.physics.length = 0;
    }
    if (boxes.length) {
      for (let i = 0, l = boxes.length; i < l; i += 6) {
        collider.physics.push({
          shape: 'box',
          width: boxes[i + 3] * scale,
          height: boxes[i + 4] * scale,
          depth: boxes[i + 5] * scale,
          position: {
            x: (boxes[i] + boxes[i + 3] * 0.5) * scale,
            y: (boxes[i + 1] + boxes[i + 4] * 0.5) * scale,
            z: (boxes[i + 2] + boxes[i + 5] * 0.5) * scale,
          },
        });
      }
      physics.addMesh(collider, { isTrigger: !!collider.onContact });
    }
  }

  updateLight(intensity) {
    const { background, fog } = this;
    this.light = intensity;
    background.setHex(0x226699).multiplyScalar(Math.max(intensity, 0.05));
    fog.color.copy(background);
    Birds.material.uniforms.diffuse.value.setScalar(intensity);
    Bodies.material.color.setScalar(Math.max(intensity, 0.3));
    Clouds.material.color.setScalar(intensity);
    Dome.material.uniforms.background.value.copy(background);
    Ocean.material.color.copy(background);
    Rain.material.uniforms.diffuse.value.copy(background);
    Starfield.material.opacity = 1.0 - intensity;
    [Dude.material, VoxelChunk.material].forEach(({ uniforms }) => {
      uniforms.ambientIntensity.value = Math.max(Math.min(intensity, 0.7) / 0.7, 0.5) * 0.1;
      uniforms.lightIntensity.value = Math.min(1.0 - Math.min(intensity, 0.5) * 2, 0.7);
      uniforms.sunlightIntensity.value = Math.min(intensity, 0.7);
    });
  }

  updateRain(enabled) {
    const { ambient, rain } = this;
    if (rain.visible === enabled) {
      return;
    }
    if (enabled) {
      rain.reset();
    }
    rain.visible = enabled;
    ambient.sounds.find(({ url }) => url === 'sounds/rain.ogg').enabled = rain.visible;
  }

  static getBrush({ shape, size }) {
    const { brushShapes, brushes } = Gameplay;
    const key = `${shape}:${size}`;
    let brush = brushes.get(key);
    if (!brush) {
      brush = [];
      if (shape === brushShapes.box) {
        size -= 1;
      }
      const radius = Math.sqrt(((size * 0.5) ** 2) * 3);
      for (let z = -size; z <= size; z += 1) {
        for (let y = -size; y <= size; y += 1) {
          for (let x = -size; x <= size; x += 1) {
            if (
              shape === brushShapes.box
              || Math.sqrt(x ** 2 + y ** 2 + z ** 2) <= radius
            ) {
              brush.push({ x, y, z });
            }
          }
        }
      }
      brush.sort((a, b) => (
        Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2) - Math.sqrt(b.x ** 2 + b.y ** 2 + b.z ** 2)
      ));
      brushes.set(key, brush);
    }
    return brush;
  }
}

Gameplay.brushes = new Map();

Gameplay.brushShapes = {
  box: 0,
  sphere: 1,
};

Gameplay.chunkNeighbors = [
  { x: -1, z: -1 },
  { x: 0, z: -1 },
  { x: 1, z: -1 },
  { x: -1, z: 0 },
  { x: 0, z: 0 },
  { x: 1, z: 0 },
  { x: -1, z: 1 },
  { x: 0, z: 1 },
  { x: 1, z: 1 },
];

export default Gameplay;
