import { Vector3, Quaternion } from '../vendor/three.js';

class Physics {
  constructor(onLoad) {
    this.bodies = new WeakMap();
    this.dynamic = [];
    this.kinematic = [];
    window.Ammo()
      .then((Ammo) => {
        const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();
        const world = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
        world.setGravity(new Ammo.btVector3(0, -9.8, 0));
        this.aux = {
          contactCallback: new Ammo.ConcreteContactResultCallback(),
          ghostObject: new Ammo.btGhostObject(),
          rayResultCallback: new Ammo.ClosestRayResultCallback(),
          transform: new Ammo.btTransform(),
          quaternion: new Ammo.btQuaternion(),
          vector: new Ammo.btVector3(),
          vectorB: new Ammo.btVector3(),
          zero: new Ammo.btVector3(0, 0, 0),
          worldspace: {
            normal: new Vector3(),
            position: new Vector3(),
            rotation: new Quaternion(),
            scale: new Vector3(),
          },
        };
        this.runtime = Ammo;
        this.world = world;
        this.hasLoaded = true;
        if (onLoad) {
          onLoad();
        }
      });
  }

  addMesh(mesh, flags = {}) {
    const { bodies, dynamic, kinematic, runtime: Ammo, world } = this;
    const shape = this.createShape(mesh.physics);
    if (!shape) {
      return;
    }
    if (mesh.isInstancedMesh) {
      const instances = [];
      for (let i = 0, offset = 0, l = mesh.count; i < l; i += 1, offset += 16) {
        const body = this.createBody(mesh, shape, flags, {
          matrix: mesh.instanceMatrix.array.slice(offset, offset + 16),
        });
        body.mesh = mesh;
        body.instance = i;
        world.addRigidBody(body, (flags.isDynamic || flags.isKinematic) ? 1 : 2, -1);
        instances.push(body);
      }
      bodies.set(mesh, instances);
    } else if (mesh.isGroup || mesh.isMesh) {
      const body = this.createBody(mesh, shape, flags, {
        position: mesh.position,
        rotation: mesh.quaternion,
      });
      body.mesh = mesh;
      world.addRigidBody(body, (flags.isDynamic || flags.isKinematic) ? 1 : 2, -1);
      bodies.set(mesh, body);
    } else {
      Ammo.destroy(shape);
      return;
    }
    if (flags.isDynamic) {
      dynamic.push(mesh);
    } else if (flags.isKinematic) {
      kinematic.push(mesh);
    }
  }

  removeMesh(mesh, instance) {
    const { bodies, dynamic, runtime: Ammo, world } = this;
    if (mesh.isInstancedMesh) {
      // Not yet implemented
    } else if (mesh.isGroup || mesh.isMesh) {
      const body = bodies.get(mesh);
      if (body) {
        const { shape, flags: { isDynamic } } = body;
        world.removeRigidBody(body);
        Ammo.destroy(body.getMotionState());
        Ammo.destroy(body);
        bodies.delete(mesh);
        if (isDynamic) {
          dynamic.splice(dynamic.findIndex((m) => m === mesh), 1);
        }
        if (shape instanceof Ammo.btCompoundShape) {
          for (let i = 0, l = shape.getNumChildShapes(); i < l; i += 1) {
            Ammo.destroy(shape.getChildShape(i));
          }
        }
        Ammo.destroy(shape);
      }
    }
  }

