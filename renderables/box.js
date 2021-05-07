import {
  BoxBufferGeometry,
  BufferAttribute,
  BufferGeometryUtils,
  Mesh,
  MeshBasicMaterial,
} from '../vendor/three.js';

class Box extends Mesh {
  static setupGeometry() {
    const box = new BoxBufferGeometry(0.25, 0.5, 0.25, 4, 4, 4).toNonIndexed();
    box.deleteAttribute('normal');
    box.deleteAttribute('uv');
    const { count } = box.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(count * 3), 3);
    let light;
    for (let i = 0; i < count; i += 1) {
      if (i % 6 === 0) {
        light = 0.8 - Math.random() * 0.1;
      }
      color.setXYZ(i, light, light, light);
    }
    box.setAttribute('color', color);
    Box.geometry = BufferGeometryUtils.mergeVertices(box);
    Box.geometry.physics = {
      shape: 'box',
      width: 0.25,
      height: 0.5,
      depth: 0.25,
    };
  }

  static setupMaterial() {
    Box.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor() {
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
    this.physics = Box.geometry.physics;
  }
}

export default Box;
