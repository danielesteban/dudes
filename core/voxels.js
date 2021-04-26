class VoxelWorld {
  constructor({
    chunkSize = 16,
    width,
    height,
    depth,
    onLoad,
  }) {
    this.chunkSize = chunkSize;
    this.width = width;
    this.height = height;
    this.depth = depth;
    const maxVoxelsPerChunk = Math.ceil(chunkSize * chunkSize * chunkSize * 0.5); // worst possible case
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
    (VoxelWorld.wasm ? (
      Promise.resolve(VoxelWorld.wasm)
    ) : (
      fetch('/core/voxels.wasm')
        .then((res) => res.arrayBuffer())
        .then((buffer) => {
          VoxelWorld.wasm = buffer;
          return buffer;
        })
    ))
      .then((buffer) => WebAssembly.instantiate(buffer, { env: { memory } }))
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

  findPath({ from, to, obstacles }) {
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

  findTarget({ origin, radius, obstacles }) {
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
      origin.x,
      origin.y,
      origin.z,
      radius
    );
    if (found === 1) {
      return queueA.view.subarray(0, 4);
    }
    return false;
  }

  generate(seed = Math.floor(Math.random() * 2147483647)) {
    const {
      world,
      heightmap,
      voxels,
      queueA,
      queueB,
      queueC,
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

  setupPakoWorker() {
    let requestId = 0;
    const requests = [];
    this.pako = new Worker('/vendor/pako.worker.js');
    this.pako.addEventListener('message', ({ data: { id, data } }) => {
      const req = requests.findIndex((p) => p.id === id);
      if (req !== -1) {
        requests.splice(req, 1)[0].resolve(data);
      }
    });
    this.pako.request = ({ data, operation }) => (
      new Promise((resolve) => {
        const id = requestId++;
        requests.push({ id, resolve });
        this.pako.postMessage({ id, data, operation }, [data.buffer]);
      })
    );
  }

  exportVoxels() {
    if (!this.pako) this.setupPakoWorker();
    const { voxels, pako } = this;
    return pako.request({ data: new Uint8Array(voxels.view), operation: 'deflate' });
  }

  importVoxels(deflated) {
    if (!this.pako) this.setupPakoWorker();
    const {
      width,
      height,
      depth,
      heightmap,
      voxels,
      pako,
    } = this;
    return pako.request({ data: deflated, operation: 'inflate' })
      .then((inflated) => {
        // This should prolly be a method in the C implementation
        for (let z = 0, index = 0; z < depth; z += 1) {
          for (let x = 0; x < width; x += 1, index += 1) {
            for (let y = height - 1; y >= 0; y -= 1) {
              if (
                y === 0
                || inflated[(z * width * height + y * width + x) * 6] !== 0
              ) {
                heightmap.view[index] = y;
                break;
              }
            }
          }
        }
        voxels.view.set(inflated);
      });
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
}

export default VoxelWorld;
