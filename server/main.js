#!/usr/bin/env node

const path = require('path');
const WebSocket = require('ws');
const VoxelServer = require('./server.js');

if (process.argv.length > 3) {
  console.log('Usage: dudes-server ./config.json', '\n');
  process.exit(1);
}

const worlds = new Map();
const config = (
  process.argv[2] ? (
    require(path.resolve(process.argv[2]))
  ) : [
    {
      id: 'default',
      world: {
        width: 400,
        height: 96,
        depth: 400,
      },
    },
  ]
);
config.forEach(({ id, ...config }) => {
  worlds.set(id, new VoxelServer(config));
});

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
