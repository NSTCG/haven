

//import {vec3} from 'gl-matrix'; (sometimes this won't work on manual js import, in that case use the following)

//code by tcg (for reference)

const vec3 = glMatrix.vec3;

/**
 * Manual movement with W/A/S/D keys and virtual joystick.
 */
WL.registerComponent('wasd_manual', {
    /** Movement speed in m/s. */
    normal_speed: { type: WL.Type.Float, default: 0.1 },
    /**Accelerated speed in m/s. */
    accelerated_speed: { type: WL.Type.Float, default: 0.2 },
    /** Object of which the orientation is used to determine forward direction */
    headObject: { type: WL.Type.Object },
    /** Whether or not to restrict movement on the Y axis */
    restrictY: { type: WL.Type.Bool, default: false }
}, {
    init: function() {
        this.speed=this.normal_speed;
        this.up = false;
        this.right = false;
        this.down = false;
        this.left = false;

        window.addEventListener('keydown', this.press.bind(this));
        window.addEventListener('keyup', this.release.bind(this));
    },

    start: function() {
        this.headObject = this.headObject || this.object;
    },

    update: function() {
        let direction = [0, 0, 0];

        if (this.up) direction[2] -= 1.0;
        if (this.down) direction[2] += 1.0;
        if (this.left) direction[0] -= 1.0;
        if (this.right) direction[0] += 1.0;

        vec3.normalize(direction, direction);
        direction[0] *= this.speed;
        direction[2] *= this.speed;
        vec3.transformQuat(direction, direction, this.headObject.transformWorld);
        if (this.restrictY) direction[1] = 0;
        this.object.translate(direction);
    },

    press: function(e) {
        if (e.keyCode === 38 /* up */ || e.keyCode === 87 /* w */ || e.keyCode === 90 /* z */ ) {
            this.up = true
        } else if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */ ) {
            this.right = true
        } else if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */ ) {
            this.down = true
        } else if (e.keyCode === 37 /* left */ || e.keyCode === 65 /* a */ || e.keyCode === 81 /* q */ ) {
            this.left = true
        }
        else if (e.keyCode === 16 /* increment_speed */  ) {
            this.speed=this.accelerated_speed
        }

    },

    release: function(e) {
        if (e.keyCode === 38 /* up */ || e.keyCode === 87 /* w */ || e.keyCode === 90 /* z */ ) {
            this.up = false
        } else if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */ ) {
            this.right = false
        } else if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */ ) {
            this.down = false
        } else if (e.keyCode === 37 /* left */ || e.keyCode === 65 /* a */ || e.keyCode === 81 /* q */ ) {
            this.left = false
        }
        else if (e.keyCode === 16 /* reset_speed */  ) {
            this.speed=this.normal_speed
        }
    }
});


//const vec3 = glMatrix.vec3;
starttimer=false;    
timer=0;

WL.registerComponent('1TapMovement(AR/VR)', {
    
    speed: { type: WL.Type.Float, default: 0.02 },          /** Movement speed in m/s. */
    starting_delay: {type: WL.Type.Float, default: 0.5},    /** how much time should we wait after the press to start movement */
    cardboard_camera: { type: WL.Type.Object },              /** select the eyeleft or eyeright (vr cameras) for this */
    restrictY: { type: WL.Type.Bool, default: false }        /** Whether or not to restrict movement on the Y axis */
},

    {

    init: function() {
        this.click_event = false;

        /** important part :input sensing  */

        WL.onXRSessionStart.push(s => s.addEventListener('selectstart',this.press.bind(this) ));    /** to listen to 'select start' event and exicute the funtion 'press' only after we enter vr session  */
        WL.onXRSessionStart.push(s => s.addEventListener('selectend',this.release.bind(this) ));    /** to listen to select end event and exicute the funtion 'release' in vr session */
        
    },



    start: function() {
        this.cardboard_camera = this.cardboard_camera || this.object;
    },

    

    update: function(dt) {

        //increment the timer over time(dt) while starttimer is true (ie while click start)

        if(starttimer){
            timer +=dt;
          }
 

        /**enable movement when the the timer exceeds the starting delay */

        if (timer>this.starting_delay)
        
        {                
            let direction = [0, 0, 0];
            if (this.click_event) direction[2] -= 1.0;
            vec3.normalize(direction, direction);
            direction[2] *= this.speed;
            vec3.transformQuat(direction, direction, this.cardboard_camera.transformWorld);
            if (this.restrictY) direction[1] = 0;
            this.object.translate(direction);
            
        }

        


    },

    press: function() {

        navigator.vibrate(200);  // vibration to detect press event (optional)
        starttimer=true;         // timer starts
        
        /**switches the click_event flag (to true)*/
        this.click_event = true;
        
        
    },

    release: function() {
        
        starttimer=false;  //timer stops
        timer=0;           //timer resets

        /**switches the click_event flag (to false) */
        this.click_event = false;
        
        
    },
   
});



/**
 * Allows switching all other components on an object to active/inactive
 * depending on whether a VR/AR session is active.
 *
 * Useful for hiding controllers until the user enters VR for example.
 */
 WL.registerComponent("mobile-active-switch", {
    /** When components should be active: In VR or when not in VR */
    activateComponents: {type: WL.Type.Enum, values: ["in VR", "in non-VR"], default: "in VR"},
    /** Whether child object's components should be affected */
    affectChildren: {type: WL.Type.Bool, default: true},
}, {
    start: function() {
        window.IsMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.components = [];
        this.getComponents(this.object);

        /* Initial activation/deactivation */
        this.onXRSessionEnd();

        WL.onXRSessionStart.push(this.onXRSessionStart.bind(this));
        WL.onXRSessionEnd.push(this.onXRSessionEnd.bind(this));
    },

    getComponents: function(obj) {
        const comps = obj.getComponents().filter(c => c.type != "mobile-active-switch");
        this.components = this.components.concat(comps);

        if(this.affectChildren) {
            let children = obj.children;
            for(let i = 0; i < children.length; ++i) {
                this.getComponents(children[i]);
            }
        }
    },

    setComponentsActive: function(active) {
        const comps = this.components;
        for (let i = 0; i < comps.length; ++i) {
            if(window.IsMobile==true){
                comps[i].active = false;
            }
            else{
                comps[i].active = active;
            }
            
        }
    },

    onXRSessionStart: function() {
        console.log("IsMobile ? "+ window.IsMobile);
        if(!this.active) return;
        this.setComponentsActive(this.activateComponents == 0);
    },

    onXRSessionEnd: function() {
        if(!this.active) return;
        this.setComponentsActive(this.activateComponents != 0);
    },
}
);