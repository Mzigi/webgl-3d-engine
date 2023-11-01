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

//prevent page jump
window.addEventListener('keydown', ev => {
    if (['ArrowDown', 'ArrowUp', ' '].includes(ev.key)) {
        ev.preventDefault();
    }
});
window.addEventListener('wheel', ev => ev.preventDefault(), { passive: false });

let AllLogs = []
let LogCount = 0

let proximityPromptAlreadyUsed = false

let SelfPlayer = new Player([21.75,12,-66.25])
SelfPlayer.rotationY = degToRad(180)
SelfPlayer.pos = [5.003319722126915, 8.004021903673507, -2.77568673353557]

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
//renderer.setAmbientLightColor([0.,0.,0.05])
//renderer.setDirectionalLightColor([0.01,0.01,0.01])
//renderer.clearColor = [0,0,0,1]

renderer.setAmbientLightColor([100 / 255, 132 / 255, 182 / 255])
renderer.setDirectionalLightColor([(255-100) / 255, (255-132) / 255, (255-182) / 255])

renderer.setDirectionalLightDirection([-0.2,-1,-0.25])
renderer.clearColor = [0.258,0.529,0.960,1]

//alternate new lighting
/*renderer.setAmbientLightColor([40 / 255, 72 / 255, 122 / 255])
renderer.setDirectionalLightColor([(255-40) / 255 * 1.2, (255-72) / 255 * 1.2, (255-122) / 255 * 1.2])
renderer.setDirectionalLightDirection([-0.2,-1,-0.25])
renderer.clearColor = [0.258,0.529,0.960,1]*/

//old lighting
/*renderer.setAmbientLightColor([0.23, 0.23, 0.26])
renderer.setDirectionalLightColor([0.9, 0.9, 0.9])
renderer.setDirectionalLightDirection([-0.2, -1, -0.25])
renderer.clearColor = [0.258,0.529,0.960,1]*/

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

let uvSphere = new mesh("assets/models/low-poly-ico-sphere.obj",ShinyMaterial,[0,2,0])
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
ArtisansMaterial.filteringMode = "nearest"
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
concreteMaterial.specularStrength = 1
concreteMaterial.loadTextures()

let pixelConcreteMaterial = new material("assets/textures/concretePixel_diffuse.png")
pixelConcreteMaterial.normal = "assets/textures/concretePixel_normal.png"
/*concreteMaterial.specular = "assets/textures/concrete_specular.jpg"
concreteMaterial.ao = "assets/textures/concrete_ao.jpg"*/
pixelConcreteMaterial.specularShininess = 8
pixelConcreteMaterial.specularStrength = 0.5
pixelConcreteMaterial.filteringMode = "nearest"
pixelConcreteMaterial.loadTextures()

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
concretePlane.visible = true
concretePlane.attachHitbox(new hitbox("box"))
concretePlane.updateHitbox()

let buildingTestMaterial = new material("assets/textures/buildingTest.png")
buildingTestMaterial.filteringMode = "nearest"
buildingTestMaterial.loadTextures()

/*let buildingTest = new mesh("assets/models/buildingTest.obj", buildingTestMaterial, [0,0,26])
buildingTest.scale = [32,32,32]
buildingTest.buildNormals("flat")
buildingTest.attachHitbox(new hitbox("box"))
buildingTest.visible = true
buildingTest.updateHitbox()*/

//let pointLightTest = new pointLight([0,5,0],1000,3200000)
let pointLightTest2 = new pointLight([0.5,1000,-3.5],1)
pointLightTest2.linear = 0.07
pointLightTest2.quadratic = 0.017

pointLightTest2.update()

let pointLightVisualization = new mesh("assets/models/ico-sphere.obj", concreteMaterial, [0.5,10,-3.5])
pointLightVisualization.scale = [0.1,0.1,0.1]

//lamp
let lampMaterial = new material("assets/textures/lamp.png")
lampMaterial.filteringMode = "nearest"
lampMaterial.loadTextures()

let lamp = new mesh("assets/models/lamp.obj", lampMaterial, [0,0,-30])
lamp.buildNormals("smooth")
lamp.attachHitbox(new hitbox("box"))
lamp.updateHitbox()

//lamp point light
/*let lampLight = new pointLight([0,0,-30],0.5)
lampLight.linear = 0.07
lampLight.quadratic = 0.017
lampLight.update()*/

//platform
let platform = new mesh("assets/models/monster.obj", concreteMaterial, [21.150699016920097, -4, -43.03165522083942])
platform.scale = [2,2,2]
platform.buildNormals("flat")
platform.attachHitbox(new hitbox("box"))
platform.updateHitbox()

//player point light
let playerLight = new pointLight(SelfPlayer.pos, 1)
playerLight.linear = 0.3
playerLight.quadratic = 0.2
playerLight.update()

//campfire
let campfireMaterial = new material("assets/textures/Campfire_diffuse.jpeg")
campfireMaterial.normal = "assets/textures/Campfire_normal.jpeg"
campfireMaterial.specular = "assets/textures/Campfire_specular.png"
campfireMaterial.specularStrength = 0.5
campfireMaterial.specularShininess = 8
campfireMaterial.loadTextures()

