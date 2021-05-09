import {
  AnimationClip,
  AnimationMixer,
  Bone,
  BoxGeometry,
  BufferAttribute,
  BufferGeometryUtils,
  Color,
  ConeGeometry,
  Euler,
  LoopPingPong,
  Math as ThreeMath,
  Quaternion,
  QuaternionKeyframeTrack,
  ShaderLib,
  ShaderMaterial,
  Skeleton,
  SkinnedMesh,
  Sphere,
  UniformsUtils,
  Vector3,
} from '../vendor/three.js';
import Marker from './marker.js';
// import Box from './box.js';

class Dude extends SkinnedMesh {
  static createGeometry({
    color: diffuse,
    height,
    waist,
    arms,
    feet,
    hands,
    hat,
    head,
    legs,
    torso,
  }) {
    const geometries = [];
    const pushModel = ({
      w,
      h,
      d,
      x,
      y,
      z,
      r,
      bone,
      shape = 'box',
      light,
    }) => {
      let model;
      if (shape === 'box') {
        model = new BoxGeometry(
          w,
          h,
          d,
          Math.round(w * 10),
          Math.round(h * 10),
          Math.round(d * 10)
        );
      } else {
        const r = Math.max(w, d) * 0.5;
        model = new ConeGeometry(r, h, 3, Math.round(h * 10));
        model.rotateX(Math.PI);
        model.rotateY(Math.PI);
        model.scale(w / (r * 1.5), 1, d / (r * 1.5));
      }
      model.deleteAttribute('normal');
      model.deleteAttribute('uv');
      model.translate(x, y, z);
      if (r !== undefined) {
        model.rotateX(r);
      }
      const geometry = model.toNonIndexed();
      const { count } = geometry.getAttribute('position');
      const color = new BufferAttribute(new Float32Array(count * 3), 3);
      const skinIndex = new BufferAttribute(new Float32Array(count * 4), 4);
      const skinWeight = new BufferAttribute(new Float32Array(count * 4), 4);
      let c;
      for (let i = 0; i < count; i += 1) {
        if (i % (shape === 'box' ? 6 : 3) === 0) {
          c = light - Math.random() * 0.15;
        }
        color.setXYZ(i, diffuse.r * c, diffuse.g * c, diffuse.b * c);
        skinIndex.setXYZW(i, bone, 0, 0, 0);
        skinWeight.setXYZW(i, 1, 0, 0, 0);
      }
      geometry.setAttribute('color', color);
      geometry.setAttribute('skinIndex', skinIndex);
      geometry.setAttribute('skinWeight', skinWeight);
      geometries.push(geometry);
    };
    const { bones } = Dude;
    // TORSO
    pushModel({
      w: torso.width * waist,
      h: torso.height * height,
      d: torso.depth * waist,
      x: 0,
      y: torso.height * height * 0.5,
      z: 0,
      bone: bones.hip,
      light: 1,
    });
    // HEAD
    pushModel({
      w: head.width * waist,
      h: head.height * height,
      d: head.depth * waist,
      x: 0,
      y: head.height * height * 0.4,
      z: 0,
      bone: bones.head,
      shape: head.shape,
      light: 0.8,
    });
    if (hat) {
      pushModel({
        w: head.width * waist * hat.width,
        h: head.height * height * hat.height,
        d: head.depth * waist * hat.depth,
        x: head.width * waist * hat.offsetX,
        y: head.height * height * 0.9 - head.height * height * hat.offsetY,
        z: head.depth * waist * hat.offsetZ,
        r: hat.rotation,
        bone: bones.head,
        light: 0.6,
      });
    }
    // L-LEG
    pushModel({
      w: legs.width * waist,
      h: legs.height * height,
      d: legs.depth * waist,
      x: 0,
      y: legs.height * height * -0.6,
      z: 0,
      bone: bones.leftLeg,
      light: 0.6,
    });
    pushModel({
      w: feet.width * waist,
      h: feet.height * height,
      d: feet.depth * waist,
      x: 0,
      y: legs.height * height * -1.1 + feet.height * height * -0.5,
      z: 0,
      bone: bones.leftLeg,
      light: 0.6,
    });
    // R-LEG
    pushModel({
      w: legs.width * waist,
      h: legs.height * height,
      d: legs.depth * waist,
      x: 0,
      y: legs.height * height * -0.6,
      z: 0,
      bone: bones.rightLeg,
      light: 0.6,
    });
    pushModel({
      w: feet.width * waist,
      h: feet.height * height,
      d: feet.depth * waist,
      x: 0,
      y: legs.height * height * -1.1 + feet.height * height * -0.5,
      z: 0,
      bone: bones.rightLeg,
      light: 0.6,
    });
    // L-ARM
    pushModel({
      w: arms.width * waist,
      h: arms.height * height,
      d: arms.depth * waist,
      x: 0,
      y: arms.height * height * -0.4,
      z: 0,
      bone: bones.leftArm,
      light: 0.6,
    });
    pushModel({
      w: hands.width * waist,
      h: hands.height * height,
      d: hands.depth * waist,
      x: 0,
      y: arms.height * height * -0.9 + hands.height * height * -0.5,
      z: 0,
      bone: bones.leftArm,
      light: 0.8,
    });
    // R-ARM
    pushModel({
      w: arms.width * waist,
      h: arms.height * height,
      d: arms.depth * waist,
      x: 0,
      y: arms.height * height * -0.4,
      z: 0,
      bone: bones.rightArm,
      light: 0.6,
    });
    pushModel({
      w: hands.width * waist,
      h: hands.height * height,
      d: hands.depth * waist,
      x: 0,
      y: arms.height * height * -0.9 + hands.height * height * -0.5,
      z: 0,
      bone: bones.rightArm,
      light: 0.8,
    });
    const geometry = BufferGeometryUtils.mergeVertices(
      BufferGeometryUtils.mergeBufferGeometries(geometries)
    );
    const boundsHeight = (head.height + torso.height + legs.height + feet.height) * height;
    const radius = Math.max(boundsHeight, waist) * 0.5;
    geometry.boundingSphere = new Sphere(new Vector3(0, radius, 0), radius);
    geometry.physics = [{
      shape: 'box',
      width: waist,
      height: boundsHeight,
      depth: waist,
      position: {
        x: 0,
        y: boundsHeight * 0.5,
        z: 0,
      },
    }];
    return geometry;
  }

