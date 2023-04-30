function dotProduct(a,b){
    const result = a.reduce((acc, cur, index)=>{
        acc += (cur * b[index]);
        return acc;
    }, 0);
    return result;
}

function getDistance(a,b) {
    let x = a[0] - b[0]
    let y = a[1] - b[1]
    let z = a[2] - b[2]

    return Math.sqrt(x*x+y*y+z*z)
}

function getViewProjectionMatrix() {
    //compute matrix
    let projectionMatrix = renderer.perspective ? webGLextra.m4.perspective(degToRad(renderer.fov), renderer.aspect, renderer.zNear, renderer.zFar) : webGLextra.m4.orthographic(-renderer.shadowMapMetersLength, renderer.shadowMapMetersLength, -renderer.shadowMapMetersLength, renderer.shadowMapMetersLength, renderer.zNear, renderer.zFar)

    let viewMatrix = webGLextra.m4.inverse(renderer.cameraMatrix)
    let viewProjectionMatrix = webGLextra.m4.multiply(projectionMatrix, viewMatrix)

    //viewProjectionMatrix = webGLextra.m4.translate(viewProjectionMatrix, object.minX,object.minY,object.minZ)

    return viewProjectionMatrix
}

function getScreenPos(x,y,z,vpm) {
    let Pos = webGLextra.m4.multiplyWith(vpm, [x,y,z],1)
    Pos[0] = Pos[0] / Pos[3]
    Pos[1] = Pos[1] / Pos[3]

    return Pos
}

function isScreenPosOnScreen(Pos) {
    if (Pos[0] >= -1 && Pos[0] <= 1 && Pos[1] >= -1 && Pos[1] <= 1 && Pos[3] >= 0) {
        return true
    }
    return false
}

function triangleTriangleIntersect(tri0, tri1){ //0.25
    var p1 = triangle2PlaneObjNormalized(tri1);
    var tri0CrossPts = triPtsCrossingNormalizedPlane(tri0, p1);

    if(tri0CrossPts){
        var p0 = triangle2PlaneObjNormalized(tri0);
        var tri1CrossPts = triPtsCrossingNormalizedPlane(tri1, p0);
        if(tri1CrossPts){
            var intLine = planePlaneIntersectionLine(p0,p1);
            return lineCrossingsIntervalLine(intLine, tri0CrossPts, tri1CrossPts) ;//|| lineCrossingsIntervalLine([intLine[1], intLine[0]], tri0CrossPts, tri1CrossPts);
        }
    }

    return null;
}

function triangle2PlaneObjNormalized(tri){ //normalized meaning no translation -- normal vector here is NOT normalized!
    //equiv:
    //var n = _crossProduct([tri[0], tri[1]],[tri[0], tri[2]]);
    //var nline = triangle2NormalLine(tri);
    //return normalLine2PlaneObjNormalized(nline);

    var res = {};
    var a = [tri[2][0]-tri[0][0], tri[2][1]-tri[0][1], tri[2][2]-tri[0][2]]; //side A
    var b = [tri[1][0]-tri[0][0], tri[1][1]-tri[0][1], tri[1][2]-tri[0][2]]; //side B
    res.nx = a[1] * b[2] - a[2] * b[1];
    res.ny = a[2] * b[0] - a[0] * b[2];
    res.nz = a[0] * b[1] - a[1] * b[0];
    res.w=-res.nx*tri[0][0] - res.ny*tri[0][1] - res.nz*tri[0][2];
    return res;
}

function planePlaneIntersectionLine(p0,p1){ //needs NORMALIZED planes not regular planeObjs
    var orthoNormal = _crossProduct([p0.nx,p0.ny,p0.nz],[p1.nx,p1.ny,p1.nz]);
    var orthoPlane = {nx: orthoNormal[0], ny: orthoNormal[1], nz: orthoNormal[2], w:0};

    var pointOnLine = intersectionPtOf3Planes(p0,p1,orthoPlane);
    var theLine = [pointOnLine, [pointOnLine[0]+orthoNormal[0], pointOnLine[1]+orthoNormal[1], pointOnLine[2]+orthoNormal[2]]];
    return theLine;
}

