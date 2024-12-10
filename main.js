import { vertexShaderSource, fragmentShaderSource, starVertexShaderSource, starFragmentShaderSource } from './shaders.js';
// Initialize WebGL context
const canvas = document.getElementById('webglCanvas');
const gl = canvas.getContext('webgl');
if (!gl) {
    alert("WebGL is not supported in your browser.");
    throw new Error("WebGL not supported.");
}

// Globals
let program, starfieldProgram;
let scene;
let projectionMatrix, viewMatrix;
const mousePosition = [0.0, 0.0];

// Utility Functions
function initializeShaders() {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    program = createProgram(gl, vertexShader, fragmentShader);

    const starVertex = createShader(gl, gl.VERTEX_SHADER, starVertexShaderSource);
    const starFragment = createShader(gl, gl.FRAGMENT_SHADER, starFragmentShaderSource);
    starfieldProgram = createProgram(gl, starVertex, starFragment);
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

function createBuffers(gl, geometry) {
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.vertices, gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.texCoords, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

    return { vertexBuffer, normalBuffer, texCoordBuffer, indexBuffer, count: geometry.indices.length };
}

// Object Geometry
function createCubeGeometry() {
    return {
        vertices: new Float32Array([
            // Front face
            -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
            // Back face
            -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
            // Top face
            -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
            // Bottom face
            -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
            // Right face
             1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
            // Left face
            -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1,
        ]),
        normals: new Float32Array([
            // Front
             0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
            // Back
             0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
            // Top
             0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
            // Bottom
             0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
            // Right
             1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
            // Left
            -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0,
        ]),
        texCoords: new Float32Array([
            0, 0,  1, 0,  1, 1,  0, 1, // Front
            0, 0,  1, 0,  1, 1,  0, 1, // Back
            0, 0,  1, 0,  1, 1,  0, 1, // Top
            0, 0,  1, 0,  1, 1,  0, 1, // Bottom
            0, 0,  1, 0,  1, 1,  0, 1, // Right
            0, 0,  1, 0,  1, 1,  0, 1, // Left
        ]),
        indices: new Uint16Array([
            0,  1,  2,   2,  3,  0, // Front
            4,  5,  6,   6,  7,  4, // Back
            8,  9, 10,  10, 11,  8, // Top
           12, 13, 14,  14, 15, 12, // Bottom
           16, 17, 18,  18, 19, 16, // Right
           20, 21, 22,  22, 23, 20, // Left
        ]),
    };
}

function createArchGeometry(numSegments = 50, radius = 1.0, thickness = 0.2, height = 0.5) {
    const vertices = [];
    const indices = [];
    const angleStep = Math.PI / numSegments;

    for (let i = 0; i <= numSegments; i++) {
        const angle = i * angleStep;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        vertices.push(x, y, 0); // Outer edge
        vertices.push(x, y - thickness, 0); // Inner edge
    }

    // Add base vertices
    vertices.push(-radius, -thickness, 0, radius, -thickness, 0, radius, -height, 0, -radius, -height, 0);

    // Create indices for the arch
    for (let i = 0; i < numSegments; i++) {
        indices.push(i * 2, i * 2 + 1, i * 2 + 2);
        indices.push(i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }

    // Add base indices
    const baseOffset = (numSegments + 1) * 2;
    indices.push(baseOffset, baseOffset + 1, baseOffset + 2, baseOffset + 2, baseOffset + 3, baseOffset);

    return {
        vertices: new Float32Array(vertices.flat()),
        normals: new Float32Array(vertices.flat().map(() => 0)), // Flat normals for simplicity
        texCoords: new Float32Array(vertices.flat().map(() => 0.5)), // Centered texture
        indices: new Uint16Array(indices),
    };
}

function createTorusGeometry(majorRadius = 1.0, minorRadius = 0.3, segments = 30, rings = 30) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const indices = [];

    for (let i = 0; i <= rings; i++) {
        const theta = (i / rings) * Math.PI * 2;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        for (let j = 0; j <= segments; j++) {
            const phi = (j / segments) * Math.PI * 2;
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);

            const x = (majorRadius + minorRadius * cosPhi) * cosTheta;
            const y = (majorRadius + minorRadius * cosPhi) * sinTheta;
            const z = minorRadius * sinPhi;

            vertices.push(x, y, z);
            normals.push(cosPhi * cosTheta, cosPhi * sinTheta, sinPhi);
            texCoords.push(i / rings, j / segments);
        }
    }

    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < segments; j++) {
            const a = i * (segments + 1) + j;
            const b = a + segments + 1;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices),
    };
}

