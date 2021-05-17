import {
  BufferAttribute,
  BufferGeometryUtils,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
} from '../vendor/three.js';

class Marker extends Mesh {
  static setupGeometry() {
    const geometry = BufferGeometryUtils.mergeBufferGeometries(
      [
        new TorusGeometry(0.2, 0.025, 8, 16),
        new TorusGeometry(0.1, 0.0125, 8, 12),
      ].map((model) => {
        model.deleteAttribute('normal');
        model.deleteAttribute('uv');
        const geometry = model.toNonIndexed();
        const { count } = geometry.getAttribute('position');
        const color = new BufferAttribute(new Float32Array(count * 3), 3);
        let light;
        for (let i = 0; i < count; i += 1) {
          if (i % 6 === 0) {
            light = 1 - Math.random() * 0.2;
          }
          color.setXYZ(i, light, light, light);
        }
        geometry.setAttribute('color', color);
        return geometry;
      })
    );
    geometry.rotateX(Math.PI * -0.5);
    geometry.translate(0, 0.025, 0);
    Marker.geometry = BufferGeometryUtils.mergeVertices(geometry);
  }

  static setupMaterial() {
    Marker.material = new MeshBasicMaterial({
      vertexColors: true,
      opacity: 0.5,
      transparent: true,
    });
  }

  constructor() {
    if (!Marker.geometry) {
      Marker.setupGeometry();
    }
    if (!Marker.material) {
      Marker.setupMaterial();
    }
    super(
      Marker.geometry,
      Marker.material
    );
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  animate(animation) {
    if (!this.visible) {
      return;
    }
    this.rotation.y += animation.delta;
    this.updateMatrix();
  }
}

export default Marker;
