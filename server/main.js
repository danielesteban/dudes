const path = require('path');
const WebSocket = require('ws');
const VoxelServer = require('./server.js');

const worlds = new Map();
worlds.set('default', new VoxelServer({
  maxClients: 32,
  world: {
    width: 400,
    height: 96,
    depth: 400,
    generator: 'debugCity',
    seed: 123456789,
  },
}));
worlds.set('sculpt', new VoxelServer({
  maxClients: 32,
  dudes: {
    maxDudes: 32,
    minDistance: 16,
    searchRadius: 32,
    spawnOrigin: {
      x: 128,
      y: 48,
      z: 128,
    },
    spawnRadius: 128,
  },
  world: {
    width: 256,
    height: 96,
    depth: 256,
    generator: 'blank',
  },
}));

const server = new WebSocket.Server({
  clientTracking: false,
  port: process.env.PORT || 8081,
});
server.on('connection', (client, req) => {
  const world = worlds.get(req.url.substr(1).split('/')[0] || 'default');
  if (!world || !world.hasLoaded || world.clients.length >= world.maxClients) {
    client.terminate();
    return;
  }
  world.onClient(client);
});

const shutdown = () => (
  server.close(() => (
    Promise.all(
      [...worlds.values()]
        .filter((world) => world.storage)
        .map((world) => world.save())
    )
      .catch(() => {})
      .finally(() => process.exit(0))
  ))
);
process
  .on('SIGTERM', shutdown)
  .on('SIGINT', shutdown);

console.log(`Listening on port ${server.options.port}`);
