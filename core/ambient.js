class Ambient {
  constructor({
    anchor,
    isRunning,
    range = { from: 0, to: 100 },
    sounds,
  }) {
    this.anchor = anchor;
    this.isRunning = isRunning;
    range.step = range.to - range.from;
    this.range = range;
    this.sounds = sounds.map(({
      enabled,
      gain = 0.2,
      from,
      to,
      url,
    }) => {
      const player = new Audio();
      player.crossOrigin = 'anonymous';
      player.loop = true;
      player.src = url;
      player.volume = 0;
      if (isRunning) {
        player.play();
      }
      return {
        enabled,
        player,
        from,
        to,
        step: to - from,
        gain,
        power: 0,
        url,
      };
    });
  }

  dispose() {
    const { sounds } = this;
    sounds.forEach(({ player }) => {
      if (!player.paused) {
        player.pause();
        player.src = '';
      }
    });
  }

  resume() {
    const { sounds } = this;
    this.isRunning = true;
    sounds.forEach(({ player }) => {
      if (player.paused) {
        player.play();
      }
    });
  }

  animate({ delta }) {
    const {
      anchor,
      isRunning,
      range,
      sounds,
    } = this;
    if (!isRunning) {
      return;
    }
    const elevation = (
      Math.min(Math.max(anchor.position.y, range.from), range.to) - range.from
    ) / (range.step);
    const step = delta * 0.5;
    sounds.forEach((sound) => {
      if (sound.enabled) {
        if (sound.power < 1) sound.power = Math.min(sound.power + step, 1);
      } else if (sound.enabled === false) {
        if (sound.power > 0) sound.power = Math.max(sound.power - step, 0);
      } else {
        const factor = (
          Math.min(Math.max(elevation, sound.from), sound.to) - sound.from
        ) / (sound.step);
        sound.power = (factor > 0.5 ? 1.0 - factor : factor) * 2.0;
      }
      sound.player.volume = Math.cos((1.0 - sound.power) * 0.5 * Math.PI) * sound.gain;
    });
  }
}

export default Ambient;
