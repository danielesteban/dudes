import {
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  Vector3,
} from '../vendor/three.js';

class Pointer extends Line {
  static setupGeometry() {
    Pointer.geometry = (new BufferGeometry()).setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -1),
    ]);
  }

  static setupMaterial() {
    Pointer.material = new LineBasicMaterial({
      color: (new Color(0xffe0bd)).convertSRGBToLinear(),
    });
  }

  constructor() {
    if (!Pointer.geometry) {
      Pointer.setupGeometry();
    }
    if (!Pointer.material) {
      Pointer.setupMaterial();
    }
    super(
      Pointer.geometry,
      Pointer.material
    );
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  update({ distance, origin, target }) {
    const { parent, position, scale } = this;
    if (distance <= 0.1) {
      return;
    }
    parent.worldToLocal(position.copy(origin));
    scale.z = distance;
    this.updateMatrix();
    this.updateMatrixWorld();
    this.target = target;
    this.visible = true;
  }
}

export default Pointer;
