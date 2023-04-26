var gl = null
var canvas = null

var vertexShader = null
var fragmentShader = null

var program = null

var positionAttributeLocation = null
var texcoordAttributeLocation = null
var normalAttributeLocation = null

var matrixUniformLocation = null
var worldUniformLocation = null
var textureUniformLocation = null

var ambientLightUniformLocation = null
var directionalLightColorUniformLocation = null
var directionalVectorUniformLocation = null

var vao = null

var textures = {}

var lastTime = performance.now()

function loadTexture(src,callback) {
  let texture = gl.createTexture()

  gl.bindTexture(gl.TEXTURE_2D, texture)

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([242, 0, 255, 255]))

  let image = new Image()
  image.src = src
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    gl.generateMipmap(gl.TEXTURE_2D)

    if (callback) {
      callback()
    }
  }

  textures[src] = texture
}

/*let artisans = {"geometry": [0,0,0,1,0,0,0,1,0], "texcoord": [0,0,0,0,0,0], "normals": [0,1,0,0,1,0,0,1,0]}
let midnightMountain = {"geometry": [0,0,0,1,0,0,0,1,0], "texcoord": [0,0,0,0,0,0], "normals": [0,1,0,0,1,0,0,1,0]}

async function loadArtisans() {
  const response = await fetch('assets/models/Artisans_Hub.obj');
  const text = await response.text();

  artisans = webGLextra.meshBuilder.objToGeo(text)
  console.log(artisans.geometry)
}

async function loadMidnightMountain() {
  const response = await fetch('assets/models/Midnight_Mountain.obj');
  const text = await response.text();

  midnightMountain = webGLextra.meshBuilder.objToGeo(text, {"flipFaces":true})
  console.log(midnightMountain.geometry)
}

loadMidnightMountain()
loadArtisans()*/

function useTexture(src) {
  if (src == "portalTexture") {
    gl.bindTexture(gl.TEXTURE_2D, textures[src])
    gl.uniform1f(isPortalLocation, 1.0)
  } else {
    gl.uniform1f(isPortalLocation, 0.0)
    gl.bindTexture(gl.TEXTURE_2D, textures[src])
  }
}

function radToDeg(r) {
  return r * 180 / Math.PI;
}

