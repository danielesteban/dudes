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
            this.lights.sunlight.target = value;
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
            this.lights.light.target = value;
            this.draw();
          },
        },
      ],
    });
    this.lights = options.lights;
  }
}

export default Lighting;
