var gl = null
var canvas = null

var vertexShader = null
var fragmentShader = null

var program = null
var shadowProgram = null
var currentProgram = program

var positionAttributeLocation = null
var texcoordAttributeLocation = null
var normalAttributeLocation = null
var tangentAttributeLocation = null

var matrixUniformLocation = null
var worldUniformLocation = null

var textureUniformLocation = null
let specularTextureUniformLocation = null
let normalTextureUniformLocation = null
var aoTextureUniformLocation = null

var ambientLightUniformLocation = null
var directionalLightColorUniformLocation = null
var directionalVectorUniformLocation = null

var shadowMapFramebuffer = null
var shadowMapTexture = null

var vao = null

var textures = {}

var lastTime = performance.now()
let lastRenderTick = new Date().getTime() / 1000
let totalRenderTick = 0

function loadTexture(src,filteringMode,callback) { //filteringMode: mipmap, linear, nearest
  let texture = gl.createTexture()

  gl.bindTexture(gl.TEXTURE_2D, texture)

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([242, 0, 255, 255]))

  let image = new Image()
  image.src = src
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    if (filteringMode === "mipmap") {
      gl.generateMipmap(gl.TEXTURE_2D)
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (filteringMode === "linear") {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      }
    }


    if (callback) {
      callback()
    }
  }

  textures[src] = texture
}

