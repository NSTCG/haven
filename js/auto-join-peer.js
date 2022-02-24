WL.registerComponent(
  "peer-manager-auto-join",
  {
    serverId: {
      type: WL.Type.String,
      default: "THISISAWONDERLANDENGINEPLACEHOLDER",
    },
    networkSendFrequencyInS: { type: WL.Type.Float, default: 0.01 },
    playerHead: { type: WL.Type.Object },
    playerRightHand: { type: WL.Type.Object },
    playerLeftHand: { type: WL.Type.Object },
    networkPlayerPool: { type: WL.Type.Object },
    voiceEnabled: { type: WL.Type.Bool, default: true },
    localPeerServer: { type: WL.Type.Bool, default: false },
  },
  {
    //
    // Initialization
    //
    init: function () {
      this.isLocalhost = window.location.hostname === 'localhost';
      this.PEER_HOST = this.localPeerServer ? 'localhost' : 'havenserver.herokuapp.com';
      console.log(`On localhost? ${this.isLocalhost}\nPeer host is ${this.PEER_HOST}`);
      this.PEER_PATH = 'peerjs/haven';
      this.username = 'default username';
      this.roomName = 'default roomname';

      this.streams = {};
      this.metadatas = {}
      this.activePlayers = {};
      this.currentDataPackage = {};
      this.calls = {};
      this.connections = [];
      this.currentTime = 0.0;

      // Dual quaternions for sending head, left and right hand transforms
      this.headDualQuat = new Float32Array(8);
      this.rightHandDualQuat = new Float32Array(8);
      this.leftHandDualQuat = new Float32Array(8);

      // Records user audio
      this.audio = document.createElement("AUDIO");
      this.audio.id = "localAudio";
      document.querySelector("body").appendChild(this.audio);

      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(
          function (stream) {
            this.localStream = stream;
          }.bind(this)
        )
        .catch(function (err) {
          console.error("User denied audio access.");
        });
      if (!this.connectionEstablishedCallbacks)
        this.connectionEstablishedCallbacks = [];
      if (!this.clientJoinedCallbacks) this.clientJoinedCallbacks = [];
      if (!this.disconnectCallbacks) this.disconnectCallbacks = [];
      if (!this.registeredNetworkCallbacks)
        this.registeredNetworkCallbacks = {};
      
      // Signal to parent page on Haven site
      console.log(`Sending ready message to ${window.parent.location}`);
      window.parent.postMessage('ready', location.origin);
      window.addEventListener('message', e => { 
        if (e.data === 'ready') return;
        this.onPayloadReceived(e.data);
      });
    },
    start: function () {
      window.peerc = this;
      /* Try to get one of the two types of spawner component */
      this.networkPlayerSpawner =
        this.networkPlayerPool.getComponent("peer-networked-player-pool") ||
        this.networkPlayerPool.getComponent("peer-networked-player-spawner");
      this.soundJoin = this.object.addComponent(
        'howler-audio-source', {
          src: 'sfx/plop.mp3',
          spatial: true
        });
    },
    refresh: function () {
      this.streams = {};
      this.activePlayers = {};
      this.currentDataPackage = {};
      this.calls = {};
      this.metadatas = {}
      this.connections = [];
      this.currentTime = 0.0;

      setTimeout(() => {
        this.host();
      }, 1000);
    },
    //
    // Host functions
    //
    host: function () {
      const hostId = `host-${this.username}-${this.roomName}`;

      let peerObject = {
        host: this.PEER_HOST,
        path: this.PEER_PATH,
        debug: true,
        secure: !this.localPeerServer,
        config: {
          'iceServers': [
            { url: 'stun:arcade.uber.space:42120' },
            { url: 'turn:arcade.uber.space:42120?transport=tcp', username: 'chess', credential: 'bGghEDegsXNrJaeGKp88mMPhPTTL' },
            { url: 'turn:arcade.uber.space:42120?transport=udp', username: 'chess', credential: 'bGghEDegsXNrJaeGKp88mMPhPTTL' },
          ]
        },
      }
      if(this.localPeerServer) peerObject['port'] = 9000;

      this.peer = new Peer(hostId, peerObject);
  
      this.peer.on("open", this._onHostOpen.bind(this));
      // this.peer.on("error", this._onHostError.bind(this));
    },
    kick: function (id) {
      if (!this.currentDataPackage["disconnect"])
        this.currentDataPackage["disconnect"] = [];
      this.currentDataPackage["disconnect"].push(id);
      this._removePlayer(id);
    },
    _onHostError: function (id) {
      this.peer = null;
      this.join();
    },
    _onHostOpen: function (id) {
      isHost = true;
      this.serverId = id;
      this.metadatas[this.serverId] = { username: this.username };
      this.activePlayers[this.serverId] = {};
      for (let i = 0; i < this.connectionEstablishedCallbacks.length; i++) {
        this.connectionEstablishedCallbacks[i]();
      }
      this.peer.on("connection", this._onHostConnected.bind(this));
      this.peer.on("disconnected", this._onDisconnected.bind(this));

      this.peer.on(
        "call",
        function (call) {
          this.calls[call.peer] = call;

          if(!this.joining) this.soundJoin.play();

          call.answer(this.localStream);
          call.on("stream",
            function (stream) {
              let audio = document.createElement("AUDIO");
              audio.id = "remoteAudio" + call.peer;
              document.querySelector("body").appendChild(audio);
              audio.srcObject = stream;
              audio.autoplay = true;
              this.streams[call.peer] = stream;
            }.bind(this)
          );
        }.bind(this)
      );
    },
    _onHostConnected: function (connection) {
      this._hostPlayerJoined(connection.peer, connection.metadata);
      this.connections.push(connection);
      this.metadatas[connection.peer] = connection.metadata;
      connection.on(
        "open",
        function () {
          if(!this.joining) this.soundJoin.play();
          // Additional data too be sent on joining can be added here
          connection.send({
            joinedPlayers: Object.keys(this.activePlayers),
            joined: true,
            metaData: this.metadatas
          });
        }.bind(this)
      );
      connection.on(
        "close",
        function () {
          this._onHostConnectionClose(connection);
        }.bind(this)
      );
      connection.on(
        "data",
        function (data) {
          this._onHostDataRecieved(data, connection);
        }.bind(this)
      );
      this.object.setTranslationWorld([0, 0, 0]);
    },
    _onHostDataRecieved: function (data, connection) {
      if (data.transforms && this.activePlayers[connection.peer]) {
        this.activePlayers[connection.peer].setTransforms(data.transforms);
      }
      const dataKeys = Object.keys(data);
      for (let i = 0; i < dataKeys.length; i++) {
        const key = dataKeys[i];
        if (key == "transforms") continue;
        if (this.registeredNetworkCallbacks[key]) {
          this.registeredNetworkCallbacks[key](data[key]);
        }
      }
      this.currentDataPackage[connection.peer] = data;
    },
    _onHostConnectionClose: function (connection) {
      this._removePlayer(connection.peer);
      // this.object.setTranslationWorld([0, -1, 0]);
      // this.disconnect();
      if (!this.currentDataPackage["disconnect"])
        this.currentDataPackage["disconnect"] = [];
      this.currentDataPackage["disconnect"].push(connection.peer);
    },
    _hostPlayerJoined: function (id, metadata) {
      let newPlayer = this.networkPlayerSpawner.getEntity(metadata, id);
      this.activePlayers[id] = newPlayer;
      if (!this.currentDataPackage.joinedPlayers) {
        this.currentDataPackage.joinedPlayers = [];
      }
      if(!this.currentDataPackage.metaData) {
        this.currentDataPackage.metaData = {};
      }
      this.currentDataPackage.metaData[id] = metadata;
      this.currentDataPackage.joinedPlayers.push(id);
      for (let i = 0; i < this.clientJoinedCallbacks.length; i++) {
        this.clientJoinedCallbacks[i](id, newPlayer);
      }
    },
    //
    // Client functions
    //
    join: function (id) {
      this.joining = true;
      this.connect(id);
    },
    connect: function (id) {
      if (!id)
        return console.error("peer-manager: Connection id parameter missing");
      this.userId = `user-${this.username}_${id}`;
      this.serverId = id;
      if (!this.peer) {
        let peerObject = {
          host: this.PEER_HOST,
          path: this.PEER_PATH,
          debug: true,
          secure: !this.localPeerServer,
          config: {
            'iceServers': [
              { url: 'stun:arcade.uber.space:42120' },
              { url: 'turn:arcade.uber.space:42120?transport=tcp', username: 'chess', credential: 'bGghEDegsXNrJaeGKp88mMPhPTTL' },
              { url: 'turn:arcade.uber.space:42120?transport=udp', username: 'chess', credential: 'bGghEDegsXNrJaeGKp88mMPhPTTL' },
            ]
          },
        }
        if(this.localPeerServer) peerObject['port'] = 9000;

        this.peer = new Peer(this.userId, peerObject);
        this.peer.on("open", this._clientOnOpen.bind(this));
        this.peer.on("disconnected", this._onDisconnected.bind(this));
        this.connectionId = id;
        this.peer.on(
          "call",
          function (call) {
            if (!this.voiceEnabled) return;
            this.calls[call.peer] = call;
            call.answer(this.localStream);
            call.on(
              "stream",
              function (stream) {
                let audio = document.createElement("AUDIO");
                audio.id = "remoteAudio" + id;
                document.querySelector("body").appendChild(audio);
                audio.srcObject = stream;
                audio.autoplay = true;
                this.streams[id] = stream;
              }.bind(this)
            );
          }.bind(this)
        );
      }
    },
    disconnect: function () {
      if (!this.peer) return;
      this.peer.destroy();
      this.peer = null;
      this.connections = [];
      delete this.connection;
    },
    _onClientConnected: function () {
      this.call(this.serverId);
      isHost = false;
      for (let i = 0; i < this.connectionEstablishedCallbacks.length; i++) {
        this.connectionEstablishedCallbacks[i]();
      }
    },
    _onClientDataRecieved: function (data) {
      let registeredCallbacksKeys = Object.keys(
        this.registeredNetworkCallbacks
      );
      const keys = Object.keys(data);
      const joined = keys.includes("joined");
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = data[key];
        if (key == "joinedPlayers") {
          for (let j = 0; j < data.joinedPlayers.length; j++) {
            // if the join id is the same, ignore
            if (
              data.joinedPlayers[j] == this.peer.id ||
              this.activePlayers[data.joinedPlayers[j]]
            )
              continue;
            if (!joined && data.joinedPlayers[j] != this.serverId) {
              let currentIndex = j;
              setTimeout(
                function () {
                  this.call(data.joinedPlayers[currentIndex]);
                }.bind(this),
                Math.floor(200 * j)
              );
            }
            let newPlayer = this.networkPlayerSpawner.getEntity(data.metaData[data.joinedPlayers[j]], data.joinedPlayers[j]);
            this.activePlayers[data.joinedPlayers[j]] = newPlayer;
            for (let k = 0; k < this.clientJoinedCallbacks.length; i++) {
              this.clientJoinedCallbacks[k](data.joinedPlayers[j], newPlayer);
            }
          }

          setTimeout(() => {
              this.joining = false;
            }, 200 * data.joinedPlayers.length);
        } else {
          if (key == "call") continue;
          if (key == "disconnect") {
            for (let j = 0; j < value.length; j++) {
              this._removePlayer(value[j]);
            }
          }
          if (this.activePlayers[key]) {
            const values = Object.keys(value);
            for (let j = 0; j < values.length; j++) {
              if (values[j] == "transforms") {
                this.activePlayers[key].setTransforms(value.transforms);
              } else {
                let includes = registeredCallbacksKeys.includes(values[j]);
                if (includes) {
                  this.registeredNetworkCallbacks[values[j]](value[values[j]]);
                }
              }
            }
          } else {
            let includes = registeredCallbacksKeys.includes(key);
            if (includes) {
              this.registeredNetworkCallbacks[key](value);
            }
          }
        }
      }
    },
    _removeAllPlayers: function () {
      const players = Object.keys(this.activePlayers);
      for (let i = 0; i < players.length; i++) {
        this._removePlayer(players[i]);
      }
    },
    _removePlayer: function (peerId) {
      if (!this.activePlayers[peerId]) return;
      if (this.calls[peerId]) {
        this.calls[peerId].close();
        delete this.calls[peerId];
      }
      if (this.connections.length) {
        const con = this.connections.find(function (element) {
          return element.peer === peerId;
        });
        if (con) {
          con.close();
          let index = this.connections.indexOf(con);
          if (index > -1) {
            this.connections.splice(index, 1);
          }
        }
      }
      if (this.activePlayers[peerId]) {
        if (Object.keys(this.activePlayers[peerId]).length !== 0) {
          console.log("removing " + peerId);
          console.log(this.activePlayers);
          this.activePlayers[peerId].reset();
          this.networkPlayerSpawner.returnEntity(this.activePlayers[peerId]);
        }
        delete this.activePlayers[peerId];
      }
    },
    // All functions
    _onDisconnected: function (connection) {
      this._removeAllPlayers();
      this.disconnect();
      for (let i = 0; i < this.disconnectCallbacks.length; i++) {
        this.disconnectCallbacks[i]();
      }
      this.refresh();
    },
    call: function (id) {
      if (!this.voiceEnabled) return;
      const call = this.peer.call(id, this.localStream);
      this.calls[id] = call;
      call.on('close', function(){
        console.log("closed")
        this.peer.call(id, this.localStream);
      }.bind(this));
      call.on('error', function(err){
        console.log("err", err)
        this.peer.call(id, this.localStream);
      }.bind(this));
      call.on(
        "stream",
        function (stream) {
          let audio = document.createElement("AUDIO");
          audio.id = id;
          document.querySelector("body").appendChild(audio);
          audio.srcObject = stream;
          audio.autoplay = true;
          this.streams[id] = stream;
        }.bind(this)
      );
    },
    _clientOnOpen: function () {
      this.connection = this.peer.connect(this.connectionId, {
        // reliable: true,
        metadata: { username: this.username },
      });
      this.connection.on("open", this._onClientConnected.bind(this));
      this.connection.on("data", this._onClientDataRecieved.bind(this));
      this.connection.on("close", this._onClientClose.bind(this));
    },
    _onClientClose: function () {
      if (this.peer) {
        this._onDisconnected();
      }
    },
    addConnectionEstablishedCallback: function (f) {
      if (!this.connectionEstablishedCallbacks)
        this.connectionEstablishedCallbacks = [];
      this.connectionEstablishedCallbacks.push(f);
    },
    removeConnectionEstablishedCallback: function (f) {
      const index = this.connectionEstablishedCallbacks.indexOf(f);
      if (index > -1) {
        this.connectionEstablishedCallbacks.splice(index, 1);
      }
    },
    addClientJoinedCallback: function (f) {
      if (!this.clientJoinedCallbacks) this.clientJoinedCallbacks = [];
      this.clientJoinedCallbacks.push(f);
    },
    removeClientJoinedCallback: function (f) {
      const index = this.clientJoinedCallbacks.indexOf(f);
      if (index > -1) {
        this.clientJoinedCallbacks.splice(index, 1);
      }
    },
    addDisconnectCallback: function (f) {
      if (!this.disconnectCallbacks) this.disconnectCallbacks = [];
      this.disconnectCallbacks.push(f);
    },
    removeDisconnectCallback: function (f) {
      const index = this.disconnectCallbacks.indexOf(f);
      if (index > -1) {
        this.disconnectCallbacks.splice(index, 1);
      }
    },
    addNetworkDataRecievedCallback: function (key, f) {
      if (!this.registeredNetworkCallbacks)
        this.registeredNetworkCallbacks = {};
      this.registeredNetworkCallbacks[key] = f;
    },
    removeNetworkDataRecievedCallback: function (key) {
      delete this.registeredNetworkCallbacks[key];
    },
    sendPackage: function (key, data) {
      this.currentDataPackage[key] = data;
    },
    sendPackageImmediately: function (key, data) {
      let package = {};
      package[key] = data;
      if (this.connection) {
        this.connection.send(package);
      } else {
        for (let i = 0; i < this.connections.length; i++) {
          this.connections[i].send(package);
        }
      }
    },
    toggleMute: function () {
      this.localStream.getTracks()[0].enabled =
        !this.localStream.getTracks()[0].enabled;
    },
    setOwnMute: function (mute) {
      this.localStream.getTracks()[0].enabled = !mute;
    },
    setOtherMute: function (mute, id) {
      if (this.streams[id]) this.streams[id].getTracks()[0].enabled = !mute;
    },
    update: function (dt) {
      if (this.connections.length) {
        this.currentTime += dt;
        if (this.currentTime >= this.networkSendFrequencyInS) {
          this.currentTime = 0.0;
          this.headDualQuat.set(this.playerHead.transformWorld);
          this.rightHandDualQuat.set(this.playerRightHand.transformWorld);
          this.leftHandDualQuat.set(this.playerLeftHand.transformWorld);

          this.currentDataPackage[this.serverId] = {
            transforms: {
              head: this.headDualQuat,
              rightHand: this.rightHandDualQuat,
              leftHand: this.leftHandDualQuat,
            },
          };
          if (Object.keys(this.currentDataPackage).length) {
            for (let i = 0; i < this.connections.length; i++) {
              let currentConnectionId = this.connections[i].peer;
              const package = Object.fromEntries(
                Object.entries(this.currentDataPackage).filter(function (e) {
                  return e[0] != currentConnectionId;
                })
              );
              if (Object.keys(package).length)
                this.connections[i].send(package);
            }
            this.currentDataPackage = {};
          }
        }
      } else if (this.connection) {
        this.currentTime += dt;
        if (this.currentTime >= this.networkSendFrequencyInS) {
          this.currentTime = 0.0;

          this.headDualQuat.set(this.playerHead.transformWorld);
          this.rightHandDualQuat.set(this.playerRightHand.transformWorld);
          this.leftHandDualQuat.set(this.playerLeftHand.transformWorld);

          this.currentDataPackage.transforms = {
            head: this.headDualQuat,
            rightHand: this.rightHandDualQuat,
            leftHand: this.leftHandDualQuat,
          };
          this.connection.send(this.currentDataPackage);
          this.currentDataPackage = {};
        }
      }
    },
    onPayloadReceived: function(rawPayload) {
      if (typeof rawPayload === 'object') return; // We should only be receiving a stringified payload

      const payload = JSON.parse(rawPayload);
      if (payload.type === 'host') {
        const [username, roomName] = payload.roomId.split('-').splice(1);
        this.username = username;
        this.roomName = roomName;
        this.host();
      }
      else if (payload.type === 'join') {
        this.username = payload.username;
        this.join(payload.roomId);
      }

      console.log(`Sending havenconnected message to ${window.parent.location}`);
      window.parent.postMessage('havenconnected', location.origin);
    }
  }
);

