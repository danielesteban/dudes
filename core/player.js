import {
  AudioListener,
  BoxBufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Raycaster,
  Vector3,
} from '../vendor/three.js';
import CurveCast from './curvecast.js';
import DesktopControls from './desktop.js';
import Hand from '../renderables/hand.js';
import Marker from '../renderables/translocation.js';
import Pointer from '../renderables/pointer.js';

// Player controller

class Player extends Group {
  constructor({
    camera,
    dom,
    xr,
  }) {
    super();
    this.add(camera);
    this.auxMatrixA = new Matrix4();
    this.auxMatrixB = new Matrix4();
    this.auxVector = new Vector3();
    this.auxDestination = new Vector3();
    this.attachments = { left: [], right: [] };
    this.climbing = {
      bodyScale: 1,
      enabled: true,
      grip: [false, false],
      hand: new Vector3(),
      isJumping: false,
      isOnAir: false,
      lastMovement: new Vector3(),
      movement: new Vector3(),
      normal: new Vector3(),
      velocity: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
      reset() {
        this.bodyScale = 1;
        this.enabled = true;
        this.grip[0] = false;
        this.grip[1] = false;
        this.isJumping = false;
        this.isOnAir = false;
      },
    };
    this.direction = new Vector3();
    this.head = new AudioListener();
    this.head.rotation.order = 'YXZ';
    const physicsMaterial = new MeshBasicMaterial({ visible: false });
    this.head.physics = new Mesh(
      new BoxBufferGeometry(0.3, 0.3, 0.3),
      physicsMaterial
    );
    this.head.add(this.head.physics);
    const controllerPhysics = new Mesh(
      new BoxBufferGeometry(0.015, 0.09, 0.14),
      physicsMaterial
    );
    controllerPhysics.position.set(0, -0.1 / 3, 0.02);
    this.controllers = [...Array(2)].map((v, i) => {
      const controller = xr.getController(i);
      this.add(controller);
      controller.buttons = {
        forwards: false,
        backwards: false,
        leftwards: false,
        rightwards: false,
        trigger: false,
        grip: false,
        primary: false,
        secondary: false,
      };
      controller.marker = new Marker();
      controller.physics = controllerPhysics.clone();
      controller.pointer = new Pointer();
      controller.add(controller.pointer);
      controller.pulse = (intensity, duration) => {
        if (
          !controller.gamepad
          || !controller.gamepad.hapticActuators
          || !controller.gamepad.hapticActuators.length
        ) {
          return;
        }
        controller.gamepad.hapticActuators[0].pulse(intensity, duration);
      };
      controller.raycaster = new Raycaster();
      controller.raycaster.far = 8;
      controller.worldspace = {
        lastPosition: new Vector3(),
        movement: new Vector3(),
        position: new Vector3(),
        quaternion: new Quaternion(),
      };
      controller.addEventListener('connected', ({ data: { handedness, gamepad } }) => {
        if (controller.hand) {
          return;
        }
        const hand = new Hand({ handedness });
        controller.hand = hand;
        controller.gamepad = gamepad;
        controller.add(hand);
        controller.add(controller.physics);
        const attachments = this.attachments[handedness];
        if (attachments) {
          attachments.forEach((attachment) => {
            controller.add(attachment);
          });
        }
      });
      controller.addEventListener('disconnected', () => {
        if (!controller.hand) {
          return;
        }
        const attachments = this.attachments[controller.hand.handedness];
        if (attachments) {
          attachments.forEach((attachment) => {
            controller.remove(attachment);
          });
        }
        controller.remove(controller.hand);
        controller.remove(controller.physics);
        delete controller.hand;
        delete controller.gamepad;
        controller.marker.visible = false;
        controller.pointer.visible = false;
      });
      return controller;
    });
    this.desktopControls = new DesktopControls({ renderer: dom.renderer, xr });
    this.xr = xr;
  }

  attach(attachment, handedness) {
    const { attachments, controllers } = this;
    attachments[handedness].push(attachment);
    controllers.forEach((controller) => {
      if (controller.hand && controller.hand.handedness === handedness) {
        controller.add(attachment);
      }
    });
  }

  detachAll() {
    const { attachments, head, controllers } = this;
    delete head.physics.onContact;
    controllers.forEach((controller) => {
      delete controller.physics.onContact;
      const children = controller.hand && attachments[controller.hand.handedness];
      if (children) {
        children.forEach((child) => (
          controller.remove(child)
        ));
      }
    });
    attachments.left.length = 0;
    attachments.right.length = 0;
  }

