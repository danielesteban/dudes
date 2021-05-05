import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  sRGBEncoding,
} from '../vendor/three.js';

class Billboard extends Mesh {
  static setupGeometry() {
    Billboard.geometry = new PlaneGeometry(6, 4);
    Billboard.geometry.translate(0, -2, 0.125);
    Billboard.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 900;
    renderer.height = 1290;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, .8)';
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(255, 255, 255, .5)';
    [
      [0, 0, renderer.width, 10],
      [0, renderer.height * 0.5 - 10, renderer.width, 20],
      [0, renderer.height - 10, renderer.width, 10],
    ].forEach(([x, y, h, w]) => {
      ctx.clearRect(x, y, h, w);
      ctx.fillRect(x, y, h, w);
    });

    ctx.save();
    ctx.translate(renderer.width * 0.2, renderer.height * 0.1125);
    ctx.rotate(Math.PI * -0.2);
    ctx.fillStyle = '#bbb';
    ctx.font = '700 40px monospace';
    ctx.fillText('Welcome to...', 0, 0);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = '700 120px monospace';
    ctx.fillText('DUDES', renderer.width * 0.5, renderer.height * 0.25);
    ctx.fillStyle = '#bbb';
    ctx.font = '700 30px monospace';
    ctx.fillText('v0.0.1 - dani@gatunes © 2021', renderer.width * 0.5, renderer.height * 0.425);
    ctx.fillText('made with three.js', renderer.width * 0.5, renderer.height * 0.4625);

    ctx.font = '700 100px monospace';
    ctx.fillText('CONTROLS', renderer.width * 0.5, renderer.height * 0.6);
    ctx.font = '700 30px monospace';
    ctx.fillText('WASD: Move', renderer.width * 0.5, renderer.height * 0.7);
    ctx.fillText('Mouse wheel: Adjust speed', renderer.width * 0.5, renderer.height * 0.75);
    ctx.fillText('Left click: Place block / Select target', renderer.width * 0.5, renderer.height * 0.8);
    ctx.fillText('Right click: Remove block / Select dude', renderer.width * 0.5, renderer.height * 0.85);
    ctx.fillText('Middle click (or F): Shoot projectile', renderer.width * 0.5, renderer.height * 0.9);
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, 0.5);
    texture.offset.set(0, 0.5);
    Billboard.material = new MeshBasicMaterial({
      map: texture,
      side: DoubleSide,
      transparent: true,
    });
  }

  constructor(origin) {
    if (!Billboard.geometry) {
      Billboard.setupGeometry();
    }
    if (!Billboard.material) {
      Billboard.setupMaterial();
    }
    super(
      Billboard.geometry,
      Billboard.material
    );
    this.position.set(origin.x, origin.y, origin.z);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.page = 0;
    this.step = 0;
    this.isSwitching = false;
    this.switchingTimer = Billboard.switchingInterval;
  }

  animate(animation) {
    const { material: { map: { offset } }, isSwitching } = this;
    if (!isSwitching) {
      this.switchingTimer -= animation.delta;
      if (this.switchingTimer <= 0) {
        this.isSwitching = true;
        this.step = 0;
      }
      return;
    }
    if (isSwitching) {
      this.step = Math.min(this.step + animation.delta, 1);
      offset.y = 0.5 - (this.page * 0.5) - this.step * this.step * 0.5;
      if (this.step >= 1) {
        this.page = (this.page + 1) % 2;
        this.isSwitching = false;
        this.switchingTimer = Billboard.switchingInterval;
      }
    }
  }
}

Billboard.switchingInterval = 10;

export default Billboard;
