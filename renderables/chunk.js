import {
  BufferGeometry,
  BufferAttribute,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  Sphere,
  UniformsUtils,
} from '../vendor/three.js';

class VoxelChunk extends Mesh {
  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    VoxelChunk.material = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        ambientIntensity: { value: 0 },
        lightIntensity: { value: 0 },
        sunlightIntensity: { value: 0 },
      },
      vertexShader: vertexShader
        .replace(
          '#include <common>',
          [
            'attribute vec2 light;',
            'uniform float ambientIntensity;',
            'uniform float lightIntensity;',
            'uniform float sunlightIntensity;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          '#include <color_vertex>',
          [
            'vColor.xyz = color.xyz / 255.0;',
            'vColor.xyz *= clamp(pow(light.x / 255.0, 2.0) * lightIntensity + pow(light.y / 255.0, 2.0) * sunlightIntensity, ambientIntensity, 1.0);',
          ].join('\n')
        ),
      fragmentShader,
      vertexColors: true,
      fog: true,
    });
  }

  constructor({
    x, y, z,
    geometry,
    scale,
  }) {
    if (!VoxelChunk.material) {
      VoxelChunk.setupMaterial();
    }
    super(new BufferGeometry(), VoxelChunk.material);
    if (geometry && geometry.indices.length > 0) {
      this.update(geometry);
    }
    this.position.set(x, y, z).multiplyScalar(scale);
    this.scale.setScalar(scale);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  update({ bounds, indices, vertices }) {
    const { geometry } = this;
    vertices = new InterleavedBuffer(vertices, 8);
    geometry.setIndex(new BufferAttribute(indices, 1));
    geometry.setAttribute('position', new InterleavedBufferAttribute(vertices, 3, 0));
    geometry.setAttribute('color', new InterleavedBufferAttribute(vertices, 3, 3));
    geometry.setAttribute('light', new InterleavedBufferAttribute(vertices, 2, 6));
    if (geometry.boundingSphere === null) {
      geometry.boundingSphere = new Sphere();
    }
    geometry.boundingSphere.set({ x: bounds[0], y: bounds[1], z: bounds[2] }, bounds[3]);
  }
}

export default VoxelChunk;
