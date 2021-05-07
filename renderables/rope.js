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
    anchorA,
    anchorB,
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
    let model = BufferGeometryUtils.mergeVertices(tube);
    const index = model.getIndex().array;
    const colors = model.getAttribute('color');
    model = model.getAttribute('position').array;
    const transform = new Matrix4();
    const vertex = new Vector3();
    const positionStride = model.length;
    const indexStride = index.length;
    const geometry = new BufferGeometry();
    const position = new BufferAttribute(new Float32Array(segments * positionStride), 3);
    const color = new BufferAttribute(new Float32Array(segments * positionStride), 3);
    const indices = new BufferAttribute(new Uint16Array(segments * indexStride), 1);
    for (let i = 0; i < segments; i += 1) {
      transform
        .makeTranslation(
          origin.x,
          origin.y + i * segmentLength,
          origin.z
        );
      for (let v = 0; v < positionStride; v += 3) {
        vertex
          .set(model[v], model[v + 1], model[v + 2])
          .applyMatrix4(transform);
        position.array.set([vertex.x, vertex.y, vertex.z], positionStride * i + v);
      }
      let light;
      for (let i = 0; i < colors.count; i += 1) {
        if (i % 4 === 0) {
          light = 1 - Math.random() * 0.5;
        }
        colors.setXYZ(i, light, light, light);
      }
      color.array.set(colors.array, positionStride * i);
      indices.array.set(index.map((j) => j + (positionStride * i) / 3), indexStride * i);
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
      model,
      normal: new Vector3(),
      matrix: new Matrix4(),
      quaternion: new Quaternion(),
      transform,
      vertex,
      vertexB: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
    };
    this.isRope = true;
    this.anchorA = anchorA;
    this.anchorB = anchorB;
    this.length = length;
    this.segments = segments;
    this.segmentLength = segmentLength;
    this.positionStride = positionStride;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  update(nodes) {
    const {
      aux: {
        model,
        normal,
        matrix,
        quaternion,
        transform,
        vertex,
        vertexB,
        worldUp,
      },
      anchorA,
      anchorB,
      geometry,
      positionStride,
      segments,
      segmentLength,
    } = this;
    const position = geometry.getAttribute('position');
    for (let i = 0; i < segments; i += 1) {
      if (i === 0 && anchorA) {
        anchorA.getWorldPosition(vertex);
      } else {
        const node = nodes.at(i);
        const nodePos = node.get_m_x();
        vertex.set(nodePos.x(), nodePos.y(), nodePos.z());
      }
      if (i === segments - 1 && anchorB) {
        anchorB.getWorldPosition(vertexB);
      } else {
        const node = nodes.at(i + 1);
        const nodePos = node.get_m_x();
        vertexB.set(nodePos.x(), nodePos.y(), nodePos.z());
      }
      normal
        .set(
          vertexB.x - vertex.x,
          vertexB.y - vertex.y,
          vertexB.z - vertex.z
        );
      const scale = normal.length() / segmentLength;
      normal.normalize();
      quaternion.setFromUnitVectors(worldUp, normal);
      transform
        .makeTranslation(
          vertex.x,
          vertex.y,
          vertex.z
        )
        .multiply(
          matrix.makeRotationFromQuaternion(quaternion)
        )
        .multiply(
          matrix.makeScale(1, scale, 1)
        );
      for (let v = 0, l = model.length; v < l; v += 3) {
        vertex
          .set(model[v], model[v + 1], model[v + 2])
          .applyMatrix4(transform);
        position.array.set([vertex.x, vertex.y, vertex.z], positionStride * i + v);
      }
    }
    position.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
}

export default Rope;
