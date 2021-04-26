import Renderer from './core/renderer.js';
import Router from './core/router.js';
import * as scenes from './scenes/index.js';

const router = new Router();
const renderer = new Renderer({
  dom: {
    cursor: document.getElementById('cursor'),
    enterVR: document.getElementById('enterVR'),
    fps: document.getElementById('fps'),
    renderer: document.getElementById('renderer'),
  },
  router,
  scenes,
});

router.addEventListener('update', ({ route, params }) => {
  switch (route) {
    default:
      renderer.world.load('Gameplay');
  }
});
router.update();
