WL.registerComponent('button', {
    buttonMeshObject: {type: WL.Type.Object},
    hoverMaterial: {type: WL.Type.Material},
}, {
    start: function() {
        if(this.buttonMeshObject) {
            this.mesh = this.buttonMeshObject.getComponent('mesh');
            this.defaultMaterial = this.mesh.material;
        }

        this.target = this.object.getComponent('cursor-target')
            || this.object.addComponent('cursor-target');
        this.target.addHoverFunction(this.onHover.bind(this));
        this.target.addUnHoverFunction(this.onUnHover.bind(this));
        this.target.addDownFunction(this.onDown.bind(this));
        this.target.addUpFunction(this.onUp.bind(this));

        this.soundClick = this.object.addComponent('howler-audio-source', {src: 'sfx/click.wav', spatial: true});
        this.soundUnClick = this.object.addComponent('howler-audio-source', {src: 'sfx/unclick.wav', spatial: true});
    },

    onHover: function(_, cursor) {
        if(this.buttonMeshObject) this.mesh.material = this.hoverMaterial;
        if(cursor.type == 'finger-cursor') {
            this.onDown(_, cursor);
        }

        this.hapticFeedback(cursor.object, 0.5, 50);
    },

    onDown: function(_, cursor) {
        this.soundClick.play();
        if(this.buttonMeshObject) this.buttonMeshObject.translate([0.0, -0.1, 0.0]);
        this.hapticFeedback(cursor.object, 1.0, 20);
    },

    onUp: function(_, cursor) {
        this.soundUnClick.play();
        if(this.buttonMeshObject) this.buttonMeshObject.translate([0.0, 0.1, 0.0]);
        this.hapticFeedback(cursor.object, 0.7, 20);
    },

    onUnHover: function(_, cursor) {
        if(this.buttonMeshObject) this.mesh.material = this.defaultMaterial;
        if(cursor.type == 'finger-cursor') {
            this.onUp(_, cursor);
        }

        this.hapticFeedback(cursor.object, 0.3, 50);
    },

    hapticFeedback: function(object, strenght, duration) {
        const input = object.getComponent('input');
        if(input && input.xrInputSource) {
            const gamepad = input.xrInputSource.gamepad;
            if(gamepad && gamepad.hapticActuators) gamepad.hapticActuators[0].pulse(strenght, duration);
        }
    },
});

WL.registerComponent('button-toggle', {
    activeMaterial: {type: WL.Type.Material},
    inactiveMaterial: {type: WL.Type.Material},
}, {
    onToggled: function() {},
    start: function() {
        this.button = this.object.addComponent('button');

        this.mesh = this.object.getComponent('mesh');
        this.mesh.material = this.activeMaterial;

        this.activeState = true;
        this.button.target.addClickFunction(() => {
            this.activeState = !this.activeState;
            this.mesh.material = this.activeState
                ? this.activeMaterial : this.inactiveMaterial;
            this.onToggled(this.activeState);
        });
    },
});

WL.registerComponent('button-mute', {
  peerManagerObject: {type: WL.Type.Object},
  muteId: {type: WL.Type.String, default: ""},
}, {
    start: function() {
        this.peerManager = this.peerManagerObject.getComponent('peer-manager-auto-join');
        this.toggleButton = this.object.getComponent('button-toggle');
        let muteFunction = this.muteId ? "setOtherMute" : "setOwnMute";
        this.toggleButton.onToggled = (b) => {
            if(b) {
              this.peerManager[muteFunction](false, this.muteId);
            } else {
              this.peerManager[muteFunction](true, this.muteId);
            }
        };
    }
});
