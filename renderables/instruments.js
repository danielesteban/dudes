import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  sRGBEncoding,
} from '../vendor/three.js';

class Instruments extends Mesh {
  static setupGeometry() {
    Instruments.geometry = new PlaneGeometry(1, 0.25);
    Instruments.geometry.translate(0, 0.125, 0);
    Instruments.geometry.rotateX(Math.PI * -0.275);
    Instruments.geometry.deleteAttribute('normal');
  }

  constructor({
    instruments,
    origin,
  }) {
    if (!Instruments.geometry) {
      Instruments.setupGeometry();
    }
    const renderer = document.createElement('canvas');
    renderer.width = 512;
    renderer.height = 128;
    const ctx = renderer.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.font = '700 18px monospace';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    super(
      Instruments.geometry,
      material
    );
    this.origin = origin;
    this.position.set(origin.x, origin.y, origin.z);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.context = ctx;
    this.renderer = renderer;
    this.texture = texture;
    this.instruments = instruments;
    this.index = instruments.reduce((index, { id }, i) => {
      index[id] = i;
      return index;
    }, {});
    this.draw();
    this.renderOrder = 2;
  }

  dispose() {
    const { material, texture } = this;
    texture.dispose();
    material.dispose();
  }

  draw() {
    const { context: ctx, instruments, renderer, texture } = this;
    ctx.clearRect(0, 0, renderer.width, renderer.height);
    instruments.forEach(({ id, color, value }, index) => {
      const width = (renderer.width - 8) / 4;
      const fill = ctx.createLinearGradient(0, 0, 0, renderer.height * 1.2);
      fill.addColorStop(0, color);
      fill.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fill;
      ctx.strokeStyle = fill;
      ctx.strokeRect(width * index + 8, 8, width - 8, renderer.height - 16);
      ctx.beginPath();
      ctx.arc(width * (index + 0.5) + 4, renderer.height * 0.5, width * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(id.toUpperCase(), width * (index + 0.5) + 4, renderer.height * 0.4);
      ctx.fillText(`${value}`.toUpperCase(), width * (index + 0.5) + 4, renderer.height * 0.6);
    });
    texture.needsUpdate = true;
  }

  getValue(id) {
    const { index, instruments } = this;
    return instruments[index[id]].value;
  }

  setValue(id, value) {
    const { index, instruments } = this;
    instruments[index[id]].value = value;
  }
}

export default Instruments;
