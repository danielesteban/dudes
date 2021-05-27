import Debug from './debug.js';

class DebugServer extends Debug {
  constructor(scene) {
    super(scene, {
      world: {
        // server: 'ws://localhost:8081/',
        server: 'wss://dudes.gatunes.com/server/',
      },
    });
  }
}

DebugServer.showInMenu = false;

export default DebugServer;