let campfire = new mesh("assets/models/Campfire.obj", campfireMaterial, [21.75,4,-58.25])
campfire.buildNormals("smooth")
campfire.attachHitbox(new hitbox("box"))
campfire.updateHitbox()

let CampfireLightColor = [255,174,0]

let CampfireBrightness = 1

let campfireLight = new pointLight([campfire.pos[0],campfire.pos[1] + 1,campfire.pos[2]], CampfireBrightness)
campfireLight.linear = 0.07
campfireLight.quadratic = 0.017
campfireLight.lightColor = CampfireLightColor
campfireLight.specularColor = CampfireLightColor
campfireLight.update()

let campfireLightVisualization = new mesh("assets/models/ico-sphere.obj", concreteMaterial, [0.5,10,-3.5])
campfireLightVisualization.scale = [0.1,0.1,0.1]

let totalCampfireLitTime = 0

//Logs
let LogPositions = [
    [9.237895559785064, 6.884831579526229, -20.21278060763269],
    [17.40097302369404, -0.4250136653584174, -105.61244744564762],
    [-20.808140974999212, 7.796479566891784, -95.92213550907194],
    [-25.687025248399728, 0.6883930563924909, -54.38293769650981],
    [-39.578529961220546, -0.6569470326107665, -10.195271838325379],
    //[-97.73775305157673, -3.004692550500369, 41.784039762939926],
    [37.25543082039705, 0.8387209335960868, -3.037108273363996],
    [65.26987566611712, 1.343380661805259, -16.55131644716542],
    [49.74208649294476, 1.3458855350810621, -66.1805151540833],
    //[61.96681629969152, 0.00938094456972794, -115.26977075761928],
    //[25.08109938063365, 8.543295143444944, -133.15358539576235],
    [-14.898964660298953, 0.3105316543575267, -53.758861703443934],
    [9.207774888019209, -0.7353762563073848, 4.75448620452687],
    [39.56481988962739, -1.04228958845181, 34.734122012136694],
    [23.417821284994478, 2.832076843579723, -14.035512330682659],
    [46.88511198994898, -0.9706749081610083, -51.65410863283219],
    [22.600513708009384, 2.262735740343957, -76.40906307120642],
    [-6.599481651257779, 0.20056522687307665, -59.26672752096214],
    [6.142308919769887, -0.09686170816391709, -121.29810040031089],
    [53.46803994270293, 1.1783083836240384, -106.04450875020146],
    [102.75180584736125, -1.0546878973640204, -82.13079861488019]
]

let logMaterial = new material("assets/textures/Log_diffuse.jpeg")
logMaterial.normal = "assets/textures/Log_normal.jpeg"
logMaterial.specular = "assets/textures/Log_specular.jpeg"
logMaterial.ao = "assets/textures/Log_ao.jpeg"
logMaterial.specularShininess = 8
logMaterial.specularStrength = 0.5
logMaterial.loadTextures()

let timeSinceLastLogSpawn = 0
let logSpawnTimeCooldown = 7

//Log functions
function SpawnLog(pos) {
    let newY = pos[1] - 3.5
    let logMesh = new mesh("assets/models/Log.obj", logMaterial, [pos[0],newY,pos[2]])
    logMesh.rotation = [0,Math.random() * 3.14,0]
    logMesh.buildNormals("smooth")
    logMesh.attachHitbox(new hitbox("mesh"))
    logMesh.updateHitbox()

    AllLogs.push(logMesh)
}

function GetClosestLog() {
    let lastDistance = 12
    let closestLog = null

    for (let i = 0; i < AllLogs.length; i++) {
        if (getDistance(AllLogs[i].pos, SelfPlayer.pos) < lastDistance) {
            lastDistance = getDistance(AllLogs[i].pos, SelfPlayer.pos)
            closestLog = AllLogs[i]
        }
    }

    return closestLog
}

function SpawnLogAtRandomPos() {
    console.log("spawning log..")
    let randomNum = Math.random() * LogPositions.length
    randomNum = Math.max(0,randomNum - 0.01)
    randomNum = Math.floor(randomNum)

    let pos = LogPositions[randomNum]
    SpawnLog(pos)
}

//SpawnLog([9.237895559785064, 6.884831579526229, -20.21278060763269])

