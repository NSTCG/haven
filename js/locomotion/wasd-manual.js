//components by tcg (for reference)
//import {vec3} from 'gl-matrix'; (sometimes this won't work on manual js import, in that case use the following)
const vec3 = glMatrix.vec3;


//Manual movement with W/A/S/D keys and virtual joystick.
WL.registerComponent(
  "wasd-manual",
  {
    /** Movement speed in m/s. */
    normal_speed: { type: WL.Type.Float, default: 0.1 },
    /**Accelerated speed in m/s. */
    accelerated_speed: { type: WL.Type.Float, default: 0.2 },
    /** Object of which the orientation is used to determine forward direction */
    headObject: { type: WL.Type.Object },
    /** Whether or not to restrict movement on the Y axis */
    restrictY: { type: WL.Type.Bool, default: false },
  },
  {
    init: function () {
      window.j2x=0;
      window.j2y=0;
      this.speed = this.normal_speed;
      this.up = false;
      this.right = false;
      this.down = false;
      this.left = false;

      this.up_main = false;
      this.right_main = false;
      this.down_main = false;
      this.left_main = false;

      window.addEventListener("keydown", this.press.bind(this));
      window.addEventListener("keyup", this.release.bind(this));

      this.tempVec = new Float32Array(3);

    },

    start: function () {
      this.headObject = this.headObject || this.object;
    },

    update: function () {

      this.object.getTranslationWorld(this.tempVec);
      this.object.resetTranslation();

      this.Main_controller();

      this.object.setTranslationWorld(this.tempVec);

      let direction = [0, 0, 0];

      if (this.up_main) direction[2] -= 1.0;
      if (this.down_main) direction[2] += 1.0;
      if (this.left_main) direction[0] -= 1.0;
      if (this.right_main) direction[0] += 1.0;

      vec3.normalize(direction, direction);
      direction[0] *= this.speed;
      direction[2] *= this.speed;
      vec3.transformQuat(direction, direction, this.headObject.transformWorld);
      if (this.restrictY) direction[1] = 0;
      this.object.translate(direction);
    },

    Main_controller: function(){
      if(window.j2x!=null)this.object.rotateAxisAngleDeg([0, 1, 0], -0.65 * window.j2x);
      if(window.j2y!=null)this.object.rotateAxisAngleDegObject([1, 0, 0], -0.65 * window.j2y); // vertical rotation ( needs to be fixed)

      this.up_main = window.j1y < -0.1  || this.up ? true : false;   //add || window.j1y < -0.1 if  you wanna use left joystick for locomotion too 
      this.down_main = window.j1y > 0.1 || this.down? true : false;  //add || window.j1y < -0.1 if you wanna use left joystick for locomotion too 
      this.right_main = window.j1x > 0.1 || this.right ? true : false;  
      this.left_main = window.j1x < -0.1 ||this.left ? true : false;
    },

    press: function (e) {
      if (
        e.keyCode === 38 /* up */ ||
        e.keyCode === 87 /* w */ ||
        e.keyCode === 90 /* z */ 
      ) {
        this.up = true;
      } else if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */ ) {
        this.right = true;
      } else if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */ ) {
        this.down = true;
      } else if (
        e.keyCode === 37 /* left */ ||
        e.keyCode === 65 /* a */ ||
        e.keyCode === 81 /* q */
      ) {
        this.left = true;
      } else if (e.keyCode === 16 /* increment_speed */) {
        this.speed = this.accelerated_speed;
      }
      
    },

    release: function (e) {
      if (
        e.keyCode === 38 /* up */ ||
        e.keyCode === 87 /* w */ ||
        e.keyCode === 90 /* z */
      ) {
        this.up = false;
      } else if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */) {
        this.right = false;
      } else if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */) {
        this.down = false;
      } else if (
        e.keyCode === 37 /* left */ ||
        e.keyCode === 65 /* a */ ||
        e.keyCode === 81 /* q */
      ) {
        this.left = false;
      } else if (e.keyCode === 16 /* reset_speed */) {
        this.speed = this.normal_speed;
      }
    },

    
  }
);
