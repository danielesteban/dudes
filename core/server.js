import SimplePeer from 'simple-peer/simplepeer.min.js';
import { Group } from '../vendor/three.js';
import { protocol } from '../vendor/protocol.js';
import Head from '../renderables/head.js';
import Peer from '../renderables/peer.js';

class Server extends Group {
  constructor({
    player,
    url,
    onLoad,
    onSpawn,
    onTarget,
    onUpdate,
  }) {
    super();
    this.matrixAutoUpdate = false;
    this.player = player;
    this.url = url;
    this.onLoad = onLoad;
    this.onSpawn = onSpawn;
    this.onTarget = onTarget;
    this.onUpdate = onUpdate;
    this.peers = [];
    {
      let skin = localStorage.getItem('skin');
      if (!skin) {
        skin = Head.generateTexture().toDataURL();
        localStorage.setItem('skin', skin);
      }
      this.skin = skin;
    }
    this.connect();
  }

  animate(animation) {
    const { peers, player, skin } = this;

    const hands = player.controllers
      .filter(({ hand }) => (!!hand))
      .sort(({ hand: { handedness: a } }, { hand: { handedness: b } }) => b.localeCompare(a));

    const update = new Float32Array([
      ...player.head.position.toArray(),
      ...player.head.quaternion.toArray(),
      ...(hands.length === 2 ? (
        hands.reduce((hands, { hand: { state }, worldspace: { position, quaternion } }) => {
          hands.push(
            ...position.toArray(),
            ...quaternion.toArray(),
            state
          );
          return hands;
        }, [])
      ) : []),
    ]);
    const payload = new Uint8Array(1 + update.byteLength);
    payload[0] = 0x01;
    payload.set(new Uint8Array(update.buffer), 1);

    peers.forEach(({ connection, controllers }) => {
      if (
        connection
        && connection._channel
        && connection._channel.readyState === 'open'
      ) {
        try {
          connection.send(payload);
        } catch (e) {
          return;
        }
        if (!connection.hasSentSkin) {
          connection.hasSentSkin = true;
          const encoded = (new TextEncoder()).encode(skin);
          const payload = new Uint8Array(1 + encoded.length);
          payload.set(encoded, 1);
          try {
            connection.send(payload);
          } catch (e) {
            // console.log(e);
          }
        }
      }
      controllers.forEach((controller) => {
        if (controller.visible) {
          controller.hand.animate(animation);
        }
      });
    });
  }

  connect() {
    const { url } = this;
    if (this.socket) {
      this.disconnect();
    }
    const socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    socket.onerror = () => {};
    socket.onclose = () => {
      this.reset();
      // this.reconnectTimer = setTimeout(this.connect.bind(this), 1000);
    };
    socket.onmessage = this.onMessage.bind(this);
    this.socket = socket;
  }

  connectToPeer(id, initiator = false) {
    const { player } = this;
    const connection = new SimplePeer({
      initiator,
      // stream: player.audioStream,
    });
    const peer = new Peer({
      peer: id,
      connection,
      listener: player.head,
    });
    connection.on('error', () => {});
    connection.on('data', (data) => peer.onData(data));
    connection.on('signal', (signal) => (
      this.request({
        type: 'SIGNAL',
        id,
        signal: JSON.stringify(signal),
      })
    ));
    connection.on('track', peer.onTrack.bind(peer));
    this.add(peer);
    return peer;
  }

  disconnect() {
    const { socket } = this;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (!socket) {
      return;
    }
    socket.onclose = null;
    socket.onmessage = null;
    socket.close();
    this.reset();
  }

  onMessage({ data: buffer }) {
    let message;
    try {
      message = protocol.Message.decode(new Uint8Array(buffer));
    } catch (e) {
      return;
    }
    switch (message.type) {
      case protocol.Message.Type.LOAD:
        this.onLoad({
          dudes: message.dudes,
          world: message.world,
        });
        this.peers = message.peers.map((id) => (
          this.connectToPeer(id, true)
        ));
        break;
      case protocol.Message.Type.UPDATE:
        this.onUpdate(message.brush, message.voxel);
        break;
      case protocol.Message.Type.JOIN:
        this.peers.push(this.connectToPeer(message.id));
        break;
      case protocol.Message.Type.LEAVE: {
        const index = this.peers.findIndex(({ peer: id }) => (id === message.id));
        if (~index) {
          const [peer] = this.peers.splice(index, 1);
          this.remove(peer);
          peer.dispose();
        }
        break;
      }
      case protocol.Message.Type.SIGNAL: {
        const { connection } = this.peers[
          this.peers.findIndex(({ peer: id }) => (id === message.id))
        ] || {};
        if (connection && !connection.destroyed) {
          let signal;
          try {
            signal = JSON.parse(message.signal);
          } catch (e) {
            return;
          }
          connection.signal(signal);
        }
        break;
      }
      case protocol.Message.Type.SPAWN:
        this.onSpawn(message.dudes);
        break;
      case protocol.Message.Type.TARGET:
        this.onTarget(message.id, message.voxel);
        break;
      default:
        break;
    }
  }

  request(message) {
    const { socket } = this;
    message.type = protocol.Message.Type[message.type];
    socket.send(protocol.Message.encode(protocol.Message.create(message)).finish());
  }

  reset() {
    const { peers } = this;
    peers.forEach((peer) => {
      this.remove(peer);
      peer.dispose();
    });
    peers.length = 0;
  }
}

export default Server;
