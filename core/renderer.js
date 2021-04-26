import {
  ACESFilmicToneMapping,
  Clock,
  PerspectiveCamera,
  ShaderChunk,
  sRGBEncoding,
  WebGLRenderer,
} from '../vendor/three.js';
import SetupComposer from './postprocessing.js';
import World from './world.js';

class Renderer {
  constructor({ dom, router, scenes }) {
    this.clock = new Clock();
    this.clock.localStartTime = Date.now();
    this.fps = {
      count: 0,
      lastTick: this.clock.oldTime / 1000,
    };
    this.dom = dom;

    this.camera = new PerspectiveCamera(70, 1, 0.1, 1000);
    this.camera.position.y = 1.6;

    this.renderer = new WebGLRenderer({
      antialias: true,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    // this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setAnimationLoop(this.onAnimationTick.bind(this));
    dom.renderer.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onResize.bind(this), false);
    this.onResize();

    if (!(navigator.userAgent.includes('Mobile') || navigator.userAgent.includes('Quest'))) {
      this.composer = SetupComposer(this.renderer);
    }

    this.world = new World({
      renderer: this,
      router,
      scenes,
    });

    if (navigator.xr) {
      const { xr } = this.renderer;
      xr.enabled = true;
      navigator.xr.isSessionSupported('immersive-vr')
        .then((supported) => {
          if (supported) {
            dom.enterVR.addEventListener('mousedown', () => {
              if (xr.isPresenting) return;
              navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor'],
              })
                .then((session) => {
                  xr.setSession(session);
                  dom.enterVR.style.display = 'none';
                  this.world.resumeAudio();
                  session.addEventListener('end', () => {
                    xr.setSession(null);
                    dom.enterVR.style.display = '';
                  });
                })
                .catch(() => {});
            }, false);
            dom.enterVR.style.display = '';
          }
        });
    }
  }

  onAnimationTick() {
    const {
      camera,
      clock,
      composer,
      dom,
      fps,
      renderer,
      world,
    } = this;

    const animation = {
      delta: Math.min(clock.getDelta(), 1 / 30),
      time: clock.oldTime / 1000,
    };

    const isXR = renderer.xr.enabled && renderer.xr.isPresenting;
    world.player.updateMatrixWorld();
    world.onAnimationTick({
      animation,
      camera: isXR ? (
        renderer.xr.getCamera(camera)
      ) : (
        camera
      ),
      isXR,
    });
    if (!isXR && composer) {
      composer.renderPass.camera = camera;
      composer.renderPass.scene = world;
      composer.render();
    } else {
      renderer.render(world, camera);
    }

    fps.count += 1;
    if (animation.time >= fps.lastTick + 1) {
      renderer.fps = Math.round(fps.count / (animation.time - fps.lastTick));
      dom.fps.innerText = `${renderer.fps}fps`;
      fps.lastTick = animation.time;
      fps.count = 0;
    }
  }

  onResize() {
    const {
      camera,
      composer,
      dom,
      renderer,
    } = this;

    const { width, height } = dom.renderer.getBoundingClientRect();
    if (renderer.xr.isPresenting) {
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;
    } else {
      renderer.setSize(width, height);
      if (composer) {
        composer.setSize(width, height);
        renderer.getDrawingBufferSize(composer.shader.uniforms.resolution.value);
      }
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

// Tweak ThreeJS fog + allow fog density override
ShaderChunk.fog_pars_vertex = ShaderChunk.fog_pars_vertex.replace(
  'varying float fogDepth;',
  'varying vec3 fogPosition;'
);

ShaderChunk.fog_vertex = ShaderChunk.fog_vertex.replace(
  'fogDepth = - mvPosition.z;',
  'fogPosition = - mvPosition.xyz;'
);

ShaderChunk.fog_pars_fragment = ShaderChunk.fog_pars_fragment.replace(
  'varying float fogDepth;',
  'varying vec3 fogPosition;'
);

ShaderChunk.fog_fragment = ShaderChunk.fog_fragment
  .replace(
    '#ifdef USE_FOG',
    [
      '#ifdef USE_FOG',
      '  float fogDepth = length(fogPosition);',
    ].join('\n')
  )
  .replace(
    'float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );',
    [
      '#ifdef FOG_DENSITY',
      '  float fogFactor = 1.0 - exp( - FOG_DENSITY * FOG_DENSITY * fogDepth * fogDepth );',
      '#else',
      '  float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );',
      '#endif',
    ].join('\n')
  );

export default Renderer;
