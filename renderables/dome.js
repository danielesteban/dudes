import {
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from '../vendor/three.js';

class Dome extends Mesh {
  static setupGeometry() {
    const geometry = new SphereGeometry(1000, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    Dome.geometry = geometry;
  }

  static setupMaterial() {
    Dome.material = new ShaderMaterial({
      uniforms: {
        background: { value: new Color(0x226699) },
      },
      vertexShader: [
        'varying float altitude;',
        'void main() {',
        '  altitude = clamp(normalize(position).y, 0.0, 1.0);',
        '  vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '  gl_Position = pos.xyww;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'varying float altitude;',
        'uniform vec3 background;',
        'void main() {',
        '  gl_FragColor  = vec4(mix(background, background * 1.5, altitude), 1.0);',
        '}',
      ].join('\n'),
      side: BackSide,
    });
  }

  constructor({ x, z }) {
    if (!Dome.geometry) {
      Dome.setupGeometry();
    }
    if (!Dome.material) {
      Dome.setupMaterial();
    }
    super(
      Dome.geometry,
      Dome.material
    );
    this.position.set(x, 0, z);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.renderOrder = 1;
  }
}

export default Dome;
