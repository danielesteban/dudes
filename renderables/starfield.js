import {
  BufferGeometry,
  Points,
  BufferAttribute,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
  Vector3,
} from '../vendor/three.js';

class Starfield extends Points {
  static setupGeometry() {
    const { count, radius } = Starfield;
    const position = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const aux = new Vector3();
    for (let i = 0; i < count; i += 1) {
      aux
        .set(
          (Math.random() - 0.5) * 2,
          Math.random(),
          (Math.random() - 0.5) * 2
        )
        .normalize()
        .multiplyScalar(radius);
      position.set([
        aux.x,
        aux.y,
        aux.z,
      ], i * 3);
      const c = 0.25 + Math.random() * 0.25;
      color.set([c, c, c], i * 3);
      size[i] = 0.5 + Math.random() * 4;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(position, 3));
    geometry.setAttribute('color', new BufferAttribute(color, 3));
    geometry.setAttribute('size', new BufferAttribute(size, 1));
    Starfield.geometry = geometry;
  }

  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.points;
    const material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(uniforms),
      vertexShader: vertexShader.replace(
        'uniform float size;',
        'attribute float size;'
      ),
      fragmentShader,
      vertexColors: true,
      transparent: true,
      opacity: 0,
    });
    material.color = material.uniforms.diffuse.value;
    material.isPointsMaterial = true;
    material.sizeAttenuation = true;
    Starfield.material = material;
  }

  constructor({ x, z }) {
    if (!Starfield.geometry) {
      Starfield.setupGeometry();
    }
    if (!Starfield.material) {
      Starfield.setupMaterial();
    }
    super(
      Starfield.geometry,
      Starfield.material
    );
    this.position.set(x, 0, z);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
  }
}

Starfield.count = 2048;
Starfield.radius = 900;

export default Starfield;
