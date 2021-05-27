import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
} from 'three';

class Box extends Mesh {
  static setupGeometry() {
    Box.geometry = new BoxGeometry(1, 1, 1);
  }

  static setupMaterial() {
    Box.material = new MeshBasicMaterial({
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
