import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  sRGBEncoding,
} from '../vendor/three.js';

class Instruments extends Mesh {
  static setupGeometry() {
    Instruments.geometry = new PlaneGeometry(1, 0.25);
    Instruments.geometry.translate(0, 0.125, 0);
    Instruments.geometry.rotateX(Math.PI / -3);
    Instruments.geometry.deleteAttribute('normal');
  }

  static setupMaterial() {
    const renderer = document.createElement('canvas');
    renderer.width = 512;
    renderer.height = 128;
    const ctx = renderer.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, .8)';
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 2;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#999';
    ctx.font = '700 20px monospace';
    const width = renderer.width / 4;
    for (let i = 0; i < 4; i += 1) {
      ctx.strokeRect(width * i + 4, 4, width - 8, renderer.height - 8);
      ctx.beginPath();
      ctx.arc(width * (i + 0.5), renderer.height * 0.5, width * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText('GAUGES!', width * (i + 0.5), renderer.height * 0.5);
    }

    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    Instruments.material = new MeshBasicMaterial({
      map: texture,
      side: DoubleSide,
      transparent: true,
    });
  }

  constructor(origin) {
    if (!Instruments.geometry) {
      Instruments.setupGeometry();
    }
    if (!Instruments.material) {
      Instruments.setupMaterial();
    }
    super(
      Instruments.geometry,
      Instruments.material
    );
    this.position.set(origin.x, origin.y, origin.z);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
  }
}
export default Instruments;
