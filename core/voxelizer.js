import { Group } from '../vendor/three.js';
import VoxelWorld from './voxels.js';
import VoxelChunk from '../renderables/chunk.js';

class Voxelizer {
  constructor({
    maxWidth,
    maxHeight,
    maxDepth,
    seaLevel,
  }) {
    this.loading = [];
    this.world = new VoxelWorld({
      width: maxWidth,
      height: maxHeight,
      depth: maxDepth,
      seaLevel,
      onLoad: () => {
        const { loading: queue } = this;
        delete this.loading;
        this.chunks = {
          x: this.world.width / this.world.chunkSize,
          y: this.world.height / this.world.chunkSize,
          z: this.world.depth / this.world.chunkSize,
        };
        queue.forEach(({ resolve, ...payload }) => (
          resolve(this.voxelize(payload))
        ));
      },
    });
  }

  voxelize({
    colliders,
    generator,
    offset,
    scale,
    seed,
  }) {
    const { chunks, loading, world } = this;
    return new Promise((resolve) => {
      if (loading) {
        loading.push({
          colliders,
          generator,
          offset,
          scale,
          resolve,
        });
        return;
      }
      if (typeof generator === 'function') {
        world.generateModel(generator);
      } else {
        world.generator = VoxelWorld.generators[generator];
        world.seed = seed;
        world.generate();
      }
      const model = new Group();
      for (let z = 0; z < chunks.z; z += 1) {
        for (let y = 0; y < chunks.y; y += 1) {
          for (let x = 0; x < chunks.x; x += 1) {
            const chunk = new VoxelChunk({
              x: offset.x + x * world.chunkSize,
              y: offset.y + y * world.chunkSize,
              z: offset.z + z * world.chunkSize,
              geometry: world.mesh(x, y, z),
              scale,
            });
            if (chunk.geometry.getIndex() === null) {
              continue;
            }
            model.add(chunk);
            if (!colliders) {
              continue;
            }
            const boxes = world.colliders(x, y, z);
            if (!boxes.length) {
              continue;
            }
            chunk.collider = new Group();
            chunk.collider.matrixAutoUpdate = false;
            chunk.collider.position.copy(chunk.position);
            chunk.collider.physics = [];
            chunk.collider.updateMatrix();
            for (let i = 0, l = boxes.length; i < l; i += 6) {
              chunk.collider.physics.push({
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
            model.add(chunk.collider);
          }
        }
      }
      resolve(model);
    });
  }
}

export default Voxelizer;
