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

  constructor(origin) {
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
    ctx.shadowBlur = 8;
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
    this.position.set(origin.x, origin.y, origin.z);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.context = ctx;
    this.renderer = renderer;
    this.texture = texture;
    this.instruments = {
      hook: 0,
      awaiting: 1,
      rescued: 2,
      deaths: 3,
    };
    this.colors = {
      hook: '#393',
      awaiting: '#339',
      rescued: '#993',
      deaths: '#933',
    };
    [
      { id: 'hook', value: 'ready' },
      { id: 'awaiting', value: 24 },
      { id: 'rescued', value: 0 },
      { id: 'deaths', value: 0 },
    ].forEach(({ id, value }) => {
      this.updateInstrument(id, value);
    });
  }

  dispose() {
    const { material, texture } = this;
    texture.dispose();
    material.dispose();
  }

  updateInstrument(id, value) {
    const { colors, context: ctx, instruments, renderer, texture } = this;
    const index = instruments[id];
    const width = (renderer.width - 8) / 4;
    const fill = ctx.createLinearGradient(0, 0, 0, renderer.height * 1.2);
    fill.addColorStop(0, colors[id]);
    fill.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fill;
    ctx.strokeStyle = fill;
    ctx.strokeRect(width * index + 8, 8, width - 8, renderer.height - 16);
    ctx.beginPath();
    ctx.arc(width * (index + 0.5) + 4, renderer.height * 0.5, width * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(id.toUpperCase(), width * (index + 0.5) + 4, renderer.height * 0.4);
    ctx.fillText(`${value}`.toUpperCase(), width * (index + 0.5) + 4, renderer.height * 0.6);
    texture.needsUpdate = true;
  }
}

export default Instruments;
