import { Scene } from '../vendor/three.js';
import Music from './music.js';
import Physics from './physics.js';
import Player from './player.js';
import SFX from './sfx.js';

class World extends Scene {
  constructor({
    renderer: {
      camera,
      clock,
      dom,
      renderer,
    },
    router,
    scenes,
  }) {
    super();

    this.clock = clock;
    this.player = new Player({ camera, dom, xr: renderer.xr });
    this.add(this.player);
    this.music = new Music(this.player.head.context.state === 'running');
    this.sfx = new SFX({ listener: this.player.head });
    this.pointables = [];
    this.translocables = [];
    this.router = router;
    this.scenes = scenes;

    const onFirstInteraction = () => {
      document.removeEventListener('mousedown', onFirstInteraction);
      this.resumeAudio();
    };
    document.addEventListener('mousedown', onFirstInteraction);
  }

  getPhysics() {
    if (this.physics) {
      return Promise.resolve(this.physics);
    }
    if (!this.onPhysics) {
      this.onPhysics = [];
      const physics = new Physics(() => {
        this.physics = physics;
        this.onPhysics.forEach((resolve) => resolve(physics));
        delete this.onPhysics;
      });
    }
    return new Promise((resolve) => this.onPhysics.push(resolve));
  }

  load(scene, options = {}) {
    const {
      physics,
      player,
      pointables,
      translocables,
      scenes,
    } = this;
    if (this.scene) {
      if (this.scene.onUnload) {
        this.scene.onUnload();
      }
      this.remove(this.scene);
    }
    this.background = null;
    this.fog = null;
    player.climbing.reset();
    player.detachAll();
    if (physics) {
      physics.reset();
    }
    pointables.length = 0;
    translocables.length = 0;
    this.scene = new scenes[scene](this, options);
    if (this.scene.resumeAudio && player.head.context.state === 'running') {
      this.scene.resumeAudio();
    }
    this.add(this.scene);
  }

  onAnimationTick({ animation, camera }) {
    const {
      player,
      physics,
      pointables,
      translocables,
      scene,
    } = this;
    if (physics) {
      physics.simulate(animation.delta);
    }
    player.onAnimationTick({
      animation,
      camera,
      physics,
      pointables,
      translocables,
    });
    if (scene && scene.onAnimationTick) {
      scene.onAnimationTick({ animation, camera });
    }
  }

  resumeAudio() {
    const { player: { head: { context } }, music, scene } = this;
    if (context.state === 'suspended') {
      context.resume();
    }
    music.resume();
    if (scene && scene.resumeAudio) {
      scene.resumeAudio();
    }
  }
}

export default World;