function createTorusGeometry(majorRadius = 1.0, minorRadius = 0.3, segments = 30, rings = 30) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const indices = [];

    for (let i = 0; i <= rings; i++) {
        const theta = (i / rings) * Math.PI * 2;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        for (let j = 0; j <= segments; j++) {
            const phi = (j / segments) * Math.PI * 2;
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);

            const x = (majorRadius + minorRadius * cosPhi) * cosTheta;
            const y = (majorRadius + minorRadius * cosPhi) * sinTheta;
            const z = minorRadius * sinPhi;

            vertices.push(x, y, z);
            normals.push(cosPhi * cosTheta, cosPhi * sinTheta, sinPhi);
            texCoords.push(i / rings, j / segments);
        }
    }

    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < segments; j++) {
            const a = i * (segments + 1) + j;
            const b = a + segments + 1;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices),
    };
}

function createConeGeometry(radius = 1.0, height = 2.0, segments = 30) {
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const indices = [];

    // Base vertices
    vertices.push(0, 0, 0); // Center of the base
    normals.push(0, -1, 0); // Downward normal
    texCoords.push(0.5, 0.5);

    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        vertices.push(x, 0, z);
        normals.push(0, -1, 0);
        texCoords.push((x / radius + 1) / 2, (z / radius + 1) / 2);
    }

    // Side vertices
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        vertices.push(x, 0, z);
        normals.push(x, height / 2, z);
        texCoords.push(i / segments, 0);
    }

    vertices.push(0, height, 0); // Apex
    normals.push(0, 1, 0);
    texCoords.push(0.5, 1);

    // Base indices
    for (let i = 1; i <= segments; i++) {
        indices.push(0, i, i + 1);
    }

    // Side indices
    const baseOffset = segments + 2;
    for (let i = 0; i < segments; i++) {
        indices.push(baseOffset + i, baseOffset + i + 1, vertices.length / 3 - 1);
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices),
    };
}

function createDNAHelix(numSegments = 100, helixRadius = 0.5, helixHeight = 2.0, connectorLength = 0.4) {
    const vertices = [];
    const indices = [];
    const normals = [];
    const texCoords = [];

    for (let i = 0; i < numSegments; i++) {
        const angle = (i / numSegments) * Math.PI * 2;
        const x = helixRadius * Math.cos(angle);
        const y = (i / numSegments) * helixHeight - helixHeight / 2;
        const z = helixRadius * Math.sin(angle);

        // Add helix vertex
        vertices.push(x, y, z);
        normals.push(x, 0, z); // Approximate normals for a helix
        texCoords.push(i / numSegments, 0.5);

        // Add connector
        if (i % 2 === 0) {
            const cx = -x * connectorLength;
            const cy = y;
            const cz = -z * connectorLength;

            vertices.push(cx, cy, cz);
            normals.push(-x, 0, -z);
            texCoords.push(i / numSegments, 0.5);
        }

        // Create indices for line segments
        if (i > 0) {
            indices.push(i - 1, i); // Connect helix points
            if (i % 2 === 0) {
                indices.push(i, i + 1); // Connect helix to connector
            }
        }
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices),
    };
}

