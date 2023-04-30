var meshCache = {}
var allMeshes = []
var allPointLights = []
var closestPointLights = []

function makeIndexIterator(indices) {
    let ndx = 0;
    const fn = () => indices[ndx++];
    fn.reset = () => { ndx = 0; };
    fn.numElements = indices.length;
    return fn;
}

function makeUnindexedIterator(positions) {
    let ndx = 0;
    const fn = () => ndx++;
    fn.reset = () => { ndx = 0; };
    fn.numElements = positions.length / 3;
    return fn;
}

const subtractVector2 = (a, b) => a.map((v, ndx) => v - b[ndx]);

function generateTangents(position, texcoord, indices) {
    const getNextIndex = indices ? makeIndexIterator(indices) : makeUnindexedIterator(position);
    const numFaceVerts = getNextIndex.numElements;
    const numFaces = numFaceVerts / 3;

    const tangents = [];
    for (let i = 0; i < numFaces; ++i) {
        const n1 = getNextIndex();
        const n2 = getNextIndex();
        const n3 = getNextIndex();

        const p1 = position.slice(n1 * 3, n1 * 3 + 3);
        const p2 = position.slice(n2 * 3, n2 * 3 + 3);
        const p3 = position.slice(n3 * 3, n3 * 3 + 3);

        const uv1 = texcoord.slice(n1 * 2, n1 * 2 + 2);
        const uv2 = texcoord.slice(n2 * 2, n2 * 2 + 2);
        const uv3 = texcoord.slice(n3 * 2, n3 * 2 + 2);

        const dp12 = webGLextra.m4.subtractVectors(p2, p1);
        const dp13 = webGLextra.m4.subtractVectors(p3, p1);

        const duv12 = subtractVector2(uv2, uv1);
        const duv13 = subtractVector2(uv3, uv1);


        const f = 1.0 / (duv12[0] * duv13[1] - duv13[0] * duv12[1]);
        const tangent = Number.isFinite(f)
        ? webGLextra.m4.normalize(webGLextra.m4.scaleVector(webGLextra.m4.subtractVectors(
            webGLextra.m4.scaleVector(dp12, duv13[1]),
            webGLextra.m4.scaleVector(dp13, duv12[1]),
            ), f))
        : [1, 0, 0];

        tangents.push(...tangent, ...tangent, ...tangent);
    }

    return tangents;
}

function getDistance(a,b) {
    let x = a[0] - b[0]
    let y = a[1] - b[1]
    let z = a[2] - b[2]

    return Math.sqrt(x*x+y*y+z*z)
}

function updateClosestPointLights() { //returns max 16 point lights
    let lights = []
    if (allPointLights.length <= 16) {
        lights = allPointLights
    }
    closestPointLights = lights
}

class pointLight {
    constructor(pos, brightness) {
        this.pos = pos
        if (!brightness) {
            brightness = 1
        }
        this.lightColor = [255 * brightness,255 * brightness,255 * brightness]
        this.specularColor = [255 * brightness,255 * brightness,255 * brightness]

        //https://wiki.ogre3d.org/tiki-index.php?page=-Point+Light+Attenuation
        //20% of the distance is most bright
        this.linear = 0.045 //0.7
        this.quadratic = 0.0075 //1.8

        allPointLights.push(this)

        updateClosestPointLights()
        let tempAllPointLights = []
        for (let i = 0; i < allPointLights.length; i++) {
            tempAllPointLights.push(allPointLights[i])
        }
        renderer.updatePointLightUniforms(tempAllPointLights)
    }

    update() {
        updateClosestPointLights()

        let tempAllPointLights = []
        for (let i = 0; i < allPointLights.length; i++) {
            tempAllPointLights.push(allPointLights[i])
        }
        renderer.updatePointLightUniforms(tempAllPointLights)
    }

    delete() {
        let index = allPointLights.indexOf(this)
        allPointLights.splice(index,1)
    }
}

class material {
    constructor (diffuse) {
        //textures
        this.diffuse = diffuse
        this.specular = "assets/textures/default.png"
        this.normal = "assets/textures/defaultNormal.png"
        this.ao = "assets/textures/default.png"

        //unset variables
        this.filteringMode = "linear"
        this.specularStrength = 0
        this.specularShininess = 8
    }

    loadTexture(type) {
        let textureString = this[type]

        if (!renderer.textureExists(textureString)) {
            renderer.loadTextureGLOBAL(textureString,this.filteringMode)
        }
    }

    loadTextures() {
        let textureTypes = ["diffuse","specular","normal","ao"]
        for (let i = 0; i < textureTypes.length; i++) {
            this.loadTexture(textureTypes[i])
        }
    }

    useMaterial() {
        //textures
        let textureTypes = ["diffuse","specular","normal","ao"]
        for (let i = 0; i < textureTypes.length; i++) {
            renderer.useTextureGLOBAL(this[textureTypes[i]], textureTypes[i])
        }

        //properties
        renderer.setSpecularStrength(this.specularStrength)
        renderer.setSpecularShininess(this.specularShininess)
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
        this.visible = true
        
        if (typeof(material) === "string") {
            this.textureLink = material
        } else {
            this.material = material
        }
        this.mesh = null
        //this.shading = "normals" FULLY REMOVED FROM RENDERER, USE buildNormals(type) INSTEAD

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
            object.mesh.normals = new Float32Array(object.mesh.normals)
            object.mesh.texcoord = new Float32Array(object.mesh.texcoord)
            object.mesh.geometry = new Float32Array(object.mesh.geometry)
            object.mesh.tangent = generateTangents(object.mesh.geometry, object.mesh.texcoord)

            if (object.generateNormalsOnLoad) {
                object.buildNormals(object.generateNormalsOnLoad)
            }
            if (object.hitbox) {
                object.updateHitbox()
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
        if (!this.mesh) {
            return
        }
        if (!this.visible) {
            return
        }
        let textureOrMaterialLoaded = false
        if (this.material) {
            if (renderer.textureExists(this.material.diffuse)) {
                textureOrMaterialLoaded = true
            }
        } else if (renderer.textureExists(this.textureLink)) {
            textureOrMaterialLoaded = true
        }
        let canSee = true
        if (this.hitbox) {
            canSee = this.hitbox.frustumIntersects()
        }
        if (textureOrMaterialLoaded && canSee) {
            renderer.globalTransform = this.pos
            renderer.globalRotation = this.rotation
            renderer.globalScale = this.scale
            renderer.globalOriginOffset = this.origin

            if (this.textureLink) {
                renderer.useTextureGLOBAL(this.textureLink, "diffuse")

                if (!renderer.isShadowMap) {
                    renderer.setSpecularStrength(0.1)
                    renderer.setSpecularShininess(8)
                }
            } else {
                this.material.useMaterial()
            }

            /*if (this.shading !== "normals") {
                shading = this.shading
            }*/
            renderer.drawGeometry(this.mesh.geometry, this.mesh.texcoord, this.mesh.normals, this.mesh.tangent)
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

            this.mesh.normals = new Float32Array(this.mesh.normals) //optimization
        } else {
            this.generateNormalsOnLoad = type
        }
    }

    attachHitbox(hitbox) {
        hitbox.mesh = this
        this.hitbox = hitbox
    }

    updateHitbox() {
        if (this.hitbox) {
            this.hitbox.calculateMeshBox()
        }
    }

    delete() {
        let index = allMeshes.indexOf(this)
        allMeshes.splice(index,1)
    }
}