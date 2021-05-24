import Sculpt from './sculpt.js';

class SculptServer extends Sculpt {
  constructor(scene) {
    super(scene, {
      server: 'wss://dudes.gatunes.com/server/sculpt',
    });
  }
}

SculptServer.showInMenu = false;

export default SculptServer;
