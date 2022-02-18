WL.registerComponent('testing-buttons', {
}, {
    start: function() {
        let children = this.object.children;
        for (let i = 0; i < children.length; i++) {
            const element = children[i];
            if(element.name === "JoinButton")
                element.getComponent('cursor-target').addClickFunction(this.join);
            else
               element.getComponent('cursor-target').addClickFunction(this.host);
        }
    },
    host: function() {
        window.pc.host();
    },
    join: function() {
        window.pc.join("1");
    },
});
