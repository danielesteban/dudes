import { UI } from 'dudes';
import { Color } from 'three';

class ColorPicker extends UI {
  constructor(options) {
    const width = 128;
    const height = 128;
    const color = new Color(Math.random() * 0xFFFFFF);
    const area = {
      color: color.clone(),
      x: width * 0.05,
      y: height * 0.05,
      width: width * 0.75,
      height: height * 0.9,
    };
    const strip = {
      x: width * 0.85,
      y: height * 0.05,
      width: width * 0.1,
      height: height * 0.9,
    };
    super({
      ...options,
      textureWidth: width,
      textureHeight: height,
      buttons: [
        {
          x: 0,
          y: 0,
          width,
          height,
          isVisible: false,
          onPointer: () => {
            const { context: ctx, pointer } = this;
            for (let i = 0; i < 2; i += 1) {
              const {
                x,
                y,
                width,
                height,
              } = i === 0 ? area : strip;
              if (
                pointer.x >= x
                && pointer.x <= x + width
                && pointer.y >= y
                && pointer.y <= y + height
              ) {
                const imageData = ctx.getImageData(pointer.x, pointer.y, 1, 1).data;
                color.setRGB(
                  imageData[0] / 0xFF,
                  imageData[1] / 0xFF,
                  imageData[2] / 0xFF
                );
                if (i !== 0) {
                  area.color.copy(color);
                  this.draw();
                }
                break;
              }
            }
          },
        },
      ],
      graphics: [
        ({ ctx }) => {
          const {
            x,
            y,
            color,
            width,
            height,
          } = area;
          ctx.translate(x, y);
          ctx.fillStyle = `#${color.getHexString()}`;
          ctx.fillRect(0, 0, width, height);

          const grdWhite = ctx.createLinearGradient(0, 0, width, 0);
          grdWhite.addColorStop(0, 'rgba(255,255,255,1)');
          grdWhite.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grdWhite;
          ctx.fillRect(0, 0, width, height);

          const grdBlack = ctx.createLinearGradient(0, 0, 0, height);
          grdBlack.addColorStop(0, 'rgba(0,0,0,0)');
          grdBlack.addColorStop(1, 'rgba(0,0,0,1)');
          ctx.fillStyle = grdBlack;
          ctx.fillRect(0, 0, width, height);
        },
        ({ ctx }) => {
          const {
            x,
            y,
            width,
            height,
          } = strip;
          ctx.translate(x, y);
          const grd = ctx.createLinearGradient(0, 0, 0, height);
          [
            '255,0,0',
            '255,0,255',
            '0,0,255',
            '0,255,255',
            '0,255,0',
            '255,255,0',
            '255,0,0',
          ].forEach((color, i) => {
            grd.addColorStop(Math.min(0.17 * i, 1), `rgb(${color})`);
          });
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, width, height);
        },
      ],
    });
    this.color = color;
  }
}

export default ColorPicker;
