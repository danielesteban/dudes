import { Group, Vector3 } from '../vendor/three.js';
import VoxelWorld from '../core/voxels.js';
import VoxelChunk from './chunk.js';

class Helicopter extends Group {
  constructor({ sfx, sound }) {
    super();

    this.aux = {
      pivot: new Vector3(),
      movement: new Vector3(),
    };
    this.acceleration = new Vector3();
    this.velocity = new Vector3();
    if (sfx && sound) {
      sfx.load(sound)
        .then((sound) => {
          sound.setLoop(true);
          sound.position.set(0, 2.75, 0);
          this.sound = sound;
          this.add(sound);
          if (sound.context.state === 'running') {
            sound.play();
          }
        });
    }
  }

  animate(animation) {
    const { rotor } = this;
    if (rotor) {
      rotor.rotation.y += animation.delta * 5;
    }
  }

  resumeAudio() {
    const { sound } = this;
    if (sound && !sound.isPlaying) {
      sound.play();
    }
  }

  voxelize() {
    return new Promise((resolve) => {
      const voxelizer = new VoxelWorld({
        width: 32,
        height: 32,
        depth: 32,
        scale: 0.125,
        onLoad: () => generate(),
      });
      const meshModel = (offset, colliders) => {
        const model = new Group();
        const chunks = {
          x: voxelizer.width / voxelizer.chunkSize,
          y: voxelizer.height / voxelizer.chunkSize,
          z: voxelizer.depth / voxelizer.chunkSize,
        };
        for (let z = 0; z < chunks.z; z += 1) {
          for (let y = 0; y < chunks.y; y += 1) {
            for (let x = 0; x < chunks.x; x += 1) {
              const chunk = new VoxelChunk({
                x: offset.x + x * voxelizer.chunkSize,
                y: offset.y + y * voxelizer.chunkSize,
                z: offset.z + z * voxelizer.chunkSize,
                geometry: voxelizer.mesh(x, y, z),
                scale: voxelizer.scale,
              });
              if (chunk.geometry.getIndex() !== null) {
                model.add(chunk);
                if (colliders) {
                  const boxes = voxelizer.colliders(x, y, z);
                  if (boxes.length) {
                    chunk.collider = new Group();
                    chunk.collider.position.copy(chunk.position);
                    chunk.collider.physics = [];
                    for (let i = 0, l = boxes.length; i < l; i += 6) {
                      chunk.collider.physics.push({
                        shape: 'box',
                        width: boxes[i + 3] * voxelizer.scale,
                        height: boxes[i + 4] * voxelizer.scale,
                        depth: boxes[i + 5] * voxelizer.scale,
                        position: {
                          x: (boxes[i] + boxes[i + 3] * 0.5) * voxelizer.scale,
                          y: (boxes[i + 1] + boxes[i + 4] * 0.5) * voxelizer.scale,
                          z: (boxes[i + 2] + boxes[i + 5] * 0.5) * voxelizer.scale,
                        },
                      });
                    }
                    model.add(chunk.collider);
                  }
                }
              }
            }
          }
        }
        return model;
      };
      const generate = () => {
        voxelizer.generateModel((x, y, z) => {
          if (
            // Limits
            y === 0
            || y > 22
            || (
              y > 20
              && (
                x < 15 || x > 16
                || z < 15 || z > 16
              )
            ) || (
              x < 12 || x > 19
              || z < 12 || z > 27
            )
            // Mid cut
            || (
              (y === 9 || y === 12)
              && z > 18
              && (x === 13 || x === 18)
            )
            // Back box
            || (
              z > 19
              && (y < 5 || y > 16)
            )
            // Cockpit
            || (
              y > 1 && y < 20
              && x > 12 && x < 19
              && z > 12 && z < 19
            )
            // Side Windows
            || (
              y > 4 && y < 17
              && z > 13 && z < 18
            )
            // Front Window
            || (
              y > 6 && y < 15
              && x > 13 && x < 18
              && z < 28
            )
            // Bottom Window
            || (
              y < 16
              && x > 13 && x < 18
              && z > 19 && z < 26
            )
          ) {
            return false;
          }
          let color;
          if (y < 2 || y > 19) {
            color = { r: 0x33, g: 0x33, b: 0x33 };
          } else if (y < 6 || y > 15) {
            color = { r: 0x99, g: 0x33, b: 0x33 };
          } else {
            color = { r: 0x99, g: 0x99, b: 0x99 };
          }
          return {
            type: 3,
            r: color.r - Math.random() * 0x11,
            g: color.g - Math.random() * 0x11,
            b: color.b - Math.random() * 0x11,
          };
        });
        const cockpit = meshModel({
          x: voxelizer.width * -0.5,
          y: -11,
          z: voxelizer.depth * -0.5,
        }, true);
        cockpit.position.set(0, 1.25, 0);
        this.cockpit = cockpit;
        this.add(cockpit);

        voxelizer.generateModel((x, y, z) => {
          if (
            // Limits
            y !== 1
            || (
              x < 4 || x > 27
              || z < 4 || z > 27
            )
            // Blades
            || (
              (x < 15 || x > 16)
              && (z < 15 || z > 16)
            )
          ) {
            return false;
          }
          return {
            type: 3,
            r: 0x33 - Math.random() * 0x11,
            g: 0x33 - Math.random() * 0x11,
            b: 0x33 - Math.random() * 0x11,
          };
        });
        const rotor = meshModel({
          x: voxelizer.width * -0.5,
          y: -1.5,
          z: voxelizer.depth * -0.5,
        });
        rotor.position.set(0, 2.75, 0);
        rotor.scale.set(1, 0.5, 1);
        this.rotor = rotor;
        this.add(rotor);
        resolve();
      };
    });
  }
}

export default Helicopter;
