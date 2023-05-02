#version 300 es

  precision highp float;
  
  in vec2 v_texcoord;
  in vec3 v_normal;
  in vec3 v_FragPos; //same as a_position
  in vec3 v_tangent;
  in vec4 v_projectedTexcoord;
  
  //point light
  in vec3[16] v_surfaceToLight;
  
  uniform vec3[16] u_pointColor;
  uniform vec3[16] u_pointSpecularColor;
  uniform vec2[16] u_pointAttenuation;
  
  uniform sampler2D u_texture;
  uniform sampler2D u_specularTexture;
  uniform sampler2D u_normalTexture;
  uniform sampler2D u_ao;
  uniform sampler2D u_projectedTexture;
  
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
      float spec = pow(max(dot(viewDir,reflectDir),0.0), u_shininess) * u_specularStrength;
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
  
  float calculateShadowLight() {
    vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;
    //float bias = max(-0.0004 * (-1.0 + dot(v_normal, u_directionalVector)), -0.00003);
    float bias = 0.000678;
    float currentDepth = projectedTexcoord.z - bias;
  
    bool inRange =
        projectedTexcoord.x >= 0.0 &&
        projectedTexcoord.x <= 1.0 &&
        projectedTexcoord.y >= 0.0 &&
        projectedTexcoord.y <= 1.0;
  
    // the 'r' channel has the depth values
    //vec4 projectedTexColor = vec4(texture(u_projectedTexture, projectedTexcoord.xy).rrr, 1);
    float projectedDepth = texture(u_projectedTexture, projectedTexcoord.xy).r;
    bool inShadow = (inRange && projectedDepth <= currentDepth) ? true : false;
    float shadowLight = 0.0;
    vec2 texelSize = vec2(1.0 / 1056.0, 1.0 / 1056.0);
    
    if (inShadow) {
      for(int x = -3; x <= 3; ++x)
      {
          for(int y = -3; y <= 3; ++y)
          {
              float pcfDepth = texture(u_projectedTexture, projectedTexcoord.xy + vec2(x, y) * texelSize).r; 
              shadowLight += (inRange && currentDepth >= pcfDepth) ? 0.65 : 1.0;
          }    
      }
      shadowLight /= 49.0;
    } else {
      shadowLight = 1.0;
    }
 
    /*for(int x = -1; x <= 1; ++x)
    {
      float pcfDepth = texture(u_projectedTexture, projectedTexcoord.xy + vec2(x, 0) * texelSize).r; 
      shadowLight += (inRange && currentDepth >= pcfDepth) ? 0.5 : 1.0; 
    }
    for(int y = -1; y <= 1; ++y)
    {
      float pcfDepth = texture(u_projectedTexture, projectedTexcoord.xy + vec2(0, y) * texelSize).r; 
      shadowLight += (inRange && currentDepth >= pcfDepth) ? 0.5 : 1.0;
    } 
    shadowLight /= 6.0;*/
  
    //float projectedAmount = inRange ? 1.0 : 0.0;
    return shadowLight;
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
      float shadowLight = calculateShadowLight();
  
      vec3 lighting = (u_ambientLight + dirLight + specular + pointLights) * aoMultiplier * shadowLight;
  
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