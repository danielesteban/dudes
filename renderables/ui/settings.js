import UI from '../ui.js';

class Settings extends UI {
  constructor(options) {
    const width = 256;
    const height = 256;
    const buttonWidth = ((width - 12) / 2) - 4;
    const dudeButtons = ['OFF', 'ON'].map((label, i) => {
      const button = {
        x: 8 + (buttonWidth + 4) * i,
        y: 144,
        width: buttonWidth,
        height: 32,
        label,
        isActive: i === 0,
        onPointer: () => {
          dudeButtons.forEach((button) => { button.isActive = false; });
          button.isActive = true;
          this.spawnDudes = i === 1;
          this.draw();
        },
      };
      return button;
    });
    super({
      ...options,
      textureWidth: width,
      textureHeight: height,
      buttons: options.dudes ? dudeButtons : [],
      labels: [
        {
          x: 8,
          y: 24,
          text: 'Sunlight',
          textAlign: 'left',
        },
        {
          x: 8,
          y: 78,
          text: 'Light',
          textAlign: 'left',
        },
        ...(options.dudes ? [{
          x: 8,
          y: 132,
          text: 'Dudes',
          textAlign: 'left',
        }] : []),
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
          y: 90,
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
    this.spawnDudes = false;
  }
}

export default Settings;