var _crossProduct = function (a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
};

function triPtsCrossingNormalizedPlane(tri, po){
    /*
    //equiv:
    var lines = triLinesCrossingNormalizedPlane(tri, po);
    if(lines.length==2){
        return [crossingLinePlaneIntersectionPt(lines[0], po), crossingLinePlaneIntersectionPt(lines[1], po)];
    }
    return null;
     */

    var df0 = tri[0][0]*po.nx+tri[0][1]*po.ny+tri[0][2]*po.nz+po.w;
    var df1 = tri[1][0]*po.nx+tri[1][1]*po.ny+tri[1][2]*po.nz+po.w;
    var df2 = tri[2][0]*po.nx+tri[2][1]*po.ny+tri[2][2]*po.nz+po.w;

    if(df0*df1<0.0){//edge A crosses...
        var d0 = Math.abs(df0);
        var d1 = Math.abs(df1);
        var d2 = Math.abs(df2);
        var t01 = d0 / (d1 + d0);

        if(df1*df2<0.0){ //edge B crosses...
            //return A, B

            var t12 = d1 / (d2 + d1);

            return [[
                tri[0][0] + (tri[1][0]-tri[0][0])*t01,
                tri[0][1] + (tri[1][1]-tri[0][1])*t01,
                tri[0][2] + (tri[1][2]-tri[0][2])*t01,
            ], [
                tri[1][0] + (tri[2][0]-tri[1][0])*t12,
                tri[1][1] + (tri[2][1]-tri[1][1])*t12,
                tri[1][2] + (tri[2][2]-tri[1][2])*t12,
            ]];

        }else{//edge B _not_ cross...
            //edge C must cross
            //return A, C

            var t20 = d2 / (d0 + d2);

            return [[
                tri[0][0] + (tri[1][0]-tri[0][0])*t01,
                tri[0][1] + (tri[1][1]-tri[0][1])*t01,
                tri[0][2] + (tri[1][2]-tri[0][2])*t01,
            ], [
                tri[2][0] + (tri[0][0]-tri[2][0])*t20,
                tri[2][1] + (tri[0][1]-tri[2][1])*t20,
                tri[2][2] + (tri[0][2]-tri[2][2])*t20,
            ]];
        }
    }else{//edge A _not_ cross...
        if(df1*df2<0.0){  //edge B cross...
            //edge C must cross
            //return B, C

            var d0 = Math.abs(df0);
            var d1 = Math.abs(df1);
            var d2 = Math.abs(df2);
            var t12 = d1 / (d2 + d1);
            var t20 = d2 / (d0 + d2);

            return [[
                tri[1][0] + (tri[2][0]-tri[1][0])*t12,
                tri[1][1] + (tri[2][1]-tri[1][1])*t12,
                tri[1][2] + (tri[2][2]-tri[1][2])*t12,
            ], [
                tri[2][0] + (tri[0][0]-tri[2][0])*t20,
                tri[2][1] + (tri[0][1]-tri[2][1])*t20,
                tri[2][2] + (tri[0][2]-tri[2][2])*t20,
            ]];
        }
    }
    return null;
}

function lineLengthSquared(line){
    var a = line[1][0]-line[0][0];
    var b = line[1][1]-line[0][1];
    var c = line[1][2]-line[0][2];
    return a*a+b*b+c*c;
};

