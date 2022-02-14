WL.registerComponent('player-name-display', {
    positionParent: {type: WL.Type.Object},
    positionYOffset: {type: WL.Type.Float, default: 0.4},
    target: {type: WL.Type.Object},
}, {
    start: function() {
      this.tempVec = new Float32Array(3);
      this.tempVec2 = new Float32Array(3);
      this.tempQuat = new Float32Array(4);
    },
    update: function() {
      this.positionParent.getTranslationWorld(this.tempVec);
      this.target.getTranslationWorld(this.tempVec2);
      lookAt(this.tempQuat, this.tempVec, this.tempVec2, [0,1,0]);
      this.object.resetTransform();
      this.object.rotate(this.tempQuat);
      this.tempVec[1] += this.positionYOffset;
      this.object.translate(this.tempVec);
    },
});

let forwardTemp = new Float32Array(3);
let temp = new Float32Array(3);
let dotTemp = 0;

let vector = new Float32Array(3);
let vector2 = new Float32Array(3);
let vector3 = new Float32Array(3);

function lookAt(quaternion, sourcePoint, destPoint, up) {
  if(!up) {
    up = [0, 1, 0];
  }

  glMatrix.vec3.sub(forwardTemp, destPoint, sourcePoint);
  glMatrix.vec3.normalize(forwardTemp, forwardTemp);

  dotTemp = glMatrix.vec3.dot(up, forwardTemp);

  glMatrix.vec3.scale(temp, forwardTemp, dotTemp);

  glMatrix.vec3.sub(up, up, temp);
  glMatrix.vec3.normalize(up, up);

  glMatrix.vec3.normalize(vector, forwardTemp);
  glMatrix.vec3.cross(vector2, up, vector);
  glMatrix.vec3.cross(vector3, vector, vector2);
  let m00 = vector2[0];
  let m01 = vector2[1];
  let m02 = vector2[2];
  let m10 = vector3[0];
  let m11 = vector3[1];
  let m12 = vector3[2];
  let m20 = vector[0];
  let m21 = vector[1];
  let m22 = vector[2];


  let num8 = (m00 + m11) + m22;
  if (num8 > 0.0)
  {
      let num = Math.sqrt(num8 + 1.0);
      quaternion[3] = num * 0.5;
      num = 0.5 / num;
      quaternion[0] = (m12 - m21) * num;
      quaternion[1] = (m20 - m02) * num;
      quaternion[2] = (m01 - m10) * num;
      return quaternion;
  }
  if ((m00 >= m11) && (m00 >= m22))
  {
      let num7 = Math.sqrt(((1.0 + m00) - m11) - m22);
      let num4 = 0.5 / num7;
      quaternion[0] = 0.5 * num7;
      quaternion[1] = (m01 + m10) * num4;
      quaternion[2] = (m02 + m20) * num4;
      quaternion[3] = (m12 - m21) * num4;
      return quaternion;
  }
  if (m11 > m22)
  {
      let num6 = Math.sqrt(((1.0 + m11) - m00) - m22);
      let num3 = 0.5 / num6;
      quaternion[0] = (m10 + m01) * num3;
      quaternion[1] = 0.5 * num6;
      quaternion[2] = (m21 + m12) * num3;
      quaternion[3] = (m20 - m02) * num3;
      return quaternion;
  }
  let num5 = Math.sqrt(((1.0 + m22) - m00) - m11);
  let num2 = 0.5 / num5;
  quaternion[0] = (m20 + m02) * num2;
  quaternion[1] = (m21 + m12) * num2;
  quaternion[2] = 0.5 * num5;
  quaternion[3] = (m01 - m10) * num2;


  return quaternion;
}
