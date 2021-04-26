import {
  BufferAttribute,
  BufferGeometryUtils,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
} from '../vendor/three.js';

class Selected extends Mesh {
  static setupGeometry() {
    const geometry = new OctahedronGeometry(0.1, 0);
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    geometry.scale(1, 2, 1);
    const { count } = geometry.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(count * 3), 3);
    let light;
    for (let i = 0; i < count; i += 1) {
      if (i % 3 === 0) {
        light = 0.8 - Math.random() * 0.2;
      }
      color.setXYZ(i, light, light, light);
    }
    geometry.setAttribute('color', color);
    Selected.geometry = BufferGeometryUtils.mergeVertices(geometry);
  }

  static setupMaterial() {
    Selected.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor() {
    if (!Selected.geometry) {
      Selected.setupGeometry();
    }
    if (!Selected.material) {
      Selected.setupMaterial();
    }
    super(
      Selected.geometry,
      Selected.material
    );
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  animate(animation) {
    if (!this.visible) {
      return;
    }
    this.rotation.y += animation.delta * 2;
    this.updateMatrix();
  }
}

export default Selected;
