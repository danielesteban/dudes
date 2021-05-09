import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometryUtils,
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  ShaderMaterial,
  ShaderLib,
  UniformsUtils,
  Vector3,
  Quaternion,
} from '../vendor/three.js';

class Rope extends InstancedMesh {
  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Rope.material = new ShaderMaterial({
      uniforms: UniformsUtils.clone(uniforms),
      vertexShader: vertexShader
        .replace(
          '#include <color_vertex>',
          'vColor = vec3(1.0 - mod(color - instanceColor.xyz, vec3(1.0)) * 0.5);'
        ),
      fragmentShader,
      vertexColors: true,
      fog: true,
    });
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
    let geometry;
    {
      let tube;
      tube = new BoxGeometry(0.1, segmentLength, 0.1, 2, Math.round(segmentLength * 6), 2);
      tube.deleteAttribute('normal');
      tube.deleteAttribute('uv');
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
      geometry = BufferGeometryUtils.mergeVertices(tube);
    }
    super(
      geometry,
      Rope.material,
      segments
    );
    const color = new Color();
    const transform = new Matrix4();
    for (let i = 0; i < segments; i += 1) {
      transform
        .makeTranslation(
          origin.x,
          origin.y + i * segmentLength,
          origin.z
        );
      this.setMatrixAt(i, transform);
      const light = Math.random();
      this.setColorAt(i, color.setRGB(light, light, light));
    }
    this.aux = {
      normal: new Vector3(),
      quaternion: new Quaternion(),
      transform,
      vertex: new Vector3(),
      vertexB: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
    };
    this.anchorA = anchorA;
    this.anchorB = anchorB;
    this.isRope = true;
    this.instanceMatrix.setUsage(DynamicDrawUsage);
    this.length = length;
    this.matrixAutoUpdate = false;
    this.segments = segments;
    this.segmentLength = segmentLength;
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  update(nodes) {
    const {
      aux: {
        normal,
        quaternion,
        transform,
        vertex,
        vertexB,
        worldUp,
      },
      anchorA,
      anchorB,
      instanceMatrix,
      segments,
      segmentLength,
    } = this;
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
      vertexB.set(1, normal.length() / segmentLength, 1);
      normal.normalize();
      quaternion.setFromUnitVectors(worldUp, normal);
      transform.compose(
        vertex,
        quaternion,
        vertexB
      );
      this.setMatrixAt(i, transform);
    }
    instanceMatrix.needsUpdate = true;
  }
}

export default Rope;
