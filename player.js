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

function radToDeg(r) {
    return r * 180 / Math.PI;
}

function degToRad(d) {
    return d * Math.PI / 180;
}

class Player {
    constructor(pos) {
        this.pos = pos
        this.rotationX = 0
        this.rotationY = 0
        this.velocityY = 0

        this.walkSpeed = 12
        this.slopeHeight = 12

        let PlayerMaterial = new material("assets/textures/red.png")

        this.PlayerMesh = new mesh("assets/models/Player.obj", PlayerMaterial, pos)
        this.PlayerMesh.visible = true
        this.PlayerMesh.origin = [0,-1,0]
        this.PlayerMesh.pos = [0,8,0]

        let PlayerHitbox = new hitbox("mesh")
        this.PlayerMesh.attachHitbox(PlayerHitbox)
    }

    collidesAt(pos) {
        this.PlayerMesh.pos = pos
        this.PlayerMesh.updateHitbox()

        for (let i = 0; i < allMeshes.length; i++) {
            if (allMeshes[i] !== this.PlayerMesh && allMeshes[i].hitbox && this.PlayerMesh.hitbox.collidesWith(allMeshes[i].hitbox)) {
                return true
            }            
        }

        return false
    }

    updateRotation(deltaTime) {
        if (isKeyPressed("ArrowLeft")) {
            this.rotationY = (this.rotationY + degToRad(180) * deltaTime) % degToRad(360)
        }
        if (isKeyPressed("ArrowRight")) {
            this.rotationY = (this.rotationY - degToRad(180) * deltaTime) % degToRad(360)
        }
        if (isKeyPressed("ArrowUp")) {
            this.rotationX = Math.min(this.rotationX + degToRad(180) * deltaTime, 1.5708)
        }
        if (isKeyPressed("ArrowDown")) {
            this.rotationX = Math.max(this.rotationX - degToRad(180) * deltaTime, -1.5708)
        }
    }

    getNewMovementPos(deltaTime) {
        let NewPlayerPos = [this.pos[0],this.pos[1],this.pos[2]]

        //controls
        if (isKeyPressed("s")) {
            let newVec2 = moveVectorForward([NewPlayerPos[0],NewPlayerPos[2]], -this.walkSpeed * deltaTime, this.rotationY + degToRad(90))
            NewPlayerPos = [newVec2[0],NewPlayerPos[1],newVec2[1]]
        }
        if (isKeyPressed("w")) {
            let newVec2 = moveVectorForward([NewPlayerPos[0],NewPlayerPos[2]], this.walkSpeed * deltaTime, this.rotationY + degToRad(90))
            NewPlayerPos = [newVec2[0],NewPlayerPos[1],newVec2[1]]
        }
        if (isKeyPressed("a")) {
            let newVec2 = moveVectorForward([NewPlayerPos[0],NewPlayerPos[2]], -this.walkSpeed * deltaTime, this.rotationY)
            NewPlayerPos = [newVec2[0],NewPlayerPos[1],newVec2[1]]
        }
        if (isKeyPressed("d")) {
            let newVec2 = moveVectorForward([NewPlayerPos[0],NewPlayerPos[2]], this.walkSpeed * deltaTime, this.rotationY)
            NewPlayerPos = [newVec2[0],NewPlayerPos[1],newVec2[1]]
        }

        return NewPlayerPos
    }

    tryMoveTo(pos) {
        if (!this.collidesAt([pos[0],this.pos[1],this.pos[2]])) {
            this.pos[0] = pos[0]
        }
        if (!this.collidesAt([this.pos[0],pos[1],pos[2]])) {
            this.pos[1] = pos[1]
        }
        if (!this.collidesAt([this.pos[0],this.pos[1],pos[2]])) {
            this.pos[2] = pos[2]
        }
    }

    updateRendererCamera() {
        renderer.cameraMatrix = webGLextra.m4.xRotate(webGLextra.m4.yRotate(webGLextra.m4.translation(this.pos[0],this.pos[1],this.pos[2]),this.rotationY),this.rotationX)
    }

    tickUpdate(deltaTime) {
        this.updateRotation(deltaTime)
        let attemptPos = this.getNewMovementPos(deltaTime)
        this.tryMoveTo(attemptPos)
        this.updateRendererCamera()
    }
}