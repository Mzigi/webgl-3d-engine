#version 300 es

precision highp float;

in vec2 v_texcoord;
in vec3 v_normal;
in vec3 v_FragPos; //same as a_position
in vec3 v_tangent;

//point light
in vec3[16] v_surfaceToLight;

uniform vec3[16] u_pointColor;
uniform vec3[16] u_pointSpecularColor;
uniform vec2[16] u_pointAttenuation;

uniform sampler2D u_texture;
uniform sampler2D u_specularTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_ao;

/*
uniform float u_isPortal;
uniform vec2 u_resolution;
*/

uniform vec3 u_ambientLight;
uniform vec3 u_directionalLightColor;
uniform vec3 u_directionalVector;
uniform vec3 u_viewPos;

uniform float u_specularStrength;
uniform float u_shininess;

out vec4 outColor;

//directional light function
vec3 calculateDirLight(vec3 normal) {
    float directionalLight = (dot(normal, u_directionalVector) + 0.5) / 2.0;
    vec3 dirLight = (u_directionalLightColor * max(directionalLight, 0.0));
    return dirLight;
}

//specular light function
vec3 calculateSpecular(vec3 dirLight, vec3 normal, vec4 specularTexelColor) {
    vec3 viewDir = normalize(u_viewPos - v_FragPos);
    vec3 reflectDir = reflect(-dirLight, normal);  

    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
    vec3 specular = u_specularStrength * spec * u_directionalLightColor * specularTexelColor.r;  
    return specular;
}

vec3 normalMapNormal(vec3 normal, vec3 textureNormalColor) {
    textureNormalColor.r = 1.0-textureNormalColor.r;
    //textureNormalColor.b = -textureNormalColor.b;

    vec3 tangent = normalize(v_tangent);
    vec3 bitangent = normalize(cross(normal, tangent));
    
    mat3 tbn = mat3(tangent, bitangent, normal);
    normal = textureNormalColor * 2. - 1.;
    //normal.x = -normal.x;
    //normal.z = -normal.z;
    normal = normalize(tbn * normal);

    return normal;
}

/*float calculatePointLights(vec3 normal) {
  float totalLight = 1.0;

  for (int i = 0; i < 16; i++) {
    vec3 surfaceToLightDirection = normalize(v_surfaceToLight[i]);
    if (u_pointShininess[i] > 0.0) {
      totalLight += dot(normal, surfaceToLightDirection);
    }
  }

  return totalLight;
}*/

vec3 calculatePointLights(vec3 normal) {
  vec3 totalLight = vec3(0.0,0.0,0.0);

  vec3 ambient = vec3(1.0,1.0,1.0);

  for (int i = 0; i < 16; i++) {
    //diffuse/lightcolor
    vec3 lightDir = normalize(v_surfaceToLight[i]);
    float diff = max(dot(normal, lightDir) * -1.0,0.0);
    vec3 diffuse = u_pointColor[i] * diff;

    //specular
    vec3 viewDir = normalize(u_viewPos - v_FragPos);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir,reflectDir),0.0), u_shininess);
    vec3 specular = u_pointSpecularColor[i] * spec;

    //attenuation
    float distance = length(v_surfaceToLight[i]);
    float attenuation = 1.0 / (1.0 + u_pointAttenuation[i].x * distance + u_pointAttenuation[i].y * (distance * distance));

    diffuse *= attenuation;
    specular *= attenuation;

    vec3 result = ambient * attenuation + diffuse + specular;
    if (u_pointAttenuation[i].x > 0.0) {
      totalLight += result;
    }
  }

  return totalLight;
}

void main() {
    vec3 normal = normalize(v_normal);
    normal = normalMapNormal(normal, texture(u_normalTexture, v_texcoord).rgb);

    //TEXTURES
    vec4 texelColor = texture(u_texture, v_texcoord);
    vec4 specularTexelColor = texture(u_specularTexture, v_texcoord);

    /* unused
    if (u_isPortal > 0.5) {
      texelColor = texture(u_texture, gl_FragCoord.xy / u_resolution);
    }
    */

    //LIGHTING
    vec3 dirLight = calculateDirLight(normal);
    vec3 specular = calculateSpecular(dirLight, normal, specularTexelColor);
    vec3 pointLights = calculatePointLights(normal);
    float aoMultiplier = texture(u_ao, v_texcoord).r;

    vec3 lighting = (u_ambientLight + dirLight + specular + pointLights) * aoMultiplier;

    //TRANSPARENCY
    if (texelColor.a == 0.0) {
      discard;
    }

    //FINISH
    outColor = vec4(texelColor.rgb * lighting, texelColor.a);


    /*
    if (u_isPortal < 0.5) {
      outColor = vec4(texelColor.rgb * lighting, texelColor.a);
    } else {
      outColor = vec4(texelColor.rgb, texelColor.a);
    }
    */
}