  static setupAnimations() {
    const eulerToQuat = (x, y, z, order) => (
      (new Quaternion()).setFromEuler(new Euler(x, y, z, order)).toArray()
    );
    const times = new Float32Array([0, 1]);
    const { bones } = Dude;
    Dude.animations = [
      {
        clip: new AnimationClip('idle', 1, [
          new QuaternionKeyframeTrack(
            `.bones[${bones.leftArm}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * -0.1, 0, 0),
              ...eulerToQuat(Math.PI * 0.1, 0, 0),
            ])
          ),
          new QuaternionKeyframeTrack(
            `.bones[${bones.rightArm}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * 0.1, 0, 0),
              ...eulerToQuat(Math.PI * -0.1, 0, 0),
            ])
          ),
        ]),
        duration: 1,
      },
      {
        clip: new AnimationClip('fly', 1, [
          new QuaternionKeyframeTrack(
            `.bones[${bones.leftArm}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * -0.5, Math.PI * -0.25, 0, 'YXZ'),
              ...eulerToQuat(Math.PI * -1, 0, 0),
            ])
          ),
          new QuaternionKeyframeTrack(
            `.bones[${bones.rightArm}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * -1, 0, 0),
              ...eulerToQuat(Math.PI * -0.5, Math.PI * 0.25, 0, 'YXZ'),
            ])
          ),
          new QuaternionKeyframeTrack(
            `.bones[${bones.leftLeg}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * -0.25, Math.PI * -0.125, 0, 'YXZ'),
              ...eulerToQuat(Math.PI * 0.25, 0, 0),
            ])
          ),
          new QuaternionKeyframeTrack(
            `.bones[${bones.rightLeg}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * 0.25, 0, 0),
              ...eulerToQuat(Math.PI * -0.25, Math.PI * 0.125, 0, 'YXZ'),
            ])
          ),
        ]),
        duration: 0.25,
      },
      {
        clip: new AnimationClip('hit', 1, [
          new QuaternionKeyframeTrack(
            `.bones[${bones.leftArm}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * -0.5, Math.PI * -0.25, 0, 'YXZ'),
              ...eulerToQuat(Math.PI * -1, 0, 0),
            ])
          ),
          new QuaternionKeyframeTrack(
            `.bones[${bones.rightArm}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * -1, 0, 0),
              ...eulerToQuat(Math.PI * -0.5, Math.PI * 0.25, 0, 'YXZ'),
            ])
          ),
        ]),
        duration: 0.25,
      },
      {
        clip: new AnimationClip('walk', 1, [
          new QuaternionKeyframeTrack(
            `.bones[${bones.head}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(0, 0, Math.PI * 0.1),
              ...eulerToQuat(0, 0, Math.PI * -0.1),
            ])
          ),
          new QuaternionKeyframeTrack(
            `.bones[${bones.leftLeg}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * -0.2, 0, 0),
              ...eulerToQuat(Math.PI * 0.2, 0, 0),
            ])
          ),
          new QuaternionKeyframeTrack(
            `.bones[${bones.rightLeg}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * 0.2, 0, 0),
              ...eulerToQuat(Math.PI * -0.2, 0, 0),
            ])
          ),
          new QuaternionKeyframeTrack(
            `.bones[${bones.leftArm}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * 0.25, 0, 0),
              ...eulerToQuat(Math.PI * -0.25, 0, 0),
            ])
          ),
          new QuaternionKeyframeTrack(
            `.bones[${bones.rightArm}].quaternion`,
            times,
            new Float32Array([
              ...eulerToQuat(Math.PI * -0.25, 0, 0),
              ...eulerToQuat(Math.PI * 0.25, 0, 0),
            ])
          ),
        ]),
        duration: 0.5,
      },
    ];
  }

  static setupMaterial() {
    const { uniforms, vertexShader, fragmentShader } = ShaderLib.basic;
    Dude.material = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.clone(uniforms),
        ambientIntensity: { value: 0 },
        lightIntensity: { value: 0 },
        sunlightIntensity: { value: 0 },
        light: { value: 0 },
        sunlight: { value: 0 },
      },
      vertexShader: vertexShader
        .replace(
          '#include <common>',
          [
            'uniform float ambientIntensity;',
            'uniform float lightIntensity;',
            'uniform float sunlightIntensity;',
            'uniform float light;',
            'uniform float sunlight;',
            '#include <common>',
          ].join('\n')
        )
        .replace(
          '#include <color_vertex>',
          [
            '#include <color_vertex>',
            '#ifdef USE_COLOR',
            'vColor.xyz *= clamp(pow(light / 255.0, 2.0) * lightIntensity + pow(sunlight / 255.0, 2.0) * sunlightIntensity, ambientIntensity, 1.0);',
            '#endif',
          ].join('\n')
        ),
      fragmentShader,
      skinning: true,
      vertexColors: true,
      fog: true,
    });
  }

  constructor(spec) {
    spec = {
      ...Dude.defaultSpec,
      ...spec,
    };
    if (!Dude.animations) {
      Dude.setupAnimations();
    }
    if (!Dude.material) {
      Dude.setupMaterial();
    }
    super(
      Dude.createGeometry(spec),
      Dude.material
    );
    const bones = [new Bone()];
    this.add(bones[0]);
    for (let i = 0; i < 5; i += 1) {
      const bone = new Bone();
      bones.push(bone);
      bones[0].add(bone);
    }
    this.bind(new Skeleton(bones));
    bones[Dude.bones.hip].position.set(
      0,
      spec.legs.height * spec.height + spec.feet.height * spec.height,
      0
    );
    bones[Dude.bones.head].position.set(
      0,
      spec.torso.height * spec.height + spec.head.height * spec.height * 0.1,
      0
    );
    bones[Dude.bones.head].rotation.order = 'YXZ';
    bones[Dude.bones.leftLeg].position.set(
      spec.torso.width * spec.waist * -0.25,
      spec.legs.height * spec.height * 0.1,
      0
    );
    bones[Dude.bones.rightLeg].position.set(
      spec.torso.width * spec.waist * 0.25,
      spec.legs.height * spec.height * 0.1,
      0
    );
    bones[Dude.bones.leftArm].position.set(
      spec.torso.width * spec.waist * -0.5 + spec.arms.width * spec.waist * -0.5,
      spec.torso.height * spec.height + spec.arms.height * spec.height * -0.1,
      0
    );
    bones[Dude.bones.rightArm].position.set(
      spec.torso.width * spec.waist * 0.5 + spec.arms.width * spec.waist * 0.5,
      spec.torso.height * spec.height + spec.arms.height * spec.height * -0.1,
      0
    );
    this.mixer = new AnimationMixer(this);
    this.actions = Dude.animations.reduce((actions, { clip, duration }) => {
      const action = this.mixer.clipAction(clip);
      action.setDuration(duration / (clip.name === 'idle' ? 1 : spec.stamina));
      action.setLoop(LoopPingPong);
      action.play();
      action.enabled = false;
      action.time = Math.random();
      actions[clip.name] = action;
      return actions;
    }, {});
    this.action = this.actions.idle;
    this.action.enabled = true;
    this.auxVector = new Vector3();
    this.lighting = {
      light: 0,
      sunlight: 0xFF,
    };
    this.marker = new Marker(spec.color);
    this.physics = this.geometry.physics;
    this.speed = 4 * spec.stamina;

    // const debug = this.physics[0];
    // const box = new Box(debug.width, debug.height, debug.depth);
    // box.position.copy(debug.position);
    // this.add(box);
  }

  dispose() {
    const { geometry } = this;
    geometry.dispose();
  }

  animate(animation, gazeAt) {
    const {
      actions,
      auxVector: vector,
      lighting,
      marker,
      mixer,
      position,
      path,
      speed,
      step,
    } = this;
    marker.animate(animation);
    mixer.update(animation.delta);
    if (this.action === actions.fly) {
      return;
    }
    if (this.action === actions.hit) {
      this.hitTimer -= animation.delta;
      if (this.hitTimer <= 0) {
        this.setAction(actions.idle);
      }
      return;
    }
    if (!path && gazeAt) {
      const head = this.skeleton.bones[Dude.bones.head];
      head.lookAt(gazeAt);
      head.rotation.y = Math.min(Math.max(head.rotation.y, Math.PI * -0.4), Math.PI * 0.4);
      return;
    }
    const from = path[step];
    const to = path[step + 1];
    const isAscending = from.position.y < to.position.y;
    const isDescending = from.readyToDescent;
    const isBeforeDescending = !isDescending && from.position.y > to.position.y;
    this.interpolation = Math.min(
      this.interpolation + animation.delta * speed * (isAscending || isDescending ? 1.5 : 1),
      1.0
    );
    const { interpolation } = this;
    const destination = vector.copy(to.position);
    if (isAscending) {
      destination.copy(from.position);
      destination.y = to.position.y;
    } else if (isBeforeDescending) {
      destination.y = from.position.y;
    }
    position.lerpVectors(from.position, destination, interpolation);
    this.lookAt(
      vector
        .lerpVectors(from.direction, to.direction, interpolation)
        .normalize()
        .add(position)
    );
    if (!isAscending && !isBeforeDescending) {
      lighting.light = ThreeMath.lerp(from.light, to.light, interpolation);
      lighting.sunlight = ThreeMath.lerp(from.sunlight, to.sunlight, interpolation);
    }
    if (this.interpolation === 1) {
      this.interpolation = 0;
      if (isAscending || isBeforeDescending) {
        if (isAscending) {
          from.position.y = to.position.y;
        }
        if (isBeforeDescending) {
          from.position.x = to.position.x;
          from.position.z = to.position.z;
          from.readyToDescent = true;
        }
        from.direction.copy(to.direction);
        return;
      }
      if (this.revaluate) {
        const { revaluate } = this;
        delete this.revaluate;
        revaluate();
        return;
      }
      this.step += 1;
      if (this.step >= path.length - 1) {
        delete this.path;
        marker.visible = false;
        this.setAction(actions.idle);
      }
    }
  }

  onBeforeRender() {
    const { material, lighting } = this;
    material.uniforms.light.value = lighting.light;
    material.uniforms.sunlight.value = lighting.sunlight;
    material.uniformsNeedUpdate = true;
  }

  onHit() {
    const { actions, marker, path } = this;
    if (this.action === actions.hit) {
      return;
    }
    if (path) {
      delete this.path;
      marker.visible = false;
    }
    this.hitTimer = 1.5;
    this.setAction(actions.hit);
  }

  setAction(action) {
    const { action: current } = this;
    this.action = action;
    action.reset().crossFadeFrom(current, 0.25, false);
  }

  setPath(results, scale, showMarker) {
    const { actions, lighting, marker, position } = this;
    if (this.action === actions.hit || this.action === actions.fly) {
      return;
    }
    const path = [{
      position: position.clone(),
      direction: this.getWorldDirection(new Vector3()),
      light: lighting.light,
      sunlight: lighting.sunlight,
    }];
    for (let i = 4, l = results.length; i < l; i += 4) {
      const isDestination = i === l - 4;
      const position = new Vector3(
        (results[i] + 0.25 + (isDestination ? 0.25 : (Math.random() * 0.5))) * scale,
        results[i + 1] * scale,
        (results[i + 2] + 0.25 + (isDestination ? 0.25 : (Math.random() * 0.5))) * scale
      );
      const direction = position.clone().sub(path[path.length - 1].position);
      direction.y = 0;
      direction.normalize();
      path.push({
        position,
        direction,
        light: results[i + 3] >> 8,
        sunlight: results[i + 3] & 0xFF,
      });
    }
    this.path = path;
    this.step = 0;
    this.interpolation = 0;
    marker.position.copy(path[path.length - 1].position);
    marker.updateMatrix();
    marker.visible = !!showMarker;
    if (this.action === actions.idle) {
      this.setAction(actions.walk);
    }
  }
}

Dude.bones = {
  hip: 0,
  head: 1,
  leftLeg: 2,
  rightLeg: 3,
  leftArm: 4,
  rightArm: 5,
};

Dude.defaultSpec = {
  height: 2,
  waist: 0.5,
  arms: {
    width: 0.4,
    height: 0.25,
    depth: 0.4,
  },
  feet: {
    width: 0.3,
    height: 0.05,
    depth: 0.3,
  },
  hat: {
    width: 1.2,
    height: 0.2,
    depth: 1.2,
    offsetX: 0,
    offsetY: 0.25,
    offsetZ: 0.35,
    rotation: Math.PI * -0.1,
  },
  hands: {
    width: 0.3,
    height: 0.05,
    depth: 0.3,
  },
  head: {
    width: 1,
    height: 0.25,
    depth: 1,
  },
  legs: {
    width: 0.4,
    height: 0.325,
    depth: 0.4,
  },
  torso: {
    width: 1,
    height: 0.375,
    depth: 0.6,
  },
  color: new Color(),
  stamina: 1,
};

export default Dude;
