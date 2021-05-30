dudes-server
[![npm-version](https://img.shields.io/npm/v/dudes-server.svg)](https://www.npmjs.com/package/dudes-server)
==

> Multiplayer server for the [dudes engine](https://github.com/danielesteban/dudes#readme)

#### Remix this project on glitch and host it for free:

[https://glitch.com/edit/#!/dudes-server](https://glitch.com/edit/#!/dudes-server)

#### Config.json options

```
The "id" will become the pathname of that world on the server.
Ex: Id === 'coolWorld' => ws://localhost:8081/coolWorld
The id "default" will also be served at '/'.
```

```json
[
  {
    "id": "test", "// The pathname of the world": "",
    "maxClients": 16, "// The maximum concurrent clients": "(default: 16)",
    "storage": "/data/test.blocks", "// Absolute path to storage": "(for persistence)",
    "dudes": {
      "maxDudes": 32, "// The maximum number of dudes": "(default: 32)",
      "minDistance": 16, "// The minimum distance to others required to spawn": "(default: 16)",
      "searchRadius": 64, "// The search radius for the pathfinding": "(default: 64)",
      "spawnRadius": 64, "// The search radius for the spawn algorithm": "(default: 64)",
      "// Optional origin for the spawn algorithm.": "",
      "// It defaults to the center of the world if undefined": "",
      "spawnOrigin": { "x": 0, "y": 0, "z": 0 },
      
    },
    "world": {
      "width": 256,      "// Volume width": "",
      "height": 64,      "// Volume height": "",
      "depth": 256,      "// Volume depth": "",
      "seaLevel": 6,     "// Sea level used in the generation and pathfinding": "",
      "seed": 987654321, "// Uint32 seed for the rng. Will use a random one if undefined": "",
      "// Built-in generators": "",
      "generator": "default", "// 'blank', 'default', 'menu', 'debugCity', 'partyBuildings', 'pit'": "",
    },
  }
]
```

#### To host it on your own server:

```bash
# install the server
npm install -g dudes-server
# start the server:
dudes-server ./config.json
```

#### Docker image:

```yaml
# docker-compose.yml
version: '3'
services:
  server:
    image: 'danigatunes/dudes-server'
    restart: always
    ports:
     - "127.0.0.1:8081:8081"
    volumes:
     - "./data:/data"

# place config.json in ./data
# run: docker-compose up -d
```

#### To use it as a node module:

```js
const WebSocket = require('ws');
const VoxelServer = require('dudes-server');

const world = new VoxelServer({
  world: {
    width: 400,
    height: 96,
    depth: 400,
  },
});

const server = new WebSocket.Server();
server.on('connection', (client) => (
  world.onClient(client)
));

console.log(`Listening on port ${server.options.port}`);
```
