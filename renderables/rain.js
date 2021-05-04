import {
  BoxGeometry,
  BufferGeometryUtils,
  Color,
  DynamicDrawUsage,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
  ShaderLib,
  ShaderMaterial,
  UniformsUtils,
  Vector3,
} from '../vendor/three.js';

class Rain extends Mesh {
  static setupGeometry() {
    let drop = new BoxGeometry(0.01, 0.5, 0.01);
    drop.deleteAttribute('normal');
    drop.deleteAttribute('uv');
    drop.translate(0, 0.25, 0);
    drop = BufferGeometryUtils.mergeVertices(drop);
    Rain.geometry = {
      index: drop.getIndex(),
      position: drop.getAttribute('position'),
    };
  }

  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Rain.material = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        diffuse: { value: new Color(0x226699) },
      },
      vertexShader: vertexShader
        .replace(
          '#include <common>',
          [
            'attribute vec3 offset;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          '#include <begin_vertex>',
          [
            'vec3 transformed = vec3( position + offset );',
          ].join('\n')
        ),
      fragmentShader,
    });
  }

  constructor({ anchor, world }) {
    if (!Rain.geometry) {
      Rain.setupGeometry();
    }
    if (!Rain.material) {
      Rain.setupMaterial();
    }
    const geometry = new InstancedBufferGeometry();
    geometry.setIndex(Rain.geometry.index);
    geometry.setAttribute('position', Rain.geometry.position);
    geometry.setAttribute('offset', (new InstancedBufferAttribute(new Float32Array(Rain.numDrops * 3), 3).setUsage(DynamicDrawUsage)));
    super(
      geometry,
      Rain.material
    );
    this.anchor = anchor;
    this.aux = new Vector3();
    this.auxB = new Vector3();
    this.targets = new Float32Array(Rain.numDrops);
    this.frustumCulled = false;
    this.matrixAutoUpdate = false;
    this.visible = false;
    this.world = world;
  }

  animate({ delta }) {
    if (!this.visible) {
      return;
    }
    const { geometry, targets } = this;
    const step = delta * 16;
    const offsets = geometry.getAttribute('offset');
    for (let i = 0; i < Rain.numDrops; i += 1) {
      const y = offsets.getY(i) - step;
      const height = targets[i];
      if (y > height) {
        offsets.setY(i, y);
      } else {
        this.resetDrop(i);
      }
    }
    offsets.needsUpdate = true;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  resetDrop(i) {
    const { radius } = Rain;
    const {
      anchor,
      aux,
      geometry,
      targets,
      world,
    } = this;
    aux.set(
      anchor.position.x + (Math.random() * (radius * 2 + 1)) - radius,
      0,
      anchor.position.z + (Math.random() * (radius * 2 + 1)) - radius
    );
    const offsets = geometry.getAttribute('offset');
    offsets.setX(i, aux.x);
    offsets.setZ(i, aux.z);

    aux.divideScalar(world.scale).floor();
    let height = 0;
    if (
      aux.x >= 0 && aux.x < world.width
      && aux.z >= 0 && aux.z < world.depth
    ) {
      height = Math.max((world.heightmap.view[(aux.z * world.width) + aux.x] + 1) * world.scale, 3);
    }
    targets[i] = height;
    offsets.setY(i, Math.max(anchor.position.y - radius + Math.random() * radius * 3, height));
    offsets.needsUpdate = true;
  }

  reset() {
    const { numDrops } = Rain;
    for (let i = 0; i < numDrops; i += 1) {
      this.resetDrop(i);
    }
  }
}

Rain.numDrops = 10000;
Rain.radius = 32;

export default Rain;
