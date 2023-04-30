#version 300 es

in vec4 a_position;
in vec2 a_texcoord;
in vec3 a_normal;
in vec3 a_tangent;

//u_matrix = u_worldViewProjection
uniform mat4 u_matrix;
uniform mat4 u_world;

uniform vec3[16] u_pointPos; //point light

out vec2 v_texcoord;
out vec3 v_normal;
out vec3 v_FragPos;
out vec3 v_tangent;

out vec3[16] v_surfaceToLight; //point light

void main() {
    gl_Position = u_matrix * a_position;

    v_texcoord = a_texcoord;
    v_normal = mat3(u_world) * a_normal;

    mat3 normalMat = mat3(u_world);
    v_normal = normalize(normalMat * a_normal);
    v_tangent = normalize(normalMat * a_tangent);

    v_FragPos = vec3(a_position);

    //point light calculations
    vec3 surfaceWorldPosition = (u_world * a_position).xyz;

    for (int i = 0; i < 16; i++) {
        v_surfaceToLight[i] = u_pointPos[i] - surfaceWorldPosition;
    }
}