import {
  BufferAttribute,
  BufferGeometryUtils,
  IcosahedronGeometry,
} from '../vendor/three.js';
import Bodies from './bodies.js';

class Spheres extends Bodies {
  static setupGeometry() {
    const sphere = new IcosahedronGeometry(0.15, 3);
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
    Spheres.geometry = BufferGeometryUtils.mergeVertices(sphere);
    Spheres.geometry.physics = {
      shape: 'sphere',
      radius: sphere.parameters.radius,
    };
  }

  constructor({
    count = 100,
    sfx,
    sound,
  }) {
    if (!Spheres.geometry) {
      Spheres.setupGeometry();
    }
    super({
      count,
      geometry: Spheres.geometry,
      sfx,
      sound,
    });
    this.physics = Spheres.geometry.physics;
  }
}

export default Spheres;
