WL.registerComponent('copy-translation', {
  source: {type: WL.Type.Object},
  offsetX: {type: WL.Type.Float},
  offsetY: {type: WL.Type.Float},
  offsetZ: {type: WL.Type.Float},
  copyYRotation: {type: WL.Type.Bool, default: true},
}, {
  start: function(dt) {
    this.originOther = new Float32Array(3);
    this.origin = new Float32Array(3);
    this.offset = new Float32Array(3);
    this.diff = new Float32Array(3);
    this.rot = new Float32Array(4);

    if(!this.source) {
      /* Avoid spamming errors in update() */
      this.active = false;
      throw new Error("'source' object not set!");
    }

    this.startPos = new Float32Array(3);
    this.object.getTranslationLocal(this.origin);
    this.source.getTranslationLocal(this.startPos);
  },

  update: function() {
    this.source.getTranslationWorld(this.originOther);
    glMatrix.vec3.sub(this.diff, this.originOther, this.startPos);

    const x = this.diff[0] + this.offsetX;
    const y = this.diff[1] + this.offsetY;
    const z = this.diff[2] + this.offsetZ;
    glMatrix.vec3.add(this.offset, this.origin, [x, y, z]);
    if(!this.copyYRotation) return;

    /* Reuse as temp vars */
    const to = this.diff;
    this.source.getForward(to);
    /* We only want rotation around Y */
    to[1] = 0;
    if(glMatrix.vec3.dot(to, to) == 0) return;

    this.object.rotationWorld = glMatrix.quat.rotationTo(this.rot, [0, 0, -1], to);

    this.object.setTranslationWorld(this.offset);
  }
});


