let PressedKeys = {
    "w" : false,
    "a" : false,
    "s" : false,
    "d" : false,
    "ArrowUp": false,
    "ArrowRight": false,
    "ArrowDown": false,
    "ArrowLeft": false,
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

function radToDeg(r) {
    return r * 180 / Math.PI;
}

function degToRad(d) {
    return d * Math.PI / 180;
}

let Player = {
    "pos": [0,3,0],
    "rotationY": 0,
    "rotationX": 0,
}

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

let totalFrames = 0

//lighting
renderer.setAmbientLightColor([0.23,0.23,0.26])
renderer.setDirectionalLightColor([0.9,0.9,0.9])
renderer.setDirectionalLightDirection([-0.2,-1,-0.25])

//test mesh
/*let cube = webGLextra.meshBuilder.createCube([2000,1,2000])
let cubeMesh = new mesh(cube, "assets/textures/snow.png", [-1000,-1,-1000])
cubeMesh.buildNormals("flat")

let terrainTest = new mesh("assets/models/terrainTest.obj","assets/textures/snow.png", [0,0,0])
terrainTest.buildNormals("smooth")*/

//primitive materials
let ShinyMaterial = new material("assets/textures/snow.png")
ShinyMaterial.specularShininess = 8
ShinyMaterial.specularStrength = 0.3

//parasol
let ParasolMaterial = new material("assets/textures/parasol.png")
ParasolMaterial.loadTextures()

let parasol = new mesh("assets/models/parasol.obj",ParasolMaterial, [-6,2,0])
parasol.buildNormals("smooth")

let ParasolHitbox = new hitbox("box")
ParasolHitbox.mesh = parasol

//primitives

//flat
let uvSphere = new mesh("assets/models/uv-sphere.obj",ShinyMaterial,[0,2,0])
uvSphere.buildNormals("flat")

let flatCube = new mesh(webGLextra.meshBuilder.createCube([2,2,2]), "assets/textures/snow.png",[6,2,-1])
flatCube.buildNormals("flat")
flatCube.origin = [-1,-1,-1]

let flatCubeHitbox = new hitbox("box")
flatCubeHitbox.mesh = flatCube
flatCube.hitbox = flatCubeHitbox

//smooth
let smoothUvSphere = new mesh("assets/models/uv-sphere.obj",ShinyMaterial,[3,2,0])
smoothUvSphere.buildNormals("smooth")

let smoothCube = new mesh(webGLextra.meshBuilder.createCube([2,2,2]), "assets/textures/snow.png",[9,2,-1])
smoothCube.buildNormals("smooth")
smoothCube.origin = [-1,-1,-1]

let smoothCubeHitbox = new hitbox("box")
smoothCubeHitbox.mesh = smoothCube
smoothCube.hitbox = smoothCubeHitbox

//artisans
let ArtisansMaterial = new material("assets/textures/High.png")
ArtisansMaterial.specularStrength = 0
ArtisansMaterial.loadTextures()

let ArtisansHub = new mesh("assets/models/Artisans_Hub.obj", ArtisansMaterial,[0,0,0])
ArtisansHub.buildNormals("smooth")

let ArtisansHitbox = new hitbox("box")
ArtisansHitbox.mesh = ArtisansHub
ArtisansHub.hitbox = ArtisansHitbox

function tick() {
    //controls
    if (PressedKeys["s"]) {
        let newVec2 = moveVectorForward([Player.pos[0],Player.pos[2]], -0.2, Player.rotationY + degToRad(90))
        Player.pos = [newVec2[0],Player.pos[1],newVec2[1]]
    }
    if (PressedKeys["w"]) {
        let newVec2 = moveVectorForward([Player.pos[0],Player.pos[2]], 0.2, Player.rotationY + degToRad(90))
        Player.pos = [newVec2[0],Player.pos[1],newVec2[1]]
    }
    if (PressedKeys["a"]) {
        let newVec2 = moveVectorForward([Player.pos[0],Player.pos[2]], -0.2, Player.rotationY)
        Player.pos = [newVec2[0],Player.pos[1],newVec2[1]]
    }
    if (PressedKeys["d"]) {
        let newVec2 = moveVectorForward([Player.pos[0],Player.pos[2]], 0.2, Player.rotationY)
        Player.pos = [newVec2[0],Player.pos[1],newVec2[1]]
    }
    if (PressedKeys["ArrowLeft"]) {
        Player.rotationY = Player.rotationY + degToRad(3)
    }
    if (PressedKeys["ArrowRight"]) {
        Player.rotationY = Player.rotationY - degToRad(3)
    }
    if (PressedKeys["ArrowUp"]) {
        Player.rotationX = Player.rotationX + degToRad(3)
    }
    if (PressedKeys["ArrowDown"]) {
        Player.rotationX = Player.rotationX - degToRad(3)
    }

    renderer.cameraMatrix = webGLextra.m4.xRotate(webGLextra.m4.yRotate(webGLextra.m4.translation(Player["pos"][0],Player["pos"][1],Player["pos"][2]),Player["rotationY"]),Player.rotationX)

    /*if (PressedKeys["s"]) {
        PlayerMatrix = webGLextra.m4.translate(PlayerMatrix, 0,0,0.2)
        renderer.cameraMatrix = webGLextra.m4.translate(renderer.cameraMatrix,0,0,0.2)
    }
    if (PressedKeys["w"]) {
        PlayerMatrix = webGLextra.m4.translate(PlayerMatrix, 0,0,-0.2)
        renderer.cameraMatrix = webGLextra.m4.translate(renderer.cameraMatrix,0,0,-0.2)
    }
    if (PressedKeys["a"]) {
        PlayerMatrix = webGLextra.m4.translate(PlayerMatrix,-0.2,0,0)
        renderer.cameraMatrix = webGLextra.m4.translate(renderer.cameraMatrix,-0.2,0,0)
    }
    if (PressedKeys["d"]) {
        PlayerMatrix = webGLextra.m4.translate(PlayerMatrix, 0.2,0,0)
        renderer.cameraMatrix = webGLextra.m4.translate(renderer.cameraMatrix,0.2,0,0)
    }
    if (PressedKeys["ArrowLeft"]) {
        renderer.cameraMatrix = webGLextra.m4.yRotate(renderer.cameraMatrix, degToRad(3))
    }
    if (PressedKeys["ArrowRight"]) {
        renderer.cameraMatrix = webGLextra.m4.yRotate(renderer.cameraMatrix, degToRad(-3))
    }
    if (PressedKeys["ArrowUp"]) {
        renderer.cameraMatrix = webGLextra.m4.xRotate(renderer.cameraMatrix, degToRad(3))
    }
    if (PressedKeys["ArrowDown"]) {
        renderer.cameraMatrix = webGLextra.m4.xRotate(renderer.cameraMatrix, degToRad(-3))
    }*/

    //rendering
    renderer.newFrame([0.258,0.529,0.960,1])

    //render meshes
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

    //hitboxes
    ParasolHitbox.calculateMeshBox()
    flatCubeHitbox.calculateMeshBox()
    smoothCubeHitbox.calculateMeshBox()

    //performance test
    /*for (let i = 0; i < 10; i++) {
        ArtisansHitbox.calculateMeshBox()
    }*/

    if (flatCubeHitbox.collidesWith(smoothCubeHitbox)) {
        console.log("theyre colliding!")
    }
    //flatCubeHitbox.visualizeMeshBox()
    //smoothCubeHitbox.visualizeMeshBox()
    ParasolHitbox.visualizeMeshBox()
    
    //render meshes
    for (let i = 0; i < allMeshes.length; i++) {
        allMeshes[i].renderMesh()
    }
    
    totalFrames += 1
    window.requestAnimationFrame(tick)
}

window.requestAnimationFrame(tick)