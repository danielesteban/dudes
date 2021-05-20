import UI from './ui.js';

class Lighting extends UI {
  constructor(options) {
    const width = 256;
    const height = 256;
    super({
      ...options,
      textureWidth: width,
      textureHeight: height,
      labels: [
        {
          x: 8,
          y: 24,
          text: 'Sunlight',
          textAlign: 'left',
        },
        {
          x: 8,
          y: 86,
          text: 'Light',
          textAlign: 'left',
        },
        {
          x: 128,
          y: 200,
          text: 'DudeBrush',
        },
        {
          x: 128,
          y: 220,
          text: 'dani@gatunes © 2021',
        },
        {
          x: 128,
          y: 240,
          text: 'powered by the Dudes Engine',
        },
      ],
      sliders: [
        {
          x: 8,
          y: 36,
          width: width - 16,
          height: 24,
          value: 1,
          min: 0,
          max: 1,
          step: 0.01,
          onPointer: (value) => {
            this.sunlight = value;
            this.update();
            this.draw();
          },
        },
        {
          x: 8,
          y: 98,
          width: width - 16,
          height: 24,
          value: 1,
          min: 0,
          max: 1,
          step: 0.01,
          onPointer: (value) => {
            this.light = value;
            this.update();
            this.draw();
          },
        },
      ],
    });
    this.background = options.background;
    this.fog = options.fog;
    this.voxels = options.voxels;
    this.light = 1;
    this.sunlight = 1;
    this.update();
  }

  update() {
    const {
      background,
      fog,
      voxels,
      light,
      sunlight,
    } = this;
    background.setHex(0x226699).multiplyScalar(Math.max(sunlight, 0.05));
    fog.color.copy(background);
    voxels.ambientIntensity.value = Math.max(Math.min(sunlight, 0.7) / 0.7, 0.5) * 0.1;
    voxels.lightIntensity.value = Math.min(light, 0.7);
    voxels.sunlightIntensity.value = Math.min(sunlight, 0.7);
  }
}

export default Lighting;
