import {
  BoxBufferGeometry,
  BufferAttribute,
  BufferGeometryUtils,
  Mesh,
  MeshBasicMaterial,
} from '../vendor/three.js';

class Box extends Mesh {
  static setupGeometry() {
    const box = new BoxBufferGeometry(1, 1, 1, 4, 4, 4).toNonIndexed();
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
  }

  static setupMaterials() {
    Box.materials = {
      default: new MeshBasicMaterial({
        vertexColors: true,
      }),
      transparent: new MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
      }),
    };
  }

  constructor(width, height, depth, transparent = false) {
    if (!Box.geometry) {
      Box.setupGeometry();
    }
    if (!Box.materials) {
      Box.setupMaterials();
    }
    super(
      Box.geometry,
      Box.materials[transparent ? 'transparent' : 'default']
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
