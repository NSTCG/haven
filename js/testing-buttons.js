WL.registerComponent('testing-buttons', {
    peerObject: { type: WL.Type.Object },
}, {
    start: function() {
        this.peerComponent = this.peerObject.getComponent('peer-manager-auto-join');
        let children = this.object.children;
        if(this.peerComponent.isLocalhost) {
            for (let i = 0; i < children.length; i++) {
                const element = children[i];
                if(element.name === "JoinButton")
                    element.getComponent('cursor-target').addClickFunction(this.join.bind(this));
                else
                   element.getComponent('cursor-target').addClickFunction(this.host.bind(this));
            }
        } else {
            this.hideButtons();
        }
    },
    host: function() {
        this.hideButtons();

        console.log('Testing: Host');
        this.peerComponent.username = "testingUser";
        this.peerComponent.roomName = "testingRoom";
        this.peerComponent.host();
    },
    join: function() {
        this.hideButtons();
        
        console.log('Testing: Join');
        this.peerComponent.username = "testing-" + Math.floor(Math.random() * 10000);
        this.peerComponent.join("host-testingUser-testingRoom");
    },
    hideButtons: function (){
        let children = this.object.children;
        for (let i = 0; i < children.length; i++) {
            const element = children[i];
            element.getComponent('text').active = false;
            element.getComponent('collision').active = false;
        }
    }
});
