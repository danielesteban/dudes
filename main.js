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
    case '':
      renderer.scene.load('Debug');
      break;
    case 'poop':
      renderer.scene.load('Poop');
      break;
    case 'rope':
      renderer.scene.load('Rope', { view: params[0] });
      break;
    default:
      router.replace('/');
  }
});
router.update();
