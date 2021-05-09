import {
  BufferAttribute,
  BufferGeometryUtils,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
} from '../vendor/three.js';

class Ball extends Mesh {
  static setupGeometry() {
    const sphere = new IcosahedronGeometry(0.3, 3);
    sphere.deleteAttribute('normal');
    sphere.deleteAttribute('uv');
    const { count } = sphere.getAttribute('position');
    const color = new BufferAttribute(new Float32Array(count * 3), 3);
    let light;
    for (let i = 0; i < count; i += 1) {
      if (i % 3 === 0) {
        light = 0.8 - Math.random() * 0.1;
      }
      color.setXYZ(i, light, light, light);
    }
    sphere.setAttribute('color', color);
    Ball.geometry = BufferGeometryUtils.mergeVertices(sphere);
    Ball.geometry.physics = {
      shape: 'sphere',
      radius: sphere.parameters.radius,
    };
  }

  static setupMaterial() {
    Ball.material = new MeshBasicMaterial({
      vertexColors: true,
    });
  }

  constructor() {
    if (!Ball.geometry) {
      Ball.setupGeometry();
    }
    if (!Ball.material) {
      Ball.setupMaterial();
    }
    super(
      Ball.geometry,
      Ball.material
    );
    this.physics = Ball.geometry.physics;
  }
}

export default Ball;
