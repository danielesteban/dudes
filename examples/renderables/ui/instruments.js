import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  sRGBEncoding,
} from 'three';

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
    this.map = new Map();
    this.instruments = instruments.map(({
      color,
      ...instrument
    }, index) => {
      const fill = ctx.createLinearGradient(0, 0, 0, renderer.height * 1.2);
      fill.addColorStop(0, color);
      fill.addColorStop(1, 'rgba(0, 0, 0, 0)');
      const width = (renderer.width - 8) / 3;
      const rect = new Path2D();
      rect.rect(width * index + 8, 8, width - 8, renderer.height - 16);
      const arc = new Path2D();
      arc.arc(width * (index + 0.5) + 4, renderer.height * 0.5, renderer.height * 0.375, 0, Math.PI * 2);
      rect.addPath(arc);
      instrument = {
        ...instrument,
        fill,
        path: rect,
        width,
      };
      this.map.set(instrument.id, instrument);
      return instrument;
    });
    this.renderOrder = 2;
  }

  dispose() {
    const { material, texture } = this;
    texture.dispose();
    material.dispose();
  }

  draw() {
    const {
      context: ctx,
      instruments,
      needsUpdate,
      renderer,
      texture,
    } = this;
    if (!needsUpdate) {
      return;
    }
    this.needsUpdate = false;
    ctx.clearRect(0, 0, renderer.width, renderer.height);
    instruments.forEach(({
      id,
      fill,
      path,
      value,
      width,
    }, index) => {
      ctx.fillStyle = fill;
      ctx.strokeStyle = fill;
      ctx.stroke(path);
      ctx.font = '700 16px monospace';
      ctx.fillText(id.toUpperCase(), width * (index + 0.5) + 4, renderer.height * 0.4);
      ctx.font = '700 24px monospace';
      ctx.fillText(`${value}`.toUpperCase(), width * (index + 0.5) + 4, renderer.height * 0.6);
    });
    texture.needsUpdate = true;
  }

  getValue(id) {
    const { map } = this;
    return map.get(id).value;
  }

  setValue(id, value) {
    const { map } = this;
    const instrument = map.get(id);
    if (instrument.value === value) {
      return;
    }
    instrument.value = value;
    this.needsUpdate = true;
  }
}

export default Instruments;
