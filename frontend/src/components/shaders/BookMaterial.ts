import * as THREE from 'three';

export const BookPageMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uBend: { value: 0.0 }, // 0.0 = closed and flat, 1.0 = fully open
    uTexture: { value: null },
  },
  vertexShader: `
    uniform float uBend;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Plane goes from x = -1.5 to 1.5. Spine is at x = -1.5.
      float distFromSpine = (pos.x + 1.5) / 3.0; 

      // Apply organic curling (z-displacement) based on bend phase
      float curlAmount = sin(uBend * 3.14159265) * 0.8; // Peak curl midway through the flip
      
      // The page arches up in the middle
      float arch = sin(distFromSpine * 3.14159265);
      
      // Push the page up/down to form an arch while turning
      // Because the page rotates via the parent group, pos.z represents local 'outward' from the page surface
      pos.z += arch * curlAmount;
      
      // Bring X inward slightly to compensate for the arch (simulates inelastic paper)
      pos.x -= arch * curlAmount * 0.3; 

      // Fix Normal rotation so lighting looks correct as it curves
      // Derivative of sin(x*pi) is cos(x*pi)*pi
      float archDeriv = cos(distFromSpine * 3.14159265) * 3.14159265;
      vec3 n = normalize(vec3(-archDeriv * curlAmount, 0.0, 1.0));
      vNormal = normalMatrix * n;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uBend;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      // Handle the flipped normal on the back side
      vec3 n = normalize(vNormal);
      if (!gl_FrontFacing) n = -n;

      // Basic directional lighting
      vec3 lightDir = normalize(vec3(0.0, 5.0, 5.0));
      float diff = max(dot(n, lightDir), 0.0);
      
      // Cover color (Dark elegant matte) vs Paper color (Warm white)
      vec3 coverColor = vec3(0.08, 0.08, 0.09); 
      vec3 paperColor = vec3(0.95, 0.93, 0.88);
      
      vec3 baseColor = gl_FrontFacing ? coverColor : paperColor;
      
      // Subtle ambient occlusion near the spine (vUv.x = 0)
      float ao = smoothstep(0.0, 0.15, vUv.x);
      baseColor *= (ao * 0.3 + 0.7);
      
      // Apply lighting
      vec3 color = baseColor * (diff * 0.6 + 0.4);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.DoubleSide,
  transparent: false,
});
