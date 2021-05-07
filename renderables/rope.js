import {
  BufferAttribute,
  BufferGeometry,
  BufferGeometryUtils,
  DynamicDrawUsage,
  MeshBasicMaterial,
  Mesh,
  BoxBufferGeometry,
  Vector3,
  Quaternion,
  Matrix4,
} from '../vendor/three.js';

class Rope extends Mesh {
  static setupMaterial() {
    Rope.material = new MeshBasicMaterial({ vertexColors: true });
  }

  constructor({
    origin,
    length,
    segments,
  }) {
    if (!Rope.material) {
      Rope.setupMaterial();
    }
    const segmentLength = length / segments;
    let tube;
    {
      tube = new BoxBufferGeometry(0.1, segmentLength, 0.1, 2, Math.round(segmentLength * 6), 2);
      tube.translate(0, segmentLength * 0.5, 0);
      tube = tube.toNonIndexed();
      const { count } = tube.getAttribute('position');
      const color = new BufferAttribute(new Float32Array(count * 3), 3);
      let light;
      for (let i = 0; i < count; i += 1) {
        if (i % 6 === 0) {
          light = Math.random();
        }
        color.setXYZ(i, light, light, light);
      }
      tube.setAttribute('color', color);
    }
    const model = BufferGeometryUtils.mergeVertices(tube);
    const aux = model.clone();
    const positionStride = model.getAttribute('position').count * 3;
    const indexStride = model.getIndex().count;
    const geometry = new BufferGeometry();
    const position = new BufferAttribute(new Float32Array(segments * positionStride), 3);
    const color = new BufferAttribute(new Float32Array(segments * positionStride), 3);
    const indices = new BufferAttribute(new Uint16Array(segments * indexStride), 1);
    for (let i = 0; i < segments; i += 1) {
      aux
        .copy(model)
        .translate(
          origin.x,
          origin.y + i * segmentLength,
          origin.z
        );
      const colors = aux.getAttribute('color');
      let light;
      for (let i = 0; i < colors.count; i += 1) {
        if (i % 4 === 0) {
          light = 1 - Math.random() * 0.5;
        }
        colors.setXYZ(i, light, light, light);
      }
      position.array.set(aux.getAttribute('position').array, positionStride * i);
      color.array.set(colors.array, positionStride * i);
      indices.array.set(aux.getIndex().array.map((j) => j + positionStride * i / 3), indexStride * i);
    }
    position.setUsage(DynamicDrawUsage);
    geometry.setIndex(indices);
    geometry.setAttribute('position', position);
    geometry.setAttribute('color', color);
    super(
      geometry,
      Rope.material
    );
    this.aux = {
      normal: new Vector3(),
      model: model.getAttribute('position').array,
      auxModel: aux.getAttribute('position'),
      quaternion: new Quaternion(),
      matrix: new Matrix4(),
      transform: new Matrix4(),
      worldUp: new Vector3(0, 1, 0),
    };
    this.isRope = true;
    this.length = length;
    this.segments = segments;
    this.segmentLength = segmentLength;
    this.positionStride = positionStride;
  }

  update(nodes) {
    const {
      aux: { model, auxModel, normal, quaternion, matrix, transform, worldUp },
      geometry,
      positionStride,
      segments,
      segmentLength,
    } = this;
    const position = geometry.getAttribute('position');
    for (let i = 0; i < segments; i += 1) {
      const node = nodes.at(i);
      const pos = node.get_m_x();
      const next = nodes.at(i + 1);
      const nextPos = next.get_m_x();
      normal
        .set(
          nextPos.x() - pos.x(),
          nextPos.y() - pos.y(),
          nextPos.z() - pos.z()
        );
      const scale = normal.length() / segmentLength;
      normal.normalize();
      quaternion.setFromUnitVectors(worldUp, normal);
      transform
        .makeTranslation(
          pos.x(),
          pos.y(),
          pos.z()
        )
        .multiply(
          matrix.makeRotationFromQuaternion(quaternion)
        )
        .multiply(
          matrix.makeScale(1, scale, 1)
        );
      auxModel.array.set(model);
      auxModel.applyMatrix4(transform);
      position.array.set(auxModel.array, positionStride * i);
    }
    position.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
}

export default Rope;
