import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
} from '../vendor/three.js';

class Ocean extends InstancedMesh {
  static setupGeometry() {
    Ocean.geometry = new BufferGeometry();
    const position = new Float32Array(Ocean.size * Ocean.size * 9 * 2);
    const color = new Float32Array(Ocean.size * Ocean.size * 9 * 2);
    const light = new Float32Array(Ocean.size * Ocean.size * 2);
    let stride = 0;
    for (let z = 0; z < Ocean.size; z += 1) {
      for (let x = 0; x < Ocean.size; x += 1) {
        for (let i = 0; i < 2; i += 1) {
          light[stride] = 1 + (Math.random() * 2);
          stride += 1;
        }
      }
    }
    Ocean.geometry.setAttribute('position', (new BufferAttribute(position, 3)).setUsage(DynamicDrawUsage));
    Ocean.geometry.setAttribute('color', (new BufferAttribute(color, 3)).setUsage(DynamicDrawUsage));
    Ocean.light = light;
  }

  static setupMaterial() {
    Ocean.material = new MeshBasicMaterial({
      color: 0x226699,
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
    });
    Ocean.material.defines = {
      FOG_DENSITY: 0.002,
    };
  }

  constructor({ x, y, z }) {
    if (!Ocean.geometry) {
      Ocean.setupGeometry();
    }
    if (!Ocean.material) {
      Ocean.setupMaterial();
    }
    super(
      Ocean.geometry,
      Ocean.material,
      (Ocean.instances * 2 + 1) ** 2
    );
    const matrix = new Matrix4();
    for (let z = -Ocean.instances, i = 0; z <= Ocean.instances; z += 1) {
      for (let x = -Ocean.instances; x <= Ocean.instances; x += 1, i += 1) {
        matrix.setPosition(
          x * Ocean.size,
          0,
          z * Ocean.size
        );
        this.setMatrixAt(i, matrix);
      }
    }
    this.position.set(x, y, z);
    this.scale.set(4, 1, 4);
    this.updateMatrixWorld();
    this.matrixAutoUpdate = false;
    this.renderOrder = 1;
  }

  static animate({ time }) {
    if (!Ocean.geometry) {
      return;
    }
    const { geometry, light, size } = Ocean;
    const { attributes: { color, position } } = geometry;
    let stride = 0;
    const waveHeight = Math.sin(time * 0.5) * 0.1;
    for (let z = 0; z < size; z += 1) {
      for (let x = 0; x < size; x += 1) {
        const pos = {
          x: x - (size * 0.5),
          y: 0,
          z: z - (size * 0.5),
        };
        const elevationA = (
          (Math.sin(z * Math.PI * 0.5) * waveHeight)
          + (Math.sin(z * Math.PI * 0.125) * waveHeight)
        );
        const elevationB = (
          (Math.sin((z + 1) * Math.PI * 0.5) * waveHeight)
          + (Math.sin((z + 1) * Math.PI * 0.125) * waveHeight)
        );
        position.array.set([
          pos.x + 0.5, pos.y + elevationB, pos.z + 1,
          pos.x + 1, pos.y + elevationA, pos.z,
          pos.x, pos.y + elevationA, pos.z,
        ], stride);
        {
          const intensity = 0.95 + (Math.sin(time * light[stride / 9]) * 0.05);
          color.array.set([
            intensity, intensity, intensity,
            intensity, intensity, intensity,
            intensity, intensity, intensity,
          ], stride);
        }
        stride += 9;
        position.array.set([
          pos.x + 0.5, pos.y + elevationB, pos.z + 1,
          pos.x + 1.5, pos.y + elevationB, pos.z + 1,
          pos.x + 1, pos.y + elevationA, pos.z,
        ], stride);
        {
          const intensity = 0.95 + (Math.sin(time * light[stride / 9]) * 0.05);
          color.array.set([
            intensity, intensity, intensity,
            intensity, intensity, intensity,
            intensity, intensity, intensity,
          ], stride);
        }
        stride += 9;
      }
    }
    color.needsUpdate = true;
    position.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
}

Ocean.instances = 10;
Ocean.size = 32;

export default Ocean;
