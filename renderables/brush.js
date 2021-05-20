import VoxelWorld from '../core/voxels.js';
import UI from './ui.js';

class Brush extends UI {
  constructor(options) {
    const width = 256;
    const height = 256;
    const buttonWidth = ((width - 12) / 2) - 4;
    const typeButtons = [
      { label: 'Block', type: 3 },
      { label: 'Light', type: 2 },
    ].map(({ label, type }, i) => {
      const button = {
        x: 8 + (buttonWidth + 4) * i,
        y: 38,
        width: buttonWidth,
        height: 32,
        label,
        isActive: i === 0,
        onPointer: () => {
          typeButtons.forEach((button) => { button.isActive = false; });
          button.isActive = true;
          this.type = type;
          this.draw();
        },
      };
      return button;
    });
    const shapeButtons = [
      { label: 'Sphere', shape: VoxelWorld.brushShapes.sphere },
      { label: 'Box', shape: VoxelWorld.brushShapes.box },
    ].map(({ label, shape }, i) => {
      const button = {
        x: 8 + (buttonWidth + 4) * i,
        y: 100,
        width: buttonWidth,
        height: 32,
        label,
        isActive: i === 0,
        onPointer: () => {
          shapeButtons.forEach((button) => { button.isActive = false; });
          button.isActive = true;
          this.shape = shape;
          this.draw();
        },
      };
      return button;
    });
    super({
      ...options,
      textureWidth: width,
      textureHeight: height,
      buttons: [
        ...typeButtons,
        ...shapeButtons,
      ],
      labels: [
        {
          x: 8,
          y: 24,
          text: 'Type',
          textAlign: 'left',
        },
        {
          x: 8,
          y: 86,
          text: 'Shape',
          textAlign: 'left',
        },
        {
          x: 8,
          y: 148,
          text: 'Size',
          textAlign: 'left',
        },
        {
          x: 8,
          y: 198,
          text: 'Noise',
          textAlign: 'left',
        },
      ],
      sliders: [
        {
          x: 8,
          y: 158,
          width: width - 16,
          height: 24,
          value: 0.5,
          min: 1,
          max: 4,
          onPointer: (value) => {
            this.size = value;
            this.draw();
          },
        },
        {
          x: 8,
          y: 208,
          width: width - 16,
          height: 24,
          value: 0.25,
          min: 0,
          max: 1,
          step: 0.01,
          onPointer: (value) => {
            this.noise = value;
            this.draw();
          },
        },
      ],
    });
    this.noise = 0.25;
    this.type = 3;
    this.shape = VoxelWorld.brushShapes.sphere;
    this.size = 3;
  }
}

export default Brush;
