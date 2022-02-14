WL.registerComponent('switch-vr-camera', {
    vrCamera: {type: WL.Type.Object},
    desktopCamera: {type: WL.Type.Object},
}, {
    start: function() {
      this.peerComponent = this.object.getComponent('peer-manager-auto-join');
      WL.onXRSessionStart.push(this.onSessionStart.bind(this));
      WL.onXRSessionEnd.push(this.onSessionEnd.bind(this));
    },
    onSessionStart: function(s) {
      this.peerComponent.playerHead = this.vrCamera;
    },
    onSessionEnd: function(s) {
      this.peerComponent.playerHead = this.desktopCamera;
    },
});