function getShadowWorldMatrix() {
  let cameraTranslation = webGLextra.m4.getTranslation(renderer.lastShadowRenderCameraMatrix)
  cameraTranslation[0] = Math.floor(cameraTranslation[0])
  cameraTranslation[1] = 0
  cameraTranslation[2] = Math.floor(cameraTranslation[2])
  
  let cameraPosNormal = [
    renderer.directionalLightNormal[0] * -renderer.shadowDistance,
    renderer.directionalLightNormal[1] * -renderer.shadowDistance,
    renderer.directionalLightNormal[2] * -renderer.shadowDistance]
  let lookAtNormal = [
    renderer.directionalLightNormal[0] * renderer.shadowDistance,
    renderer.directionalLightNormal[1] * renderer.shadowDistance,
    renderer.directionalLightNormal[2] * renderer.shadowDistance]

  cameraPosNormal = webGLextra.m4.addVectors(cameraPosNormal, cameraTranslation)
  lookAtNormal = webGLextra.m4.addVectors(lookAtNormal, cameraTranslation)
  let shadowWorldMatrix = webGLextra.m4.lookAt(cameraPosNormal, lookAtNormal, [0,1,0])
  //shadowWorldMatrix = webGLextra.m4.translate(shadowWorldMatrix, Math.floor(cameraTranslation[0]), 0, Math.floor(cameraTranslation[2]))
  
  //shadowWorldMatrix = webGLextra.m4.translate(shadowWorldMatrix, cameraTranslation[0],cameraTranslation[1],cameraTranslation[2])

  return shadowWorldMatrix
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

function useTexture(src, textureType) { //textureType: diffuse, specular, normal
  if (src === "shadowMapTexture") {
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture)
  } else if (src === "portalTexture") {
    gl.bindTexture(gl.TEXTURE_2D, textures[src])
    gl.uniform1f(isPortalLocation, 1.0)
  } else {
    switch(textureType) {
      case "diffuse":
        gl.activeTexture(gl.TEXTURE0)
        break;
      case "specular":
        gl.activeTexture(gl.TEXTURE1)
        break;
      case "normal":
        gl.activeTexture(gl.TEXTURE2)
        break;
      case "ao":
        gl.activeTexture(gl.TEXTURE3)
        break;
      default:
        console.log(src + " was missing textureType")
        console.log(textureType)
        gl.activeTexture(gl.TEXTURE0)
    } 
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

/*function quatToRotMatrix(quat) {
  const xyz = webGLextra.m4.normalize([quat[1],quat[2],quat[3]])

  const w = quat[0]
  const x = xyz[0]
  const y = xyz[1]
  const z = xyz[2]
  let matrixArray = null
  // Validate inputs
  if (isNaN(w) | isNaN(x) | isNaN(y) | isNaN(z)) {
    matrixArray = [[NaN, NaN, NaN], [NaN, NaN, NaN], [NaN, NaN, NaN]]
  } else {
    matrixArray = [
      [1 - 2 * y * y - 2 * z * z, 2 * x * y - 2 * z * w, 2 * x * z + 2 * y * w,
      2 * x * y + 2 * z * w, 1 - 2 * x * x - 2 * z * z, 2 * y * z - 2 * x * w,
      2 * x * z - 2 * y * w, 2 * y * z + 2 * x * w, 1 - 2 * x * x - 2 * y * y],
    ]
  }
  return matrixArray
}*/

var renderer = {
globalRotation: [0,0,0],
globalTransform: [0,0,0],
globalScale: [1,1,1],
globalOriginOffset: [0,0,0],

clearColor: [0,0,0,0],
directionalLightNormal: [0,0,0],

aspect: 1,
portalScene: null,
shadowMapSize: 4224,
shadowDistance: 256,
shadowMapMetersLength: 24 * 6,
perspective: true,
isShadowMap: false,
shadowsEnabled: true,

zNear: 0.01,
zFar: 500,

fov: 75,

cameraMatrix: webGLextra.m4.translation(0,0,0),
lastShadowRenderCameraMatrix: webGLextra.m4.translation(0,0,0),

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
  in vec3 a_tangent;
  
  //u_matrix = u_worldViewProjection
  uniform mat4 u_matrix;
  uniform mat4 u_world;
  uniform mat4 u_realWorld;
  uniform mat4 u_textureMatrix;
  
  uniform vec3[16] u_pointPos; //point light
  
  out vec2 v_texcoord;
  out vec3 v_normal;
  out vec3 v_FragPos;
  out vec3 v_tangent;
  out vec4 v_projectedTexcoord;
  
  out vec3[16] v_surfaceToLight; //point light
  
  void main() {
      gl_Position = u_matrix * a_position;
  
      v_texcoord = a_texcoord;
      v_normal = mat3(u_world) * a_normal;
  
      mat3 normalMat = mat3(u_world);
      v_normal = normalize(normalMat * a_normal);
      v_tangent = normalize(normalMat * a_tangent);
  
      v_FragPos = vec3(a_position);
  
      //point light calculations
      vec3 surfaceWorldPosition = (u_world * a_position).xyz;
  
      for (int i = 0; i < 16; i++) {
          v_surfaceToLight[i] = u_pointPos[i] - surfaceWorldPosition;
      }
  
      //shadow texture coordinates
      v_projectedTexcoord = u_realWorld * u_textureMatrix * a_position;
  }`

  let fragmentShaderSource = `#version 300 es

  precision highp float;
  
  in vec2 v_texcoord;
  in vec3 v_normal;
  in vec3 v_FragPos; //same as a_position
  in vec3 v_tangent;
  in vec4 v_projectedTexcoord;
  
  //point light
  in vec3[16] v_surfaceToLight;
  
  uniform vec3[16] u_pointColor;
  uniform vec3[16] u_pointSpecularColor;
  uniform vec2[16] u_pointAttenuation;
  
  uniform sampler2D u_texture;
  uniform sampler2D u_specularTexture;
  uniform sampler2D u_normalTexture;
  uniform sampler2D u_ao;
  uniform sampler2D u_projectedTexture;
  
  /*
  uniform float u_isPortal;*/
  uniform vec2 u_resolution;
  uniform float u_time;
  
  
  uniform vec3 u_ambientLight;
  uniform vec3 u_directionalLightColor;
  uniform vec3 u_directionalVector;
  uniform vec3 u_viewPos;
  
  uniform float u_specularStrength;
  uniform float u_shininess;
  
  out vec4 outColor;
  
  //grad4
  vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p,s;
  
    p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;
  
    return p;
  }
  
  //taylorInvSqrt
  float taylorInvSqrt(in float r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec2 taylorInvSqrt(in vec2 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 taylorInvSqrt(in vec3 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec4 taylorInvSqrt(in vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  //mod289
  float mod289(const in float x) { return x - floor(x * (1. / 289.)) * 289.; }
  vec2 mod289(const in vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
  vec3 mod289(const in vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
  vec4 mod289(const in vec4 x) { return x - floor(x * (1. / 289.)) * 289.; }
  
  //permute
  float permute(const in float x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec2 permute(const in vec2 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec3 permute(const in vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 permute(const in vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  
  //fnoise
  float snoise(in vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                        -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    // First corner
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
  
    // Other corners
    vec2 i1;
    //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
    //i1.y = 1.0 - i1.x;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
  
    // Permutations
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
  
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
  
    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
  
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
  
    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  
    // Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  
  float snoise(in vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  
    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;
  
    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
  
    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
  
    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  
    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;
  
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
  
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
  
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
  
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
  
    //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
    //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
  
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
  
    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
  
    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }
  
  float snoise(in vec4 v) {
    const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
                        0.276393202250021,  // 2 * G4
                        0.414589803375032,  // 3 * G4
                        -0.447213595499958); // -1 + 4 * G4
  
    // First corner
    vec4 i  = floor(v + dot(v, vec4(.309016994374947451)) ); // (sqrt(5) - 1)/4
    vec4 x0 = v -   i + dot(i, C.xxxx);
  
    // Other corners
  
    // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
    vec4 i0;
    vec3 isX = step( x0.yzw, x0.xxx );
    vec3 isYZ = step( x0.zww, x0.yyz );
    //  i0.x = dot( isX, vec3( 1.0 ) );
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
  
    // i0 now contains the unique values 0,1,2,3 in each channel
    vec4 i3 = clamp( i0, 0.0, 1.0 );
    vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
    vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
  
    //  x0 = x0 - 0.0 + 0.0 * C.xxxx
    //  x1 = x0 - i1  + 1.0 * C.xxxx
    //  x2 = x0 - i2  + 2.0 * C.xxxx
    //  x3 = x0 - i3  + 3.0 * C.xxxx
    //  x4 = x0 - 1.0 + 4.0 * C.xxxx
    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;
  
    // Permutations
    i = mod289(i);
    float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute( permute( permute( permute (
                i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
            + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
            + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
            + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
  
    // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
    // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
    vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
  
    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
  
    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4,p4));
  
    // Mix contributions from the five corners
    vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
                + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
  }
  
  vec2 snoise2( vec2 x ){
    float s  = snoise(vec2( x ));
    float s1 = snoise(vec2( x.y - 19.1, x.x + 47.2 ));
    return vec2( s , s1 );
  }
  
  vec3 snoise3( vec3 x ){
    float s  = snoise(vec3( x ));
    float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
    float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
    return vec3( s , s1 , s2 );
  }
  
  vec3 snoise3( vec4 x ){
    float s  = snoise(vec4( x ));
    float s1 = snoise(vec4( x.y - 19.1 , x.z + 33.4 , x.x + 47.2, x.w ));
    float s2 = snoise(vec4( x.z + 74.2 , x.x - 124.5 , x.y + 99.4, x.w ));
    return vec3( s , s1 , s2 );
  }
  
  vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
    vec4 color = vec4(0.0);
    vec2 off1 = vec2(1.3846153846) * direction;
    vec2 off2 = vec2(3.2307692308) * direction;
    color += texture(image, uv) * 0.2270270270;
    color += texture(image, uv + (off1 / resolution)) * 0.3162162162;
    color += texture(image, uv - (off1 / resolution)) * 0.3162162162;
    color += texture(image, uv + (off2 / resolution)) * 0.0702702703;
    color += texture(image, uv - (off2 / resolution)) * 0.0702702703;
    return color;
  }
  
  //directional light function
  vec3 calculateDirLight(vec3 normal) {
      float directionalLight = (dot(normal, u_directionalVector) + 0.5) / 2.0;
      vec3 dirLight = (u_directionalLightColor * max(directionalLight, 0.0));
      return dirLight;
  }
  
  //specular light function
  vec3 calculateSpecular(vec3 dirLight, vec3 normal, vec4 specularTexelColor) {
      vec3 viewDir = normalize(u_viewPos - v_FragPos);
      vec3 reflectDir = reflect(-dirLight, normal);  
  
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
      vec3 specular = u_specularStrength * spec * u_directionalLightColor * specularTexelColor.r;  
      return specular;
  }
  
  vec3 normalMapNormal(vec3 normal, vec3 textureNormalColor) {
      textureNormalColor.r = 1.0-textureNormalColor.r;
      //textureNormalColor.b = -textureNormalColor.b;
  
      vec3 tangent = normalize(v_tangent);
      vec3 bitangent = normalize(cross(normal, tangent));
      
      mat3 tbn = mat3(tangent, bitangent, normal);
      normal = textureNormalColor * 2. - 1.;
      //normal.x = -normal.x;
      //normal.z = -normal.z;
      normal = normalize(tbn * normal);
  
      return normal;
  }
  
  /*float calculatePointLights(vec3 normal) {
    float totalLight = 1.0;
  
    for (int i = 0; i < 16; i++) {
      vec3 surfaceToLightDirection = normalize(v_surfaceToLight[i]);
      if (u_pointShininess[i] > 0.0) {
        totalLight += dot(normal, surfaceToLightDirection);
      }
    }
  
    return totalLight;
  }*/
  
  vec3 calculatePointLights(vec3 normal) {
    vec3 totalLight = vec3(0.0,0.0,0.0);
  
    vec3 ambient = vec3(1.0,1.0,1.0);
  
    for (int i = 0; i < 16; i++) {
      //diffuse/lightcolor
      vec3 lightDir = normalize(v_surfaceToLight[i]);
      float diff = max(dot(normal, lightDir) * -1.0,0.0);
      vec3 diffuse = u_pointColor[i] * diff;
  
      //specular
      vec3 viewDir = normalize(u_viewPos - v_FragPos);
      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir,reflectDir),0.0), u_shininess) * u_specularStrength;
      vec3 specular = u_pointSpecularColor[i] * spec;
  
      //attenuation
      float distance = length(v_surfaceToLight[i]);
      float attenuation = 1.0 / (1.0 + u_pointAttenuation[i].x * distance + u_pointAttenuation[i].y * (distance * distance));
  
      diffuse *= attenuation;
      specular *= attenuation;
  
      vec3 result = (ambient * attenuation + diffuse + specular) * u_pointColor[i];
      if (u_pointAttenuation[i].x > 0.0) {
        totalLight += result;
      }
    }
  
    return totalLight;
  }
  
  //float calculateShadowLight(float[200] randomSampler) {
  float calculateShadowLight() {
    vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;
    //float bias = max(-0.0004 * (-1.0 + dot(v_normal, u_directionalVector)), -0.00003);
    float bias = 0.00015;
    float currentDepth = projectedTexcoord.z - bias;
  
    bool inRange =
        projectedTexcoord.x >= 0.0 &&
        projectedTexcoord.x <= 1.0 &&
        projectedTexcoord.y >= 0.0 &&
        projectedTexcoord.y <= 1.0;
  
    // the 'r' channel has the depth values
    //vec4 projectedTexColor = vec4(texture(u_projectedTexture, projectedTexcoord.xy).rrr, 1);
    //float projectedDepth = texture(u_projectedTexture, projectedTexcoord.xy).r;
    //bool inShadow = (inRange && projectedDepth <= currentDepth) ? true : false;
    float shadowLight = 0.0;
    //float shadowLight = (inRange && projectedDepth <= currentDepth) ? 0.75 : 1.0;
    vec2 texelSize = vec2(1.0 / 4224.0, 1.0 / 4224.0);
  
    int sampleWidth = 1;
    //float distancePerSample = 1.0;
  
    for(int x = -sampleWidth; x <= sampleWidth; ++x)
    {
        for(int y = -sampleWidth; y <= sampleWidth; ++y)
        {
          vec2 pixelPos = projectedTexcoord.xy/texelSize + vec2(0.5);
          vec2 fractPart = fract(pixelPos);
          vec2 startTexel = (pixelPos - fractPart - vec2(0.5)) * texelSize;
  
          float blTexel = (inRange && currentDepth >= texture(u_projectedTexture, startTexel + vec2(float(x),float(y)) * texelSize).r) ? 0.65 : 1.0;
          float brTexel = (inRange && currentDepth >= texture(u_projectedTexture, startTexel + vec2(texelSize.x, 0.0) + vec2(float(x),float(y)) * texelSize).r) ? 0.65 : 1.0;
          float tlTexel = (inRange && currentDepth >= texture(u_projectedTexture, startTexel + vec2(0.0, texelSize.y) + vec2(float(x),float(y)) * texelSize).r) ? 0.65 : 1.0;
          float trTexel = (inRange && currentDepth >= texture(u_projectedTexture, startTexel + texelSize + vec2(float(x),float(y)) * texelSize).r) ? 0.65 : 1.0;
  
          float mixA = mix(blTexel, tlTexel, fractPart.y);
          float mixB = mix(brTexel, trTexel, fractPart.y);
  
          shadowLight += mix(mixA, mixB, fractPart.x);
        }
    }
    shadowLight /= float((sampleWidth*2 + 1) * (sampleWidth*2 + 1));
  
    /*vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
      vec4 color = vec4(0.0);
      vec2 off1 = vec2(1.3846153846) * direction;
      vec2 off2 = vec2(3.2307692308) * direction;
      color += texture(image, uv) * 0.2270270270;
      color += texture(image, uv + (off1 / resolution)) * 0.3162162162;
      color += texture(image, uv - (off1 / resolution)) * 0.3162162162;
      color += texture(image, uv + (off2 / resolution)) * 0.0702702703;
      color += texture(image, uv - (off2 / resolution)) * 0.0702702703;
      return color;
    }*/
  
    /*for(int x = -sampleWidth; x <= sampleWidth; ++x)
    {
        for(int y = -sampleWidth; y <= sampleWidth; ++y)
        {
          vec2 screenPos = vec2(v_FragPos.x + float(x), v_FragPos.z + float(y)) / u_resolution;
  
          float xOffset = snoise(screenPos * 100000.0 * v_FragPos.y) * 2.0 - 1.0;
          //float yOffset = snoise(vec2(screenPos.x + 1000.0, screenPos.y + 1000.0) * 100000.0 * u_time) * 2.0 - 1.0;
          //float xOffset = 0.0;
          //float yOffset = 0.0;
  
          //int randomSamplerIndexX = int(mod((projectedTexcoord.x * texelSize.x + float(x) * texelSize.x), 200.0));
          //int randomSamplerIndexY = int(mod((projectedTexcoord.y * texelSize.y + float(y) * texelSize.y), 199.0));
          float pcfDepth = texture(u_projectedTexture, projectedTexcoord.xy + vec2(float(x) * distancePerSample + xOffset, float(y) * distancePerSample + xOffset) * texelSize).r; 
          shadowLight += (inRange && currentDepth >= pcfDepth) ? 0.65 : 1.0;
        }
    }
    shadowLight /= float((sampleWidth*2 + 1) * (sampleWidth*2 + 1));*/
  
    /*vec2 direction = vec2(1,0);
    //vec2 positionOffset = vec2(float(x) * distancePerSample, float(y) * distancePerSample) * texelSize;
    //vec2 uv = projectedTexcoord.xy + positionOffset;
    vec2 uv = projectedTexcoord.xy;
  
    float color = 0.0;
    vec2 off1 = vec2(1.3846153846) * direction;
    vec2 off2 = vec2(3.2307692308) * direction;
    color += ((inRange && currentDepth >= texture(u_projectedTexture, uv).r) ? 0.65 : 1.0) * 0.2270270270;
    color += ((inRange && currentDepth >= texture(u_projectedTexture, uv + (off1 * texelSize)).r) ? 0.65 : 1.0) * 0.3162162162;
    color += ((inRange && currentDepth >= texture(u_projectedTexture, uv - (off1 * texelSize)).r) ? 0.65 : 1.0) * 0.3162162162;
    color += ((inRange && currentDepth >= texture(u_projectedTexture, uv + (off2 * texelSize)).r) ? 0.65 : 1.0) * 0.0702702703;
    color += ((inRange && currentDepth >= texture(u_projectedTexture, uv - (off2 * texelSize)).r) ? 0.65 : 1.0) * 0.0702702703;
  
    //float pcfDepth = texture(u_projectedTexture, projectedTexcoord.xy).r; 
    //shadowLight += (inRange && currentDepth >= pcfDepth) ? 0.65 : 1.0;
    shadowLight = color;*/
  
    //shadowLight /= float((sampleWidth*2 + 1) * (sampleWidth*2 + 1));
  
    /*for(int x = -1; x <= 1; ++x)
    {
      float pcfDepth = texture(u_projectedTexture, projectedTexcoord.xy + vec2(x, 0) * texelSize).r; 
      shadowLight += (inRange && currentDepth >= pcfDepth) ? 0.5 : 1.0; 
    }
    for(int y = -1; y <= 1; ++y)
    {
      float pcfDepth = texture(u_projectedTexture, projectedTexcoord.xy + vec2(0, y) * texelSize).r; 
      shadowLight += (inRange && currentDepth >= pcfDepth) ? 0.5 : 1.0;
    } 
    shadowLight /= 6.0;*/
  
    //float projectedAmount = inRange ? 1.0 : 0.0;
    return shadowLight;
  }
  
  void main() {
      //float[200] randomSampler = float[200](0.41,-0.65,0.86,-0.75,-0.76,-0.90,-0.41,-0.12,-0.53,-0.29,0.97,0.89,-0.14,0.62,0.27,0.64,-0.82,-1.0,-0.6,-0.47,0.50,-0.8,0.21,-0.73,-0.40,0.49,0.81,-0.50,-1.0,-0.17,-0.63,-0.71,-0.34,0.48,0.1,0.15,-0.44,0.93,-0.66,-0.61,0.94,0.75,-0.21,0.2,0.70,0.79,-0.84,-0.95,0.19,0.84,-0.76,0.98,-0.93,0.52,0.12,0.23,-0.52,-0.5,0.22,0.68,0.33,-0.72,0.26,-0.94,-0.49,-0.31,-0.92,0.73,0.9,0.18,0.67,-0.46,0.58,0.63,0.54,0.28,-0.80,-0.35,0.57,-0.2,0.77,0.16,-0.13,-0.77,0.11,-0.27,0.74,-0.43,0.39,-0.42,-0.55,-0.3,-0.38,-0.18,0.45,-0.4,-0.11,-0.67,0.42,-0.16,0.43,-0.83,0.34,0.38,-0.74,-0.30,-0.79,0.30,0.0,0.3,0.96,0.51,0.5,-0.60,0.14,0.60,-0.37,-0.69,-0.10,-0.88,-0.20,-0.51,-0.59,-0.23,0.53,0.46,-0.57,-0.36,0.71,-0.22,0.7,-0.64,-0.58,-0.62,-0.26,0.6,0.55,0.66,0.20,-0.33,-0.24,0.47,0.100,-0.68,0.24,-0.89,0.87,-0.97,0.85,-0.78,0.37,-0.54,-0.96,0.44,0.10,-0.45,-0.81,0.88,-0.98,-0.39,-0.32,0.65,0.4,0.32,0.61,0.8,0.35,0.29,-0.25,-0.15,0.91,0.36,0.90,0.72,-0.48,-0.56,-0.7,0.82,0.95,-0.99,0.92,0.13,0.83,0.17,-0.86,0.69,0.25,-0.87,-0.85,0.78,0.59,-0.28,0.80,-0.19,-0.70,-0.9,0.56,0.31,0.99,0.40);
  
      vec3 ogNormal = normalize(v_normal);
      vec3 normal = normalMapNormal(ogNormal, texture(u_normalTexture, v_texcoord).rgb);
  
      //TEXTURES
      vec4 texelColor = texture(u_texture, v_texcoord);
      //float texelPNoiseColor = snoise(v_texcoord);
      //vec4 texelColor = vec4(texelPNoiseColor,texelPNoiseColor,texelPNoiseColor,texelPNoiseColor);
      vec4 specularTexelColor = texture(u_specularTexture, v_texcoord);
  
      /* unused
      if (u_isPortal > 0.5) {
        texelColor = texture(u_texture, gl_FragCoord.xy / u_resolution);
      }
      */
  
      //LIGHTING
      vec3 dirLight = calculateDirLight(normal);
      vec3 specular = calculateSpecular(dirLight, normal, specularTexelColor);
      vec3 pointLights = calculatePointLights(normal);
      float aoMultiplier = texture(u_ao, v_texcoord).r;
      float shadowLight = calculateShadowLight();
  
      vec3 lighting = (u_ambientLight + dirLight + specular + pointLights) * aoMultiplier * shadowLight;
  
      //TRANSPARENCY
      if (texelColor.a == 0.0) {
        discard;
      }
  
      //FINISH
      outColor = vec4(texelColor.rgb * lighting, texelColor.a);
      //outColor = vec4(lighting, texelColor.a);
  
  
      /*
      if (u_isPortal < 0.5) {
        outColor = vec4(texelColor.rgb * lighting, texelColor.a);
      } else {
        outColor = vec4(texelColor.rgb, texelColor.a);
      }
      */
  }`

  let shadowVertexSource = `#version 300 es

  in vec4 a_position;
  
  uniform mat4 u_matrix;
  
  void main() {
      gl_Position = u_matrix * a_position;
  }`

  let shadowFragmentSource = `#version 300 es
  precision highp float;
  
  out vec4 outColor;
  
  void main() {
    outColor = vec4(1.0,1.0,1.0,1.0);
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

  shadowVertexShader = webGLextra.createShader(gl, shadowVertexSource, gl.VERTEX_SHADER)
  shadowFragmentShader = webGLextra.createShader(gl, shadowFragmentSource, gl.FRAGMENT_SHADER)

  let programAttribInfo = [
    ["a_position",0],
    ["a_texcoord",1],
    ["a_normal",2],
    ["a_tangent",3]
  ]

  program = webGLextra.createProgram(gl, [vertexShader, fragmentShader], programAttribInfo)
  currentProgram = program
  shadowProgram = webGLextra.createProgram(gl, [shadowVertexShader, shadowFragmentShader], programAttribInfo)
  

  //attribute for vertex data
  gl.useProgram(program)
  positionAttributeLocation = gl.getAttribLocation(currentProgram, "a_position")
  texcoordAttributeLocation = gl.getAttribLocation(currentProgram, "a_texcoord")
  normalAttributeLocation = gl.getAttribLocation(currentProgram, "a_normal")
  tangentAttributeLocation = gl.getAttribLocation(currentProgram, "a_tangent")

  matrixUniformLocation = gl.getUniformLocation(currentProgram, "u_matrix")
  worldUniformLocation = gl.getUniformLocation(currentProgram, "u_world")
  realWorldUniformLocation = gl.getUniformLocation(currentProgram, "u_realWorld")
  textureMatrixUniformLocation = gl.getUniformLocation(currentProgram, "u_textureMatrix")

  resolutionUniformLocation = gl.getUniformLocation(currentProgram, "u_resolution")
  timeUniformLocation = gl.getUniformLocation(currentProgram, "u_time")

  //texture locations
  textureUniformLocation = gl.getUniformLocation(currentProgram, "u_texture")
  specularTextureUniformLocation = gl.getUniformLocation(currentProgram, "u_specularTexture")
  normalTextureUniformLocation = gl.getUniformLocation(currentProgram, "u_normalTexture")
  aoTextureUniformLocation = gl.getUniformLocation(currentProgram, "u_ao")
  shadowTextureUniformLocation = gl.getUniformLocation(currentProgram, "u_projectedTexture")

  gl.useProgram(shadowProgram)
  shadowPositionAttributeLocation = gl.getAttribLocation(shadowProgram, "a_position")
  shadowMatrixUniformLocation = gl.getUniformLocation(shadowProgram, "u_matrix")

  gl.useProgram(currentProgram)
  gl.uniform1i(textureUniformLocation, 0)
  gl.uniform1i(specularTextureUniformLocation, 1)
  gl.uniform1i(normalTextureUniformLocation, 2)
  gl.uniform1i(aoTextureUniformLocation, 3)
  gl.uniform1i(shadowTextureUniformLocation, 4)
  
  //directional lighting uniforms
  ambientLightUniformLocation = gl.getUniformLocation(currentProgram, "u_ambientLight")
  directionalLightColorUniformLocation = gl.getUniformLocation(currentProgram, "u_directionalLightColor")
  directionalVectorUniformLocation = gl.getUniformLocation(currentProgram, "u_directionalVector")
  viewPosUniformLocation = gl.getUniformLocation(currentProgram, "u_viewPos")
  specularStrengthUniformLocation = gl.getUniformLocation(currentProgram, "u_specularStrength")
  shininessUniformLocation = gl.getUniformLocation(currentProgram, "u_shininess")

  //point lighting uniform
  pointLightShininessUniformLocation = gl.getUniformLocation(currentProgram, "u_pointShininess")
  pointLightColorUniformLocation = gl.getUniformLocation(currentProgram, "u_pointColor")
  pointLightSpecularColorUniformLocation = gl.getUniformLocation(currentProgram, "u_pointSpecularColor")
  pointLightPosUniformLocation = gl.getUniformLocation(currentProgram, "u_pointPos")
  pointLightAttenuationUniformLocation = gl.getUniformLocation(currentProgram, "u_pointAttenuation")

  renderer.updatePointLightUniforms()

  //isPortal bool
  isPortalLocation = gl.getUniformLocation(currentProgram, "u_isPortal")

  //vertex array object
  vao = gl.createVertexArray()
  gl.bindVertexArray(vao)

  //PORTAL TEXTURE (UNUSED)
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

  //SHADOWMAP
  shadowMapTexture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture)

  //depth buffer configuration
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, renderer.shadowMapSize, renderer.shadowMapSize, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null)

  // set the filtering so we don't need mips (probably wont work anyway)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  gl.activeTexture(gl.TEXTURE4)
  gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture)

  //create framebuffer for rendering to it
  renderer.shadowMapFramebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.shadowMapFramebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowMapTexture, 0)
},
newFrame: function(clearColor) {
  totalRenderTick += new Date().getTime() / 1000 - lastRenderTick
  lastRenderTick = new Date().getTime() / 1000
  
  if (clearColor == undefined) {
    clearColor = renderer.clearColor
  }
  
  let shadowWorldMatrix = getShadowWorldMatrix()
  
  //shadowWorldMatrix = webGLextra.m4.translate(shadowWorldMatrix, cameraTranslation[0],cameraTranslation[1],cameraTranslation[2])

  if (renderer.isShadowMap) {
    renderer.lastShadowRenderCameraMatrix = renderer.cameraMatrix

    clearColor = [1,1,1,1]

    currentProgram = shadowProgram
    
    renderer.cameraMatrix = shadowWorldMatrix

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(4, 6);
  } else {
    gl.disable(gl.POLYGON_OFFSET_FILL)
    //renderer.cameraMatrix = shadowWorldMatrix
    currentProgram = program
  }

  gl.useProgram(currentProgram)

  webGLextra.resizeCanvas(gl, canvas)

  renderer.aspect = canvas.clientWidth / canvas.clientHeight

  gl.uniform1f(timeUniformLocation, totalRenderTick)

  if (!this.isShadowMap) {
    gl.uniform2f(resolutionUniformLocation, canvas.clientWidth, canvas.clientHeight)
    gl.uniform3fv(viewPosUniformLocation, webGLextra.m4.getTranslation(this.cameraMatrix))
  }

  //gl.enable(gl.CULL_FACE)
  gl.enable(gl.DEPTH_TEST)

  if (!this.isShadowMap) {
    gl.enable(gl.CULL_FACE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0,0,canvas.clientWidth,canvas.clientHeight)
  } else {
    gl.disable(gl.CULL_FACE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.shadowMapFramebuffer)
    gl.viewport(0,0,renderer.shadowMapSize,renderer.shadowMapSize)
  }
  
  gl.clearColor(clearColor[0],clearColor[1],clearColor[2],clearColor[3])
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  gl.bindVertexArray(vao)
},
drawGeometry: function(geometry, texcoords, normals, tangents) {
  gl.bindVertexArray(vao)

  if (!this.isShadowMap) {
    gl.useProgram(program)
    gl.activeTexture(gl.TEXTURE4)
    gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture)

    //connect a_position & ARRAY_BUFFER
    let positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    //buffer geometry
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(positionAttributeLocation)

    //vertextAttribPointer binds ARRAY_BUFFER to the position attribute
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0) //attribute location, size, type, normalize, stride, offset

    //connect a_texcoord & ARRAY_BUFFER
    let texcoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW)

    //texcoord vertex attribute
    gl.enableVertexAttribArray(texcoordAttributeLocation)
    gl.vertexAttribPointer(texcoordAttributeLocation, 2, gl.FLOAT, true, 0, 0)

    //normals
    let normalBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(normalAttributeLocation)

    gl.vertexAttribPointer(normalAttributeLocation, 3, gl.FLOAT, true, 0, 0)

    //tangents
    let tangentBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer)

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(tangentAttributeLocation)

    gl.vertexAttribPointer(tangentAttributeLocation, 3, gl.FLOAT, true, 0, 0)
  } else {
    gl.useProgram(shadowProgram)

    //connect a_position & ARRAY_BUFFER
    let positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

    //buffer geometry
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(shadowPositionAttributeLocation)

    //vertextAttribPointer binds ARRAY_BUFFER to the position attribute
    gl.vertexAttribPointer(shadowPositionAttributeLocation, 3, gl.FLOAT, false, 0, 0) //attribute location, size, type, normalize, stride, offset
  }

  //compute matrix
  let projectionMatrix = renderer.perspective ? webGLextra.m4.perspective(degToRad(renderer.fov), renderer.aspect, renderer.zNear, renderer.zFar) : webGLextra.m4.orthographic(-renderer.shadowMapMetersLength, renderer.shadowMapMetersLength, -renderer.shadowMapMetersLength, renderer.shadowMapMetersLength, renderer.zNear, renderer.zFar)

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

  let realWorldMatrix = webGLextra.m4.translation(renderer.globalTransform[0],renderer.globalTransform[1],renderer.globalTransform[2])
  realWorldMatrix = webGLextra.m4.xRotate(realWorldMatrix, renderer.globalRotation[0])
  realWorldMatrix = webGLextra.m4.yRotate(realWorldMatrix, renderer.globalRotation[1])
  realWorldMatrix = webGLextra.m4.zRotate(realWorldMatrix, renderer.globalRotation[2])
  realWorldMatrix = webGLextra.m4.translate(realWorldMatrix, renderer.globalOriginOffset[0],renderer.globalOriginOffset[1],renderer.globalOriginOffset[2])
  realWorldMatrix = webGLextra.m4.scale(realWorldMatrix, renderer.globalScale[0], renderer.globalScale[1], renderer.globalScale[2])

  let orthoProjectionMatrix = webGLextra.m4.orthographic(-renderer.shadowMapMetersLength, renderer.shadowMapMetersLength, -renderer.shadowMapMetersLength, renderer.shadowMapMetersLength, renderer.zNear, renderer.zFar)

  let textureMatrix = webGLextra.m4.identity();
  textureMatrix = webGLextra.m4.translate(textureMatrix, 0.5, 0.5, 0.5)
  textureMatrix = webGLextra.m4.scale(textureMatrix, 0.5, 0.5, 0.5)
  textureMatrix = webGLextra.m4.multiply(textureMatrix, orthoProjectionMatrix)
  // use the inverse of this world matrix to make
  // a matrix that will transform other positions
  // to be relative this this world space.
  let shadowWorldMatrix = getShadowWorldMatrix()
  
  //shadowWorldMatrix = webGLextra.m4.translate(shadowWorldMatrix, cameraTranslation[0],0,cameraTranslation[2])
  

  textureMatrix = webGLextra.m4.multiply(textureMatrix, webGLextra.m4.inverse(shadowWorldMatrix))

  if (!this.isShadowMap) {
    gl.uniformMatrix4fv(matrixUniformLocation, false, viewProjectionMatrix)
    gl.uniformMatrix4fv(worldUniformLocation, false, worldMatrix)
    gl.uniformMatrix4fv(realWorldUniformLocation, false, realWorldMatrix)
    gl.uniformMatrix4fv(textureMatrixUniformLocation, false, textureMatrix)
  } else {
    gl.uniformMatrix4fv(shadowMatrixUniformLocation, false, viewProjectionMatrix)
  }

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
  renderer.directionalLightNormal = vec3
},
setSpecularShininess: function(float) {
  gl.useProgram(program)
  gl.uniform1f(shininessUniformLocation, float)
},
setSpecularStrength: function(float) {
  gl.useProgram(program)
  gl.uniform1f(specularStrengthUniformLocation, float)
},
updatePointLightUniforms: function(allPointLights) {
  gl.useProgram(program)

  let pointLightColorArray = []
  let pointLightPosArray = []
  let pointLightShininessArray = []
  let pointLightSpecularColorArray = []
  let pointLightAttenuationArray = []

  if (allPointLights) {
    for (let i = 0; i < allPointLights.length; i++) { //color, pos, shininess, specular color
      pointLightPosArray.push(allPointLights[i].pos[0])
      pointLightPosArray.push(allPointLights[i].pos[1])
      pointLightPosArray.push(allPointLights[i].pos[2])

      pointLightColorArray.push(allPointLights[i].lightColor[0] / 255)
      pointLightColorArray.push(allPointLights[i].lightColor[1] / 255)
      pointLightColorArray.push(allPointLights[i].lightColor[2] / 255)

      pointLightSpecularColorArray.push(allPointLights[i].specularColor[0] / 255)
      pointLightSpecularColorArray.push(allPointLights[i].specularColor[1] / 255)
      pointLightSpecularColorArray.push(allPointLights[i].specularColor[2] / 255)

      pointLightAttenuationArray.push(allPointLights[i].linear)
      pointLightAttenuationArray.push(allPointLights[i].quadratic)

      pointLightShininessArray.push(allPointLights[i].brightness)
    }
  }

  let lightsMissing = 16
  if (allPointLights) {
    lightsMissing = 16 - allPointLights.length
  }
  for (let i = 0; i < lightsMissing; i++) {
    pointLightPosArray.push(99999)
    pointLightPosArray.push(99999)
    pointLightPosArray.push(99999)

    pointLightColorArray.push(0)
    pointLightColorArray.push(0)
    pointLightColorArray.push(0)

    pointLightSpecularColorArray.push(0)
    pointLightSpecularColorArray.push(0)
    pointLightSpecularColorArray.push(0)

    pointLightAttenuationArray.push(0)
    pointLightAttenuationArray.push(0)

    pointLightShininessArray.push(0)
  }

  gl.useProgram(program)
  gl.uniform3fv(pointLightPosUniformLocation, new Float32Array(pointLightPosArray))
  gl.uniform3fv(pointLightColorUniformLocation, new Float32Array(pointLightColorArray))
  gl.uniform3fv(pointLightSpecularColorUniformLocation, new Float32Array(pointLightSpecularColorArray))
  gl.uniform2fv(pointLightAttenuationUniformLocation, new Float32Array(pointLightAttenuationArray))
  gl.uniform1fv(pointLightShininessUniformLocation, new Float32Array(pointLightShininessArray))
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