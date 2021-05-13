import { PositionalAudio } from '../vendor/three.js';

class Music {
  constructor(listener) {
    this.isRunning = listener.context.state === 'running';
    this.player = document.createElement('audio');
    this.player.crossOrigin = 'anonymous';
    this.player.onerror = this.next.bind(this);
    this.player.onended = this.next.bind(this);
    const audio = listener.context.createMediaElementSource(this.player);
    const splitter = listener.context.createChannelSplitter(2);
    audio.connect(splitter);
    this.speakers = [...Array(2)].map((v, channel) => {
      const gain = listener.context.createGain();
      splitter.connect(gain, channel);
      const speaker = new PositionalAudio(listener);
      speaker.setNodeSource(gain);
      return speaker;
    });
    this.track = -1;
    this.next();
  }

  dispose() {
    const { player } = this;
    if (!player.paused) {
      player.pause();
      player.src = '';
    }
  }

  resume() {
    const { player } = this;
    this.isRunning = true;
    if (player.paused) {
      player.play();
    }
  }

  next() {
    const { player } = this;
    const { tracks } = Music;
    this.track = (this.track + 1) % tracks.length;
    const clientId = 'client_id=eb5fcff9e107aab508431b4c3c416415';
    const id = tracks[this.track];
    fetch(`https://api.soundcloud.com/tracks/${id}?format=json&${clientId}`)
      .then((res) => {
        if (res.status !== 200) {
          throw new Error(`Couldn't fetch track: ${id}`);
        }
        return res.json();
      })
      .then((track) => {
        player.src = `${track.stream_url}?${clientId}`;
        if (this.isRunning) player.play();
      })
      .catch(() => this.next());
  }
}

Music.tracks = [
  304835585,302743925,330782018,300939526,459525066,296293091,379018106,261722294,282925668,384922289,373765862,415017399,306335557,380188898,297111389,277594175,247472456,253918910,259938928,280127344,340311729,231217657,278455437,277243857,269664911,270902712,272061364,246644393,261427242,286969134,340491361,292822898,120511758,308113300,310752288,325763708,246221763,318821121,311917735,310747443,518526270,
];

{
  const { length } = Music.tracks;
  const rng = new Uint32Array(length);
  crypto.getRandomValues(rng);
  for (let i = length - 1; i >= 0; i -= 1) {
    const random = rng[i] % length;
    const temp = Music.tracks[i];
    Music.tracks[i] = Music.tracks[random];
    Music.tracks[random] = temp;
  }
}

export default Music;
