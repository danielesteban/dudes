const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');
const { v4: uuid } = require('uuid');
const zlib = require('zlib');
const requireESM = require('esm')(module);
const { default: VoxelWorld } = requireESM(path.resolve(__dirname, '..', 'core', 'voxels.js'));
const Dudes = require('./dudes.js');

const Message = protobuf
  .loadSync(path.join(__dirname, 'messages.proto'))
  .lookupType('protocol.Message');

// Patch WASM loader
VoxelWorld.getWASM = () => {
  if (VoxelWorld.wasm) {
    return Promise.resolve(VoxelWorld.wasm);
  }
  return new Promise((resolve) => {
    if (VoxelWorld.loadingWASM) {
      VoxelWorld.loadingWASM.push(resolve);
      return;
    }
    VoxelWorld.loadingWASM = [resolve];
    return WebAssembly.compile(
      fs.readFileSync(path.resolve(__dirname, '..', 'core', 'voxels.wasm'))
    )
      .then((wasm) => {
        VoxelWorld.wasm = wasm;
        VoxelWorld.loadingWASM.forEach((resolve) => resolve(wasm));
        delete VoxelWorld.loadingWASM;
      });
  });
};

class VoxelServer {
  constructor(options) {
    this.clients = [];
    this.maxClients = options.maxClients || 16;
    this.world = new VoxelWorld({
      ...options.world,
      onLoad: () => {
        this.world.generate();
        this.hasLoaded = true;
        this.dudes = new Dudes(this, options.dudes || {});
      },
    });
  }

  onClient(client) {
    const { clients, dudes, pingInterval, world } = this;
    zlib.deflate(world.voxels.view, (err, voxels) => {
      if (err) {
        client.terminate();
        return;
      }
      client.id = uuid();
      client.send(Message.encode(Message.create({
        type: Message.Type.LOAD,
        dudes: dudes.dudes.map((dude) => (dude.path ? ({ ...dude, target: dude.path[dude.path.length - 1] }) : dude)),
        peers: clients.map(({ id }) => id),
        world: {
          width: world.width,
          height: world.height,
          depth: world.depth,
          voxels,
        },
      })).finish(), VoxelServer.noop);
      this.broadcast({
        type: 'JOIN',
        id: client.id,
      });
      clients.push(client);
      client.isAlive = true;
      client.once('close', () => this.onClose(client));
      client.on('message', (data) => this.onMessage(client, data));
      client.on('pong', () => {
        client.isAlive = true;
      });
      if (!pingInterval) {
        this.pingInterval = setInterval(this.ping.bind(this), 30000);
      }
      if (dudes.isPaused) {
        dudes.resume();
      }
    });
  }
  
  onClose(client) {
    const { clients, dudes, pingInterval } = this;
    if (client.dude) {
      client.dude.selected -= 1;
      delete client.dude;
    }
    const index = clients.findIndex(({ id }) => (id === client.id));
    if (~index) {
      clients.splice(index, 1);
      this.broadcast({
        type: 'LEAVE',
        id: client.id,
      });
      if (!clients.length) {
        if (pingInterval) {
          clearInterval(pingInterval);
          delete this.pingInterval;
        }
        dudes.pause();
      }
    }
  }

  onMessage(client, data) {
    let message;
    try {
      message = Message.decode(data);
    } catch (e) {
      return;
    }
    const { clients, dudes, world } = this;
    switch (message.type) {
      case Message.Type.SIGNAL: {
        const { id, signal } = message;
        if (!id || !signal) {
          return;
        }
        const peer = clients.find(({ id: peer }) => (peer === id));
        if (!peer) {
          return;
        }
        peer.send(Message.encode(Message.create({
          type: Message.Type.SIGNAL,
          id: client.id,
          signal,
        })).finish(), VoxelServer.noop);
        break;
      }
      case Message.Type.SELECT:
      case Message.Type.TARGET: {
        if (client.dude) {
          client.dude.selected -= 1;
          delete client.dude;
        }
        if (!message.id) {
          return;
        }
        const dude = dudes.dudes.find(({ id: dude }) => (dude === message.id));
        if (!dude) {
          return;
        }
        client.dude = dude;
        dude.selected += 1;
        if (message.voxel) {
          dudes.setDestination(dude, message.voxel);
        }
        break;
      }
      case Message.Type.UPDATE: {
        const { brush, voxel } = message;
        if (brush.size <= 0 || brush.size > 4) {
          return;
        }
        const r = ((brush.color >> 16) & 0xFF) / 0xFF;
        const g = ((brush.color >> 8) & 0xFF) / 0xFF;
        const b = (brush.color & 0xFF) / 0xFF;
        const noise = ((r + g + b) / 3) * brush.noise;
        VoxelWorld.getBrush({
          shape: brush.shape,
          size: brush.size,
        }).forEach(({ x, y, z }) => (
          world.update({
            x: voxel.x + x,
            y: voxel.y + y,
            z: voxel.z + z,
            type: brush.type,
            r: Math.min(Math.max((r + (Math.random() - 0.5) * noise) * 0xFF, 0), 0xFF),
            g: Math.min(Math.max((g + (Math.random() - 0.5) * noise) * 0xFF, 0), 0xFF),
            b: Math.min(Math.max((b + (Math.random() - 0.5) * noise) * 0xFF, 0), 0xFF),
          })
        ));
        this.broadcast({
          type: 'UPDATE',
          brush,
          voxel,
        }, { exclude: client.id });
        dudes.revaluatePaths();
        break;
      }
      default:
        break;
    }
  }

  broadcast(message, { exclude, include } = {}) {
    const { clients } = this;
    message.type = Message.Type[message.type];
    const encoded = Message.encode(Message.create(message)).finish();
    if (exclude && !Array.isArray(exclude)) {
      exclude = [exclude];
    }
    if (include && !Array.isArray(include)) {
      include = [include];
    }
    clients.forEach((client) => {
      if (
        (!include || ~include.indexOf(client.id))
        && (!exclude || exclude.indexOf(client.id) === -1)
      ) {
        client.send(encoded, VoxelServer.noop);
      }
    });
  }

  ping() {
    const { clients } = this;
    clients.forEach((client) => {
      if (client.isAlive === false) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping(VoxelServer.noop);
    });
  }

  static noop() {}
}

module.exports = VoxelServer;

