import Sculpt from './sculpt.js';

class SculptServer extends Sculpt {
  constructor(scene) {
    super(scene, {
      // server: 'ws://localhost:8081/sculpt',
      server: 'wss://dudes.gatunes.com/server/sculpt',
    });
  }

  onLoad(options) {
    super.onLoad(options);
    const { player, server } = this;
    player.getAudioStream()
      .then(server.onAudioStream.bind(server));
  }
}

SculptServer.showInMenu = 'DudeBrush (Multiplayer)';

export default SculptServer;