WL.registerComponent("peer-networked-player-pool", {

}, {
  init: function() {
    this.inactivePool = [];
    for (let c of this.object.children) {
      this.inactivePool.push(c.getComponent("peer-networked-player"));
    }
  },
  getEntity: function() {
    if (this.inactivePool.length) return this.inactivePool.shift();
    console.error("peer-networked-player-pool: No more inactive entities");
  },
  returnEntity: function(entity) {
    this.inactivePool.push(entity);
  },
}
);

WL.registerComponent("peer-networked-player", {
  nameTextObject: { type: WL.Type.Object }
}, {
  init: function() {
    for (let c of this.object.children) {
      if(c.name == "Head") this.head = c;
      if(c.name == "LeftHand") this.leftHand = c;
      if(c.name == "RightHand") this.rightHand = c;
    }
  },

  setName: function(name) {
    if (this.nameTextObject) this.nameTextObject.getComponent("text").text = name;
  },

  reset: function() {
    this.head.resetTranslationRotation();
    this.head.children[0].resetTranslationRotation();
    this.rightHand.resetTranslationRotation();
    this.leftHand.resetTranslationRotation();
  },

  setTransforms: function(transforms) {
    this.head.transformLocal.set(new Float32Array(transforms.head));
    this.head.setDirty();

    this.rightHand.transformLocal.set(new Float32Array(transforms.rightHand));
    this.rightHand.setDirty();

    this.leftHand.transformLocal.set(new Float32Array(transforms.leftHand));
    this.leftHand.setDirty();
  },
}
);

