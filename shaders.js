export const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uRotationMatrix;
    uniform mat4 uScaleMatrix;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vTexCoord;

    void main() {
        vec4 transformedPosition = uScaleMatrix * uRotationMatrix * vec4(aPosition, 1.0);
        vNormal = aNormal;
        vPosition = vec3(uModelViewMatrix * transformedPosition);
        vTexCoord = aTexCoord;
        gl_Position = uProjectionMatrix * vec4(vPosition, 1.0);
    }
`;

export const fragmentShaderSource = `
    precision mediump float;

    uniform vec3 uLightColor;
    uniform vec3 uLightPosition;
    uniform vec3 uViewPosition;
    uniform float uBrightness;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vTexCoord;

    uniform sampler2D uTexture;

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(uLightPosition - vPosition);
        vec3 viewDir = normalize(uViewPosition - vPosition);
        vec3 reflectDir = reflect(-lightDir, normal);

        vec3 ambient = 0.3 * uLightColor;
        float diff = max(dot(lightDir, normal), 0.0);
        vec3 diffuse = diff * uLightColor;
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        vec3 specular = spec * uLightColor;

        vec4 textureColor = texture2D(uTexture, vTexCoord);
        vec3 lighting = ambient + diffuse + specular;

        gl_FragColor = vec4(lighting * textureColor.rgb * uBrightness, textureColor.a);
    }
`;

export const starVertexShaderSource = `
    attribute vec3 aPosition;

    uniform mat4 uProjectionMatrix;
    uniform vec2 uMousePosition;

    void main() {
        vec3 adjustedPosition = aPosition + vec3(uMousePosition, 0.0);
        gl_Position = uProjectionMatrix * vec4(adjustedPosition, 1.0);
        gl_PointSize = 2.0;
    }
`;

export const starFragmentShaderSource = `
    precision mediump float;

    void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
`;