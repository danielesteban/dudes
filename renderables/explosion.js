import {
  BufferAttribute,
  BufferGeometryUtils,
  IcosahedronBufferGeometry,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
} from '../vendor/three.js';

class Explosion extends Mesh {
  static setupGeometry() {
    const sphere = new IcosahedronBufferGeometry(0.5, 3);
    sphere.deleteAttribute('normal');
    sphere.deleteAttribute('uv');
    const scale = 1 / Explosion.chunks;
    sphere.scale(scale, scale, scale);
    {
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
    }
    const model = BufferGeometryUtils.mergeVertices(sphere);
    const geometry = new InstancedBufferGeometry();
    geometry.setIndex(model.getIndex());
    geometry.setAttribute('position', model.getAttribute('position'));
    geometry.setAttribute('color', model.getAttribute('color'));
    const count = Explosion.chunks ** 3;
    const stride = 1 / Explosion.chunks;
    const offset = new Float32Array(count * 3);
    const direction = new Float32Array(count * 3);
    for (let v = 0, z = -0.5; z < 0.5; z += stride) {
      for (let y = -0.5; y < 0.5; y += stride) {
        for (let x = -0.5; x < 0.5; x += stride, v += 3) {
          direction[v] = Math.random() - 0.5;
          direction[v + 1] = Math.random() - 0.5;
          direction[v + 2] = Math.random() - 0.5;
          offset[v] = x;
          offset[v + 1] = y;
          offset[v + 2] = z;
        }
      }
    }
    geometry.setAttribute('direction', new InstancedBufferAttribute(direction, 3));
    geometry.setAttribute('offset', new InstancedBufferAttribute(offset, 3));
    Explosion.geometry = geometry;
  }

  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Explosion.material = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        step: { value: 0 },
      },
      vertexShader: vertexShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'attribute vec3 direction;',
            'attribute vec3 offset;',
            'uniform float step;',
          ].join('\n')
        )
        .replace(
          '#include <begin_vertex>',
          [
            'vec3 transformed = vec3( position * (2.0 - step * step * 2.0) + direction * step * 5.0 + offset );',
          ].join('\n')
        ),
      fragmentShader,
      fog: true,
      vertexColors: true,
    });
  }

  constructor({ sfx }) {
    if (!Explosion.geometry) {
      Explosion.setupGeometry();
    }
    if (!Explosion.material) {
      Explosion.setupMaterial();
    }
    super(
      Explosion.geometry,
      Explosion.material.clone()
    );
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
    this.visible = false;
    sfx.load('/sounds/blast.ogg')
      .then((sound) => {
        sound.filter = sound.context.createBiquadFilter();
        sound.setFilter(sound.filter);
        this.add(sound);
        this.sound = sound;
      });
  }

  animate({ delta }) {
    const { material: { uniforms: { step } } } = this;
    if (!this.visible) {
      return;
    }
    step.value = Math.min(step.value + delta * 3, 1);
    if (step.value >= 1) {
      this.visible = false;
    }
  }

  detonate({
    color,
    filter,
    position,
    scale,
  }) {
    const { material, sound } = this;
    material.uniforms.step.value = 0;
    material.uniforms.diffuse.value.copy(color);
    this.position.copy(position);
    this.scale.setScalar(scale);
    this.updateMatrix();
    this.updateMatrixWorld();
    this.visible = true;
    if (sound && sound.context.state === 'running') {
      sound.filter.type = filter;
      sound.filter.frequency.value = (Math.random() + 0.5) * 1000;
      sound.play();
    }
  }
}

Explosion.chunks = 4;

export default Explosion;