function lineCrossingsIntervalLine(line, triIntPts0, triIntPts1){

    var lineLength2 = lineLengthSquared(line);
    var triIntTs0_0=-1.0*((line[0][0]-triIntPts0[0][0])*(line[1][0]-line[0][0]) + (line[0][1]-triIntPts0[0][1]) * (line[1][1]-line[0][1]) + (line[0][2]-triIntPts0[0][2])*(line[1][2]-line[0][2])) /lineLength2;
    var triIntTs1_0=-1.0*((line[0][0]-triIntPts1[0][0])*(line[1][0]-line[0][0]) + (line[0][1]-triIntPts1[0][1]) * (line[1][1]-line[0][1]) + (line[0][2]-triIntPts1[0][2])*(line[1][2]-line[0][2])) /lineLength2;
    var triIntTs0_1=-1.0*((line[0][0]-triIntPts0[1][0])*(line[1][0]-line[0][0]) + (line[0][1]-triIntPts0[1][1]) * (line[1][1]-line[0][1]) + (line[0][2]-triIntPts0[1][2])*(line[1][2]-line[0][2])) /lineLength2;
    var triIntTs1_1=-1.0*((line[0][0]-triIntPts1[1][0])*(line[1][0]-line[0][0]) + (line[0][1]-triIntPts1[1][1]) * (line[1][1]-line[0][1]) + (line[0][2]-triIntPts1[1][2])*(line[1][2]-line[0][2])) /lineLength2;

    var intersectedSpan = null;

    if(triIntTs0_0<triIntTs0_1){
        if(triIntTs1_0<triIntTs1_1){
            intersectedSpan = intersectSpans(triIntTs0_0, triIntTs0_1, triIntTs1_0, triIntTs1_1);
        }else{
            intersectedSpan = intersectSpans(triIntTs0_0, triIntTs0_1, triIntTs1_1, triIntTs1_0);
        }
    }else{
        if(triIntTs1_0<triIntTs1_1){
            intersectedSpan = intersectSpans(triIntTs0_1, triIntTs0_0, triIntTs1_0, triIntTs1_1);
        }else{
            intersectedSpan = intersectSpans(triIntTs0_1, triIntTs0_0, triIntTs1_1, triIntTs1_0);
        }
    }

    if(!intersectedSpan)return null;

    return [ //gettings points along line at t values returned by intersectSpans
        [
            line[0][0] + (line[1][0]-line[0][0])*intersectedSpan[0],
            line[0][1] + (line[1][1]-line[0][1])*intersectedSpan[0],
            line[0][2] + (line[1][2]-line[0][2])*intersectedSpan[0],
        ],
        [
            line[0][0] + (line[1][0]-line[0][0])*intersectedSpan[1],
            line[0][1] + (line[1][1]-line[0][1])*intersectedSpan[1],
            line[0][2] + (line[1][2]-line[0][2])*intersectedSpan[1],
        ]
    ];
}

function intersectSpans(a0,a1, b0, b1){ //https://stackoverflow.com/questions/5390941/get-number-range-intersection?rq=1&utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
    var maxStart = Math.max(a0, b0);
    var minEnd = Math.min(a1, b1);

    if(maxStart <= minEnd) {
        return [maxStart, minEnd];
    }

    return null;
}

//closest pt between 2 lines: http://morroworks.palitri.com/Content/Docs/Rays%20closest%20point.pdf

//http://www.ambrsoft.com/TrigoCalc/Plan3D/3PlanesIntersection_.htm
function intersectionPtOf3Planes(p0,p1,p2){ //intersect3planes 3planeintersection planes3Intersection

    var d0 = determinant3x3(
        p0.nx,p0.ny,p0.nz,
        p1.nx,p1.ny,p1.nz,
        p2.nx,p2.ny,p2.nz,
    );

    if(d0==0){
        console.log("determinant zero!", p0, p1, p2);
        return null;
    }

    var dx = determinant3x3(
        -p0.w,p0.ny,p0.nz,
        -p1.w,p1.ny,p1.nz,
        -p2.w,p2.ny,p2.nz,
    );

    var dy = determinant3x3(
        p0.nx,-p0.w,p0.nz,
        p1.nx,-p1.w,p1.nz,
        p2.nx,-p2.w,p2.nz,
    );

    var dz = determinant3x3(
        p0.nx,p0.ny,-p0.w,
        p1.nx,p1.ny,-p1.w,
        p2.nx,p2.ny,-p2.w,
    );

    return [dx/d0, dy/d0, dz/d0];
}