function degToRad(d) {
  return d * Math.PI / 180;
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

var renderer = {
globalRotation: [0,0,0],
globalTransform: [0,0,0],
globalScale: [1,1,1],
globalOriginOffset: [0,0,0],

aspect: 1,
portalScene: null,

zNear: 0.01,
zFar: 1000,

fov: 75,

cameraMatrix: webGLextra.m4.translation(0,0,0),

//functions
init: function () {
  canvas = document.getElementById("renderCanvas")
  gl = canvas.getContext("webgl2")

  if (!gl) {
    alert("Your browser/device is not compatible with WebGL2 and cannot run this app!")
    console.error("WebGL2 failed to initialize")
  }

  let vertexShaderSource = `#version 300 es

  in vec4 a_position;
  in vec2 a_texcoord;
  in vec3 a_normal;

  //u_matrix = u_worldViewProjection
  uniform mat4 u_matrix;
  uniform mat4 u_world;

  out vec2 v_texcoord;
  out vec3 v_normal;
  out vec2 v_screenPos;
  out vec3 v_FragPos;

  void main() {
      gl_Position = u_matrix * a_position;

      v_screenPos = vec2(u_matrix * a_position);

      v_texcoord = a_texcoord;
      v_normal = mat3(u_world) * a_normal;

      v_FragPos = vec3(a_position);
  }`

  let fragmentShaderSource = `#version 300 es

  precision highp float;

  in vec2 v_texcoord;
  in vec3 v_normal;
  in vec2 v_screenPos;
  in vec3 v_FragPos;

  uniform sampler2D u_texture;

  uniform float u_isPortal;
  uniform vec2 u_resolution;

  uniform vec3 u_ambientLight;
  uniform vec3 u_directionalLightColor;
  uniform vec3 u_directionalVector;
  uniform vec3 u_viewPos;

  uniform float u_specularStrength;
  uniform float u_shininess;

  out vec4 outColor;

  void main() {
      vec3 normal = normalize(v_normal);
      float directionalLight = (dot(normal, u_directionalVector) + 0.5) / 2.0;
      vec4 texelColor = texture(u_texture, v_texcoord);
      if (u_isPortal > 0.5) {
        texelColor = texture(u_texture, gl_FragCoord.xy / u_resolution);
      }

      vec3 dirLight = (u_directionalLightColor * max(directionalLight, 0.0));

      vec3 viewDir = normalize(u_viewPos - v_FragPos);
      vec3 reflectDir = reflect(-dirLight, normal);  
      
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
      vec3 specular = u_specularStrength * spec * u_directionalLightColor;  

      vec3 lighting = u_ambientLight + dirLight + specular;

      if (u_isPortal < 0.5) {
        outColor = vec4(texelColor.rgb * lighting, texelColor.a);
      } else {
        outColor = vec4(texelColor.rgb, texelColor.a);
      }
  }`

  function createTextureAndUse(gl, src) {
    let texture = gl.createTexture()

    gl.bindTexture(gl.TEXTURE_2D, texture)

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([242, 0, 255, 255]))

    let image = new Image()
    image.src = src
    image.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      gl.generateMipmap(gl.TEXTURE_2D)
    }

    return texture
  }

  //shaders
  vertexShader = webGLextra.createShader(gl, vertexShaderSource, gl.VERTEX_SHADER)
  fragmentShader = webGLextra.createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER)

  program = webGLextra.createProgram(gl, [vertexShader, fragmentShader])

  //attribute for vertex data
  positionAttributeLocation = gl.getAttribLocation(program, "a_position")
  texcoordAttributeLocation = gl.getAttribLocation(program, "a_texcoord")
  normalAttributeLocation = gl.getAttribLocation(program, "a_normal")

  matrixUniformLocation = gl.getUniformLocation(program, "u_matrix")
  worldUniformLocation = gl.getUniformLocation(program, "u_world")
  textureUniformLocation = gl.getUniformLocation(program, "u_texture")

  resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution")

  //directional lighting uniforms
  ambientLightUniformLocation = gl.getUniformLocation(program, "u_ambientLight")
  directionalLightColorUniformLocation = gl.getUniformLocation(program, "u_directionalLightColor")
  directionalVectorUniformLocation = gl.getUniformLocation(program, "u_directionalVector")
  viewPosUniformLocation = gl.getUniformLocation(program, "u_viewPos")
  specularStrengthUniformLocation = gl.getUniformLocation(program, "u_specularStrength")
  shininessUniformLocation = gl.getUniformLocation(program, "u_shininess")

  //isPortal bool
  isPortalLocation = gl.getUniformLocation(program, "u_isPortal")

  //vertex array object
  vao = gl.createVertexArray()
  gl.bindVertexArray(vao)

  //portal texture
  textures["portalTexture"] = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, textures["portalTexture"])

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.clientWidth, canvas.clientHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)

  //no mipmap needed
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Create and bind the framebuffer
  renderer.fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.fb);
    
  // attach the texture as the first color attachment
  var attachmentPoint = gl.COLOR_ATTACHMENT0;
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, textures["portalTexture"], 0);
  
  // create a depth texture
  textures["portalDepthTexture"] = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textures["portalDepthTexture"]);
    
  // make a depth buffer and the same size as the targetTexture

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, canvas.clientWidth, canvas.clientHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

  // set the filtering so we don't need mips
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // attach the depth texture to the framebuffer
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, textures["portalDepthTexture"], 0);

},
newFrame: function(clearColor) {
  if (clearColor == undefined) {
    clearColor = [0,0,0,0]
  }

  webGLextra.resizeCanvas(gl, canvas)

  renderer.aspect = canvas.clientWidth / canvas.clientHeight

  gl.useProgram(program)

  gl.uniform2f(resolutionUniformLocation, canvas.clientWidth, canvas.clientHeight)
  gl.uniform3fv(viewPosUniformLocation, webGLextra.m4.getTranslation(this.cameraMatrix))

  gl.enable(gl.CULL_FACE)
  gl.enable(gl.DEPTH_TEST)

  gl.clearColor(clearColor[0],clearColor[1],clearColor[2],clearColor[3])
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0,0,canvas.clientWidth,canvas.clientHeight)

  gl.bindVertexArray(vao)
},
drawGeometry: function(geometry, texcoords, shadingType) {
  gl.bindVertexArray(vao)

  //connect a_texcoord & ARRAY_BUFFER
  let texcoordBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW)

  //texcoord vertex attribute
  gl.enableVertexAttribArray(texcoordAttributeLocation)
  gl.vertexAttribPointer(texcoordAttributeLocation, 2, gl.FLOAT, true, 0, 0)

  //connect a_position & ARRAY_BUFFER
  let positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

  //buffer geometry
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(positionAttributeLocation)

  //vertextAttribPointer binds ARRAY_BUFFER to the position attribute
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0) //attribute location, size, type, normalize, stride, offset

  //normals
  let normalBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)

  let normals = []
  if (shadingType == "flat") {
    normals = webGLextra.generateFlatShadingNormals(geometry)
  } else if (shadingType == "smooth") {
    normals = webGLextra.generateSmoothShadingNormals(geometry)
  } else {
    normals = shadingType
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(normalAttributeLocation)

  gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, true, 0, 0)

  //compute matrix
  let projectionMatrix = webGLextra.m4.perspective(degToRad(renderer.fov), renderer.aspect, renderer.zNear, renderer.zFar)

  let viewMatrix = webGLextra.m4.inverse(renderer.cameraMatrix)
  let viewProjectionMatrix = webGLextra.m4.multiply(projectionMatrix, viewMatrix)

  viewProjectionMatrix = webGLextra.m4.translate(viewProjectionMatrix, renderer.globalTransform[0],renderer.globalTransform[1],renderer.globalTransform[2])
  viewProjectionMatrix = webGLextra.m4.xRotate(viewProjectionMatrix, renderer.globalRotation[0])
  viewProjectionMatrix = webGLextra.m4.yRotate(viewProjectionMatrix, renderer.globalRotation[1])
  viewProjectionMatrix = webGLextra.m4.zRotate(viewProjectionMatrix, renderer.globalRotation[2])
  viewProjectionMatrix = webGLextra.m4.translate(viewProjectionMatrix, renderer.globalOriginOffset[0],renderer.globalOriginOffset[1],renderer.globalOriginOffset[2])
  viewProjectionMatrix = webGLextra.m4.scale(viewProjectionMatrix, renderer.globalScale[0], renderer.globalScale[1], renderer.globalScale[2])

  let worldMatrix = webGLextra.m4.xRotation(renderer.globalRotation[0])
  worldMatrix = webGLextra.m4.yRotate(worldMatrix, renderer.globalRotation[1])
  worldMatrix = webGLextra.m4.zRotate(worldMatrix, renderer.globalRotation[2])

  gl.uniformMatrix4fv(matrixUniformLocation, false, viewProjectionMatrix)
  gl.uniformMatrix4fv(worldUniformLocation, false, worldMatrix)

  gl.drawArrays(gl.TRIANGLES, 0, geometry.length / 3)
},
loadTextureGLOBAL: loadTexture,
textureExists: function(src) {
  if (textures[src] != undefined) {
    return true
  } else {
    return false
  }
},
useTextureGLOBAL: useTexture,
setAmbientLightColor: function(rgb) {
  gl.useProgram(program)
  gl.uniform3fv(ambientLightUniformLocation, rgb)
},
setDirectionalLightColor: function(rgb) {
  gl.useProgram(program)
  gl.uniform3fv(directionalLightColorUniformLocation, rgb)
},
setDirectionalLightDirection: function(vec3) {
  gl.useProgram(program)
  gl.uniform3fv(directionalVectorUniformLocation, vec3)
},
setSpecularShininess: function(float) {
  gl.useProgram(program)
  gl.uniform1f(shininessUniformLocation, float)
},
setSpecularStrength: function(float) {
  gl.useProgram(program)
  gl.uniform1f(specularStrengthUniformLocation, float)
}
}

