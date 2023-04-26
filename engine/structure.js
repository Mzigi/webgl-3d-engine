var meshCache = {}
var allMeshes = []

class material {
    constructor (diffuse) {
        this.diffuse = diffuse

        //unset variables
        this.specularStrength = 0
        this.specularShininess = 8
    }

    loadTexture(type) {
        let textureString = ""

        if (type == "diffuse") {
            textureString = this.diffuse
        }

        if (!renderer.textureExists(textureString)) {
            renderer.loadTextureGLOBAL(textureString)
        }
    }

    loadTextures() {
        let textureTypes = ["diffuse"]
        for (let i = 0; i < textureTypes.length; i++) {
            this.loadTexture(textureTypes[i])
        }
    }
}

class mesh {
    constructor (objLink, material, pos) {
        this.pos = pos
        this.rotation = [0,0,0]
        this.scale = [1,1,1]
        this.origin = [0,0,0]
        this.objLink = objLink
        this.textureLink = null //DEPRECATED, use materials
        this.material = null
        this.hitbox = null
        if (typeof(material) === "string") {
            this.textureLink = material
        } else {
            this.material = material
        }
        this.mesh = null
        this.shading = "normals" //DEPRECATED, use buildNormals() or leave as "normals"

        if (this.textureLink && renderer.textureExists(this.textureLink) === false) {
            renderer.loadTextureGLOBAL(this.textureLink)
        }

        async function loadMesh(object) {
            let mesh = null
            if (meshCache[objLink] == undefined) {
                const response = await fetch(objLink)
                const text = await response.text()

                mesh = webGLextra.meshBuilder.objToGeo(text)
                meshCache[objLink] = mesh
            } else {
                mesh = meshCache[objLink]
            }
            object.mesh = mesh

            if (object.generateNormalsOnLoad) {
                object.buildNormals(object.generateNormalsOnLoad)
            }
        }

        if (objLink.geometry == undefined) {
            loadMesh(this)
        } else {
            this.mesh = objLink
        }

        allMeshes.push(this)
    }

    renderMesh () {
        let textureOrMaterialLoaded = false
        if (this.material) {
            if (renderer.textureExists(this.material.diffuse)) {
                textureOrMaterialLoaded = true
            }
        }
        if (renderer.textureExists(this.textureLink)) {
            textureOrMaterialLoaded = true
        }
        if (this.mesh && this.mesh.geometry && textureOrMaterialLoaded) {
            renderer.globalTransform = this.pos
            renderer.globalRotation = this.rotation
            renderer.globalScale = this.scale
            renderer.globalOriginOffset = this.origin

            if (this.textureLink) {
                renderer.setSpecularStrength(0.1)
                renderer.setSpecularShininess(8)
            } else {
                renderer.setSpecularStrength(this.material.specularStrength)
                renderer.setSpecularShininess(this.material.specularShininess)
            }

            if (this.textureLink) {
                renderer.useTextureGLOBAL(this.textureLink)
            } else if (this.material) {
                renderer.useTextureGLOBAL(this.material.diffuse, "diffuse")
            }

            let shading = this.mesh.normals
            if (this.shading !== "normals") {
                shading = this.shading
            }
            renderer.drawGeometry(this.mesh.geometry, this.mesh.texcoord, shading)
        }
    }

    buildNormals(type) {
        if (this.mesh && this.mesh.geometry) {
            if (type === "flat") {
                this.mesh.normals = webGLextra.generateFlatShadingNormals(this.mesh.geometry)
            } else if (type === "smooth") {
                this.mesh.normals = webGLextra.generateSmoothShadingNormals(this.mesh.geometry)
            } else {
                console.warn("Shading type " + type + " does not exist")
            }
        } else {
            this.generateNormalsOnLoad = type
        }
    }
}