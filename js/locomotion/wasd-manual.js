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
      this.speed = this.normal_speed;
      this.up = false;
      this.right = false;
      this.down = false;
      this.left = false;

      window.addEventListener("keydown", this.press.bind(this));
      window.addEventListener("keyup", this.release.bind(this));

      document.addEventListener("touchstart", this.press.bind(this));
      document.addEventListener("touchmove", this.press.bind(this));
      document.addEventListener("touchend", this.reset.bind(this));
    },

    start: function () {
      this.headObject = this.headObject || this.object;
    },

    update: function () {
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

      if (window.j1x > 0.1) {
        this.object.rotateAxisAngleDegObject([0, 1, 0], -1 * window.j1x);
      }
      if (window.j1x < -0.1) {
        this.object.rotateAxisAngleDegObject([0, 1, 0], -1 * window.j1x);
      }
      if (window.j1y < -0.5) {
        //this.headObject.rotateAxisAngleDeg([1, 0, 0], 1);
        window.j2y = -1;
      } else {
        //window.j2y=0
      }
      if (window.j1y > 0.5) {
        //this.headObject.rotateAxisAngleDeg([1, 0, 0], -1);
        window.j2y = 1;
      } else {
      }
    },

    press: function (e) {
      if (
        e.keyCode === 38 /* up */ ||
        e.keyCode === 87 /* w */ ||
        e.keyCode === 90 /* z */
      ) {
        this.up = true;
      } else if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */) {
        this.right = true;
      } else if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */) {
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
      if (window.IsMobile) {
        this.up = window.j2y < -0.1 ? true : false;
        this.right = window.j2x > 0.1 ? true : false;
        this.down = window.j2y > 0.1 ? true : false;
        this.left = window.j2x < -0.1 ? true : false;
        if (window.j2x == 0 && window.j2y == 0) {
          this.up = false;
          this.right = false;
          this.down = false;
          this.left = false;
        }
        this.speed = this.normal_speed * 0.5;
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

    reset: function (e) {
      this.up = false;
      this.right = false;
      this.down = false;
      this.left = false;
    },
  }
);