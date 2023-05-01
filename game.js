/*let PressedKeys = {
    "w" : false,
    "a" : false,
    "s" : false,
    "d" : false,
    "ArrowUp": false,
    "ArrowRight": false,
    "ArrowDown": false,
    "ArrowLeft": false,
    " ": false,
}

document.body.onkeydown = function(e) {
    if (PressedKeys[e.key] != undefined) {
        PressedKeys[e.key] = true
    }
}

document.body.onkeyup = function(e) {
    if (PressedKeys[e.key] != undefined) {
        PressedKeys[e.key] = false
    }
}

let Player = {
    "pos": [0,8,0],
    "rotationY": 0,
    "rotationX": 0,
    "velocityY": 0,
}*/

let SelfPlayer = new Player([0,15,0])

function radToDeg(r) {
    return r * 180 / Math.PI;
}

function degToRad(d) {
    return d * Math.PI / 180;
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255]
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

let ShinyMaterial = new material("assets/textures/snow.png")
ShinyMaterial.specularShininess = 8
ShinyMaterial.specularStrength = 0.3
ShinyMaterial.loadTextures()

/*let PlayerMesh = new mesh("assets/models/Player.obj", ShinyMaterial, [0,0,0])
PlayerMesh.visible = true
PlayerMesh.origin = [0,-1,0]

let PlayerHitbox = new hitbox("mesh")
PlayerMesh.attachHitbox(PlayerHitbox)
console.log(PlayerHitbox.mesh)*/

function offsetWithRotation(pos, rotation, offset) {
    let matrix = webGLextra.m4.translation(pos[0],pos[1],pos[2])
    matrix = webGLextra.m4.yRotate(matrix, rotation)
    matrix = webGLextra.m4.translate(matrix,offset[0],offset[1],offset[2])

    let newPos = webGLextra.m4.getTranslation(matrix)
    return newPos
}

function moveVectorForward(vec2, steps, direction) {
	newVector = [ steps * Math.cos(direction), steps * -Math.sin(direction) ]
	newVector[0] = newVector[0] + vec2[0]
	newVector[1] = newVector[1] + vec2[1]
	return newVector
}

let FPSCounter = 0

//lighting
renderer.setAmbientLightColor([0.23,0.23,0.26])
renderer.setDirectionalLightColor([0.9,0.9,0.9])
renderer.setDirectionalLightDirection([-0.2,-0.6,-0.25])
renderer.clearColor = [0.258,0.529,0.960,1]

//test mesh
/*let cube = webGLextra.meshBuilder.createCube([2000,1,2000])
let cubeMesh = new mesh(cube, ShinyMaterial, [-1000,-1,-1000])
cubeMesh.buildNormals("flat")
cubeMesh.updateHitbox()
cubeMesh.attachHitbox(new hitbox("box"))

let terrainTest = new mesh("assets/models/terrainTest.obj","assets/textures/snow.png", [0,0,0])
terrainTest.buildNormals("smooth")*/

//primitive materials

//parasol
let ParasolMaterial = new material("assets/textures/parasol.png")
ParasolMaterial.loadTextures()

let parasol = new mesh("assets/models/parasol.obj",ParasolMaterial, [-6,2,0])
parasol.buildNormals("smooth")

parasol.attachHitbox(new hitbox("box"))

//primitives

//flat
let cubeMaterial = new material("assets/textures/snow.png")
cubeMaterial.loadTextures()

let uvSphere = new mesh("assets/models/ico-sphere.obj",ShinyMaterial,[0,2,0])
uvSphere.buildNormals("flat")
uvSphere.attachHitbox(new hitbox("box"))

let flatCube = new mesh(webGLextra.meshBuilder.createCube([2,2,2]), cubeMaterial,[6,2,-1])
flatCube.buildNormals("flat")
flatCube.origin = [-1,-1,-1]

let flatCubeHitbox = new hitbox("box")
flatCubeHitbox.mesh = flatCube
flatCube.hitbox = flatCubeHitbox

//smooth
let smoothUvSphere = new mesh("assets/models/ico-sphere.obj",ShinyMaterial,[3,2,0])
smoothUvSphere.buildNormals("smooth")
smoothUvSphere.attachHitbox(new hitbox("box"))