  createBody(mesh, shape, flags, transform) {
    const { aux, runtime: Ammo } = this;

    flags.mass = flags.mass || 0;
    flags.isDynamic = flags.mass > 0;
    flags.isKinematic = !flags.isDynamic && flags.isKinematic;
    flags.isTrigger = !!flags.isTrigger;

    if (transform.matrix) {
      aux.transform.setFromOpenGLMatrix(transform.matrix);
    } else {
      aux.transform.setIdentity();
      aux.vector.setValue(transform.position.x, transform.position.y, transform.position.z);
      aux.transform.setOrigin(aux.vector);
      aux.quaternion.setValue(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w);
      aux.transform.setRotation(aux.quaternion);
    }

    aux.vector.setValue(0, 0, 0);
    if (flags.isDynamic) shape.calculateLocalInertia(flags.mass, aux.vector);
    const motionState = new Ammo.btDefaultMotionState(aux.transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(flags.mass, motionState, shape, aux.vector);
    const body = new Ammo.btRigidBody(rbInfo);
    Ammo.destroy(rbInfo);

    const CF_STATIC_OBJECT = 1;
    const CF_KINEMATIC_OBJECT = 2;
    const CF_NO_CONTACT_RESPONSE = 4;
    const DISABLE_DEACTIVATION = 4;
    if (flags.noContactResponse) {
      body.setCollisionFlags(body.getCollisionFlags() | CF_NO_CONTACT_RESPONSE);
    }
    if (flags.isKinematic) {
      body.setCollisionFlags((body.getCollisionFlags() & ~CF_STATIC_OBJECT) | CF_KINEMATIC_OBJECT);    
      body.setActivationState(DISABLE_DEACTIVATION);
    }

    body.flags = flags;
    body.shape = shape;

    return body;
  }

  createShape(physics) {
    const { aux: { transform, quaternion, vector }, runtime: Ammo } = this;

    if (Array.isArray(physics)) {
      const compound = new Ammo.btCompoundShape();
      physics.forEach((physics) => {
        const shape = this.createShape(physics);
        if (shape) {
          transform.setIdentity();
          if (physics.position) {
            vector.setValue(physics.position.x, physics.position.y, physics.position.z);
            transform.setOrigin(vector);
          }
          if (physics.rotation) {
            quaternion.setValue(physics.rotation.x, physics.rotation.y, physics.rotation.z, physics.rotation.w);
            transform.setRotation(quaternion);
          }
          compound.addChildShape(transform, shape);
        }
      });
      return compound;
    }

    switch (physics.shape) {
      case 'box': {
        const { width, height, depth } = physics;
        vector.setValue(width / 2, height / 2, depth / 2);
        return new Ammo.btBoxShape(vector);
      }
      case 'capsule': {
        const { height, radius } = physics;
        return new Ammo.btCapsuleShape(radius, height);
      }
      case 'plane': {
        const { normal } = physics;
        vector.setValue(normal.x, normal.y, normal.z);
        return new Ammo.btStaticPlaneShape(vector, constant || 0);
      }
      case 'sphere': {
        const { radius } = physics;
        return new Ammo.btSphereShape(radius);
      }
      default:
        return false;
    }
  }

  getBody(mesh, instance) {
    const { bodies } = this;
    if (mesh.isInstancedMesh) {
      return bodies.get(mesh)[instance];
    }
    if (mesh.isGroup || mesh.isMesh) {
      return bodies.get(mesh);
    }
    return false;
  }

  getContacts(query) {
    const {
      aux: {
        contactCallback,
        ghostObject,
        transform,
        quaternion,
        vector,
      },
      runtime: Ammo,
      world,
    } = this;
    const shape = this.createShape(query);
    if (!shape) {
      return [];
    }

    const results = [];
    contactCallback.addSingleResult = (cp, colObj0Wrap, partId0, index0, colObj1Wrap) => {
      const contactPoint = Ammo.castObject({ hy: cp }, Ammo.btManifoldPoint);
      const obj0Wrap = Ammo.castObject({ hy: colObj0Wrap }, Ammo.btCollisionObjectWrapper);
      const obj1Wrap = Ammo.castObject({ hy: colObj1Wrap }, Ammo.btCollisionObjectWrapper);

      let body;
      let normal = contactPoint.get_m_normalWorldOnB();
      if (Ammo.castObject( obj0Wrap.getCollisionObject(), Ammo.btGhostObject) === ghostObject) {
        body = Ammo.castObject(obj1Wrap.getCollisionObject(), Ammo.btRigidBody);
        normal = { x: normal.x(), y: normal.y(), z: normal.z() };
      } else {
        body = Ammo.castObject(obj0Wrap.getCollisionObject(), Ammo.btRigidBody);
        normal = { x: normal.x() * -1, y: normal.y() * -1, z: normal.z() * -1 };
      }
      const distance = contactPoint.getDistance();
      if (
        distance > 0
        || (query.climbable && !(body.flags && body.flags.isClimbable))
        || (query.static && !body.isStaticObject())
      ) {
        return;
      }
      results.push({ body, distance, normal });
    };

    transform.setIdentity();
    if (query.position) {
      vector.setValue(query.position.x, query.position.y, query.position.z);
      transform.setOrigin(vector);
    }
    if (query.rotation) {
      quaternion.setValue(query.rotation.x, query.rotation.y, query.rotation.z, query.rotation.w);
      transform.setRotation(quaternion);
    }
    ghostObject.setCollisionShape(shape);
    ghostObject.setWorldTransform(transform);

    world.contactTest(ghostObject, contactCallback);
    Ammo.destroy(shape);

    return results.sort(({ distance: a }, { distance: b }) => (a - b));
  }

  raycast(origin, direction, far = 64) {
    const {
      aux: {
        vector: from,
        vectorB: to,
        rayResultCallback,
        worldspace,
      },
      runtime: Ammo,
      world,
    } = this;
    from.setValue(origin.x, origin.y, origin.z);
    to.setValue(direction.x, direction.y, direction.z);
    to.op_mul(far);
    to.op_add(from);
    rayResultCallback.set_m_collisionFilterMask(2);
    rayResultCallback.set_m_collisionObject(null);
    rayResultCallback.set_m_closestHitFraction(1);
    rayResultCallback.set_m_rayFromWorld(from);
    rayResultCallback.set_m_rayToWorld(to);
    world.rayTest(from, to, rayResultCallback);
    if (rayResultCallback.hasHit()) {
      const point = rayResultCallback.get_m_hitPointWorld();
      const normal = rayResultCallback.get_m_hitNormalWorld();
      from.op_sub(point);
      return {
        distance: from.length(),
        point: worldspace.position.set(point.x(), point.y(), point.z()),
        normal: worldspace.normal.set(normal.x(), normal.y(), normal.z()).normalize(),
        object: Ammo.castObject(rayResultCallback.get_m_collisionObject(), Ammo.btRigidBody).mesh,
      };
    }
    return false;
  }

  reset() {
    // TODO!
  }

  simulate(delta) {
    const {
      aux: {
        transform,
        quaternion,
        vector,
        worldspace,
      },
      bodies,
      dynamic,
      kinematic,
      world,
    } = this;
    kinematic.forEach((mesh) => {
      if (mesh.isInstancedMesh) {
        // Not yet implemented
      } else if (mesh.isGroup || mesh.isMesh) {
        const body = bodies.get(mesh);
        const motionState = body.getMotionState();
        mesh.matrixWorld.decompose(worldspace.position, worldspace.rotation, worldspace.scale);
        transform.setIdentity();
        vector.setValue(worldspace.position.x, worldspace.position.y, worldspace.position.z);
        quaternion.setValue(worldspace.rotation.x, worldspace.rotation.y, worldspace.rotation.z, worldspace.rotation.w);
        transform.setOrigin(vector);
        transform.setRotation(quaternion);
        motionState.setWorldTransform(transform);
      }
    });
    world.stepSimulation(delta, 10);
    dynamic.forEach((mesh) => {
      if (mesh.isInstancedMesh) {
        const instances = bodies.get(mesh);
        for (let i = 0, offset = 0; i < mesh.count; i += 1, offset += 16) {
          const body = instances[i];
          const motionState = body.getMotionState();
          motionState.getWorldTransform(transform);
          Physics.composeMatrix(transform.getOrigin(), transform.getRotation(), mesh.instanceMatrix.array, offset);
        }
        mesh.instanceMatrix.needsUpdate = true;
      } else if (mesh.isGroup || mesh.isMesh) {
        const body = bodies.get(mesh);
        const motionState = body.getMotionState();
        motionState.getWorldTransform(transform);
        const position = transform.getOrigin();
        const quaternion = transform.getRotation();
        mesh.position.set(position.x(), position.y(), position.z());
        mesh.quaternion.set(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());
      }
    });
    const dispatcher = world.getDispatcher();
    for (let i = 0, il = dispatcher.getNumManifolds(); i < il; i += 1) {
      const contactManifold = dispatcher.getManifoldByIndexInternal(i);
      const bodyA = Ammo.castObject(contactManifold.getBody0(), Ammo.btRigidBody);
      const bodyB = Ammo.castObject(contactManifold.getBody1(), Ammo.btRigidBody);
      const bodyAIsTrigger = bodyA.flags && bodyA.flags.isTrigger;
      const bodyBIsTrigger = bodyB.flags && bodyB.flags.isTrigger;
      if (bodyAIsTrigger || bodyBIsTrigger) {
        let body;
        let trigger;
        let getContact;

        if (bodyAIsTrigger) {
          body = bodyB;
          trigger = bodyA;
          getContact = Physics.getContactFromA;
        } else {
          body = bodyA;
          trigger = bodyB;
          getContact = Physics.getContactFromB;
        }

        let contact = false;
        for (let j = 0, jl = contactManifold.getNumContacts(); j < jl; j += 1) {
          const contactPoint = contactManifold.getContactPoint(j);
          const distance = contactPoint.getDistance();
          if (distance < 0) {
            contact = {
              distance,
              impulse: contactPoint.getAppliedImpulse(),
              point: contactPoint,
            };
            break;
          }
        }

        if (contact) {
          trigger.mesh.onContact({
            ...getContact(contact.point),
            distance: contact.distance,
            impulse: contact.impulse,
            trigger: trigger.instance,
            mesh: body.mesh,
            instance: body.instance,
          });
        }
      }
    }
  }

  setTransform(mesh, instance, position, rotation) {
    const { aux: { transform, vector, quaternion, zero } } = this;
    const body = this.getBody(mesh, instance);
    if (!body) {
      return;
    }
    body.setAngularVelocity(zero);
    body.setLinearVelocity(zero);
    transform.setIdentity();
    if (position) {
      vector.setValue(position.x, position.y, position.z);
      transform.setOrigin(vector);
    }
    if (rotation) {
      quaternion.setValue(rotation.x, rotation.y, rotation.z, rotation.w);
      transform.setRotation(quaternion);
    }
    body.setWorldTransform(transform);
    body.getMotionState().setWorldTransform(transform);
    body.activate();
  }

  applyImpulse(mesh, instance, impulse) {
    const { aux: { vector, zero } } = this;
    const body = this.getBody(mesh, instance);
    if (!body) {
      return;
    }
    vector.setValue(impulse.x, impulse.y, impulse.z);
    body.applyImpulse(vector, zero);
    body.activate();
  }

  wakeAll() {
    const { bodies, dynamic } = this;
    dynamic.forEach((mesh) => {
      if (mesh.isInstancedMesh) {
        bodies.get(mesh).forEach((body) => body.activate());
      } else if (mesh.isGroup || mesh.isMesh) {
        bodies.get(mesh).activate();
      }
    });
  }

  static composeMatrix(position, quaternion, array, index) {
    const x = quaternion.x(), y = quaternion.y(), z = quaternion.z(), w = quaternion.w();
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    array[index + 0] = (1 - ( yy + zz ));
    array[index + 1] = (xy + wz);
    array[index + 2] = (xz - wy);
    array[index + 3] = 0;

    array[index + 4] = (xy - wz);
    array[index + 5] = (1 - (xx + zz));
    array[index + 6] = (yz + wx);
    array[index + 7] = 0;

    array[index + 8] = (xz + wy);
    array[index + 9] = (yz - wx);
    array[index + 10] = (1 - (xx + yy));
    array[index + 11] = 0;

    array[index + 12] = position.x();
    array[index + 13] = position.y();
    array[index + 14] = position.z();
    array[index + 15] = 1;
  }

  static getContactFromA(contactPoint) {
    const normal = contactPoint.get_m_normalWorldOnB();
    const position = contactPoint.getPositionWorldOnA();
    return {
      normal: { x: normal.x() * -1, y: normal.y() * -1, z: normal.z() * -1 },
      position: { x: position.x(), y: position.y(), z: position.z() },
    };
  }

  static getContactFromB(contactPoint) {
    const normal = contactPoint.get_m_normalWorldOnB();
    const position = contactPoint.getPositionWorldOnB();
    return {
      normal: { x: normal.x(), y: normal.y(), z: normal.z() },
      position: { x: position.x(), y: position.y(), z: position.z() },
    };
  }
}

export default Physics;
