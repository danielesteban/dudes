import {
  AudioListener,
  Euler,
  Group,
  Matrix4,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from '../vendor/three.js';
import Hand from '../renderables/hand.js';
import Pointer from '../renderables/pointer.js';

class Player extends Group {
  constructor({
    camera,
    dom,
    xr,
  }) {
    super();
    this.attachments = { left: [], right: [] };
    this.aux = {
      center: new Vector2(),
      euler: new Euler(0, 0, 0, 'YXZ'),
      one: new Vector3(1, 1, 1),
      matrixA: new Matrix4(),
      matrixB: new Matrix4(),
      vectorA: new Vector3(),
      vectorB: new Vector3(),
      vectorC: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
    };
    this.cursor = dom.cursor;
    this.head = new AudioListener();
    this.head.rotation.order = 'YXZ';
    this.add(camera);
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
      controller.joystick = new Vector2();
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
        delete controller.hand;
        delete controller.gamepad;
        controller.pointer.visible = false;
      });
      return controller;
    });
    this.xr = xr;
    this.desktop = {
      buttons: {
        primary: false,
        secondary: false,
        tertiary: false,
        view: false,
      },
      camera,
      keyboard: new Vector3(0, 0, 0),
      pointer: new Vector2(0, 0),
      raycaster: new Raycaster(),
      speed: 6,
    };
    this.desktop.buttonState = { ...this.desktop.buttons };
    this.onBlur = this.onBlur.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseWheel = this.onMouseWheel.bind(this);
    this.onPointerLock = this.onPointerLock.bind(this);
    this.requestPointerLock = this.requestPointerLock.bind(this);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('wheel', this.onMouseWheel, false);
    document.addEventListener('pointerlockchange', this.onPointerLock);
    dom.renderer.addEventListener('mousedown', this.requestPointerLock);
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
    const { attachments, controllers } = this;
    controllers.forEach((controller) => {
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

  move(offset, physics, collider) {
    const {
      controllers,
      desktop,
      head,
      position,
    } = this;
    position.add(offset);
    head.position.add(offset);
    controllers.forEach(({
      hand,
      matrixWorld,
      raycaster,
      worldspace,
    }) => {
      if (hand) {
        raycaster.ray.origin.add(offset);
        worldspace.position.add(offset);
        matrixWorld.compose(worldspace.position, worldspace.quaternion, this.aux.one);
      }
    });
    desktop.raycaster.ray.origin.add(offset);
    if (physics) {
      const radius = 0.2;
      const height = Math.max(head.position.y - position.y - radius, 0) + radius * 2;
      if (collider) {
        collider.position.add(offset);
      } else {
        collider = {
          shape: 'capsule',
          radius,
          height: height - (radius * 2),
          position: {
            x: head.position.x,
            y: (head.position.y + radius) - height * 0.5,
            z: head.position.z,
          },
        };
      }
      const contacts = physics.getContacts({
        static: true,
        ...collider,
      });
      if (contacts.length) {
        const { aux: { vectorA: movement, vectorB: direction } } = this;
        movement.set(0, 0, 0);
        contacts.forEach(({ distance, normal }) => (
          movement.addScaledVector(direction.copy(normal).normalize(), -distance)
        ));
        if (movement.length()) {
          this.move(movement);
        }
      }
    }
  }

  rotate(axis, angle, pivot) {
    const {
      aux: {
        matrixA: transform,
        matrixB: matrix,
        vectorA: vector,
      },
      controllers,
      desktop,
      head,
      position,
    } = this;
    pivot = pivot || vector.set(head.position.x, position.y, head.position.z);
    transform.makeTranslation(
      pivot.x, pivot.y, pivot.z
    );
    transform.multiply(
      matrix.makeRotationAxis(axis, angle)
    );
    transform.multiply(
      matrix.makeTranslation(
        -pivot.x, -pivot.y, -pivot.z
      )
    );
    this.applyMatrix4(transform);
    head.applyMatrix4(transform);
    controllers.forEach(({
      hand,
      matrixWorld,
      raycaster,
      worldspace,
    }) => {
      if (hand) {
        raycaster.ray.origin.applyMatrix4(transform);
        worldspace.position.applyMatrix4(transform);
        matrixWorld.multiply(transform);
      }
    });
    desktop.raycaster.ray.origin.applyMatrix4(transform);
  }

  teleport(destination, physics) {
    const { aux: { vectorA }, position } = this;
    vectorA.subVectors(destination, position);
    this.move(vectorA, physics);
  }

  onAnimationTick({
    animation,
    camera,
    isXR,
  }) {
    const {
      aux: {
        center,
        euler,
        matrixA: rotation,
        vectorA: vector,
      },
      controllers,
      desktop,
      head,
    } = this;
    if (isXR) {
      if (desktop.isLocked) {
        document.exitPointerLock();
      }
      controllers.forEach(({
        buttons,
        hand,
        gamepad,
        joystick,
        matrixWorld,
        pointer,
        raycaster,
        worldspace,
      }) => {
        if (!hand) {
          return;
        }
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
        joystick.set(gamepad.axes[2], gamepad.axes[3]);
        hand.setFingers({
          thumb: gamepad.buttons[3] && gamepad.buttons[3].touched,
          index: gamepad.buttons[0] && gamepad.buttons[0].pressed,
          middle: gamepad.buttons[1] && gamepad.buttons[1].pressed,
        });
        hand.animate(animation);
        pointer.visible = false;
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
    } else if (desktop.isLocked) {
      const {
        buttons,
        buttonState,
        pointer,
        raycaster,
      } = desktop;
      if (pointer.x !== 0 || pointer.y !== 0) {
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= pointer.x * 0.003;
        euler.x -= pointer.y * 0.003;
        const PI_2 = Math.PI / 2;
        euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
        camera.quaternion.setFromEuler(euler);
        camera.updateMatrixWorld();
        pointer.set(0, 0);
      }
      ['primary', 'secondary', 'tertiary', 'view'].forEach((button) => {
        const state = buttonState[button];
        buttons[`${button}Down`] = state && buttons[button] !== state;
        buttons[`${button}Up`] = !state && buttons[button] !== state;
        buttons[button] = state;
      });
      raycaster.setFromCamera(center, camera);
    }
    camera.matrixWorld.decompose(head.position, head.quaternion, vector);
  }

  onLocomotionTick({
    animation,
    camera,
    isXR,
    movementScale = 1,
    physics,
  }) {
    const {
      aux: {
        vectorA: direction,
        vectorB: forward,
        vectorC: right,
        worldUp,
      },
      controllers,
      xr,
    } = this;

    if (isXR) {
      controllers.forEach(({ buttons, hand, joystick, worldspace }) => {
        if (
          hand && hand.handedness === 'left'
          && (buttons.leftwardsDown || buttons.rightwardsDown)
        ) {
          this.rotate(worldUp, Math.PI * 0.25 * (buttons.leftwardsDown ? 1 : -1));
        }
        if (
          hand && hand.handedness === 'right'
          && (
            Math.abs(joystick.x) > 0.1
            || Math.abs(joystick.y) > 0.1
          )
        ) {
          const speed = 6;
          this.move(
            direction
              .set(joystick.x, 0, joystick.y)
              .applyQuaternion(worldspace.quaternion)
              .multiplyScalar(animation.delta * speed * movementScale),
            physics
          );
        }
        if (hand && buttons.secondaryDown) {
          xr.getSession().end();
        }
      });
    } else {
      const { desktop: { keyboard, isLocked, speed } } = this;
      if (
        isLocked
        && (
          keyboard.x !== 0
          || keyboard.y !== 0
          || keyboard.z !== 0
        )
      ) {
        camera.getWorldDirection(forward);
        right.crossVectors(worldUp, forward);
        this.move(
          direction
            .set(0, 0, 0)
            .addScaledVector(right, -keyboard.x)
            .addScaledVector(worldUp, keyboard.y)
            .addScaledVector(forward, keyboard.z)
            .normalize()
            .multiplyScalar(animation.delta * speed * movementScale),
          physics
        );
      }
    }
  }

  onBlur() {
    const { desktop: { buttonState, keyboard } } = this;
    buttonState.primary = false;
    buttonState.secondary = false;
    buttonState.tertiary = false;
    buttonState.view = false;
    keyboard.set(0, 0, 0);
  }

  onKeyDown({ keyCode, repeat }) {
    const { desktop: { buttonState, keyboard } } = this;
    if (repeat) return;
    switch (keyCode) {
      case 16:
        keyboard.y = -1;
        break;
      case 32:
        keyboard.y = 1;
        break;
      case 87:
        keyboard.z = 1;
        break;
      case 83:
        keyboard.z = -1;
        break;
      case 65:
        keyboard.x = -1;
        break;
      case 68:
        keyboard.x = 1;
        break;
      case 70:
        buttonState.tertiary = true;
        break;
      case 86:
        buttonState.view = true;
        break;
      default:
        break;
    }
  }

  onKeyUp({ keyCode, repeat }) {
    const { desktop: { buttonState, keyboard } } = this;
    if (repeat) return;
    switch (keyCode) {
      case 16:
        if (keyboard.y < 0) keyboard.y = 0;
        break;
      case 32:
        if (keyboard.y > 0) keyboard.y = 0;
        break;
      case 87:
        if (keyboard.z > 0) keyboard.z = 0;
        break;
      case 83:
        if (keyboard.z < 0) keyboard.z = 0;
        break;
      case 65:
        if (keyboard.x < 0) keyboard.x = 0;
        break;
      case 68:
        if (keyboard.x > 0) keyboard.x = 0;
        break;
      case 70:
        buttonState.tertiary = false;
        break;
      case 86:
        buttonState.view = false;
        break;
      default:
        break;
    }
  }

  onMouseDown({ button }) {
    const { desktop: { buttonState, isLocked } } = this;
    if (!isLocked) {
      return;
    }
    switch (button) {
      case 0:
        buttonState.primary = true;
        break;
      case 1:
        buttonState.tertiary = true;
        break;
      case 2:
        buttonState.secondary = true;
        break;
      default:
        break;
    }
  }

  onMouseMove({ movementX, movementY }) {
    const { desktop: { isLocked, pointer } } = this;
    if (!isLocked) {
      return;
    }
    pointer.x += movementX;
    pointer.y += movementY;
  }

  onMouseUp({ button }) {
    const { desktop: { buttonState, isLocked } } = this;
    if (!isLocked) {
      return;
    }
    switch (button) {
      case 0:
        buttonState.primary = false;
        break;
      case 1:
        buttonState.tertiary = false;
        break;
      case 2:
        buttonState.secondary = false;
        break;
      default:
        break;
    }
  }

  onMouseWheel({ deltaY }) {
    const { desktop: { speed, isLocked } } = this;
    if (!isLocked) {
      return;
    }
    const { minSpeed, speedRange } = Player;
    const logSpeed = Math.min(
      Math.max(
        ((Math.log(speed) - minSpeed) / speedRange) - (deltaY * 0.0003),
        0
      ),
      1
    );
    this.desktop.speed = Math.exp(minSpeed + logSpeed * speedRange);
  }

  onPointerLock() {
    this.desktop.isLocked = !!document.pointerLockElement;
    document.body.classList[this.desktop.isLocked ? 'add' : 'remove']('pointerlock');
    if (!this.desktop.isLocked) {
      this.onBlur();
    }
  }

  requestPointerLock() {
    const { desktop: { isLocked }, xr } = this;
    if (isLocked || (xr.enabled && xr.isPresenting)) {
      return;
    }
    document.body.requestPointerLock();
  }
}

Player.minSpeed = Math.log(2);
Player.maxSpeed = Math.log(40);
Player.speedRange = Player.maxSpeed - Player.minSpeed;

export default Player;
