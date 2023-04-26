class hitbox {
    constructor(highLevelHitboxType) { //hitbox types, mesh, box, sphere
        //hitboxes
        this.lowHitbox = "box"
        this.hitbox = highLevelHitboxType

        //mesh info
        this.mesh = null
        this.meshBox = [1,1,1]

        //aabb/box properties
        this.minX = null
        this.maxX = null

        this.minY = null
        this.maxY = null

        this.minZ = null
        this.maxZ = null
    }

    calculateMeshBox() {
        let minX = null
        let maxX = null

        let minY = null
        let maxY = null

        let minZ = null
        let maxZ = null

        if (this.mesh) {
            if (this.mesh.mesh) {
                let meshMatrix = webGLextra.m4.translation(this.mesh.pos[0],this.mesh.pos[1],this.mesh.pos[2])
                meshMatrix = webGLextra.m4.xRotate(meshMatrix, this.mesh.rotation[0])
                meshMatrix = webGLextra.m4.yRotate(meshMatrix, this.mesh.rotation[1])
                meshMatrix = webGLextra.m4.zRotate(meshMatrix, this.mesh.rotation[2])
                meshMatrix = webGLextra.m4.translate(meshMatrix, this.mesh.origin[0],this.mesh.origin[1],this.mesh.origin[2])
                meshMatrix = webGLextra.m4.scale(meshMatrix, this.mesh.scale[0], this.mesh.scale[1], this.mesh.scale[2])

                let geometry = this.mesh.mesh.geometry
                let vertexCount = geometry.length / 3
                for (let i = 0; i < vertexCount; i++) {
                    let vertex = webGLextra.m4.multiplyWith(meshMatrix,[geometry[i * 3+0],geometry[i * 3+1],geometry[i * 3+2]])
                    if (!minX) {
                        minX = vertex[0]
                        maxX = vertex[0]

                        minY = vertex[1]
                        maxY = vertex[1]

                        minZ = vertex[2]
                        maxZ = vertex[2]
                    } else {
                        minX = Math.min(minX, vertex[0])
                        maxX = Math.max(maxX, vertex[0])

                        minY = Math.min(minY, vertex[1])
                        maxY = Math.max(maxY, vertex[1])

                        minZ = Math.min(minZ, vertex[2])
                        maxZ = Math.max(maxZ, vertex[2])
                    }
                }
            } else {
                console.warn("Mesh not loaded yet, cannot calculate meshBox")
            }
        } else {
            console.warn("Mesh not set, cannot calculate meshBox")
        }

        if (minX) {
            this.minX = minX
            this.maxX = maxX

            this.minY = minY
            this.maxY = maxY

            this.minZ = minZ
            this.maxZ = maxZ
        }
    }

    collidesWith(otherHitbox) {
        let colliding = false

        if (this.lowHitbox == "box" && otherHitbox.lowHitbox == "box") { //aabb vs aabb
            if (otherHitbox.minX) {
                colliding =
                this.minX <= otherHitbox.maxX &&
                this.maxX >= otherHitbox.minX &&
                this.minY <= otherHitbox.maxY &&
                this.maxY >= otherHitbox.minY &&
                this.minZ <= otherHitbox.maxZ &&
                this.maxZ >= otherHitbox.minZ
            } else {
                colliding = false
            }
        }

        return colliding
    }

    visualizeMeshBox() {
        let sizeX = this.maxX - this.minX
        let sizeY = this.maxY - this.minY
        let sizeZ = this.maxZ - this.minZ

        let cubeVisualization = webGLextra.meshBuilder.createCube([sizeX,sizeY,sizeZ])
        renderer.globalTransform = [this.minX,this.minY,this.minZ]
        renderer.useTextureGLOBAL("assets/textures/red.png")
        if (!renderer.textureExists("assets/textures/red.png")) {
            renderer.loadTextureGLOBAL("assets/textures/red.png")
        }
        renderer.drawGeometry(cubeVisualization.geometry,cubeVisualization.texcoord,"flat")
    }
}