function createBowAndArrow() {
    const vertices = [
        // Bow vertices
        -0.5,  1.0, 0.0,
        -0.4,  0.0, 0.0,
        -0.5, -1.0, 0.0,
         0.5,  1.0, 0.0,
         0.4,  0.0, 0.0,
         0.5, -1.0, 0.0,
        // Arrow vertices
        0.0,  0.0, 0.0,
        1.0,  0.0, 0.0,
        1.1,  0.05, 0.0,
        1.1, -0.05, 0.0,
    ];

    const indices = [
        // Bow connections
        0, 1, 2,   3, 4, 5,
        // Arrow connections
        6, 7,   7, 8,   7, 9,
    ];

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(vertices.map(() => 0.0)), // Flat normals
        texCoords: new Float32Array(vertices.map(() => 0.0)), // No texture mapping
        indices: new Uint16Array(indices),
    };
}

function createStarGeometry() {
    const vertices = [];
    const indices = [];
    const normals = [];
    const texCoords = [];
    const numPoints = 10;
    const innerRadius = 0.5;
    const outerRadius = 1.0;

    for (let i = 0; i < numPoints; i++) {
        const angle = (Math.PI * 2 * i) / numPoints;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        vertices.push(x, y, 0); // z = 0 (2D star on XY plane)
        normals.push(0, 0, 1); // Normal points up
        texCoords.push((x + 1) / 2, (y + 1) / 2); // Map texture to star

        if (i > 1) {
            indices.push(0, i - 1, i); // Create triangles for the star
        }
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texCoords: new Float32Array(texCoords),
        indices: new Uint16Array(indices),
    };
}

// Scene Initialization
async function initScene() {
    const cubeBuffers = createBuffers(gl,  createCubeGeometry());
    const starBuffers = createBuffers(gl, createStarGeometry());
    const dnaBuffers = createBuffers(gl, createDNAHelix());
    const bowAndArrowBuffers = createBuffers(gl, createBowAndArrow());
    const archBuffers = createBuffers(gl, createArchGeometry());
    const donutBuffers = createBuffers(gl, createTorusGeometry());
    const coneBuffers = createBuffers(gl, createConeGeometry());

    const teapotData = await loadOBJ('https://raw.githubusercontent.com/mouniesa/OpenGL/master/Binaries/teapot.obj');
    const teapotBuffers = createBuffers(gl, teapotData);

    // Starfield Initialization
    const starfield = createStarfield(1000);

    return { cubeBuffers, starBuffers, dnaBuffers, bowAndArrowBuffers, archBuffers, donutBuffers, coneBuffers, teapotBuffers, starfield};
}

// Render Functions
function renderScene(scene) {
    renderRotatingObject(scene.cubeBuffers);
    renderRotatingObject(scene.starBuffers);
    renderRotatingObject(scene.dnaBuffers);
    renderRotatingObject(scene.bowAndArrowBuffers);
    renderRotatingObject(scene.archBuffers);
    renderRotatingObject(scene.donutBuffers);
    renderRotatingObject(scene.coneBuffers);
    renderRotatingObject(scene.teapotBuffers);

    renderStarfield(starfield);

    requestAnimationFrame(render);
}

function renderRotatingObject(objectBuffers) {
    gl.useProgram(program);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const rotationMatrix = getRotationMatrix(Date.now() * 0.001, 0, 0);
    const uRotationMatrix = gl.getUniformLocation(program, 'uRotationMatrix');
    gl.uniformMatrix4fv(uRotationMatrix, false, rotationMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, objectBuffers.vertexBuffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objectBuffers.indexBuffer);
    gl.drawElements(gl.TRIANGLES, objectBuffers.count, gl.UNSIGNED_SHORT, 0);
}

function renderStarfield(starfield) {
    gl.useProgram(starfieldProgram);

    const aPosition = gl.getAttribLocation(starfieldProgram, 'aPosition');
    const uProjectionMatrix = gl.getUniformLocation(starfieldProgram, 'uProjectionMatrix');
    const uMousePosition = gl.getUniformLocation(starfieldProgram, 'uMousePosition');

    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniform2fv(uMousePosition, mousePosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, starfield.buffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.drawArrays(gl.POINTS, 0, starfield.count);
}

// Main Function
async function main() {
    initializeShaders();
    projectionMatrix = createPerspectiveMatrix(45, canvas.width / canvas.height, 0.1, 100.0);
    scene = await initScene();
    render();
}

main();
