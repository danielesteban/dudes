import { Color } from '../vendor/three.js';
import Dude from './dude.js';

class Chief extends Dude {
  constructor() {
    const spec = Dude.defaultSpec;
    const height = 2.5;
    const head = 1;
    const legs = 1;
    const torso = 1;
    const waist = 0.5;
    super({
      colors: {
        primary: (new Color()).setHSL(
          Math.random(),
          0.5 + Math.random() * 0.25,
          0.25 + Math.random() * 0.25
        ),
        secondary: (new Color()).setHSL(
          Math.random(),
          0.5 + Math.random() * 0.25,
          0.5 + Math.random() * 0.25
        ),
        skin: (new Color()).setHSL(
          Math.random(),
          0.5 + Math.random() * 0.25,
          0.25 + Math.random() * 0.5
        ),
      },
      stamina: 1,
      height,
      waist,
      torso: {
        width: spec.torso.width,
        height: spec.torso.height * torso,
        depth: spec.torso.depth * 1.5,
      },
      head: {
        shape: 'box',
        width: spec.head.width,
        height: spec.head.height * head,
        depth: spec.head.depth,
      },
      legs: {
        ...spec.legs,
        height: spec.legs.height * legs,
        depth: spec.legs.depth * 1.5,
      },
      arms: {
        ...spec.arms,
        height: spec.arms.height,
      },
      hat: {
        ...spec.hat,
        width: spec.hat.width * 3,
        height: spec.hat.height * 4,
        offsetY: spec.hat.offsetY * 0.5,
      },
    });
    this.setAction(this.actions.hype);
  }
}

export default Chief;
