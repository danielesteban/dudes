import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../vendor/three.js';

class Box extends Mesh {
  static setupGeometry() {
    Box.geometry = new BoxGeometry(1, 1, 1);
  }

  static setupMaterial() {
    Box.material = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
    });
  }

  constructor(width, height, depth) {
    if (!Box.geometry) {
      Box.setupGeometry();
    }
    if (!Box.material) {
      Box.setupMaterial();
    }
    super(
      Box.geometry,
      Box.material
    );
    this.scale.set(width, height, depth);
    this.physics = {
      shape: 'box',
      width,
      height,
      depth,
    };
  }
}

export default Box;
