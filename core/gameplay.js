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
  constructor(scene, options) {
    super();
    this.matrixAutoUpdate = false;

    this.background = scene.background = new Color(0);
    this.fog = scene.fog = new FogExp2(0, 0.005);
    this.player = scene.player;

    this.ambient = new Ambient({
      anchor: this.player.head,
      isRunning: this.player.head.context.state === 'running',
      range: { from: 0, to: Math.round(options.height * 0.7) },
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
          url: '/sounds/rain.ogg',
          enabled: false,
        },
      ],
    });
    this.light = 0;
    this.targetLight = 1;
    this.locomotion = {
      direction: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
    };

    this.explosions = [...Array(50)].map(() => {
      const explosion = new Explosion({ sfx: scene.sfx });
      this.add(explosion);
      return explosion;
    });

    this.projectile = 0;
    this.projectiles = new Spheres({
      count: 50,
      sfx: scene.sfx,
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
      scene.getPhysics(),
      new Promise((resolve) => {
        const world = new VoxelWorld({
          generation: options.generation,
          width: options.width,
          height: options.height,
          depth: options.depth,
          onLoad: () => resolve(world),
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
      physics,
      player,
      projectiles,
      world,
    } = this;

    world.generate();

    const spawn = (new Vector3(world.width * 0.5, 0, world.depth * 0.5)).floor();
    spawn.y = Math.max(3, world.heightmap.view[spawn.z * world.width + spawn.x] + 1);
    spawn.multiplyScalar(world.scale);
    player.teleport(spawn);

    this.birds = new Birds({ anchor: player });
    this.clouds = new Clouds(spawn);
    const dome = new Dome(spawn);
    this.dudes = new Dudes({
      count: 32,
      spawn: {
        origin: spawn.clone().divideScalar(world.scale).floor(),
        radius: 60,
      },
      world,
    });
    const ocean = new Ocean({
      x: spawn.x,
      y: 3.2,
      z: spawn.z,
    });
    this.rain = new Rain({ anchor: player, world });
    const starfield = new Starfield(spawn);

    this.add(world.chunks);
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
            scale: world.scale,
          });
          chunk.collider = new Group();
          chunk.collider.isChunk = true;
          chunk.collider.position.copy(chunk.position);
          chunk.collider.physics = [];
          if (projectiles.onColliderContact) {
            chunk.collider.onContact = projectiles.onColliderContact;
          }
          world.meshes.push(chunk);
          if (chunk.geometry.getIndex() !== null) {
            world.chunks.add(chunk);
            this.updateCollider(chunk.collider, world.colliders(x, y, z), true);
          }
        }
      }
    }

    this.dudes.dudes.forEach((dude) => {
      if (projectiles.onDudeContact) {
        dude.onContact = projectiles.onDudeContact;
      }
      physics.addMesh(dude, { isKinematic: true, isTrigger: !!dude.onContact });
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

  onLocomotionTick({ animation, camera, isXR }) {
    const {
      hasLoaded,
      locomotion: {
        direction,
        forward,
        right,
        worldUp,
      },
      physics,
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
        right.crossVectors(worldUp, forward);
        player.move(
          direction
            .set(0, 0, 0)
            .addScaledVector(right, -keyboard.x)
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
    } else if (player.position.y > 128) {
      player.move({ x: 0, y: 128 - player.position.y, z: 0 });
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

  updateCollider(collider, boxes, force) {
    const { physics, world } = this;
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
          width: boxes[i + 3] * world.scale,
          height: boxes[i + 4] * world.scale,
          depth: boxes[i + 5] * world.scale,
          position: {
            x: (boxes[i] + boxes[i + 3] * 0.5) * world.scale,
            y: (boxes[i + 1] + boxes[i + 4] * 0.5) * world.scale,
            z: (boxes[i + 2] + boxes[i + 5] * 0.5) * world.scale,
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
    ambient.sounds.find(({ url }) => url === '/sounds/rain.ogg').enabled = rain.visible;
  }

  updateVoxel(brush, voxel) {
    const {
      chunks,
      dudes,
      world,
    } = this;
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
        const mesh = world.meshes[z * chunks.x * chunks.y + y * chunks.x + x];
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
          if (!mesh.parent) world.chunks.add(mesh);
        } else if (mesh.parent) {
          world.chunks.remove(mesh);
          this.updateCollider(mesh.collider, []);
        }
      }
    });
    dudes.revaluatePaths();
    // this.physics.wakeAll();
  }
}

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