//monster
/*let monsterMaterial = new material("assets/textures/scaryFace.png")
monsterMaterial.specularShininess = 8
monsterMaterial.specularStrength = 0
monsterMaterial.loadTextures()

let monsterMesh = new mesh("assets/models/monster.obj", monsterMaterial, [20,0,0])
monsterMesh.buildNormals("flat")
monsterMesh.attachHitbox(new hitbox("box"))
monsterMesh.updateHitbox()*/


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

    //thunder
    /*if (totalThunderTime >= requiredThunderTime) {
        if (!thunderHasFlashed) {
            thunderHasFlashed = true
            thunderLight.pos = [0,0,0]
            thunderLight.update()
        }
        if (totalThunderTime >= (requiredThunderTime + 0.3) && totalThunderTime < (requiredThunderTime + 0.4)) {
            console.log("removing light")
            thunderLight.pos = [0,999999,0]
            thunderLight.update()
        }
        if (totalThunderTime >= (requiredThunderTime + 0.4) && totalThunderTime < (requiredThunderTime + 0.5)) {
            thunderHasFlashed = true
            thunderLight.pos = [0,0,0]
            thunderLight.update()
        }
        if (totalThunderTime >= (requiredThunderTime + 0.5)) {
            console.log("removing light")
            thunderLight.pos = [0,999999,0]
            thunderLight.update()
        }

        if (totalThunderTime >= requiredThunderTime + Math.random() * 4 + 0.5) {
            let randomSound = Math.random() * 3
            console.log(randomSound)
            if (randomSound > 0 && randomSound <= 1) {
                console.log(1)
                thunderSound1.play()
            } else if (randomSound > 1 && randomSound <= 2) {
                console.log(2)
                thunderSound2.play()
            } else if (randomSound > 2) {
                console.log(3)
                thunderSound3.play()
            }

            thunderHasFlashed = false
            requiredThunderTime = 30 + Math.random() * 40
            totalThunderTime = 0
        }
    }*/

    let ambientC = hexToRgb(document.getElementById("ambient").value)
    let direcC = hexToRgb(document.getElementById("directional").value)
    //renderer.setAmbientLightColor([ambientC[0],ambientC[1],ambientC[2]])
    //renderer.clearColor = [direcC[0],direcC[1],direcC[2],1]
    //renderer.setDirectionalLightColor([direcC[0],direcC[1],direcC[2]])
    //renderer.setDirectionalLightColor([1 - ambientC[0],1 - ambientC[1],1 - ambientC[2]])

    sunDirection = sunDirection + 0.01 % degToRad(360)

    //campfire
    let brightnessToRemove = 0.015 + (CampfireBrightness * 0.005)
    
    //CampfireBrightness -= brightnessToRemove * deltaTime
    CampfireBrightness = Math.min(CampfireBrightness,1)
    CampfireBrightness = Math.max(CampfireBrightness,0)
    document.getElementById("campfire-brightness").innerText = "Campfire Health: " + Math.floor(CampfireBrightness * 100) + "%"
    campfireLight.lightColor = [CampfireLightColor[0] * CampfireBrightness, CampfireLightColor[1] * CampfireBrightness, CampfireLightColor[2] * CampfireBrightness]
    if (CampfireBrightness <= 0) {
        SelfPlayer.frozen = true
        document.getElementById("wood-count").hidden = true
        document.getElementById("wood-image").hidden = true
        document.getElementById("score-display").innerText = "Time Survived: " + Math.floor(totalCampfireLitTime * 10) / 10 + "s"
        document.getElementById("score-display").hidden = false
        document.getElementById("retry").hidden = false
    } else {
        totalCampfireLitTime += deltaTime
    }

    //log picking up
    let logToTake = GetClosestLog()
    if (logToTake && !proximityPromptAlreadyUsed) {
        proximityPromptAlreadyUsed = true
        document.getElementById("proximity-prompt").hidden = false
        document.getElementById("proximity-prompt").innerText = "Pick up (E)"
        if (keyPressStarted("e")) {
            logToTake.visible = false
            logToTake.hitbox = null
            logToTake.delete()
            let index = AllLogs.indexOf(logToTake)
            AllLogs.splice(index, 1)
            LogCount++
        }
    } else {
        document.getElementById("proximity-prompt").hidden = true
    }
    document.getElementById("wood-count").innerText = LogCount

    //campfire add wood
    if (!proximityPromptAlreadyUsed && getDistance(campfire.pos, SelfPlayer.pos) < 12 && LogCount > 0) {
        proximityPromptAlreadyUsed = true
        document.getElementById("proximity-prompt").hidden = false
        document.getElementById("proximity-prompt").innerText = "Add wood (E)"
        if (keyPressStarted("e")) {
            CampfireBrightness += 0.25
            LogCount--
        }
    } else if (!proximityPromptAlreadyUsed) {
        document.getElementById("proximity-prompt").hidden = true
    }

    //logs easier to find if youre about to lose
    //logMaterial.specularStrength = 15 + (1 - (CampfireBrightness + LogCount * 0.15)) * 10


    let newDir = moveVectorForward([0,0],0.5,sunDirection)
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
    if (renderer.shadowsEnabled & FPSCounter % 2 === 0) {
        renderer.lastShadowRenderCameraMatrix = renderer.cameraMatrix
        renderer.isShadowMap = true
        renderer.perspective = false
        renderer.newFrame()
        
        for (let i = 0; i < allMeshes.length; i++) {
            allMeshes[i].renderMesh()
        }
    } else if (!renderer.shadowsEnabled) {
        renderer.lastShadowRenderCameraMatrix = webGLextra.m4.translation(999999,0,999999)
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