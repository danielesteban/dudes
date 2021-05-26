import Debug from './debug.js';

class Pit extends Debug {
  constructor(scene) {
    super(scene, {
      dudes: {
        searchRadius: 16,
        spawn: { count: 32 },
      },
      world: {
        width: 160,
        height: 144,
        depth: 160,
        seaLevel: 14,
        generator: 'pit',
      },
    });
  }
}

Pit.showInMenu = 'Pit worldgen';

export default Pit;
