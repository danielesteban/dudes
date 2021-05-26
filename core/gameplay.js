import { Color, FogExp2, Group, Matrix4, Vector3 } from '../vendor/three.js';
import Ambient from './ambient.js';
import Dudes from './dudes.js';
import Server from './server.js';
import VoxelWorld from './voxels.js';
import Birds from '../renderables/scenery/birds.js';
import Dome from '../renderables/scenery/dome.js';
import Clouds from '../renderables/scenery/clouds.js';
import Ocean from '../renderables/scenery/ocean.js';
import Rain from '../renderables/scenery/rain.js';
import Starfield from '../renderables/scenery/starfield.js';
import Bodies from '../renderables/bodies.js';
import Dude from '../renderables/dude.js';
import Explosion from '../renderables/explosion.js';
import Spheres from '../renderables/spheres.js';
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
      range: { from: 0, to: 128 },
      ...(options.ambient ? options.ambient : {}),
      sounds: [
        ...(options.ambient && options.ambient.sounds ? options.ambient.sounds : [
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
        ]),
        {
          url: '/sounds/rain.ogg',
          enabled: false,
        },
      ],
    });

    Bodies.setupMaterial();
    Dude.setupMaterial();
    Ocean.setupMaterial();
    this.lights = {
      light: {
        state: 0,
        target: 0,
      },
      sunlight: {
        state: 0,
        target: 1,
      },
    };

    this.explosions = [...Array(50)].map(() => {
      const explosion = new Explosion({ sfx: scene.sfx });
      this.add(explosion);
      return explosion;
    });

    if (options.projectiles) {
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
    }

    if (options.lightToggle) {
      const toggle = document.getElementById('light');
      toggle.classList.add('enabled');
      [...toggle.getElementsByTagName('svg')].forEach((svg, i) => {
        const target = i === 0 ? 1 : 0;
        svg.onclick = () => {
          if (
            this.lights.light.state !== this.lights.light.target
            || this.lights.sunlight.state !== this.lights.sunlight.target
          ) {
            return;
          }
          this.lights.light.target = 1 - target;
          this.lights.sunlight.target = target;
          toggle.classList[target >= 0.5 ? 'add' : 'remove']('day');
          toggle.classList[target < 0.5 ? 'add' : 'remove']('night');
        };
      });
    }

    if (options.rainToggle) {
      const toggle = document.getElementById('rain');
      toggle.classList.add('enabled');
      if (options.lightToggle) {
        toggle.classList.add('light');
      }
      toggle.onclick = () => {
        if (!this.rain) return;
        this.updateRain(!this.rain.visible);
        toggle.classList[this.rain.visible ? 'add' : 'remove']('active');
      };
    }

    Promise.all([
      options.physics !== false ? scene.getPhysics() : Promise.resolve(false),
      (!options.world.server ? Promise.resolve(options.world) : (
        new Promise((resolve) => {
          const color = new Color();
          const server = new Server({
            player: this.player,
            url: options.world.server,
            onLoad: ({
              dudes,
              world: {
                width,
                height,
                depth,
                voxels,
              },
            }) => {
              options.dudes = {
                ...(options.dudes || {}),
                server: dudes,
              };
              this.add(server);
              this.server = server;
              resolve({
                ...options.world,
                width,
                height,
                depth,
                voxels,
              });
            },
            onUpdate: (brush, voxel) => {
              if (this.hasLoaded) {
                this.updateVoxel({
                  ...brush,
                  color: color.setHex(brush.color),
                }, voxel, false);
              }
            },
            onSpawn: (dudes) => {
              if (this.hasLoaded) {
                this.dudes.spawnFromServer(dudes);
              }
            },
            onTarget: (dude, target) => {
              if (this.hasLoaded) {
                this.dudes.setDestination(
                  this.dudes.dudes.find(({ serverId }) => serverId === dude),
                  target
                );
              }
            },
          });
        })
      ))
        .then((options) => (
          new Promise((resolve) => {
            const world = new VoxelWorld({
              ...options,
              onLoad: () => {
                if (options.voxels) {
                  world.load(options.voxels)
                    .then(() => resolve(world));
                  return;
                }
                world.generate();
                resolve(world);
              },
            });
          })
        )),
    ])
      .then(([physics, world]) => {
        this.physics = physics;
        this.world = world;
        this.onLoad(options);
      });
  }

  onLoad(options) {
    const {
      physics,
      player,
      projectiles,
      server,
      world,
    } = this;

    world.chunks = new Group();
    world.chunks.matrixAutoUpdate = false;
    world.meshes = [];

    const spawn = (new Vector3(world.width * 0.5, 0, world.depth * 0.5)).floor();
    spawn.y = Math.max(world.seaLevel, world.getHeight(spawn.x, spawn.z) + 1);
    spawn.multiplyScalar(world.scale);
    player.teleport(spawn);

    this.dudes = new Dudes({
      searchRadius: 64,
      ...(options.dudes || {}),
      world,
      onSpawn: (dude) => {
        if (options.dudes && options.dudes.onContact) {
          dude.onContact = options.dudes.onContact;
        }
        if (physics) {
          physics.addMesh(dude, { isKinematic: true, isTrigger: !!dude.onContact });
        }
      },
    });

    this.birds = new Birds({ anchor: player });
    this.clouds = new Clouds(spawn);
    const dome = new Dome(spawn);
    const ocean = world.seaLevel > 0 ? (
      new Ocean({
        x: spawn.x,
        y: (world.seaLevel + 0.4) * world.scale,
        z: spawn.z,
      })
    ) : false;
    this.rain = new Rain({ anchor: player, world });
    const starfield = new Starfield(spawn);

    this.add(world.chunks);
    this.add(this.dudes);
    if (projectiles) this.add(projectiles);
    this.add(this.clouds);
    this.add(this.rain);
    this.add(starfield);
    this.add(dome);
    this.add(this.birds);
    if (ocean) this.add(ocean);

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
          if (physics) {
            chunk.collider = new Group();
            chunk.collider.isChunk = true;
            chunk.collider.position.copy(chunk.position);
            chunk.collider.physics = [];
            if (options.world.onContact) {
              chunk.collider.onContact = options.world.onContact;
            }
          }
          world.meshes.push(chunk);
          if (chunk.geometry.getIndex() !== null) {
            world.chunks.add(chunk);
            if (physics) {
              this.updateCollider(chunk.collider, world.colliders(x, y, z), true);
            }
          }
        }
      }
    }

    if (server) {
      this.dudes.spawnFromServer(options.dudes.server);
    } else {
      this.dudes.spawn({
        count: 32,
        origin: spawn.clone().divideScalar(world.scale).floor(),
        radius: 64,
        ...((options.dudes && options.dudes.spawn) || {}),
      });
    }
    if (physics && projectiles) physics.addMesh(projectiles, { mass: 1 });

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
    document.getElementById('light').classList.remove('enabled');
    document.getElementById('rain').classList.remove('enabled');
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
      ambient,
      birds,
      clouds,
      dudes,
      explosions,
      hasLoaded,
      lights,
      player,
      rain,
      server,
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
    if (server) {
      server.animate(animation);
    }
    if (
      lights.light.state !== lights.light.target
      || lights.sunlight.state !== lights.sunlight.target
    ) {
      const { light, sunlight } = lights;
      this.updateLights(
        light.state + Math.min(Math.max(light.target - light.state, -animation.delta), animation.delta),
        sunlight.state + Math.min(Math.max(sunlight.target - sunlight.state, -animation.delta), animation.delta),
      );
    }
  }

  onLocomotionTick({ animation, camera, isXR }) {
    const {
      hasLoaded,
      physics,
      player,
      world,
    } = this;
    if (!hasLoaded) {
      return;
    }
    player.onLocomotionTick({ animation, camera, isXR, physics });
    const seaLevel = world.seaLevel * world.scale;
    if (player.position.y < seaLevel) {
      player.move({ x: 0, y: seaLevel - player.position.y, z: 0 });
    } else if (player.position.y > 128) {
      player.move({ x: 0, y: 128 - player.position.y, z: 0 });
    }
  }

  remesh() {
    const { chunks, world } = this;
    for (let z = 0, i = 0; z < chunks.z; z += 1) {
      for (let y = 0; y < chunks.y; y += 1) {
        for (let x = 0; x < chunks.x; x += 1, i += 1) {
          const mesh = world.meshes[i];
          if (mesh.collider) {
            mesh.collider.physics.length = 0;
          }
          const geometry = world.mesh(x, y, z);
          if (geometry.indices.length > 0) {
            mesh.update(geometry);
            if (mesh.collider) {
              this.updateCollider(mesh.collider, world.colliders(x, y, z));
            }
            if (!mesh.parent) world.chunks.add(mesh);
          } else if (mesh.parent) {
            world.chunks.remove(mesh);
            if (mesh.collider) {
              this.updateCollider(mesh.collider, []);
            }
          }
        }
      }
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
    if (!physics || !projectiles) {
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

  updateLights(light, sunlight) {
    const { background, fog, lights } = this;
    lights.light.state = light;
    lights.sunlight.state = sunlight;
    background.setHex(0x226699).multiplyScalar(Math.max(sunlight, 0.05));
    fog.color.copy(background);
    Birds.material.uniforms.diffuse.value.setScalar(sunlight);
    Bodies.material.color.setScalar(Math.max(sunlight, 0.3));
    Clouds.material.color.setScalar(sunlight);
    Dome.material.uniforms.background.value.copy(background);
    Ocean.material.color.copy(background);
    Rain.material.uniforms.diffuse.value.copy(background);
    Starfield.material.opacity = 1.0 - sunlight;
    [Dude.material, VoxelChunk.material].forEach(({ uniforms }) => {
      uniforms.ambientIntensity.value = Math.max(Math.min(sunlight, 0.7) / 0.7, 0.5) * 0.1;
      uniforms.lightIntensity.value = Math.min(light, 0.7);
      uniforms.sunlightIntensity.value = Math.min(sunlight, 0.7);
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

  updateVoxel(brush, voxel, broadcast = true) {
    const {
      chunks,
      dudes,
      server,
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
          if (mesh.collider && Math.abs(chunkY - y) <= 1) {
            this.updateCollider(
              mesh.collider,
              world.colliders(x, y, z),
              x === chunkX && y === chunkY && z === chunkZ
            );
          }
          if (!mesh.parent) world.chunks.add(mesh);
        } else if (mesh.parent) {
          world.chunks.remove(mesh);
          if (mesh.collider) {
            this.updateCollider(mesh.collider, []);
          }
        }
      }
    });
    dudes.revaluatePaths();
    // this.physics.wakeAll();
    if (server && broadcast) {
      server.request({
        type: 'UPDATE',
        voxel,
        brush: {
          ...brush,
          color: brush.color.getHex(),
        },
      });
    }
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
