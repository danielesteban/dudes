import { Vector3, Quaternion } from '../vendor/three.js';

class Physics {
  constructor(onLoad) {
    this.bodies = new WeakMap();
    this.constraints = [];
    this.dynamic = [];
    this.kinematic = [];
    this.ropes = [];
    window.Ammo()
      .then((Ammo) => {
        const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();
        const softBodySolver = new Ammo.btDefaultSoftBodySolver();
        const world = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
        world.setGravity(new Ammo.btVector3(0, -9.8, 0));
        world.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, -9.8, 0));
        this.aux = {
          contactCallback: new Ammo.ConcreteContactResultCallback(),
          ghostObject: new Ammo.btGhostObject(),
          rayResultCallback: new Ammo.ClosestRayResultCallback(),
          transform: new Ammo.btTransform(),
          quaternion: new Ammo.btQuaternion(),
          softBodyHelpers: new Ammo.btSoftBodyHelpers(),
          vector: new Ammo.btVector3(),
          vectorB: new Ammo.btVector3(),
          vectorC: new Ammo.btVector3(),
          vectorD: new Ammo.btVector3(),
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
        const body = this.createBody(shape, flags, {
          matrix: mesh.instanceMatrix.array.slice(offset, offset + 16),
        });
        body.mesh = mesh;
        body.instance = i;
        world.addRigidBody(body, flags.collisionGroup, flags.collisionMask);
        instances.push(body);
      }
      bodies.set(mesh, instances);
    } else if (mesh.isGroup || mesh.isMesh) {
      let transform;
      if (flags.isKinematic) {
        transform = { matrix: mesh.matrixWorld.elements };
      } else {
        transform = {
          position: mesh.position,
          rotation: mesh.quaternion,
        };
      }
      const body = this.createBody(shape, flags, transform);
      body.mesh = mesh;
      world.addRigidBody(body, flags.collisionGroup, flags.collisionMask);
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

  addConstraint(mesh, instance, options) {
    const {
      aux: {
        transform,
        quaternion,
        vector,
        vectorB,
        vectorC,
        vectorD,
      },
      constraints,
      runtime: Ammo,
      world,
    } = this;
    let constraint;
    switch (options.type) {
      case 'hinge':
        if (options.mesh) {
          vector.setValue(options.pivotInA.x, options.pivotInA.y, options.pivotInA.z);
          vectorB.setValue(options.pivotInB.x, options.pivotInB.y, options.pivotInB.z);
          vectorC.setValue(options.axisInA.x, options.axisInA.y, options.axisInA.z);
          vectorD.setValue(options.axisInB.x, options.axisInB.y, options.axisInB.z);
          constraint = new Ammo.btHingeConstraint(
            this.getBody(mesh, instance),
            this.getBody(options.mesh, options.instance),
            vector, vectorB, vectorC, vectorD,
            true
          );
        } else {
          transform.setIdentity();
          if (options.position) {
            vector.setValue(options.position.x, options.position.y, options.position.z);
            transform.setOrigin(vector);
          }
          if (options.rotation) {
            quaternion.setValue(options.rotation.x, options.rotation.y, options.rotation.z, options.rotation.w);
            transform.setRotation(quaternion);
          }
          constraint = new Ammo.btHingeConstraint(this.getBody(mesh, instance), transform, true);
        }
        if (options.friction) {
          constraint.enableAngularMotor(true, 0, 1);
        }
        if (options.limits) {
          constraint.setLimit(
            options.limits.low,
            options.limits.high,
            options.limits.softness || 0.9,
            options.limits.biasFactor || 0.3,
            options.limits.relaxationFactor || 1.0
          );
        }
        break;
      case 'p2p':
        vector.setValue(options.pivotInA.x, options.pivotInA.y, options.pivotInA.z);
        vectorB.setValue(options.pivotInB.x, options.pivotInB.y, options.pivotInB.z);
        constraint = new Ammo.btPoint2PointConstraint(
          this.getBody(mesh, instance),
          this.getBody(options.mesh, options.instance),
          vector,
          vectorB
        );
        break;
      case 'slider':
        transform.setIdentity();
        if (options.position) {
          vector.setValue(options.position.x, options.position.y, options.position.z);
          transform.setOrigin(vector);
        }
        if (options.rotation) {
          quaternion.setValue(options.rotation.x, options.rotation.y, options.rotation.z, options.rotation.w);
          transform.setRotation(quaternion);
        }
        constraint = new Ammo.btSliderConstraint(this.getBody(mesh, instance), transform, true);
        if (options.limits && options.limits.linear && options.limits.linear.lower !== undefined) {
          constraint.setLowerLinLimit(options.limits.linear.lower);
        }
        if (options.limits && options.limits.linear && options.limits.linear.upper !== undefined) {
          constraint.setUpperLinLimit(options.limits.linear.upper);
        }
        break;
      default:
        break;
    }

    if (constraint) {
      world.addConstraint(constraint);
      constraints.push(constraint);
    }

    return constraint;
  }

  removeConstraint(constraint) {
    const { constraints, world } = this;
    const index = constraints.indexOf(constraint);
    if (index !== -1) {
      constraints.splice(index, 1);
      world.removeConstraint(constraint);
    }
  }

  addRope(mesh, {
    anchorA,
    anchorB,
    origin,
    length,
    segments,
  }) {
    const {
      aux: {
        softBodyHelpers,
        vector: from,
        vectorB: to,
      },
      bodies,
      ropes,
      world,
    } = this;
    from.setValue(origin.x, origin.y, origin.z);
    to.setValue(origin.x, origin.y + length, origin.z);
    const body = softBodyHelpers.CreateRope(
      world.getWorldInfo(),
      from,
      to,
      segments - 1,
      0
    );
    body.setTotalMass(length * 0.5, false);
    const DISABLE_DEACTIVATION = 4;
    body.setActivationState(DISABLE_DEACTIVATION);
    if (anchorA) {
      body.appendAnchor(0, this.getBody(anchorA), true, 1);
    }
    if (anchorB) {
      body.appendAnchor(segments, this.getBody(anchorB), true, 1);
    }
    const stride = length / segments;
    const colliderShape = this.createShape({
      shape: 'sphere',
      radius: stride * 0.5,
    });
    const colliders = [];
    for (let i = 1; i < segments - 1; i += 1) {
      const collider = this.createBody(colliderShape, { angularFactor: { x: 0, y: 0, z: 0 }, mass: (length * 0.5) / segments }, {
        position: { x: origin.x, y: origin.y + stride * i, z: origin.z },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
      collider.setActivationState(DISABLE_DEACTIVATION);
      collider.mesh = mesh;
      world.addRigidBody(collider, 8, -1 & ~8);
      body.appendAnchor(i, collider, true, 0.5);
      colliders.push(collider);
    }
    body.colliders = colliders;
    body.colliderShape = colliderShape;
    body.mesh = mesh;
    world.addSoftBody(body, 8, -1 & ~8);
    bodies.set(mesh, body);
    ropes.push(mesh);
  }

  removeRope(mesh) {
    const { bodies, ropes, runtime: Ammo, world } = this;
    const index = ropes.indexOf(mesh);
    if (index !== -1) {
      ropes.splice(index, 1);
      const body = bodies.get(mesh);
      world.removeSoftBody(body);
      Ammo.destroy(body);
      bodies.delete(mesh);
      for (let i = 0, l = body.colliders.length; i < l; i += 1) {
        const collider = body.colliders[i];
        world.removeRigidBody(collider);
        Ammo.destroy(collider.getMotionState());
        Ammo.destroy(collider);
      }
      Ammo.destroy(body.colliderShape);
    }
  }

  createBody(shape, flags, transform) {
    const { aux, runtime: Ammo } = this;

    flags.mass = flags.mass || 0;
    flags.isDynamic = flags.mass > 0;
    flags.isKinematic = !flags.isDynamic && flags.isKinematic;
    flags.isTrigger = !!flags.isTrigger;
    flags.collisionGroup = 1;
    if (flags.isDynamic) flags.collisionGroup = 2;
    else if (flags.isKinematic) flags.collisionGroup = 4;
    flags.collisionMask = flags.isKinematic ? (-1 & ~(1 | 4)) : -1;

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
    if (flags.angularFactor) {
      aux.vector.setValue(flags.angularFactor.x, flags.angularFactor.y, flags.angularFactor.z);
      body.setAngularFactor(aux.vector);
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
        const { constant, normal } = physics;
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
      if (Ammo.castObject(obj0Wrap.getCollisionObject(), Ammo.btGhostObject) === ghostObject) {
        body = Ammo.castObject(obj1Wrap.getCollisionObject(), Ammo.btRigidBody);
        normal = { x: normal.x(), y: normal.y(), z: normal.z() };
      } else {
        body = Ammo.castObject(obj0Wrap.getCollisionObject(), Ammo.btRigidBody);
        normal = { x: normal.x() * -1, y: normal.y() * -1, z: normal.z() * -1 };
      }
      const distance = contactPoint.getDistance();
      if (
        distance > 0
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

  raycast(origin, direction, mask = 1, far = 64) {
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
    rayResultCallback.set_m_collisionFilterGroup(-1);
    rayResultCallback.set_m_collisionFilterMask(mask);
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
    // ToDo?
    // I didn't find a way to extract the full list of bodies from the btDiscreteDynamicsWorld.
    // So... This will require to track all the added/removed bodies in JS
    // Which I don't want to do right now for performance.
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
      ropes,
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
    ropes.forEach((mesh) => {
      mesh.update(bodies.get(mesh).get_m_nodes());
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
          if (
            distance <= 0
            && (!contact || contact.distance > distance)
          ) {
            contact = {
              distance,
              impulse: contactPoint.getAppliedImpulse(),
              point: contactPoint,
            };
          }
        }

        if (contact) {
          trigger.mesh.onContact({
            ...getContact(contact.point),
            distance: contact.distance,
            impulse: contact.impulse,
            triggerMesh: trigger.mesh,
            triggerInstance: trigger.instance,
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
