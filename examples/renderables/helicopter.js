import { Group, Vector3 } from 'three';
import Instruments from './ui/instruments.js';

class Helicopter extends Group {
  constructor({ instruments, sfx, sound }) {
    super();
    this.aux = {
      pivot: new Vector3(),
      movement: new Vector3(),
    };
    this.acceleration = new Vector3();
    this.velocity = new Vector3();
    this.instruments = new Instruments({
      instruments,
      origin: {
        x: 0, y: 0.625, z: -0.625,
      },
    });
    this.add(this.instruments);
    if (sfx && sound) {
      sfx.load(sound)
        .then((sound) => {
          sound.setLoop(true);
          sound.setVolume(0.8);
          sound.position.set(0, 2.75, 0);
          this.sound = sound;
          this.add(sound);
          if (sound.context.state === 'running') {
            sound.play();
          }
        });
    }
  }

  dispose() {
    const { cockpit, rotor } = this;
    cockpit.dispose();
    rotor.dispose();
  }

  animate(animation) {
    const { instruments, rotor } = this;
    instruments.draw();
    if (rotor) {
      rotor.rotation.y += animation.delta * 5;
    }
  }

  resumeAudio() {
    const { sound } = this;
    if (sound && !sound.isPlaying) {
      sound.play();
    }
  }

  voxelize(voxelizer) {
    return Promise.all([
      voxelizer.voxelize({
        colliders: true,
        scale: 0.125,
        offset: {
          x: voxelizer.world.width * -0.5,
          y: -2,
          z: voxelizer.world.depth * -0.5,
        },
        generator: (x, y, z) => {
          if (
            // Limits
            y === 0
            || y > 20
            || (
              x < 8 || x > 23 || z < 8 || z > 29
            )
          ) {
            return false;
          }
          const cockpitDistance = Math.sqrt(
            (x - voxelizer.world.width * 0.5 + 0.5) ** 2
            + (y - 11 + 0.5) ** 2
            + (z - 16 + 0.5) ** 2
          );
          if (
            // Cockpit rounding
            (
              (x < 10 || x > 21 || z < 12)
              && (
                (y > 9 && y < 12 && z < 19)
                || cockpitDistance > 9.5
              )
            )
            || (
              z < 19 && y > 6 && y < 18
              && cockpitDistance < 8.5
            )
            // Rotor socket
            || (
              y > 18
              && (
                x < 15 || x > 16
                || z < 15 || z > 16
              )
            )
            // Mid cut
            || (
              (y === 9 || y === 12)
              && z > 18
              && (x === 13 || x === 18)
            )
            // Back box
            || (
              z > 19
              && (y < 5 || y > 16)
            )
            // Side cut
            || (
              (x < 12 || x > 19)
              && ((y < 5 && z > 17) || (z > 21 && (y > 8 || (z !== 24 && z !== 25))))
            )
            // Cockpit
            || (
              y > 1 && y < 18
              && x > 12 && x < 19
              && z > 12 && z < 19
            )
            // Side Windows
            || (
              y > 5 && y < 15
              && z > 13 && z < 18
            )
            // Front Window
            || (
              y > 6 && y < 15
              && x > 13 && x < 18
            )
            // Bottom Window
            || (
              y < 16
              && x > 13 && x < 18
              && z > 19 && z < 26
            )
          ) {
            return false;
          }
          let color;
          if (y < 2 || y > 17) {
            color = { r: 0x33, g: 0x33, b: 0x33 };
          } else if (y < 6 || y > 15) {
            color = { r: 0x99, g: 0x33, b: 0x33 };
          } else {
            color = { r: 0x99, g: 0x99, b: 0x99 };
          }
          return {
            type: 3,
            r: color.r - Math.random() * 0x11,
            g: color.g - Math.random() * 0x11,
            b: color.b - Math.random() * 0x11,
          };
        },
      }),
      voxelizer.voxelize({
        scale: 0.125,
        offset: {
          x: voxelizer.world.width * -0.5,
          y: -1.5,
          z: voxelizer.world.depth * -0.5,
        },
        generator: (x, y, z) => {
          if (
            // Limits
            y !== 1
            || (
              x < 4 || x > 27
              || z < 4 || z > 27
            )
            // Blades
            || (
              (x < 15 || x > 16)
              && (z < 15 || z > 16)
            )
          ) {
            return false;
          }
          return {
            type: 3,
            r: 0x33 - Math.random() * 0x11,
            g: 0x33 - Math.random() * 0x11,
            b: 0x33 - Math.random() * 0x11,
          };
        },
      }),
    ])
      .then(([cockpit, rotor]) => {
        this.cockpit = cockpit;
        this.add(cockpit);
        rotor.position.set(0, 2.375, 0);
        rotor.scale.set(1, 0.5, 1);
        rotor.updateMatrix();
        this.rotor = rotor;
        this.add(rotor);
      });
  }
}

export default Helicopter;