  onAnimationTick({
    animation,
    camera,
    physics,
    pointables,
    translocables,
  }) {
    const {
      auxMatrixA: rotation,
      auxVector: vector,
      climbing,
      controllers,
      desktopControls,
      destination,
      direction,
      head,
      position,
      speed,
      xr,
    } = this;

    // Update input state
    camera.matrixWorld.decompose(head.position, head.quaternion, vector);
    head.updateMatrixWorld();
    controllers.forEach(({
      buttons,
      hand,
      gamepad,
      marker,
      matrixWorld,
      pointer,
      raycaster,
      worldspace,
    }) => {
      if (!hand) {
        return;
      }
      marker.visible = false;
      pointer.visible = false;
      [
        ['forwards', gamepad.axes[3] <= -0.5],
        ['backwards', gamepad.axes[3] >= 0.5],
        ['leftwards', gamepad.axes[2] <= -0.5],
        ['rightwards', gamepad.axes[2] >= 0.5],
        ['trigger', gamepad.buttons[0] && gamepad.buttons[0].pressed],
        ['grip', gamepad.buttons[1] && gamepad.buttons[1].pressed],
        ['primary', gamepad.buttons[4] && gamepad.buttons[4].pressed],
        ['secondary', gamepad.buttons[5] && gamepad.buttons[5].pressed],
      ].forEach(([key, value]) => {
        buttons[`${key}Down`] = value && buttons[key] !== value;
        buttons[`${key}Up`] = !value && buttons[key] !== value;
        buttons[key] = value;
      });
      hand.setFingers({
        thumb: gamepad.buttons[3] && gamepad.buttons[3].touched,
        index: gamepad.buttons[0] && gamepad.buttons[0].pressed,
        middle: gamepad.buttons[1] && gamepad.buttons[1].pressed,
      });
      hand.animate(animation);
      worldspace.lastPosition.copy(worldspace.position);
      matrixWorld.decompose(worldspace.position, worldspace.quaternion, vector);
      worldspace.movement.subVectors(worldspace.position, worldspace.lastPosition);
      rotation.identity().extractRotation(matrixWorld);
      raycaster.ray.origin
        .addVectors(
          worldspace.position,
          vector.set(0, -0.1 / 3, 0).applyMatrix4(rotation)
        );
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
    });

    // Animate translocation
    if (destination) {
      let step = speed * animation.delta;
      const distance = destination.distanceTo(position);
      if (distance <= step) {
        delete this.destination;
        step = distance;
      }
      vector.copy(direction).multiplyScalar(step);
      position.add(vector);
      head.position.add(vector);
      controllers.forEach(({ hand, raycaster, worldspace }) => {
        if (hand) {
          raycaster.ray.origin.add(vector);
          worldspace.position.add(vector);
        }
      });
    }

    // Climb
    let climbingHands = 0;
    if (climbing.enabled && !destination && physics) {
      climbing.movement.set(0, 0, 0);
      controllers.forEach((controller, hand) => {
        if (
          controller.hand
          && controller.buttons.gripDown
          && !(climbing.isOnAir && climbing.velocity.length() < -5)
        ) {
          climbing.hand
            .copy(controller.physics.position)
            .applyQuaternion(controller.worldspace.quaternion)
            .add(controller.worldspace.position);
          const contacts = physics.getContacts({
            climbable: true,
            shape: 'sphere',
            radius: 0.1,
            position: climbing.hand,
          });
          if (contacts.length) {
            const { mesh, index } = contacts[0].body;
            climbing.grip[hand] = { mesh, index, time: animation.time };
            controller.pulse(0.3, 30);
          }
        }
        if (climbing.grip[hand]) {
          if (!controller.hand || controller.buttons.gripUp) {
            climbing.grip[hand] = false;
            if (!climbing.climbingHands) {
              climbing.isOnAir = true;
              climbing.velocity.copy(climbing.lastMovement);
            }
          } else {
            climbing.movement.add(controller.worldspace.movement);
            climbingHands += 1;
            climbing.isOnAir = false;
          }
        }
      });

      // Jump
      const jumpGrip = (
        controllers[0].hand && controllers[0].buttons.grip
        && controllers[1].hand && controllers[1].buttons.grip
      );
      if (
        !climbingHands
        && jumpGrip
        && !climbing.isOnAir
        && !climbing.isJumping
      ) {
        climbing.isJumping = true;
      }
      if (climbing.isJumping) {
        if (jumpGrip) {
          climbingHands = 2;
          climbing.movement.addVectors(
            controllers[0].worldspace.movement,
            controllers[1].worldspace.movement
          );
        } else {
          climbing.isJumping = false;
          climbing.isOnAir = true;
          climbing.velocity.copy(climbing.lastMovement);
        }
      }
      if (climbingHands) {
        this.move(
          climbing.movement.divideScalar(climbingHands).negate()
        );
        climbing.bodyScale = 0;
        climbing.lastMovement.copy(climbing.movement).divideScalar(animation.delta);
      } else if (climbing.isOnAir) {
        climbing.velocity.y -= 9.8 * animation.delta;
        this.move(
          climbing.movement.copy(climbing.velocity).multiplyScalar(animation.delta)
        );
      }
    }

    // Process input
    controllers.forEach(({
      hand,
      buttons: {
        forwards,
        forwardsUp,
        leftwardsDown,
        rightwardsDown,
        secondaryDown,
      },
      marker,
      pointer,
      raycaster,
    }) => {
      if (!hand) {
        return;
      }
      if (
        !climbingHands
        && !climbing.isOnAir
        && !this.destination
        && hand.handedness === 'left'
        && (leftwardsDown || rightwardsDown)
      ) {
        this.rotate(
          Math.PI * 0.25 * (leftwardsDown ? 1 : -1)
        );
      }
      if (
        !climbingHands
        && !climbing.isOnAir
        && !this.destination
        && hand.handedness === 'right'
        && (forwards || forwardsUp)
      ) {
        const { hit, points } = CurveCast({
          intersects: translocables.flat(),
          raycaster,
        });
        if (hit) {
          if (forwardsUp) {
            this.translocate(hit.point);
          } else {
            marker.update({ animation, hit, points });
          }
        }
      }
      if (
        !climbingHands
        && !climbing.isOnAir
        && !this.destination
        && secondaryDown
        && xr.enabled
        && xr.isPresenting
      ) {
        xr.getSession().end();
      }
      if (pointables.length) {
        const hit = raycaster.intersectObjects(pointables.flat())[0] || false;
        if (hit) {
          pointer.update({
            distance: hit.distance,
            origin: raycaster.ray.origin,
            target: hit,
          });
        }
      }
    });
    desktopControls.onAnimationTick({ animation, camera, player: this });

    // Fall
    if (climbing.enabled && !this.destination && physics) {
      if (!climbingHands && climbing.bodyScale < 1) {
        climbing.bodyScale = (
          Math.min(Math.max(climbing.bodyScale + animation.delta * 2, 0.45), 1)
        );
      }
      const radius = 0.2;
      const height = (
        Math.max(head.position.y - position.y - radius, 0) * climbing.bodyScale ** 2
        + radius * 2
      );
      const contacts = physics.getContacts({
        static: true,
        shape: 'capsule',
        radius,
        height: height - (radius * 2),
        position: {
          x: head.position.x,
          y: (head.position.y + radius) - height * 0.5,
          z: head.position.z,
        },
      });
      if (contacts.length) {
        climbing.movement.set(0, 0, 0);
        contacts.forEach(({
          distance,
          normal,
        }) => {
          climbing.normal.copy(normal).normalize();
          climbing.movement.addScaledVector(climbing.normal, -distance);
          if (
            climbing.bodyScale === 1
            && climbing.normal.dot(climbing.worldUp) > 0
          ) {
            climbing.isOnAir = false;
          }
        });
        if (climbing.movement.length()) {
          this.move(climbing.movement);
        }
      }
    }
  }