WL.registerComponent("peer-networked-player-spawner", {
  headMesh: { type: WL.Type.Mesh },
  headMaterial: { type: WL.Type.Material },
  leftHandMesh: { type: WL.Type.Mesh },
  leftHandMaterial: { type: WL.Type.Material },
  rightHandMesh: { type: WL.Type.Mesh },
  rightHandMaterial: { type: WL.Type.Material },
}, {
  init: function() {
    this.count = 0;
  },

  getEntity: function(metadata, roomName) {
    const player = WL.scene.addObject(1);
    const children = WL.scene.addObjects(3, player);
    const nametag = WL.scene.addObject(children[0]._id);

    children[0].name = "Head";
    children[0].addComponent("mesh", {
      mesh: this.headMesh,
      material: this.headMaterial,
    });

    children[1].name = "LeftHand";
    children[1].addComponent("mesh", {
      mesh: this.leftHandMesh,
      material: this.leftHandMaterial,
    });

    children[2].name = "RightHand";
    children[2].addComponent("mesh", {
      mesh: this.rightHandMesh,
      material: this.rightHandMaterial,
    });

    nametag.name = "Nametag";
    nametag.addComponent("text").text = metadata.username;
    nametag.addComponent("player-name-display", {
      positionParent: children[0],
      positionYOffset: 1.6,
      target: new WL.Object(2).getComponent('wasd-manual').headObject
    });

    player.name = `Player ${this.count++}`;
    return player.addComponent("peer-networked-player");
  },

  returnEntity: function(player) {
    console.log("returning:", player);
    player.children.forEach((c) => { c.active = false; });
    player.active = false;
  },
});