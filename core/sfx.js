import { AudioLoader, PositionalAudio } from '../vendor/three.js';

class SFX {
  constructor({ listener }) {
    this.buffers = new Map();
    this.listener = listener;
    this.loader = new AudioLoader();
  }

  load(sound) {
    const { buffers, listener, loader } = this;
    return new Promise((resolve) => {
      let cache = buffers.get(sound);
      if (!cache) {
        cache = {
          loading: true,
          promises: [resolve],
        };
        buffers.set(sound, cache);
        loader.load(sound, (buffer) => {
          cache.loading = false;
          cache.buffer = buffer;
          cache.promises.forEach((resolve) => {
            const sound = new PositionalAudio(listener);
            sound.setBuffer(buffer);
            resolve(sound);
          });
          delete cache.promises;
        });
      } else if (cache.loading) {
        cache.promises.push(resolve);
      } else {
        const sound = new PositionalAudio(listener);
        sound.setBuffer(cache.buffer);
        resolve(sound);
      }
    });
  }
}

export default SFX;
