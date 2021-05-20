import { Scene as ThreeScene } from '../vendor/three.js';
import Physics from './physics.js';
import Player from './player.js';
import SFX from './sfx.js';

class Scene extends ThreeScene {
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
    this.sfx = new SFX({ listener: this.player.head });
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
    player.cursor.classList.add('enabled');
    player.desktop.camera.rotation.set(0, 0, 0);
    player.rotation.set(0, 0, 0);
    player.detachAll();
    if (physics) physics.reset();
    this.scene = new scenes[scene](this, options);
    if (this.scene.onXR && player.xr.enabled && player.xr.isPresenting) {
      this.scene.onXR();
    }
    if (this.scene.resumeAudio && player.head.context.state === 'running') {
      this.scene.resumeAudio();
    }
    this.add(this.scene);
  }

  onAnimationTick({ animation, camera, isXR }) {
    const {
      player,
      physics,
      scene,
    } = this;
    player.onAnimationTick({ animation, camera, isXR });
    if (scene && scene.onLocomotionTick) {
      scene.onLocomotionTick({ animation, camera, isXR });
      player.updateMatrixWorld();
    }
    player.head.updateMatrixWorld();
    if (physics) {
      physics.simulate(animation.delta);
    }
    if (scene && scene.onAnimationTick) {
      scene.onAnimationTick({ animation, camera, isXR });
    }
  }

  onXR() {
    const { scene } = this;
    this.resumeAudio();
    if (scene.onXR) {
      scene.onXR();
    }
  }

  resumeAudio() {
    const { player: { head: { context } }, scene } = this;
    if (context.state === 'suspended') {
      context.resume();
    }
    if (scene && scene.resumeAudio) {
      scene.resumeAudio();
    }
  }
}

export default Scene;
