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
        this.falling = true
        this.frozen = false

        //player stats
        this.walkSpeed = 12
        this.slopeHeight = 12
        this.jumpPower = 0.3

        //hitbox stuff
        let PlayerMaterial = new material("assets/textures/red.png")

        this.PlayerMesh = new mesh("assets/models/Player.obj", PlayerMaterial, pos)
        this.PlayerMesh.visible = false
        this.PlayerMesh.origin = [0,-2,0]
        this.PlayerMesh.pos = [0,8,0]

        let PlayerHitbox = new hitbox("mesh")
        this.PlayerMesh.attachHitbox(PlayerHitbox)

        //sounds
        this.sounds = {
            //"footsteps": new audioPlayer("assets/audio/footsteps.mp3")
            "footsteps": new Audio("assets/audio/footsteps2.wav"),
            "jump": new Audio("assets/audio/jump.mp3")
        }

        this.sounds.footsteps.loop = true
        this.sounds.footsteps.playbackRate = 1.25

        this.sounds.jump.volume = 0.5
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

        let currentWalkSpeed = this.walkSpeed
        let keysPressedCount = 0

        //controls
        if (isKeyPressed("s")) {
            let newVec2 = moveVectorForward([NewPlayerPos[0],NewPlayerPos[2]], -currentWalkSpeed * deltaTime, this.rotationY + degToRad(90))
            NewPlayerPos = [newVec2[0],NewPlayerPos[1],newVec2[1]]
            keysPressedCount++
        }
        if (keysPressedCount > 0) {
            currentWalkSpeed = Math.sqrt(this.walkSpeed*this.walkSpeed+this.walkSpeed*this.walkSpeed) / 2
        }
        if (isKeyPressed("w")) {
            let newVec2 = moveVectorForward([NewPlayerPos[0],NewPlayerPos[2]], currentWalkSpeed * deltaTime, this.rotationY + degToRad(90))
            NewPlayerPos = [newVec2[0],NewPlayerPos[1],newVec2[1]]
            keysPressedCount++
        }
        if (keysPressedCount > 0) {
            currentWalkSpeed = Math.sqrt(this.walkSpeed*this.walkSpeed+this.walkSpeed*this.walkSpeed) / 2
        }
        if (isKeyPressed("a")) {
            let newVec2 = moveVectorForward([NewPlayerPos[0],NewPlayerPos[2]], -currentWalkSpeed * deltaTime, this.rotationY)
            NewPlayerPos = [newVec2[0],NewPlayerPos[1],newVec2[1]]
            keysPressedCount++
        }
        if (keysPressedCount > 0) {
            currentWalkSpeed = Math.sqrt(this.walkSpeed*this.walkSpeed+this.walkSpeed*this.walkSpeed) / 2
        }
        if (isKeyPressed("d")) {
            let newVec2 = moveVectorForward([NewPlayerPos[0],NewPlayerPos[2]], currentWalkSpeed * deltaTime, this.rotationY)
            NewPlayerPos = [newVec2[0],NewPlayerPos[1],newVec2[1]]
        }
        /*if (isKeyPressed("Shift")) {
            renderer.fov = 90
            this.walkSpeed = 16
        } else {
            renderer.fov = 75
            this.walkSpeed = 12
        }*/

        if (NewPlayerPos[0] === this.pos[0] && NewPlayerPos[1] === this.pos[1] && NewPlayerPos[2] === this.pos[2]) {
            this.sounds.footsteps.pause()
        } else {
            this.sounds.footsteps.play()
        }

        return NewPlayerPos
    }

    tryMoveTo(pos) {
        let moved = false

        if (pos[1] && !this.collidesAt([this.pos[0],pos[1],this.pos[2]])) {
            this.pos[1] = pos[1]
            moved = true
        }
        if (pos[0] && !this.collidesAt([pos[0],this.pos[1],this.pos[2]])) {
            this.pos[0] = pos[0]
            moved = true
        }
        if (pos[2] && !this.collidesAt([this.pos[0],this.pos[1],pos[2]])) {
            this.pos[2] = pos[2]
            moved = true
        }

        return moved
    }

    updateFalling(deltaTime, precision) {
        this.velocityY = Math.max(this.velocityY - 1 * deltaTime,-1)
        let fellDown = false
        let moved = this.tryMoveTo([null,this.pos[1] + this.velocityY,null])
        if (!moved) {
            for (let i = 0; i < precision; i++) {
                if (!this.tryMoveTo([null,this.pos[1] + this.velocityY / precision,null])) {
                    i = precision
                }
            }
            if (this.velocityY < -0.2) {
                this.velocityY = -0.2
            } else {
                this.velocityY = -0.19
            }
        } else {
            fellDown = true
        }

        this.falling = fellDown

        return fellDown
    }

    jump() {
        if (isKeyPressed(" ") && this.velocityY <= -0.2 && !this.falling) {
            this.velocityY = this.jumpPower
            this.sounds.jump.currentTime = 0.1
            this.sounds.jump.play()
        }
    }

    updateRendererCamera() {
        renderer.cameraMatrix = webGLextra.m4.xRotate(webGLextra.m4.yRotate(webGLextra.m4.translation(this.pos[0],this.pos[1],this.pos[2]),this.rotationY),this.rotationX)
    }

    tickUpdate(deltaTime) {
        if (!this.frozen) {
            this.updateRotation(deltaTime)
            let attemptPos = this.getNewMovementPos(deltaTime)

            let originalHeight = this.pos[1]
            if (!this.tryMoveTo([attemptPos[0], null, null])) {
                this.tryMoveTo([attemptPos[0], originalHeight + this.slopeHeight * deltaTime, null])
            }

            if (!this.tryMoveTo([null, null, attemptPos[2]])) {
                this.tryMoveTo([null, originalHeight + this.slopeHeight * deltaTime, attemptPos[2]])
            }
            
            if (!this.updateFalling(deltaTime,12)) {
                this.jump()
            }
        } else {
            this.sounds.footsteps.pause()
        }

        this.updateRendererCamera()
    }
}