function determinant3x3( //doesnt matter if transposed, det(A) = det(A^transposed)
    a1,b1,c1,
    a2,b2,c2,
    a3,b3,c3
){
    return a1*b2*c3-a1*b3*c2+a3*b1*c2-a2*b1*c3+a2*b3*c1-a3*b2*c1;
}

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

        if (otherHitbox === this) {
            return false
        }

        if (this.lowHitbox === "box" && otherHitbox.lowHitbox === "box") { //aabb vs aabb
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
        if (colliding) {
            if (this.hitbox === "mesh" && otherHitbox.hitbox === "mesh") {
                colliding = false

                let mesh1 = this.mesh
                let mesh2 = otherHitbox.mesh

                let mesh1MaxSize = getDistance([this.minX,this.minY,this.minZ],[this.maxX,this.maxY,this.maxZ])
                let mesh1Origin = [mesh1.pos[0],mesh1.pos[1],mesh1.pos[2]]

                let mesh1Matrix = webGLextra.m4.translation(mesh1.pos[0],mesh1.pos[1],mesh1.pos[2])
                mesh1Matrix = webGLextra.m4.xRotate(mesh1Matrix, mesh1.rotation[0])
                mesh1Matrix = webGLextra.m4.yRotate(mesh1Matrix, mesh1.rotation[1])
                mesh1Matrix = webGLextra.m4.zRotate(mesh1Matrix, mesh1.rotation[2])
                mesh1Matrix = webGLextra.m4.translate(mesh1Matrix, mesh1.origin[0],mesh1.origin[1],mesh1.origin[2])
                mesh1Matrix = webGLextra.m4.scale(mesh1Matrix, mesh1.scale[0], mesh1.scale[1], mesh1.scale[2])

                let mesh2Matrix = webGLextra.m4.translation(mesh2.pos[0],mesh2.pos[1],mesh2.pos[2])
                mesh2Matrix = webGLextra.m4.xRotate(mesh2Matrix, mesh2.rotation[0])
                mesh2Matrix = webGLextra.m4.yRotate(mesh2Matrix, mesh2.rotation[1])
                mesh2Matrix = webGLextra.m4.zRotate(mesh2Matrix, mesh2.rotation[2])
                mesh2Matrix = webGLextra.m4.translate(mesh2Matrix, mesh2.origin[0],mesh2.origin[1],mesh2.origin[2])
                mesh2Matrix = webGLextra.m4.scale(mesh2Matrix, mesh2.scale[0], mesh2.scale[1], mesh2.scale[2])

                let mesh1geometry = []
                for (let i = 0; i < mesh1.mesh.geometry.length / 3; i++) {
                    let vec3 = [mesh1.mesh.geometry[i*3+0],mesh1.mesh.geometry[i*3+1],mesh1.mesh.geometry[i*3+2]]
                    let newVec3 = webGLextra.m4.multiplyWith(mesh1Matrix, vec3)
                    mesh1geometry[i*3+0] = newVec3[0]
                    mesh1geometry[i*3+1] = newVec3[1]
                    mesh1geometry[i*3+2] = newVec3[2]
                }

                let mesh2geometry = []
                for (let i = 0; i < mesh2.mesh.geometry.length / 9; i++) {
                    let p1 = [mesh2.mesh.geometry[i*9+0],mesh2.mesh.geometry[i*9+1],mesh2.mesh.geometry[i*9+2]]
                    let p2 = [mesh2.mesh.geometry[i*9+3],mesh2.mesh.geometry[i*9+4],mesh2.mesh.geometry[i*9+5]]
                    let p3 = [mesh2.mesh.geometry[i*9+6],mesh2.mesh.geometry[i*9+7],mesh2.mesh.geometry[i*9+8]]

                    /*let vec3 = [mesh2.mesh.geometry[i*3+0],mesh2.mesh.geometry[i*3+1],mesh2.mesh.geometry[i*3+2]]
                    let newVec3 = webGLextra.m4.multiplyWith(mesh2Matrix, vec3)
                    mesh2geometry[i*3+0] = newVec3[0]
                    mesh2geometry[i*3+1] = newVec3[1]
                    mesh2geometry[i*3+2] = newVec3[2]*/

                    let maxTriangleSize = (getDistance(p1,p2) + getDistance(p2,p3))
                    if (getDistance(mesh1Origin, p1) < mesh1MaxSize + maxTriangleSize) {
                        mesh2geometry.push(p1[0])
                        mesh2geometry.push(p1[1])
                        mesh2geometry.push(p1[2])

                        mesh2geometry.push(p2[0])
                        mesh2geometry.push(p2[1])
                        mesh2geometry.push(p2[2])

                        mesh2geometry.push(p3[0])
                        mesh2geometry.push(p3[1])
                        mesh2geometry.push(p3[2])
                    }
                }

                let mesh1TriangleCount = mesh1.mesh.geometry.length / 9
                let mesh2TriangleCount = mesh2geometry.length / 9

                for (let i = 0; i < mesh1TriangleCount; i++) {
                    let p1 = [mesh1geometry[i*9+0],mesh1geometry[i*9+1],mesh1geometry[i*9+2]]
                    let p2 = [mesh1geometry[i*9+3],mesh1geometry[i*9+4],mesh1geometry[i*9+5]]
                    let p3 = [mesh1geometry[i*9+6],mesh1geometry[i*9+7],mesh1geometry[i*9+8]]

                    let triangle = [p1,p2,p3]
                    for (let j = 0; j < mesh2TriangleCount; j++) {
                        let p1 = [mesh2geometry[j*9+0],mesh2geometry[j*9+1],mesh2geometry[j*9+2]]
                        let p2 = [mesh2geometry[j*9+3],mesh2geometry[j*9+4],mesh2geometry[j*9+5]]
                        let p3 = [mesh2geometry[j*9+6],mesh2geometry[j*9+7],mesh2geometry[j*9+8]]

                        let triangle2 = [p1,p2,p3]

                        if (triangleTriangleIntersect(triangle,triangle2)) {
                            colliding = true
                            return colliding
                        }
                    }
                }
            }
        }
        return colliding
    }

    visualizeMeshBox() {
        if (this.minX) {
            let sizeX = this.maxX - this.minX
            let sizeY = this.maxY - this.minY
            let sizeZ = this.maxZ - this.minZ

            let cubeVisualization = webGLextra.meshBuilder.createCube([sizeX,sizeY,sizeZ])
            renderer.globalTransform = [this.minX,this.minY,this.minZ]
            renderer.useTextureGLOBAL("assets/textures/red.png")
            if (!renderer.textureExists("assets/textures/red.png")) {
                renderer.loadTextureGLOBAL("assets/textures/red.png")
            }
            renderer.drawGeometry(cubeVisualization.geometry,cubeVisualization.texcoord,cubeVisualization.normals,cubeVisualization.tangent)
        }
    }

    frustumIntersectsOLD() {
        let intersecting = true
        let vmin = [0,0,0]
        let vmax = [0,0,0]

        let mins = [this.minX,this.minY,this.minZ]
        let maxs = [this.maxX,this.maxY,this.maxZ]

        let planesD = 0
        let planes = [
            {
                "normal": [0,1,0],
                "d": planesD
            },
            {
                "normal": [0,-1,0],
                "d": planesD
            },
            {
                "normal": [1,0,0],
                "d": planesD
            },
            {
                "normal": [-1,0,0],
                "d": planesD
            },
            {
                "normal": [0,0,1],
                "d": planesD
            },
            {
                "normal": [0,0,-1],
                "d": planesD
            },
        ]

        for(let i = 0; i < 6; i++) { 
            // X axis 
            if(planes[i].normal[0] > 0) { 
                vmin[0] = mins[0]
                vmax[0] = maxs[0]
            } else { 
                vmin[0] = maxs[0]
                vmax[0] = mins[0]
            } 
            // Y axis 
            if(planes[i].normal[1] > 0) { 
                vmin[1] = mins[1]
                vmax[1] = maxs[1]
            } else { 
                vmin[1] = maxs[1]
                vmax[1] = mins[1]
            } 
            // Z axis 
            if(planes[i].normal[2] > 0) { 
                vmin[2] = mins[2]
                vmax[2] = maxs[2]
            } else { 
                vmin[2] = maxs[2]
                vmax[2] = mins[2]
            } 
            if (dotProduct(planes[i].normal, vmin) + planes[i].d > 0) {
                return false
            }
            if (dotProduct(planes[i].normal, vmax) + planes[i].d >= 0) {
                intersecting = true
            }
        } 
        return intersecting
    }

    frustumIntersects() {
        if (this.minX) {
            let cameraPosition = webGLextra.m4.getTranslation(renderer.cameraMatrix)
            if (cameraPosition[0] >= this.minX && cameraPosition[0] <= this.maxX &&
                cameraPosition[1] >= this.minY && cameraPosition[1] <= this.maxY &&
                cameraPosition[2] >= this.minZ && cameraPosition[2] <= this.maxZ) {
                return true
            }

            let vpm = getViewProjectionMatrix(this)

            //behind check
            let xDiff = this.maxX - this.minX
            let yDiff = this.maxY - this.minY
            let zDiff = this.maxZ - this.minZ
            let MIDDLE = getScreenPos(this.minX + xDiff/2,this.minY + yDiff/2,this.minZ + zDiff/2,vpm)
            if (MIDDLE[2] < -Math.max(this.maxX,this.maxY,this.maxZ)) {
                return false
            }

            if (isScreenPosOnScreen(MIDDLE)) {
                return true
            }

            //cheap checks
            let PXPYPZ = getScreenPos(this.maxX,this.maxY,this.maxZ,vpm)
            if (isScreenPosOnScreen(PXPYPZ)) {
                return true
            }
            let PXNYPZ = getScreenPos(this.maxX,this.minY,this.maxZ,vpm)
            if (isScreenPosOnScreen(PXNYPZ)) {
                return true
            }
            let PXPYNZ = getScreenPos(this.maxX,this.maxY,this.minZ,vpm)
            if (isScreenPosOnScreen(PXPYNZ)) {
                return true
            }
            let NXPYPZ = getScreenPos(this.minX,this.maxY,this.maxZ,vpm)
            if (isScreenPosOnScreen(NXPYPZ)) {
                return true
            }
            let NXNYPZ = getScreenPos(this.minX,this.minY,this.maxZ,vpm)
            if (isScreenPosOnScreen(NXNYPZ)) {
                return true
            }
            let NXNYNZ = getScreenPos(this.minX,this.minY,this.minZ,vpm)
            if (isScreenPosOnScreen(NXNYNZ)) {
                return true
            }
            let NXPYNZ = getScreenPos(this.minX,this.maxY,this.minZ,vpm)
            if (isScreenPosOnScreen(NXPYNZ)) {
                return true
            }
            let PXNYNZ = getScreenPos(this.maxX,this.minY,this.minZ,vpm)
            if (isScreenPosOnScreen(PXNYNZ)) {
                return true
            }

            //per meter check
            for (let x = this.minX; x < this.maxX + 1; x++) {
                for (let y = this.minY; y < this.maxY + 1; y++) {
                    for (let z = this.minZ; z < this.maxZ + 1; z++) {
                        if (isScreenPosOnScreen(getScreenPos(x,y,z,vpm))) {
                            return true
                        }
                    }
                }
            }

            return false

            /*let minPos = webGLextra.m4.multiplyWith(vpm, [this.minX,this.minY,this.minZ],1)
            minPos[0] = minPos[0] / minPos[3]
            minPos[1] = minPos[1] / minPos[3]

            let maxPos = webGLextra.m4.multiplyWith(vpm, [this.maxX,this.maxY,this.maxZ],1)
            maxPos[0] = maxPos[0] / maxPos[3]
            maxPos[1] = maxPos[1] / maxPos[3]

            if (minPos[0] >= -1 && minPos[0] <= 1
                && minPos[1] >= -1 && minPos[1] <= 1
                && minPos[3] >= 0
                || maxPos[0] >= -1 && maxPos[0] <= 1
                && maxPos[1] >= -1 && maxPos[1] <= 1
                && maxPos[3] >= 0) {
                return true
            } else {
                return false
            }*/
            //console.log(minPos)
        }
    }
}