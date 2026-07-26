import React from 'react';
import { ShaderBackground } from './ShaderCore';

const shaderData = {
  vertex: `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `,
  fragment: `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      float map(vec3 p) {
          vec3 q = p;
          
          // Wavy silk surface
          float h = sin(q.x * 0.5 + uTime) * 1.5;
          h += cos(q.z * 0.4 - uTime * 0.8) * 1.2;
          h += sin((q.x + q.z) * 0.2 + uTime * 0.5) * 2.0;
          
          float d = q.y - h;
          
          // Add folds
          d += sin(q.x * 2.0) * 0.2;
          d += cos(q.z * 2.5) * 0.2;
          
          return d * 0.5; // Scale distance for better precision
      }

      vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.01, 0.0);
          return normalize(vec3(
              map(p + e.xyy) - map(p - e.xyy),
              map(p + e.yxy) - map(p - e.yxy),
              map(p + e.yyx) - map(p - e.yyx)
          ));
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3(uTime * 0.5, 4.0, uTime * 0.5);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.yz *= rot(radians(40.0)); // Look down
          rd.xy *= rot((m.x - 0.5) * 1.0);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          
          for(int i = 0; i < 90; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(abs(d) < 0.01) {
                  vec3 n = calcNormal(p);
                  
                  vec3 lightDir = normalize(vec3(1.0, 3.0, -1.0));
                  float diff = max(dot(n, lightDir), 0.0);
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
                  
                  // Iridescent silk colors
                  vec3 iridescence = 0.5 + 0.5 * cos(3.14159 * 2.0 * (fre * 1.5 + p.y * 0.2 + vec3(0.0, 0.33, 0.67)));
                  
                  col = iridescence * (diff * 0.6 + 0.4) + fre * vec3(1.0);
                  
                  // Faux sub-surface scattering (rim light)
                  col += vec3(0.9, 0.2, 0.5) * pow(max(dot(n, normalize(vec3(-1.0, -1.0, 1.0))), 0.0), 2.0) * 0.5;
                  
                  break;
              }
              
              t += d * 0.8;
              if(t > 25.0) break;
          }
          
          col = mix(col, vec3(0.05, 0.0, 0.1), smoothstep(10.0, 25.0, t));
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const HyperSilkHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#030005] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(3, 0, 5, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);