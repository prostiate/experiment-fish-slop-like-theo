import * as THREE from 'three';

export function createCausticsMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorSand: { value: new THREE.Color(0xd2b48c) },
      uColorCaustic: { value: new THREE.Color(0x99ffff) },
      uColorShadow: { value: new THREE.Color(0x403018) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorSand;
      uniform vec3 uColorCaustic;
      uniform vec3 uColorShadow;
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      // 2D simplex-like wave superposition
      float causticPattern(vec2 p, float t) {
        vec2 p1 = p * 0.15 + vec2(t * 0.04, t * 0.03);
        vec2 p2 = p * 0.22 - vec2(t * 0.05, -t * 0.02);
        vec2 p3 = p * 0.35 + vec2(-t * 0.02, t * 0.06);

        float w1 = sin(p1.x * 3.0 + sin(p1.y * 3.0));
        float w2 = sin(p2.x * 4.0 + sin(p2.y * 2.5));
        float w3 = sin(p3.x * 2.0 + p3.y * 5.0);

        float c = (w1 + w2 + w3) / 3.0;
        c = pow(abs(c), 4.5) * 4.0;
        return clamp(c, 0.0, 1.5);
      }

      void main() {
        vec2 p = vWorldPosition.xz;
        float c1 = causticPattern(p, uTime);
        float c2 = causticPattern(p + vec2(0.5, 0.5), uTime * 1.15);
        float caustics = max(c1, c2 * 0.8);

        // Mix sand base with ambient occlusion and caustic ripples
        vec3 finalColor = mix(uColorSand, uColorShadow, 0.25);
        finalColor += uColorCaustic * caustics * 0.65;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
}
