import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneBufferGeometry,
  sRGBEncoding,
  Vector3,
} from '../vendor/three.js';

class UI extends Mesh {
  static setupGeometry() {
    UI.geometry = new PlaneBufferGeometry(1, 1, 1, 1);
  }

  constructor({
    origin,
    width = 1,
    height = 1,
    buttons = [],
    labels = [],
    styles = {},
    textureWidth = 128,
    textureHeight = 128,
  }) {
    if (!UI.geometry) {
      UI.setupGeometry();
    }
    styles = {
      background: 'rgba(0, 0, 0, .2)',
      color: '#fff',
      font: '700 14px monospace',
      textAlign: 'center',
      textBaseline: 'middle',
      ...styles,
      button: {
        background: '#333',
        border: '#000',
        color: '#fff',
        ...(styles.button || {}),
        disabled: {
          background: '#555',
          border: '#000',
          color: '#777',
          ...(styles.button && styles.button.disabled ? styles.button.disabled : {}),
        },
        hover: {
          background: '#393',
          border: '#000',
          color: '#fff',
          ...(styles.button && styles.button.hover ? styles.button.hover : {}),
        },
      },
    };
    const renderer = document.createElement('canvas');
    renderer.width = textureWidth;
    renderer.height = textureHeight;
    const texture = new CanvasTexture(renderer);
    texture.anisotropy = 8;
    texture.encoding = sRGBEncoding;
    super(
      UI.geometry,
      new MeshBasicMaterial({
        map: texture,
        transparent: true,
      })
    );
    this.position.set(origin.x, origin.y, origin.z);
    this.scale.set(width, height, 1);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.buttons = buttons;
    this.context = renderer.getContext('2d');
    this.labels = labels;
    this.pointer = new Vector3();
    this.renderer = renderer;
    this.styles = styles;
    this.texture = texture;
    this.draw();
  }

  dispose() {
    const { material, texture } = this;
    material.dispose();
    texture.dispose();
  }

  draw() {
    const {
      buttons,
      context: ctx,
      hover,
      labels,
      renderer,
      styles,
      texture,
    } = this;
    ctx.clearRect(0, 0, renderer.width, renderer.height);
    ctx.fillStyle = styles.background;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    buttons.forEach(({
      label,
      x,
      y,
      width,
      height,
      background,
      border,
      color,
      font,
      textAlign,
      textBaseline,
      textOffset,
      isDisabled,
      isVisible,
    }, i) => {
      if (isVisible === false) {
        return;
      }
      let { button } = styles;
      if (isDisabled) button = styles.button.disabled;
      else if (hover === i) button = styles.button.hover;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.fillStyle = background || button.background;
      ctx.strokeStyle = border || button.border;
      if (button.textShadow) {
        ctx.shadowBlur = button.textShadow.blur;
        ctx.shadowColor = button.textShadow.color;
      }
      ctx.fill();
      ctx.stroke();
      if (label) {
        ctx.fillStyle = color || button.color;
        ctx.font = font || button.font || styles.font;
        ctx.textAlign = textAlign || button.textAlign || styles.textAlign;
        ctx.textBaseline = textBaseline || button.textBaseline || styles.textBaseline;
        ctx.fillText(
          label,
          width * 0.5,
          height * 0.5 + (textOffset || 1)
        );
      }
      ctx.restore();
    });
    labels.forEach(({
      x,
      y,
      color,
      font,
      text,
      textAlign,
      textBaseline,
      isVisible,
    }) => {
      if (isVisible === false || !text) {
        return;
      }
      ctx.save();
      ctx.fillStyle = color || styles.color;
      ctx.font = font || styles.font;
      ctx.textAlign = textAlign || styles.textAlign;
      ctx.textBaseline = textBaseline || styles.textBaseline;
      ctx.fillText(text, x, y);
      ctx.restore();
    });
    texture.needsUpdate = true;
  }

  onPointer({ enabled, point }) {
    const { buttons, pointer, renderer } = this;
    this.worldToLocal(pointer.copy(point));
    pointer.set(
      (pointer.x + 0.5) * renderer.width,
      (1 - (pointer.y + 0.5)) * renderer.height,
      0
    );
    const l = buttons.length - 1;
    for (let i = l; i >= 0; i -= 1) {
      const {
        isDisabled,
        x,
        y,
        width,
        height,
        onPointer,
      } = buttons[i];
      if (
        !isDisabled
        && onPointer
        && pointer.x >= x
        && pointer.x <= x + width
        && pointer.y >= y
        && pointer.y <= y + height
      ) {
        if (enabled) {
          onPointer();
        } else if (this.hover !== i) {
          this.hover = i;
          this.draw();
        }
        return;
      }
    }
    this.resetHover();
  }

  resetHover() {
    if (this.hover === undefined) {
      return;
    }
    delete this.hover;
    this.draw();
  }
}

export default UI;