let smoothCube = new mesh(webGLextra.meshBuilder.createCube([2,2,2]), cubeMaterial,[9,2,-1])
smoothCube.buildNormals("smooth")
smoothCube.origin = [-1,-1,-1]

let smoothCubeHitbox = new hitbox("box")
smoothCubeHitbox.mesh = smoothCube
smoothCube.hitbox = smoothCubeHitbox

//artisans
let ArtisansMaterial = new material("assets/textures/High.png")
ArtisansMaterial.normal = "assets/textures/ArtisansNormalMap.png"
ArtisansMaterial.specularStrength = 0
ArtisansMaterial.loadTextures()

let ArtisansHub = new mesh("assets/models/Artisans_Hub.obj", ArtisansMaterial,[0,0,0])
ArtisansHub.buildNormals("smooth")
ArtisansHub.visible = true
ArtisansHub.attachHitbox(new hitbox("mesh"))

//pbr test
let pbrRockMaterial = new material("assets/textures/pbrRockDiffuse.png")
pbrRockMaterial.normal = "assets/textures/normalMapTest.png"
pbrRockMaterial.specular = "assets/textures/pbrRockSpecular.png"
pbrRockMaterial.specularShininess = 8
pbrRockMaterial.specularStrength = 4
pbrRockMaterial.filteringMode = "nearest"
pbrRockMaterial.loadTextures()

/*let pbrRockMesh = new mesh("assets/models/plane.obj", pbrRockMaterial, [0,0,-4])
pbrRockMesh.buildNormals("flat")*/

//pbr concrete
let concreteMaterial = new material("assets/textures/concrete_diffuse.jpg")
concreteMaterial.normal = "assets/textures/concrete_normal.jpg"
concreteMaterial.specular = "assets/textures/concrete_specular.jpg"
concreteMaterial.ao = "assets/textures/concrete_ao.jpg"
concreteMaterial.specularShininess = 8
concreteMaterial.specularStrength = 0.5
concreteMaterial.loadTextures()

let rockMaterial = new material("assets/textures/rock_diffuse.jpg")
rockMaterial.normal = "assets/textures/rock_normal.jpg"
rockMaterial.specular = "assets/textures/rock_specular.jpg"
rockMaterial.ao = "assets/textures/rock_ao.jpg"
rockMaterial.specularShininess = 8
rockMaterial.specularStrength = 0.5
rockMaterial.loadTextures()


let concretePlane = new mesh("assets/models/subdividedPlane.obj", concreteMaterial, [0,0,0])
concretePlane.scale = [1,1,1]
concretePlane.buildNormals("flat")
concretePlane.attachHitbox(new hitbox("box"))
concretePlane.updateHitbox()

//let pointLightTest = new pointLight([0,5,0],1000,3200000)
let pointLightTest2 = new pointLight([0.5,10,-3.5],1)
pointLightTest2.linear = 0.07
pointLightTest2.quadratic = 0.017

pointLightTest2.update()

let pointLightVisualization = new mesh("assets/models/ico-sphere.obj", concreteMaterial, [0.5,10,-3.5])
pointLightVisualization.scale = [0.1,0.1,0.1]

//sun visualization
/*let sunMaterial = new material("assets/textures/red.png")
sunMaterial.loadTextures()

let sunMesh = new mesh("assets/models/ico-sphere.obj", sunMaterial, [0,0,0])
sunMesh.scale = [10,10,10]

let sunDistance = 200*/

/*let map_neighborhood_newMaterial = new material("assets/textures/mapTest.png")
let map_neighborhood_new = new mesh("assets/models/mapTest.obj", map_neighborhood_newMaterial, [0,0,0])
map_neighborhood_new.buildNormals("flat")
map_neighborhood_new.attachHitbox(new hitbox("mesh"))
map_neighborhood_newMaterial.filteringMode = "nearest"
map_neighborhood_newMaterial.loadTextures()*/

let lastSecond = new Date().getTime() / 1000
let lastTick = new Date().getTime() / 1000

let sunDirection = 0