renderer.init()

renderer.setSpecularStrength(0.1)
renderer.setSpecularShininess(8)

//renderer.cameraMatrix = webGLextra.m4.translate(renderer.cameraMatrix,0,0,0)
//renderer.cameraMatrix = webGLextra.m4.yRotate(renderer.cameraMatrix, degToRad(180))
//renderer.globalRotation = [degToRad(180),degToRad(45),0]
//renderer.cameraMatrix = webGLextra.m4.lookAt([renderer.cameraMatrix[12],renderer.cameraMatrix[13],renderer.cameraMatrix[14]],[0,0,0],[0,1,0])

/*function renderScene() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.fb)
  gl.viewport(0,0,canvas.clientWidth, canvas.clientHeight)

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let ogRotation = renderer.globalRotation
  let ogTransform = renderer.globalTransform
  let ogZNear = renderer.zNear
  renderer.globalRotation = [degToRad(-90),degToRad(0),degToRad(0)]
  renderer.globalTransform = [-10,-35,-40]
  renderer.globalScale = [2,2,2]
  renderer.zNear = webGLextra.distance([-3,-9.5,-0.125],[renderer.cameraMatrix[12],renderer.cameraMatrix[13],renderer.cameraMatrix[14]]) - 5
  scene("midnight_mountain")

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0,0,canvas.clientWidth,canvas.clientHeight)
  
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  renderer.globalRotation = ogRotation
  renderer.globalTransform = ogTransform

  renderer.aspect = canvas.clientWidth / canvas.clientHeight
  renderer.zNear = ogZNear
  renderer.globalScale = [1,1,1]
  scene("artisans")
  useTexture("portalTexture")
  let cube7 = webGLextra.meshBuilder.createCube([6,9,0.25])
  renderer.globalTransform = [-3,-9.5,-0.125]
  renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
  renderer.drawGeometry(cube7.geometry,cube7.texcoord,'flat')

  lastTime = performance.now()
  window.requestAnimationFrame(renderScene)
}

loadTexture("assets/textures/smile.png", renderScene)
loadTexture("assets/textures/red.png")
loadTexture("assets/textures/blue.png")
loadTexture("assets/textures/green.png")
loadTexture("assets/textures/High.png")
loadTexture("assets/textures/Textures.png")

function scene(sceneName) {
    if (sceneName == "debug1") {
      renderer.globalRotation[0] += degToRad(45) * (performance.now() / 1000 - lastTime / 1000)
      renderer.globalRotation[1] += degToRad(43) * (performance.now() / 1000 - lastTime / 1000)
      renderer.globalRotation[2] += degToRad(40) * (performance.now() / 1000 - lastTime / 1000)
      if (radToDeg(renderer.globalRotation[0]) > 360) {
        renderer.globalRotation[0] -= degToRad(360)
      }
      if (radToDeg(renderer.globalRotation[1]) > 360) {
        renderer.globalRotation[1] -= degToRad(360)
      }
      if (radToDeg(renderer.globalRotation[2]) > 360) {
        renderer.globalRotation[2] -= degToRad(360)
      }
      
      renderer.globalOriginOffset = [-75,-75,-75]
      
      renderer.cameraMatrix = webGLextra.m4.lookAt([300,400,200], [0,0,0],[0,1,0])
      renderer.newFrame()
      
      let cubeMesh = webGLextra.meshBuilder.createCube([150,150,150])

      //axis
      let x = webGLextra.meshBuilder.createCube([1000,15,15])
      let y = webGLextra.meshBuilder.createCube([15,1000,15])
      let z = webGLextra.meshBuilder.createCube([15,15,1000])

      let prevGR = renderer.globalRotation
      let prevT = renderer.globalTransform
      let prevO = renderer.globalOriginOffset
      let prevS = renderer.globalScale

      renderer.globalRotation = [0,0,0]
      renderer.globalTransform = [0,0,0]
      renderer.globalOriginOffset = [0,0,0]
      renderer.globalScale = [1,1,1]

      useTexture("assets/textures/red.png")
      renderer.drawGeometry(x.geometry,x.texcoord,"flat")
      useTexture("assets/textures/green.png")
      renderer.drawGeometry(y.geometry,y.texcoord,"flat")
      useTexture("assets/textures/blue.png")
      renderer.drawGeometry(z.geometry,z.texcoord,"flat")

      renderer.globalRotation = prevGR
      renderer.globalTransform = prevT
      renderer.globalOriginOffset = prevO
      renderer.globalScale = prevS

      useTexture("assets/textures/smile.png")
      renderer.drawGeometry(cubeMesh.geometry,cubeMesh.texcoord,"flat")
    } else if (sceneName == "portalSide1") {
      renderer.newFrame()

      useTexture("assets/textures/red.png")

      let cube3 = webGLextra.meshBuilder.createCube([100,1,100])
      renderer.globalTransform = [-50,-10.5,-50]
      renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
      renderer.drawGeometry(cube3.geometry,cube3.texcoord,'flat')

      useTexture("assets/textures/green.png")
      let cube4 = webGLextra.meshBuilder.createCube([1,9,1])
      renderer.globalTransform = [-4,-9.5,-0.5]
      renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
      renderer.drawGeometry(cube4.geometry,cube4.texcoord,'flat')
      let cube5 = webGLextra.meshBuilder.createCube([1,9,1])
      renderer.globalTransform = [3,-9.5,-0.5]
      renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
      renderer.drawGeometry(cube5.geometry,cube5.texcoord,'flat')
      let cube6 = webGLextra.meshBuilder.createCube([8,1,1])
      renderer.globalTransform = [-4,-0.5,-0.5]
      renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
      renderer.drawGeometry(cube6.geometry,cube6.texcoord,'flat')

      useTexture("portalTexture")
      let cube7 = webGLextra.meshBuilder.createCube([6,9,0.25])
      renderer.globalTransform = [-3,-9.5,-0.125]
      renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
      renderer.drawGeometry(cube7.geometry,cube7.texcoord,'flat')
  } else if (sceneName == "portalSide2") {
    renderer.newFrame()

    useTexture("assets/textures/blue.png")

    let cube3 = webGLextra.meshBuilder.createCube([15,1,200])
    renderer.globalTransform = [-7.5,-10.5,-100]
    renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
    renderer.drawGeometry(cube3.geometry,cube3.texcoord,'flat')

    useTexture("assets/textures/green.png")
    let cube4 = webGLextra.meshBuilder.createCube([1,9,1])
    renderer.globalTransform = [-4,-9.5,-0.5]
    renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
    renderer.drawGeometry(cube4.geometry,cube4.texcoord,'flat')
    let cube5 = webGLextra.meshBuilder.createCube([1,9,1])
    renderer.globalTransform = [3,-9.5,-0.5]
    renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
    renderer.drawGeometry(cube5.geometry,cube5.texcoord,'flat')
    let cube6 = webGLextra.meshBuilder.createCube([8,1,1])
    renderer.globalTransform = [-4,-0.5,-0.5]
    renderer.globalRotation = [degToRad(0),degToRad(0),degToRad(0)]
    renderer.drawGeometry(cube6.geometry,cube6.texcoord,'flat')
  } else if (sceneName == "artisans") {
    gl.uniform3fv(ambientLightUniformLocation, [0.23,0.23,0.26])
    gl.uniform3fv(directionalLightColorUniformLocation, [0.9,0.9,0.9])
    gl.uniform3fv(directionalVectorUniformLocation, [-0.2,-1,-0.25])
    renderer.newFrame([0.05,0.65,0.81])

    useTexture("assets/textures/High.png")
    renderer.drawGeometry(artisans.geometry, artisans.texcoord, "flat")
  } else if (sceneName == "midnight_mountain") {
    gl.uniform3fv(ambientLightUniformLocation, [0.46, 0.2, 1])
    gl.uniform3fv(directionalLightColorUniformLocation, [0.64,0.9,0])
    gl.uniform3fv(directionalVectorUniformLocation, [-0.2,-1,-0.25])
    renderer.newFrame([0.36, 0.1, 0.9,1])

    useTexture("assets/textures/Textures.png")
    renderer.drawGeometry(midnightMountain.geometry, midnightMountain.texcoord, "flat")
  }
}*/