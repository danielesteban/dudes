[dudes!](https://dudes.gatunes.com/)
==

[![screenshot](https://github.com/danielesteban/dudes/raw/master/screenshot.png)](https://dudes.gatunes.com/)

#### Live examples

 * [demo](https://dudes.gatunes.com/) | [source](examples/scenes/menu.js) - Menu
 * [demo](https://dudes.gatunes.com/sculpt) | [source](examples/scenes/sculpt.js) - DudeBrush: A VR sculpting tool with import/export 
   * [demo](https://dudes.gatunes.com/sculptserver) | [source](examples/scenes/sculptserver.js) - Multiplayer version
 * [demo](https://dudes.gatunes.com/debug) | [source](examples/scenes/debug.js) - A scene to debug the voxel updates, the physics contact callbacks and the dudes pathfinding.
   * [demo](https://dudes.gatunes.com/debugserver) | [source](examples/scenes/debugserver.js) - Multiplayer version
 * [demo](https://dudes.gatunes.com/heli) | [source](examples/scenes/heliparty.js) - A helicopter gameplay where you help "The Chief" fly dudes up to the party.
 * [demo](https://dudes.gatunes.com/party) | [source](examples/scenes/party.js) - A rave party where you can change the song by showing both thumbs down to "The Chief".
 * [demo](https://dudes.gatunes.com/pit) | [source](examples/scenes/pit.js) - A worldgen happy accident
 * [demo](https://dudes.gatunes.com/stress) | [source](examples/scenes/stress.js) - A stress test
 * [demo](https://dudes.gatunes.com/poop) | [source](examples/scenes/poop.js) - Some state-of-the-art poop tech

#### Hello World / Boilerplate

[https://github.com/danielesteban/dudes-boilerplate](https://github.com/danielesteban/dudes-boilerplate.git)

```bash
# clone the boilerplate
git clone https://github.com/danielesteban/dudes-boilerplate.git
cd dudes-boilerplate
# install dev dependencies
npm install
# start the dev environment:
npm start
# open http://localhost:8080/ in your browser
```

#### Multiplayer server

```bash
# clone this repo
git clone https://github.com/danielesteban/dudes.git
cd dudes/server
# install dev dependencies
npm install
# edit worlds config in server/main.js
# and start the server:
npm start
# set ws://localhost:8081/ as the server in the world config,
```

#### Gameplay constructor options

```js
{
  world: {
    // For singleplayer
    chunkSize: 16,   // Size of the rendering chunks (default: 16)
    scale: 0.5,      // Scale of the rendering chunks (default: 0.5)
    width: 256,      // Volume width (should be a multiple of the chunkSize)
    height: 64,      // Volume height (should be a multiple of the chunkSize)
    depth: 256,      // Volume depth (should be a multiple of the chunkSize)
    seaLevel: 6,     // Sea level used in the generation and pathfinding
    seed: 987654321, // Uint32 seed for the rng. Will use a random one if undefined
    // Built-in generators
    generator: 'default', // 'blank', 'default', 'menu', 'debugCity', 'partyBuildings', 'pit'
    // Custom generator
    generator: (x, y, z) => (y < 6 ? { type: 'stone', r: 0xFF, g: 0, b: 0 } : false),

    // For multiplayer
    server: 'ws://localhost:8081/', // Server url

    // This will be called on every voxels contact if the physics are enabled
    onContact: (contact) => {},
  },
  dudes: {
    searchRadius: 64, // The search radius for the pathfinding
    spawn: {
      count: 32, // Number of dudes to initially spawn (default: 0)
      radius: 64, // The search radius for the spawn algorithm (default: 64)
      // Optional origin for the spawn algorithm.
      // It defaults to the center of the world if undefined
      origin: { x: 0, y: 0, z: 0 },
    },
    // This will be called on every dudes contact if the physics are enabled
    onContact: (contact) => {},
  },
  ambient = {
    range: { from: 0, to: 128 }, // Ambient sounds altitude range (in worldspace)
    sounds: [
      {
        url: '/sounds/sea.ogg', // Public url of the sound
        from: 0,                // Normalized altitude range
        to: 0.75,
      },
      {
        url: '/sounds/forest.ogg',
        from: 0.25,
        to: 1,
      },
    ],
  },
  explosionSound: '/sounds/blast.ogg', // Public url of the explosion sound
  projectileSound: '/sounds/shot.ogg', // Public url of the projectile shooting sound
  rainSound: '/sounds/rain.ogg',       // Public url of the rain sound
  explosions: false,  // Enable explosions (default: false)
  physics: true,      // Enable physics (default: true)
  projectiles: false, // Enable projectiles (default: false)
  lightToggle: false, // Enable light toggle UI (default: false)
  rainToggle: false,  // Enable rain toggle UI (default: false)
}
```

#### Gameplay overridable functions

```js
onLoad(options) {
  super.onLoad(options);
  // Do the things you want to do at construction
  // but require the world to be loaded/generated here
}

onUnload() {
  super.onUnload();
  // Dispose additional geometries/materials you created here
}

onAnimationTick({ animation, camera, isXR }) {
  const { hasLoaded } = this;
  super.onAnimationTick({ animation, camera, isXR });
  if (!hasLoaded) {
    return;
  }
  // Do input handling and custom animations here
  // This runs right after the physics and before the rendering
}

onLocomotionTick({ animation, camera, isXR }) {
  const { hasLoaded } = this;
  if (!hasLoaded) {
    return;
  }
  // You can use this to implement a custom locomotion
  // This runs right before the physics
}
```

#### Gameplay helper functions

```js
spawnProjectile(
  position = { x: 0, y: 0, z: 0 },
  impulse = { x: 0, y: 10, z: 0 },
);

spawnExplosion(
  position = { x: 0, y: 0, z: 0 },
  color = new Color(),
  scale = 0.5
);

updateVoxel(
  brush = {
    color: new Color(),
    noise: 0.1,    // color noise
    type: 'stone', // 'air', 'dirt', 'light', 'stone'
    shape: 'box',  // 'box', 'sphere'
    size: 1,       // brush radius
  },
  voxel = { x: 0, y: 0, z: 0 }
);
```

#### Input state

```js
onAnimationTick({ animation, camera, isXR }) {
  const { hasLoaded, player } = this;
  super.onAnimationTick({ animation, camera, isXR });
  if (!hasLoaded) {
    return;
  }

  // VR controllers input
  if (isXR) {
    player.controllers.forEach(({
      hand, // The hand mesh. Also used to detect controller presence
      buttons, // Buttons state
      joystick, // Joystick axes
      raycaster, // A threejs raycaster with the hand position and direction
    }) => {
      if (hand) {
        console.log(hand.handedness); // 'left' or 'right'
        console.log(
          buttons.trigger, // always true while the trigger is pressed
          buttons.triggerDown, // only true the first frame after the trigger was pressed
          buttons.triggerUp, // only true the first frame after the trigger was released
          buttons.grip, // always true while the grip is pressed
          buttons.gripDown, // only true the first frame after the grip was pressed
          buttons.gripUp, // only true the first frame after the grip was released
          buttons.primary,       // A/X button
          buttons.primaryDown,
          buttons.primaryUp,
          buttons.secondary,     // B/Y button
          buttons.secondaryDown,
          buttons.secondaryUp,
          buttons.forwards,       // Joystick forwards
          buttons.forwardsDown,
          buttons.forwardsUp,
          buttons.backwards,      // Joystick backwards
          buttons.backwardsDown,
          buttons.backwardsUp,
          buttons.leftwards,      // Joystick leftwards
          buttons.leftwardsDown,
          buttons.leftwardsUp,
          buttons.rightwards,     // Joystick rightwards
          buttons.rightwardsDown,
          buttons.rightwardsUp
        );
      }
    });
  }

  // Desktop input
  if (!isXR) {
    const {
      buttons, // Buttons state
      keyboard, // Keyboard axes
      raycaster, // A threejs raycaster with the camera position and direction
    } = player.desktop;
    console.log(
      buttons.primary,      // Left mouse button
      buttons.primaryDown,
      buttons.primaryUp,
      buttons.secondary,    // Right mouse button
      buttons.secondaryDown,
      buttons.secondaryUp,
      buttons.tertiary,     // Middle mouse button (or F)
      buttons.tertiaryDown,
      buttons.tertiaryUp,
      buttons.view,         // V
      buttons.viewDown,
      buttons.viewUp
    );
  }
}
```

#### Physics

```js
// A box
mesh.physics = {
  shape: 'box',
  width: 1,
  height: 1,
  depth: 1,
};

// A capsule
mesh.physics = {
  shape: 'capsule',
  radius: 0.5,
  height: 1,
};

// A sphere
mesh.physics = {
  shape: 'sphere',
  radius: 0.5,
};

// A plane
mesh.physics = {
  shape: 'plane',
  constant: 0,
  normal: { x: 0, y: 1, z: 0 },
};

physics.addMesh(
  mesh, // A threejs Mesh (or InstancedMesh) with a physics definition
  {
    // Optional flags
    isKinematic: true,
    isTrigger: true, // This will call mesh.onContact on every contact
  }
);

physics.addConstraint(
  mesh, // Mesh that was already added to the physics with physics.addMesh
  instance = 0, // For instanced meshes
  options = {
    type: 'p2p',
    mesh: anotherMesh, // Another mesh already added to the physics
    pivotInA: { x: 0, y: 0, z: 0 },
    pivotInB: { x: 0, y: 0, z: 0 },
  },
);

physics.addConstraint(
  mesh, // Mesh that was already added to the physics with physics.addMesh
  instance = 0, // For instanced meshes
  options = {
    type: 'hinge',
    mesh: anotherMesh, // Another mesh already added to the physics
    pivotInA: { x: 0, y: 0, z: 0 },
    pivotInB: { x: 0, y: 0, z: 0 },
    axisInA: { x: 0, y: 1, z: 0 },
    axisInB: { x: 0, y: 1, z: 0 },
    friction: true, // simulate friction using an angular motor
    limits: { // optional limits
      low: 0,
      high: Math.PI * 2,
    },
  },
);

physics.applyImpulse(
  mesh, // Mesh that was already added to the physics with physics.addMesh
  instance = 0, // For instanced meshes
  impulse = { x: 0, y: 10, z: 0 },
);

physics.setTransform(
  mesh, // Mesh that was already added to the physics with physics.addMesh
  instance = 0, // For instanced meshes
  position = { x: 0, y: 0, z: 0 },
  rotation = { x: 0, y: 0, z: 0, w: 1 },
);

physics.raycast(
  origin = { x: 0, y: 0, z: 0 }, // ray origin
  direction = { x: 0, y: 0, z: -1 }, // ray direction
  mask = 1, // collision mask (-1: ALL | 1: STATIC | 2: DYNAMIC | 4: KINEMATIC)
  far = 64
);
```

#### Voxelizer

```js
import { Voxelizer } from 'dudes';

const voxelizer = new Voxelizer({
  maxWidth: 256,
  maxHeight: 32,
  maxDepth: 256,
});
voxelizer.voxelize({
  scale: 0.5,
  offset: {
    x: voxelizer.world.width * -0.5,
    y: -1,
    z: voxelizer.world.depth * -0.5,
  },
  generator: (x, y, z) => {
    const r = Math.sqrt((x - 128.5) ** 2 + ((y - 16.5) * 2) ** 2 + (z - 128.5) ** 2);
    if (
      r > 32 && r < 64 && y < 16
    ) {
      return {
        type: 'stone',
        r: 0xBB - Math.random() * 0x33,
        g: 0x66 - Math.random() * 0x33,
        b: 0x44 - Math.random() * 0x22,
      };
    }
    return false;
  },
})
  .then((mesh) => {
    this.add(mesh);
  });
```

#### Engine dev dependencies

To build the C code, you'll need to install LLVM:

 * Win: [https://chocolatey.org/packages/llvm](https://chocolatey.org/packages/llvm)
 * Mac: [https://formulae.brew.sh/formula/llvm](https://formulae.brew.sh/formula/llvm)
 * Linux: [https://releases.llvm.org/download.html](https://releases.llvm.org/download.html)

On the first build, it will complain about a missing file that you can get here:
[libclang_rt.builtins-wasm32-wasi-12.0.tar.gz](https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-12/libclang_rt.builtins-wasm32-wasi-12.0.tar.gz). Just put it on the same path that the error specifies and you should be good to go.

To build [wasi-libc](https://github.com/WebAssembly/wasi-libc), you'll need to install [GNU make](https://chocolatey.org/packages/make).

#### Engine dev environment

```bash
# clone this repo and it's submodules
git clone --recursive https://github.com/danielesteban/dudes.git
cd dudes
# build wasi-libc
cd vendor/wasi-libc && make -j8 && cd ../..
# install dev dependencies
npm install
# start the dev environment:
npm start
# open http://localhost:8080/ in your browser
```
