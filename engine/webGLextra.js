function cross(a,b) {
  return [ a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] ]
}

function subtractVectors(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v) {
  var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  // make sure we don't divide by 0.
  if (length > 0.00001) {
    return [v[0] / length, v[1] / length, v[2] / length];
  } else {
    return [0, 0, 0];
  }
}

var webGLextra = {
    helloWorld: function () {
        console.log("Hello World!")
    },
    createShader: function (gl, shaderSource, shaderType) {
        let shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderSource)
        gl.compileShader(shader)
        if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader
        } else {
            console.log(gl.getShaderInfoLog(shader))
            gl.deleteShader(shader)

            return null
        }
    },
    createProgram: function (gl, shaderList) {
        let program = gl.createProgram()

        shaderList.forEach(function (shader) {
            gl.attachShader(program, shader)
        })

        gl.linkProgram(program)
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            return program
        } else {
            console.log(gl.getProgramInfoLog(program))
            gl.deleteProgram(program)
        }
    },
    resizeCanvas: function (gl, canvas) {
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth
            canvas.height = canvas.clientHeight

            gl.viewport(0,0,canvas.width,canvas.height)
        }
    },
    generateFlatShadingNormals: function (vertexArray) {
      let normalArray = []
      let triangleCount = vertexArray.length / 9
      for (let i = 0; i < triangleCount; i++) {
        let pos1 = [vertexArray[i*9], vertexArray[i*9+1], vertexArray[i*9+2]]
        let pos2 = [vertexArray[i*9+3], vertexArray[i*9+4], vertexArray[i*9+5]]
        let pos3 = [vertexArray[i*9+6], vertexArray[i*9+7], vertexArray[i*9+8]]

        let a = [pos2[0] - pos1[0], pos2[1] - pos1[1], pos2[2] - pos1[2]]
        let b = [pos3[0] - pos1[0], pos3[1] - pos1[1], pos3[2] - pos1[2]]

        let normal = cross(a, b)
        normal = normalize(normal)

        for (let j = 0; j < 3; j++) {
          normalArray.push(normal[0] * -1)
          normalArray.push(normal[1] * -1)
          normalArray.push(normal[2] * -1)
        }
      }

      return normalArray
    },
    generateSmoothShadingNormalsBROKEN: function (vertexArray) {
      let normalArray = []
      let triangleCount = vertexArray.length / 9
      for (let i = 0; i < triangleCount; i++) {
        let pos1 = [vertexArray[i*9], vertexArray[i*9+1], vertexArray[i*9+2]]
        let pos2 = [vertexArray[i*9+3], vertexArray[i*9+4], vertexArray[i*9+5]]
        let pos3 = [vertexArray[i*9+6], vertexArray[i*9+7], vertexArray[i*9+8]]

        let a = [pos2[0] - pos1[0], pos2[1] - pos1[1], pos2[2] - pos1[2]]
        let b = [pos3[0] - pos1[0], pos3[1] - pos1[1], pos3[2] - pos1[2]]

        let normal = cross(a, b)

        for (let j = 0; j < triangleCount; j++) {
          let jpos1 = [vertexArray[j*9], vertexArray[j*9+1], vertexArray[j*9+2]]
          let jpos2 = [vertexArray[j*9+3], vertexArray[j*9+4], vertexArray[j*9+5]]
          let jpos3 = [vertexArray[j*9+6], vertexArray[j*9+7], vertexArray[j*9+8]]

          let a = [jpos2[0] - jpos1[0], jpos2[1] - jpos1[1], jpos2[2] - jpos1[2]]
          let b = [jpos3[0] - jpos1[0], jpos3[1] - jpos1[1], jpos3[2] - jpos1[2]]

          let normal2 = cross(a, b)

          normal = normal2 + normal
          normal = [normal[0] / 2, normal[1] / 2, normal[2] / 2]
        }
        
        for (let j = 0; j < 3; j++) {
          normalArray.push(normal[0] * -1)
          normalArray.push(normal[1] * -1)
          normalArray.push(normal[2] * -1)
        }
      }

      return normalArray
    },
    generateSmoothShadingNormalsBROKEN2: function (vertexArray) {
      let normalArray = []
      let triangleCount = vertexArray.length / 9
      let vertexCount = vertexArray.length / 3

      for (let i = 0; i < triangleCount; i++) { //original triangle
        console.log(i + "/" + triangleCount)
        let pos1 = [vertexArray[i*9], vertexArray[i*9+1], vertexArray[i*9+2]]
        let pos2 = [vertexArray[i*9+3], vertexArray[i*9+4], vertexArray[i*9+5]]
        let pos3 = [vertexArray[i*9+6], vertexArray[i*9+7], vertexArray[i*9+8]]

        let a = [pos2[0] - pos1[0], pos2[1] - pos1[1], pos2[2] - pos1[2]]
        let b = [pos3[0] - pos1[0], pos3[1] - pos1[1], pos3[2] - pos1[2]]

        let selfTriangleNormal = cross(a,b)

        for (let j = 0; j < 3; j++) { //vertexes in triangle
          let currentVertexPos = vertexArray[i*9 + j * 3]
          let currentVertex = [vertexArray[currentVertexPos],vertexArray[currentVertexPos + 1],vertexArray[currentVertexPos + 2]]
          let currentVertexNormals = [selfTriangleNormal]

          for (let k = 0; k < triangleCount; k++) { //all other triangles
            let pos1 = [vertexArray[i*9], vertexArray[i*9+1], vertexArray[i*9+2]]
            let pos2 = [vertexArray[i*9+3], vertexArray[i*9+4], vertexArray[i*9+5]]
            let pos3 = [vertexArray[i*9+6], vertexArray[i*9+7], vertexArray[i*9+8]]

            let a = [pos2[0] - pos1[0], pos2[1] - pos1[1], pos2[2] - pos1[2]]
            let b = [pos3[0] - pos1[0], pos3[1] - pos1[1], pos3[2] - pos1[2]]

            let newTriangleNormal = cross(a,b)

            for (let l = 0; l < 3; l++) {//vertexes in other triangle (to find matching vertex)
              let newVertexPos = vertexArray[k*9 + l * 3]
              let newVertex = [vertexArray[newVertexPos],vertexArray[newVertexPos + 1],vertexArray[newVertexPos + 2]]
              if (newVertex === currentVertex) {
                currentVertexNormals.push(newTriangleNormal)
              }
            }
          }

          //combine normals
          let combinedNormal = [0,0,0]

          for (let k = 0; k < currentVertexNormals.length; k++) {
            combinedNormal[0] += currentVertexNormals[k][0]
            combinedNormal[1] += currentVertexNormals[k][1]
            combinedNormal[2] += currentVertexNormals[k][2]
          }

          combinedNormal[0] = combinedNormal[0] / currentVertexNormals.length
          combinedNormal[1] = combinedNormal[1] / currentVertexNormals.length
          combinedNormal[2] = combinedNormal[2] / currentVertexNormals.length

          normalArray.push(combinedNormal)
        }
      }

      return normalArray
    },
    generateSmoothShadingNormals: function (geometry) {
      let normals = []
      let normalsTable = {}
      let triangleCount = geometry.length / 9
      let vertexCount = geometry.length / 3
      for (let i = 0; i < triangleCount; i++) {
        let pos1 = [geometry[i*9], geometry[i*9+1], geometry[i*9+2]]
        let pos2 = [geometry[i*9+3], geometry[i*9+4], geometry[i*9+5]]
        let pos3 = [geometry[i*9+6], geometry[i*9+7], geometry[i*9+8]]

        let a = [pos2[0] - pos1[0], pos2[1] - pos1[1], pos2[2] - pos1[2]]
        let b = [pos3[0] - pos1[0], pos3[1] - pos1[1], pos3[2] - pos1[2]]

        let normal = cross(a, b)

        if (normalsTable[pos1] === undefined) {
          normalsTable[pos1] = []
        }
        if (normalsTable[pos2] === undefined) {
          normalsTable[pos2] = []
        }
        if (normalsTable[pos3] === undefined) {
          normalsTable[pos3] = []
        }

        normalsTable[pos1].push(normal)
        normalsTable[pos2].push(normal)
        normalsTable[pos3].push(normal)
      }

      for (let i = 0; i < vertexCount; i++) {
        let vertexPos = [geometry[i*3],geometry[i*3+1],geometry[i*3+2]]
        let normalCombined = [0,0,0]

        for (let j = 0; j < normalsTable[vertexPos].length; j++) {
          let nToCombine = normalsTable[vertexPos][j]
          normalCombined[0] = normalCombined[0] + nToCombine[0]
          normalCombined[1] = normalCombined[1] + nToCombine[1]
          normalCombined[2] = normalCombined[2] + nToCombine[2]
        }

        normalCombined[0] = normalCombined[0] / normalsTable[vertexPos].length * -1
        normalCombined[1] = normalCombined[1] / normalsTable[vertexPos].length * -1
        normalCombined[2] = normalCombined[2] / normalsTable[vertexPos].length * -1

        normalCombined = normalize(normalCombined)

        normals.push(normalCombined[0],normalCombined[1],normalCombined[2])
      }

      console.log(normals)
      return normals
    },
    m3: {
        multiply: function (a, b) {
            let a00 = a[0]
            let a01 = a[1]
            let a02 = a[2]
            let a10 = a[3]
            let a11 = a[4]
            let a12 = a[5]
            let a20 = a[6]
            let a21 = a[7]
            let a22 = a[8]
            let b00 = b[0]
            let b01 = b[1]
            let b02 = b[2]
            let b10 = b[3]
            let b11 = b[4]
            let b12 = b[5]
            let b20 = b[6]
            let b21 = b[7]
            let b22 = b[8]
        
            return [
                b00 * a00 + b01 * a10 + b02 * a20,
                b00 * a01 + b01 * a11 + b02 * a21,
                b00 * a02 + b01 * a12 + b02 * a22,
                b10 * a00 + b11 * a10 + b12 * a20,
                b10 * a01 + b11 * a11 + b12 * a21,
                b10 * a02 + b11 * a12 + b12 * a22,
                b20 * a00 + b21 * a10 + b22 * a20,
                b20 * a01 + b21 * a11 + b22 * a21,
                b20 * a02 + b21 * a12 + b22 * a22,
            ]
        },
        translation: function(tx, ty) {
            return [
                1, 0, 0,
                0, 1, 0,
                tx, ty, 1,
            ];
        },
    
        rotation: function(angleInRadians) {
            var c = Math.cos(angleInRadians);
            var s = Math.sin(angleInRadians);
            return [
                c,-s, 0,
                s, c, 0,
                0, 0, 1,
            ];
        },
    
        scaling: function(sx, sy) {
            return [
                sx, 0, 0,
                0, sy, 0,
                0, 0, 1,
            ];
        },
        translate: function(m, tx, ty) {
            return webGLextra.m3.multiply(m, webGLextra.m3.translation(tx, ty));
        },
    
        rotate: function(m, angleInRadians) {
            return webGLextra.m3.multiply(m, webGLextra.m3.rotation(angleInRadians));
        },
    
        scale: function(m, sx, sy) {
            return webGLextra.m3.multiply(m, webGLextra.m3.scaling(sx, sy));
        },
        projection: function (width, height) {
            // Note: This matrix flips the Y axis so that 0 is at the top.
            return [
                2 / width, 0, 0,
                0, -2 / height, 0,
                -1, 1, 1,
            ];
        },
    },
    m4: {
        translation: function(tx, ty, tz) {
          return [
             1,  0,  0,  0,
             0,  1,  0,  0,
             0,  0,  1,  0,
             tx, ty, tz, 1,
          ];
        },
      
        xRotation: function(angleInRadians) {
          var c = Math.cos(angleInRadians);
          var s = Math.sin(angleInRadians);
      
          return [
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1,
          ];
        },
      
        yRotation: function(angleInRadians) {
          var c = Math.cos(angleInRadians);
          var s = Math.sin(angleInRadians);
      
          return [
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1,
          ];
        },
      
        zRotation: function(angleInRadians) {
          var c = Math.cos(angleInRadians);
          var s = Math.sin(angleInRadians);
      
          return [
             c, s, 0, 0,
            -s, c, 0, 0,
             0, 0, 1, 0,
             0, 0, 0, 1,
          ];
        },
      
        scaling: function(sx, sy, sz) {
          return [
            sx, 0,  0,  0,
            0, sy,  0,  0,
            0,  0, sz,  0,
            0,  0,  0,  1,
          ];
        },
        translate: function(m, tx, ty, tz) {
            return webGLextra.m4.multiply(m, webGLextra.m4.translation(tx, ty, tz));
          },
        
          xRotate: function(m, angleInRadians) {
            return webGLextra.m4.multiply(m, webGLextra.m4.xRotation(angleInRadians));
          },
        
          yRotate: function(m, angleInRadians) {
            return webGLextra.m4.multiply(m, webGLextra.m4.yRotation(angleInRadians));
          },
        
          zRotate: function(m, angleInRadians) {
            return webGLextra.m4.multiply(m, webGLextra.m4.zRotation(angleInRadians));
          },
        
          scale: function(m, sx, sy, sz) {
            return webGLextra.m4.multiply(m, webGLextra.m4.scaling(sx, sy, sz));
          },
          multiply: function(a, b) {
            var b00 = b[0];
            var b01 = b[1];
            var b02 = b[2];
            var b03 = b[3];
            var b10 = b[4];
            var b11 = b[5];
            var b12 = b[6];
            var b13 = b[7];
            var b20 = b[8];
            var b21 = b[9];
            var b22 = b[10];
            var b23 = b[11];
            var b30 = b[12];
            var b31 = b[13];
            var b32 = b[14];
            var b33 = b[15];
            var a00 = a[0];
            var a01 = a[1];
            var a02 = a[2];
            var a03 = a[3];
            var a10 = a[4];
            var a11 = a[5];
            var a12 = a[6];
            var a13 = a[7];
            var a20 = a[8];
            var a21 = a[9];
            var a22 = a[10];
            var a23 = a[11];
            var a30 = a[12];
            var a31 = a[13];
            var a32 = a[14];
            var a33 = a[15];
        
            return [
              b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
              b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
              b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
              b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
              b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
              b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
              b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
              b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
              b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
              b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
              b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
              b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
              b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
              b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
              b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
              b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
            ];
          },
          projection: function(width, height, depth) {
            // Note: This matrix flips the Y axis so 0 is at the top.
            return [
                2 / width, 0, 0, 0,
                0, -2 / height, 0, 0,
                0, 0, 2 / depth, 0,
               -1, 1, 0, 1,
            ];
          },
          perspective: function(fieldOfViewInRadians, aspect, near, far) {
            var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
            var rangeInv = 1.0 / (near - far);
        
            return [
              f / aspect, 0, 0, 0,
              0, f, 0, 0,
              0, 0, (near + far) * rangeInv, -1,
              0, 0, near * far * rangeInv * 2, 0,
            ];
          },
          inverse: function(m) {
            var m00 = m[0 * 4 + 0];
            var m01 = m[0 * 4 + 1];
            var m02 = m[0 * 4 + 2];
            var m03 = m[0 * 4 + 3];
            var m10 = m[1 * 4 + 0];
            var m11 = m[1 * 4 + 1];
            var m12 = m[1 * 4 + 2];
            var m13 = m[1 * 4 + 3];
            var m20 = m[2 * 4 + 0];
            var m21 = m[2 * 4 + 1];
            var m22 = m[2 * 4 + 2];
            var m23 = m[2 * 4 + 3];
            var m30 = m[3 * 4 + 0];
            var m31 = m[3 * 4 + 1];
            var m32 = m[3 * 4 + 2];
            var m33 = m[3 * 4 + 3];
            var tmp_0  = m22 * m33;
            var tmp_1  = m32 * m23;
            var tmp_2  = m12 * m33;
            var tmp_3  = m32 * m13;
            var tmp_4  = m12 * m23;
            var tmp_5  = m22 * m13;
            var tmp_6  = m02 * m33;
            var tmp_7  = m32 * m03;
            var tmp_8  = m02 * m23;
            var tmp_9  = m22 * m03;
            var tmp_10 = m02 * m13;
            var tmp_11 = m12 * m03;
            var tmp_12 = m20 * m31;
            var tmp_13 = m30 * m21;
            var tmp_14 = m10 * m31;
            var tmp_15 = m30 * m11;
            var tmp_16 = m10 * m21;
            var tmp_17 = m20 * m11;
            var tmp_18 = m00 * m31;
            var tmp_19 = m30 * m01;
            var tmp_20 = m00 * m21;
            var tmp_21 = m20 * m01;
            var tmp_22 = m00 * m11;
            var tmp_23 = m10 * m01;
        
            var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
                     (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
            var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
                     (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
            var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
                     (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
            var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
                     (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);
        
            var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
        
            return [
              d * t0,
              d * t1,
              d * t2,
              d * t3,
              d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
                   (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
              d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
                   (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
              d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
                   (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
              d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
                   (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
              d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
                   (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
              d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
                   (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
              d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
                   (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
              d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
                   (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
              d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
                   (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
              d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
                   (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
              d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
                   (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
              d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
                   (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02)),
            ];
          },
          lookAt: function(cameraPosition, target, up) {
            var zAxis = normalize(
                subtractVectors(cameraPosition, target));
            var xAxis = normalize(cross(up, zAxis));
            var yAxis = normalize(cross(zAxis, xAxis));
         
            return [
              xAxis[0], xAxis[1], xAxis[2], 0,
              yAxis[0], yAxis[1], yAxis[2], 0,
              zAxis[0], zAxis[1], zAxis[2], 0,
              cameraPosition[0],
              cameraPosition[1],
              cameraPosition[2],
              1,
            ];
          },
          getTranslation: function(m) {
            //let scalingFactor = sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2])
            //rotationMatrix = (1.0 / scalingFactor) * m
            let translation = [m[12],m[13],m[14]]
            return translation
          },
          multiplyWith: function(mat,vec3,w) {
            let x = vec3[0]
            let y = vec3[1]
            let z = vec3[2]
            if (!w) {
              w = 1 //1 to include transformation, 0 to not include transformation
            }

            let res = [0, 0, 0, 0]
            res[0] = mat[0*4+0]*x + mat[1*4+0]*y + mat[2*4+0]*z + mat[3*4+0]*w
            res[1] = mat[0*4+1]*x + mat[1*4+1]*y + mat[2*4+1]*z + mat[3*4+1]*w
            res[2] = mat[0*4+2]*x + mat[1*4+2]*y + mat[2*4+2]*z + mat[3*4+2]*w
            res[3] = mat[0*4+3]*x + mat[1*4+3]*y + mat[2*4+3]*z + mat[3*4+3]*w
            return res
          },
          subtractVectors: subtractVectors,
          scaleVector: function scaleVector(v, s) {
            let dst = [0,0,0]
            dst[0] = v[0] * s;
            dst[1] = v[1] * s;
            dst[2] = v[2] * s;
            return dst;
          },
          normalize: normalize,
      },
    meshBuilder: {
      createCube: function (size) {
        let x = size[0]
        let y = size[1]
        let z = size[2]

        let geo = [
          //front
          0,0,0,
          0,y,0,
          x,0,0,
          0,y,0,
          x,y,0,
          x,0,0,
          //left
          0,0,0,
          0,0,z,
          0,y,0,
          0,y,0,
          0,0,z,
          0,y,z,
          //right
          x,0,0,
          x,y,0,
          x,0,z,
          x,y,0,
          x,y,z,
          x,0,z,
          //back
          0,0,z,
          x,0,z,
          0,y,z,
          0,y,z,
          x,0,z,
          x,y,z,
          //top
          0,y,0,
          0,y,z,
          x,y,0,
          0,y,z,
          x,y,z,
          x,y,0,
          //bottom
          0,0,0,
          x,0,0,
          0,0,z,
          0,0,z,
          x,0,0,
          x,0,z,
        ]

        let texc = [
          //front
          0,0,
          0,1,
          1,0,
          0,1,
          1,1,
          1,0,
          //left
          0,0,
          0,1,
          1,0,
          1,0,
          0,1,
          1,1,
          //right
          0,0,
          1,0,
          0,1,
          1,0,
          1,1,
          0,1,
          //back
          0,0,
          1,0,
          0,1,
          0,1,
          1,0,
          1,1,
          //top
          0,0,
          0,1,
          1,0,
          0,1,
          1,1,
          1,0,
          //bottom
          0,0,
          1,0,
          0,1,
          0,1,
          1,0,
          1,1,
        ]

        return {
          geometry: geo,
          texcoord: texc,
        }
      },
      objToGeo: function (text, properties) {
        let vertexes = []
        let texcoords = []
        let normals = []

        let geometry = []
        let finalTexcoords = []
        let finalNormals = []
        
        if (properties == undefined) {
          properties = {}
        }

        let lines = text.split("\n")
        for (let i = 0; i < lines.length; i++) {
          //console.log("0")
          let line = lines[i]
          //console.log("line-" + i.toString())
          //console.log(line.charAt(0))
          if (line.charAt(0) !== "#") {
            lineSections = line.split(" ")
            
            switch (lineSections[0]) {
              case "v":
                //console.log("v")
                //vertex
                vertexes.push([Number(lineSections[1]),Number(lineSections[2]),Number(lineSections[3])])
                break;
              case "vt":
                //console.log("vt")
                //texture coord
                texcoords.push([Number(lineSections[1]),Number(lineSections[2])])
                break;
              case "vn":
                //console.log("vn")
                //normal
                normals.push([Number(lineSections[1]),Number(lineSections[2]),Number(lineSections[3])])
                break;
              case "f":
                //console.log("f")
                //face (can be triangle or square)
                if (lineSections[4]) {
                  //square
                  let values1 = null
                  let values2 = null
                  let values3 = null
                  let values4 = null

                  for (let j = 1; j < 5; j++) {
                    //console.log("square alue")
                    let values = lineSections[j].split("/")
                    
                    let vertex = values[0]
                    let texcoord = values[1]
                    let normal = values[2]

                    if (vertex == undefined) {
                      vertex = 0
                    }
                    if (texcoord == undefined) {
                      texcoord = 0
                    }
                    if (normal == undefined) {
                      normal = 0
                    }

                    let realVertex = vertexes[vertex - 1]
                    let realTexcoord = texcoords[texcoord - 1]
                    let realNormal = normals[normal - 1]

                    if (j == 1) {
                      values1 = [realVertex,realTexcoord,realNormal]
                    } else if (j == 2) {
                      values2 = [realVertex,realTexcoord,realNormal]
                      //console.log(values2)
                    } else if (j == 3) {
                      values3 = [realVertex,realTexcoord,realNormal]
                    } else if (j == 4) {
                      values4 = [realVertex,realTexcoord,realNormal]
                    }

                    /*geometry.push(realVertex[0])
                    geometry.push(realVertex[1])
                    geometry.push(realVertex[2])

                    finalTexcoords.push(realTexcoord[0])
                    finalTexcoords.push(realTexcoord[1])
                    
                    finalNormals.push(realNormal[0])
                    finalNormals.push(realNormal[1])
                    finalNormals.push(realNormal[2])*/
                  }


                  if (properties.flipFaces != true) {
                    //1
                    geometry.push(values1[0][0])
                    geometry.push(values1[0][1])
                    geometry.push(values1[0][2])

                    finalTexcoords.push(values1[1][0])
                    finalTexcoords.push(1 - values1[1][1])
                    
                    if (values1[2]) {
                      finalNormals.push(values1[2][0])
                      finalNormals.push(values1[2][1])
                      finalNormals.push(values1[2][2])
                    }

                    //console.log(geometry)
                    //console.log(vertexes)

                    //2
                    //console.log(values2)
                    geometry.push(values2[0][0])
                    geometry.push(values2[0][1])
                    geometry.push(values2[0][2])

                    finalTexcoords.push(values2[1][0])
                    finalTexcoords.push(1 - values2[1][1])
                    
                    if (values2[2]) {
                    finalNormals.push(values2[2][0])
                    finalNormals.push(values2[2][1])
                    finalNormals.push(values2[2][2])
                    }

                    //3
                    geometry.push(values3[0][0])
                    geometry.push(values3[0][1])
                    geometry.push(values3[0][2])

                    finalTexcoords.push(values3[1][0])
                    finalTexcoords.push(1 - values3[1][1])
                    
                    if (values3[2]) {
                    finalNormals.push(values3[2][0])
                    finalNormals.push(values3[2][1])
                    finalNormals.push(values3[2][2])
                    }

                    //1
                    geometry.push(values1[0][0])
                    geometry.push(values1[0][1])
                    geometry.push(values1[0][2])

                    finalTexcoords.push(values1[1][0])
                    finalTexcoords.push(1 - values1[1][1])
                    
                    if (values1[2]) {
                    finalNormals.push(values1[2][0])
                    finalNormals.push(values1[2][1])
                    finalNormals.push(values1[2][2])
                    }

                    //3
                    geometry.push(values3[0][0])
                    geometry.push(values3[0][1])
                    geometry.push(values3[0][2])

                    finalTexcoords.push(values3[1][0])
                    finalTexcoords.push(1 - values3[1][1])
                    
                    if (values3[2]) {
                    finalNormals.push(values3[2][0])
                    finalNormals.push(values3[2][1])
                    finalNormals.push(values3[2][2])
                    }

                    //4
                    //console.log(lineSections[i])
                    //console.log(values4) 
                    geometry.push(values4[0][0])
                    geometry.push(values4[0][1])
                    geometry.push(values4[0][2])

                    //console.log(values4[1])
                    finalTexcoords.push(values4[1][0])
                    finalTexcoords.push(1 - values4[1][1])
                    
                    if (values4[2]) {
                    finalNormals.push(values4[2][0])
                    finalNormals.push(values4[2][1])
                    finalNormals.push(values4[2][2])
                    }
                  } else {
                    //1
                    geometry.push(values1[0][0])
                    geometry.push(values1[0][1])
                    geometry.push(values1[0][2])

                    finalTexcoords.push(values1[1][0])
                    finalTexcoords.push(1 - values1[1][1])
                    
                    if (values1[2]) {
                      finalNormals.push(values1[2][0])
                      finalNormals.push(values1[2][1])
                      finalNormals.push(values1[2][2])
                    }

                    //console.log(geometry)
                    //console.log(vertexes)

                    //3
                    geometry.push(values3[0][0])
                    geometry.push(values3[0][1])
                    geometry.push(values3[0][2])

                    finalTexcoords.push(values3[1][0])
                    finalTexcoords.push(1 - values3[1][1])
                    
                    if (values3[2]) {
                    finalNormals.push(values3[2][0])
                    finalNormals.push(values3[2][1])
                    finalNormals.push(values3[2][2])
                    }

                    //2
                    //console.log(values2)
                    geometry.push(values2[0][0])
                    geometry.push(values2[0][1])
                    geometry.push(values2[0][2])

                    finalTexcoords.push(values2[1][0])
                    finalTexcoords.push(1 - values2[1][1])
                    
                    if (values2[2]) {
                    finalNormals.push(values2[2][0])
                    finalNormals.push(values2[2][1])
                    finalNormals.push(values2[2][2])
                    }


                    //1
                    geometry.push(values1[0][0])
                    geometry.push(values1[0][1])
                    geometry.push(values1[0][2])

                    finalTexcoords.push(values1[1][0])
                    finalTexcoords.push(1 - values1[1][1])
                    
                    if (values1[2]) {
                    finalNormals.push(values1[2][0])
                    finalNormals.push(values1[2][1])
                    finalNormals.push(values1[2][2])
                    }

                    //4
                    //console.log(lineSections[i])
                    //console.log(values4) 
                    geometry.push(values4[0][0])
                    geometry.push(values4[0][1])
                    geometry.push(values4[0][2])

                    //console.log(values4[1])
                    finalTexcoords.push(values4[1][0])
                    finalTexcoords.push(1 - values4[1][1])
                    
                    if (values4[2]) {
                    finalNormals.push(values4[2][0])
                    finalNormals.push(values4[2][1])
                    finalNormals.push(values4[2][2])
                    }

                    //3
                    geometry.push(values3[0][0])
                    geometry.push(values3[0][1])
                    geometry.push(values3[0][2])

                    finalTexcoords.push(values3[1][0])
                    finalTexcoords.push(1 - values3[1][1])
                    
                    if (values3[2]) {
                    finalNormals.push(values3[2][0])
                    finalNormals.push(values3[2][1])
                    finalNormals.push(values3[2][2])
                    }

                    
                  }
                } else {
                  //triangle
                  for (let j = 1; j < 4; j++) {
                    let values = lineSections[j].split("/")
                    
                    let vertex = values[0]
                    let texcoord = values[1]
                    let normal = values[2]

                    if (vertex == undefined) {
                      vertex = 0
                    }
                    if (texcoord == undefined) {
                      texcoord = 0
                    }
                    if (normal == undefined) {
                      normal = 0
                    }

                    let realVertex = vertexes[vertex - 1]
                    let realTexcoord = texcoords[texcoord - 1]
                    let realNormal = normals[normal - 1]

                    if (properties.flipFaces != true) {
                      geometry.push(realVertex[0])
                      geometry.push(realVertex[1])
                      geometry.push(realVertex[2])
                    } else {
                      geometry.push(realVertex[0])
                      geometry.push(realVertex[2])
                      geometry.push(realVertex[1])
                    }

                    finalTexcoords.push(realTexcoord[0])
                    finalTexcoords.push(1 - realTexcoord[1])
                    
                    if (realNormal) {
                    finalNormals.push(realNormal[0])
                    finalNormals.push(realNormal[1])
                    finalNormals.push(realNormal[2])
                    }
                  }
                }
                break;
              default:
                console.log(`unknown type "` + lineSections[0] + `"`)
            }
          }
        }

        return {"geometry": geometry, "texcoord": finalTexcoords, "normals": finalNormals}
      }
    },
    distance: function (pos1, pos2) {
      let x1 = pos1[0]
      let y1 = pos1[1]
      let z1 = pos1[2]

      let x2 = pos2[0]
      let y2 = pos2[1]
      let z2 = pos2[2]

      return Math.sqrt(((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1) + (z2 - z1)*(z2 - z1)))
    },
}