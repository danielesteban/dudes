import { Color, Group } from '../vendor/three.js';

class VoxelWorld {
  constructor({
    chunkSize = 16,
    scale = 0.5,
    seed = Math.floor(Math.random() * 2147483647),
    width,
    height,
    depth,
    onLoad,
  }) {
    this.brush = {
      color: new Color(0xAAAAAA),
      noise: 0.15,
      shape: VoxelWorld.brushShapes.box,
      size: 1,
      type: 3,
    };
    this.chunks = new Group();
    this.chunks.matrixAutoUpdate = false;
    this.chunkSize = chunkSize;
    this.meshes = [];
    this.scale = scale;
    this.seed = seed;
    this.width = width;
    this.height = height;
    this.depth = depth;
    // worst possible case
    const maxVoxelsPerChunk = Math.ceil(chunkSize * chunkSize * chunkSize * 0.5);
    const maxFacesPerChunk = maxVoxelsPerChunk * 6;
    const queueSize = width * depth * 3;
    const layout = [
      { id: 'voxels', type: Uint8Array, size: width * height * depth * 6 },
      { id: 'colliderBoxes', type: Uint8Array, size: maxVoxelsPerChunk * 6 },
      { id: 'colliderMap', type: Uint8Array, size: chunkSize * chunkSize * chunkSize },
      { id: 'obstaclesMap', type: Uint8Array, size: width * height * depth },
      { id: 'vertices', type: Uint8Array, size: maxFacesPerChunk * 4 * 8 },
      { id: 'indices', type: Uint32Array, size: maxFacesPerChunk * 6 },
      { id: 'heightmap', type: Int32Array, size: width * depth },
      { id: 'queueA', type: Int32Array, size: queueSize },
      { id: 'queueB', type: Int32Array, size: queueSize },
      { id: 'queueC', type: Int32Array, size: queueSize },
      { id: 'world', type: Int32Array, size: 3 },
      { id: 'bounds', type: Float32Array, size: 4 },
    ];
    const pages = Math.ceil(layout.reduce((total, { type, size }) => (
      total + size * type.BYTES_PER_ELEMENT
    ), 0) / 65536) + 2;
    const memory = new WebAssembly.Memory({ initial: pages, maximum: pages });
    const source = fetch('/voxels.wasm');
    (WebAssembly.instantiateStreaming ? (
      WebAssembly.instantiateStreaming(source, { env: { memory } })
    ) : (
      source
        .then((res) => res.arrayBuffer())
        .then((buffer) => WebAssembly.instantiate(buffer, { env: { memory } }))
    ))
      .then(({ instance }) => {
        this._colliders = instance.exports.colliders;
        this._findPath = instance.exports.findPath;
        this._findTarget = instance.exports.findTarget;
        this._generate = instance.exports.generate;
        this._mesh = instance.exports.mesh;
        this._propagate = instance.exports.propagate;
        this._update = instance.exports.update;
        let address = instance.exports.__heap_base * 1;
        layout.forEach(({ id, type, size }) => {
          this[id] = {
            address,
            view: new type(memory.buffer, address, size),
          };
          address += size * type.BYTES_PER_ELEMENT;
        });
        this.world.view.set([width, height, depth]);
        this.generate();
        if (onLoad) {
          onLoad(this);
        }
        this.hasLoaded = true;
      })
      .catch((e) => console.error(e));
  }

  colliders(x, y, z) {
    const {
      world,
      voxels,
      colliderBoxes,
      colliderMap,
      chunkSize,
    } = this;
    colliderMap.view.fill(0);
    const boxes = this._colliders(
      world.address,
      voxels.address,
      colliderBoxes.address,
      colliderMap.address,
      chunkSize,
      x * chunkSize,
      y * chunkSize,
      z * chunkSize
    );
    if (boxes === -1) {
      throw new Error('Requested chunk is out of bounds');
    }
    return colliderBoxes.view.subarray(0, boxes * 6);
  }

  findPath({
    height,
    from,
    to,
    obstacles,
  }) {
    const {
      world,
      voxels,
      obstaclesMap,
      queueA,
    } = this;
    this.setupObstaclesMap(obstacles);
    const nodes = this._findPath(
      world.address,
      voxels.address,
      obstaclesMap.address,
      queueA.address,
      height,
      from.x,
      from.y,
      from.z,
      to.x,
      to.y,
      to.z
    );
    if (nodes === -1) {
      throw new Error('Requested path is out of bounds');
    }
    return queueA.view.subarray(0, nodes * 4);
  }

  findTarget({
    height,
    radius,
    origin,
    obstacles,
  }) {
    const {
      world,
      heightmap,
      voxels,
      obstaclesMap,
      queueA,
    } = this;
    this.setupObstaclesMap(obstacles);
    const found = this._findTarget(
      world.address,
      heightmap.address,
      voxels.address,
      obstaclesMap.address,
      queueA.address,
      height,
      radius,
      origin.x,
      origin.y,
      origin.z
    );
    if (found === 1) {
      return queueA.view.subarray(0, 4);
    }
    return false;
  }

  generate() {
    const {
      world,
      heightmap,
      voxels,
      queueA,
      queueB,
      queueC,
      seed,
    } = this;
    heightmap.view.fill(0);
    voxels.view.fill(0);
    this._generate(
      world.address,
      heightmap.address,
      voxels.address,
      queueA.address,
      queueB.address,
      seed
    );
    this._propagate(
      world.address,
      heightmap.address,
      voxels.address,
      queueA.address,
      queueB.address,
      queueC.address
    );
  }

  mesh(x, y, z) {
    const {
      world,
      voxels,
      chunkSize,
      bounds,
      indices,
      vertices,
    } = this;
    const faces = this._mesh(
      world.address,
      voxels.address,
      bounds.address,
      indices.address,
      vertices.address,
      chunkSize,
      x * chunkSize,
      y * chunkSize,
      z * chunkSize
    );
    if (faces === -1) {
      throw new Error('Requested chunk is out of bounds');
    }
    return {
      bounds: new Float32Array(bounds.view),
      indices: new ((faces * 4 - 1) <= 65535 ? Uint16Array : Uint32Array)(
        indices.view.subarray(0, faces * 6)
      ),
      vertices: new Uint8Array(vertices.view.subarray(0, faces * 4 * 8)),
    };
  }

  update({
    type,
    x, y, z,
    r, g, b,
  }) {
    const {
      world,
      heightmap,
      voxels,
      queueA,
      queueB,
      queueC,
    } = this;
    this._update(
      world.address,
      heightmap.address,
      voxels.address,
      queueA.address,
      queueB.address,
      queueC.address,
      type,
      x, y, z,
      r, g, b
    );
  }

  setupObstaclesMap(obstacles) {
    const {
      obstaclesMap,
      width,
      height,
      depth,
    } = this;
    obstaclesMap.view.fill(0);
    obstacles.forEach(({ x, y, z }) => {
      if (
        x < 0 || x >= width
        || y < 0 || y >= height
        || z < 0 || z >= depth
      ) {
        return;
      }
      obstaclesMap.view[z * width * height + y * width + x] = 1;
    });
  }

  static getBrush({ shape, size }) {
    const { brushShapes, brushes } = VoxelWorld;
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

VoxelWorld.brushes = new Map();

VoxelWorld.brushShapes = {
  box: 0,
  sphere: 1,
};

export default VoxelWorld;