  move(offset) {
    const { controllers, head, position } = this;
    position.add(offset);
    head.position.add(offset);
    controllers.forEach(({ hand, raycaster, worldspace }) => {
      if (hand) {
        raycaster.ray.origin.add(offset);
        worldspace.position.add(offset);
      }
    });
    delete this.destination;
  }

  rotate(radians) {
    const {
      auxMatrixA: transform,
      auxMatrixB: matrix,
      controllers,
      head,
      position,
    } = this;
    transform.makeTranslation(
      head.position.x, position.y, head.position.z
    );
    transform.multiply(
      matrix.makeRotationY(radians)
    );
    transform.multiply(
      matrix.makeTranslation(
        -head.position.x, -position.y, -head.position.z
      )
    );
    this.applyMatrix4(transform);
    head.applyMatrix4(transform);
    controllers.forEach(({ hand, raycaster, worldspace }) => {
      if (hand) {
        raycaster.ray.origin.applyMatrix4(transform);
        worldspace.position.applyMatrix4(transform);
      }
    });
  }

  teleport(point) {
    const { head, position } = this;
    const headY = head.position.y - position.y;
    position
      .subVectors(point, position.set(
        head.position.x - position.x,
        0,
        head.position.z - position.z
      ));
    head.position.set(
      point.x,
      point.y + headY,
      point.z
    );
    delete this.destination;
  }

  translocate(point) {
    const {
      auxDestination: destination,
      direction,
      head,
      position,
    } = this;
    destination
      .subVectors(point, destination.set(
        head.position.x - position.x,
        0,
        head.position.z - position.z
      ));
    this.destination = destination;
    this.speed = Math.max(destination.distanceTo(position) / 0.2, 2);
    direction
      .copy(destination)
      .sub(position)
      .normalize();
  }
}

export default Player;
