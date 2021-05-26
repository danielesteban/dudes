import { Dude } from 'dudes';
import { Color } from 'three';

class Chief extends Dude {
  constructor() {
    const spec = Dude.defaultSpec;
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
      height: 2.5,
      waist: 0.5,
      torso: {
        ...spec.torso,
        depth: spec.torso.depth * 1.5,
      },
      head: {
        ...spec.head,
        shape: 'box',
      },
      legs: {
        ...spec.legs,
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