function tick() {
    let deltaTime = (new Date().getTime() / 1000) - lastTick
    lastTick = new Date().getTime() / 1000

    if (new Date().getTime() / 1000 - lastSecond >= 1) {
        console.log("FPS: " + FPSCounter)
        FPSCounter = 0
        lastSecond = new Date().getTime() / 1000
    }

    let ambientC = hexToRgb(document.getElementById("ambient").value)
    let direcC = hexToRgb(document.getElementById("directional").value)
    //renderer.setAmbientLightColor([ambientC[0],ambientC[1],ambientC[2]])
    //renderer.clearColor = [direcC[0],direcC[1],direcC[2],1]
    //renderer.setDirectionalLightColor([direcC[0],direcC[1],direcC[2]])
    //renderer.setDirectionalLightColor([1 - ambientC[0],1 - ambientC[1],1 - ambientC[2]])

    sunDirection = sunDirection + 0.01 % degToRad(360)

    let newDir = moveVectorForward([0,0],1,sunDirection)
    //renderer.setDirectionalLightDirection([newDir[0],-1,newDir[1]])
    //sunMesh.pos = [newDir[0] * sunDistance,0.8 * sunDistance,newDir[1] * sunDistance]

    //move meshes
    parasol.rotation[0] += 0.01
    parasol.rotation[1] += 0.01
    parasol.rotation[2] += 0.01
    flatCube.rotation[0] += 0.01
    flatCube.rotation[1] += 0.01
    flatCube.rotation[2] += 0.01
    smoothCube.rotation[0] += 0.01
    smoothCube.rotation[1] += 0.01
    smoothCube.rotation[2] += 0.01
    uvSphere.rotation[0] += 0.01
    uvSphere.rotation[1] += 0.01
    uvSphere.rotation[2] += 0.01
    smoothUvSphere.rotation[0] += 0.01
    smoothUvSphere.rotation[1] += 0.01
    smoothUvSphere.rotation[2] += 0.01
    //concretePlane.pos[0] += 0.01
    //pbrRockMesh.rotation[1] = pbrRockMesh.rotation[1] + 0.01 % degToRad(360)

    //hitboxes
    parasol.updateHitbox()
    flatCubeHitbox.calculateMeshBox()
    smoothCubeHitbox.calculateMeshBox()

    //pointLightTest.pos = SelfPlayer.pos
    //pointLightTest.update()

    //pointLightTest2.pos = SelfPlayer.pos
    pointLightTest2.pos[1] = pointLightTest2.pos[1] - 0.01
    pointLightVisualization.pos = pointLightTest2.pos
    //pointLightTest2.pos = SelfPlayer.pos
    //pointLightTest2.update()

    //rendering

    //performance test
    /*for (let i = 0; i < 10; i++) {
        ArtisansHitbox.calculateMeshBox()
    }*/

    /*if (flatCubeHitbox.collidesWith(smoothCubeHitbox)) {
        //console.log("theyre colliding!")
    }*/
    //flatCubeHitbox.visualizeMeshBox()
    //smoothCubeHitbox.visualizeMeshBox()
    //parasol.hitbox.visualizeMeshBox()
    
    //render meshes
    if (renderer.shadowsEnabled & FPSCounter % 20 === 0) {
        renderer.lastShadowRenderCameraMatrix = renderer.cameraMatrix
        renderer.isShadowMap = true
        renderer.perspective = false
        renderer.newFrame()
        
        for (let i = 0; i < allMeshes.length; i++) {
            allMeshes[i].renderMesh()
        }
    }

    SelfPlayer.tickUpdate(deltaTime)

    renderer.isShadowMap = false
    renderer.perspective = true
    renderer.newFrame()
    
    for (let i = 0; i < allMeshes.length; i++) {
        allMeshes[i].renderMesh()
    }
    

    /*renderer.isShadowMap = true
    renderer.perspective = false
    renderer.newFrame()
    
    for (let i = 0; i < allMeshes.length; i++) {
        allMeshes[i].renderMesh()
    }*/

    /*for (let i = 0; i < 50; i++) {
        ArtisansHub.renderMesh()
    }*/
    
    FPSCounter += 1
    window.requestAnimationFrame(tick)
}

window.requestAnimationFrame(tick)