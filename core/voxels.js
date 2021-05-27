class VoxelWorld {
  constructor({
    width,
    height,
    depth,
    seaLevel = 6,
    scale = 0.5,
    chunkSize = 16,
    generator = 'default',
    seed = Math.floor(Math.random() * 2147483647),
    onLoad,
  }) {
    this.chunkSize = chunkSize;
    this.generator = typeof generator === 'function' ? generator : VoxelWorld.generators[generator];
    this.seed = seed;
    this.seaLevel = seaLevel;
    this.scale = scale;
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
      { id: 'world', type: Int32Array, size: 4 },
      { id: 'bounds', type: Float32Array, size: 4 },
    ];
    const pages = Math.ceil(layout.reduce((total, { type, size }) => (
      total + size * type.BYTES_PER_ELEMENT
    ), 0) / 65536) + 10;
    const memory = new WebAssembly.Memory({ initial: pages, maximum: pages });
    VoxelWorld.getWASM()
      .then((wasm) => WebAssembly.instantiate(wasm, { env: { memory } }))
      .then((instance) => {
        this._colliders = instance.exports.colliders;
        this._findGround = instance.exports.findGround;
        this._findPath = instance.exports.findPath;
        this._findTarget = instance.exports.findTarget;
        this._generate = instance.exports.generate;
        this._getHeight = instance.exports.getHeight;
        this._getLight = instance.exports.getLight;
        this._heightmap = instance.exports.heightmap;
        this._mesh = instance.exports.mesh;
        this._propagate = instance.exports.propagate;
        this._update = instance.exports.update;
        layout.forEach(({ id, type, size }) => {
          const address = instance.exports.malloc(size * type.BYTES_PER_ELEMENT);
          this[id] = {
            address,
            view: new type(memory.buffer, address, size),
          };
        });
        this.world.view.set([width, height, depth, seaLevel]);
        onLoad();
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

  findGround({
    avoidTrees,
    height,
    voxel,
  }) {
    const {
      world,
      heightmap,
      voxels,
    } = this;
    return this._findGround(
      world.address,
      heightmap.address,
      voxels.address,
      avoidTrees,
      height,
      voxel.x,
      voxel.y,
      voxel.z
    );
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
    obstacles(obstaclesMap.view.fill(0));
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
    obstacles(obstaclesMap.view.fill(0));
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
      return queueA.view.subarray(0, 3);
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
      generator,
      seed,
    } = this;
    heightmap.view.fill(0);
    voxels.view.fill(0);
    if (typeof generator === 'function') {
      const { width, height, depth } = this;
      for (let z = 0, voxel = 0; z < depth; z += 1) {
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1, voxel += 6) {
            const result = generator(x, y, z);
            if (!result) {
              continue;
            }
            voxels.view[voxel] = typeof result.type === 'number' ? result.type : VoxelWorld.blockTypes[result.type];
            voxels.view[voxel + 1] = result.r;
            voxels.view[voxel + 2] = result.g;
            voxels.view[voxel + 3] = result.b;
            const heightmapIndex = z * width + x;
            if (heightmap.view[heightmapIndex] < y) {
              heightmap.view[heightmapIndex] = y;
            }
          }
        }
      }
    } else {
      this._generate(
        world.address,
        heightmap.address,
        voxels.address,
        queueA.address,
        queueB.address,
        generator,
        seed
      );
    }
    this._propagate(
      world.address,
      heightmap.address,
      voxels.address,
      queueA.address,
      queueB.address,
      queueC.address
    );
  }

  getHeight(x, z) {
    const {
      world,
      heightmap,
    } = this;
    return this._getHeight(
      world.address,
      heightmap.address,
      x, z
    );
  }

  getLight(x, y, z) {
    const {
      world,
      voxels,
    } = this;
    return this._getLight(
      world.address,
      voxels.address,
      x, y, z
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

  load(deflated) {
    if (!VoxelWorld.zlib) VoxelWorld.setupZlibWorker();
    const { zlib } = VoxelWorld;
    const {
      world,
      heightmap,
      voxels,
    } = this;
    return zlib.request({ data: deflated, operation: 'unzlib' })
      .then((buffer) => {
        voxels.view.set(buffer);
        this._heightmap(
          world.address,
          heightmap.address,
          voxels.address
        );
      });
  }

  save() {
    if (!VoxelWorld.zlib) VoxelWorld.setupZlibWorker();
    const { zlib } = VoxelWorld;
    const { voxels } = this;
    return zlib.request({ data: new Uint8Array(voxels.view), operation: 'zlib' });
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

  static getWASM() {
    if (VoxelWorld.wasm) {
      return Promise.resolve(VoxelWorld.wasm);
    }
    return new Promise((resolve) => {
      if (VoxelWorld.loadingWASM) {
        VoxelWorld.loadingWASM.push(resolve);
        return;
      }
      VoxelWorld.loadingWASM = [resolve];
      const source = fetch('/voxels.wasm');
      (WebAssembly.compileStreaming ? (
        WebAssembly.compileStreaming(source)
      ) : (
        source
          .then((res) => res.arrayBuffer())
          .then((buffer) => WebAssembly.compile(buffer))
      ))
        .then((wasm) => {
          VoxelWorld.wasm = wasm;
          VoxelWorld.loadingWASM.forEach((resolve) => resolve(wasm));
          delete VoxelWorld.loadingWASM;
        })
        .catch((e) => console.error(e));
    });
  }

  static setupZlibWorker() {
    let requestId = 0;
    const requests = [];
    this.zlib = new Worker('/fflate.worker.js');
    this.zlib.addEventListener('message', ({ data: { id, data } }) => {
      const req = requests.findIndex((p) => p.id === id);
      if (req !== -1) {
        requests.splice(req, 1)[0].resolve(data);
      }
    });
    this.zlib.request = ({ data, operation }) => (
      new Promise((resolve) => {
        const id = requestId++;
        requests.push({ id, resolve });
        this.zlib.postMessage({ id, data, operation }, [data.buffer]);
      })
    );
  }
}

VoxelWorld.blockTypes = {
  air: 0,
  dirt: 1,
  light: 2,
  stone: 3,
  tree: 4,
};

VoxelWorld.brushes = new Map();

VoxelWorld.brushShapes = {
  box: 0,
  sphere: 1,
};

VoxelWorld.generators = {
  blank: 0,
  default: 1,
  menu: 2,
  debugCity: 3,
  partyBuildings: 4,
  pit: 5,
  sculpt: 6,
};

export default VoxelWorld;
