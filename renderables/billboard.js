import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  sRGBEncoding,
} from '../vendor/three.js';

class Billboard extends Mesh {
  static setupGeometry() {
    Billboard.geometry = new PlaneGeometry(6, 4);
    Billboard.geometry.translate(0, -2, 0.02);
    Billboard.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 900;
    renderer.height = 600;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, .8)';
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#bbb';
    ctx.font = '700 40px monospace';
    ctx.save();
    ctx.translate(renderer.width * 0.2, renderer.height * 0.225);
    ctx.rotate(Math.PI * -0.2);
    ctx.fillText('Welcome to...', 0, 0);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = '700 120px monospace';
    ctx.fillText('DUDES', renderer.width * 0.5, renderer.height * 0.5);
    ctx.fillStyle = '#bbb';
    ctx.font = '700 30px monospace';
    ctx.fillText('v0.0.1 - dani@gatunes © 2021', renderer.width * 0.5, renderer.height * 0.85);
    ctx.fillText('made with three.js', renderer.width * 0.5, renderer.height * 0.925);
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    Billboard.material = new MeshBasicMaterial({ map: texture, transparent: true });
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
  }
}

export default Billboard;
