import Gameplay from '../core/gameplay.js';
import Music from '../core/music.js';
import Billboard from '../renderables/billboard.js';
import Chief from '../renderables/chief.js';

class Party extends Gameplay {
  constructor(scene, {
    dudesAtParty = 16,
    dudesPerBuilding = 1,
    onDudesContact,
  }) {
    const buildings = (3 * 3) - 1;
    super(scene, {
      dudes: {
        count: dudesPerBuilding * buildings + dudesAtParty,
        onContact: onDudesContact,
        searchRadius: 10,
        spawn: {
          algorithm: (i) => {
            const { world } = this;
            if (i >= dudesPerBuilding * buildings) {
              const angle = Math.PI * Math.random();
              const dist = 4 + Math.random() * 12;
              const x = world.width * 0.5 + Math.floor(Math.cos(angle) * dist);
              const z = world.depth * 0.5 + Math.floor(Math.sin(angle) * dist);
              const y = world.getHeight(x, z) + 1;
              return [x, y, z];
            }
            let building = Math.floor(i / dudesPerBuilding);
            if (building > 3) building += 1;
            const x = world.width * 0.5 - 60 + Math.floor(building % 3) * 40 + 10 + Math.floor(Math.random() * 22);
            const z = world.depth * 0.5 - 60 + Math.floor(building / 3) * 40 + 10 + Math.floor(Math.random() * 22);
            const y = world.getHeight(x, z) + 1;
            return [x, y, z];
          },
        },
      },
      rainToggle: true,
      world: {
        width: 192,
        height: 128,
        depth: 192,
        generator: 'partyBuildings',
        seed: Math.floor(Math.random() * 2147483647),
      },
    });
    this.dayDuration = 180;
    this.time = this.dayDuration * 0.4;
    this.player.cursor.classList.remove('enabled');
  }

  onLoad() {
    const { physics, player, world } = this;
    super.onLoad();

    this.partyOrigin = player.position.clone();

    const billboardPos = this.partyOrigin
      .clone()
      .divideScalar(world.scale)
      .floor()
      .add({ x: 0, y: 0, z: -17 });
    const billboard = new Billboard({
      x: billboardPos.x * world.scale,
      y: world.getHeight(billboardPos.x, billboardPos.z) * world.scale,
      z: billboardPos.z * world.scale,
    });
    this.add(billboard);

    {
      const chief = new Chief();
      chief.position.copy(this.partyOrigin).add({ x: 0, y: 0, z: -5.75 });
      chief.position.y = (world.getHeight(
        Math.floor(chief.position.x / world.scale),
        Math.floor(chief.position.z / world.scale)
      ) + 1) * world.scale;
      const light = world.getLight(
        Math.floor(chief.position.x / world.scale),
        Math.floor(chief.position.y / world.scale) + 1,
        Math.floor(chief.position.z / world.scale)
      );
      chief.lighting.light = light >> 8;
      chief.lighting.sunlight = light & 0xFF;
      this.chief = chief;
    }
    this.add(this.chief);

    this.dudes.dudes.forEach((dude) => {
      if (dude.position.y >= this.partyOrigin.y - 1) {
        dude.rotation.y += Math.PI * (0.5 + Math.random());
        dude.minSearchTime = 10;
        dude.maxSearchTime = 20;
        dude.searchTimer = (
          dude.minSearchTime + (dude.maxSearchTime - dude.minSearchTime) * Math.random()
        );
        delete dude.onContact;
        dude.setIdleAction(dude.actions.dance);
        physics.getBody(dude).flags.isTrigger = false;
      }
    });

    this.music = new Music(player.head);
    this.music.speakers.forEach((speaker, channel) => {
      speaker.position.copy(this.partyOrigin).add({ x: channel === 0 ? -7 : 7, y: 6, z: -7 });
      this.add(speaker);
    });
  }

  onUnload() {
    const { music } = this;
    super.onUnload();
    music.dispose();
  }

  onAnimationTick({ animation, camera, isXR }) {
    const { chief, dayDuration, hasLoaded } = this;
    if (!hasLoaded) {
      return;
    }
    chief.animate(animation);
    this.time += animation.delta;
    const dayTime = (this.time % dayDuration) / dayDuration;
    this.targetLight = 1 - ((dayTime > 0.5 ? 1 - dayTime : dayTime) * 2);
    super.onAnimationTick({ animation, camera, isXR });
  }

  resumeAudio() {
    const { music } = this;
    super.resumeAudio();
    if (music) {
      music.resume();
    }
  }
}

export default Party;
