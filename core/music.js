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
  5901645,8025605,22875418,233606431,233617393,235375023,235624512,236614244,848063,4647775,131973269,145965215,155092305,156883087,161821067,234636978,240073482,280616948,291949738,562438,4648942,22197829,31343669,80055939,123453086,131842370,138415193,175748933,286904364,4663923,38683941,222316758
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
