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

      float sdOctahedron( vec3 p, float s) {
          p = abs(p);
          return (p.x+p.y+p.z-s)*0.57735027;
      }

      float map(vec3 p) {
          vec3 q = p;
          
          // Core Engine
          q.xy *= rot(uTime * 0.5);
          q.xz *= rot(uTime * 0.3);
          float core = sdOctahedron(q, 1.0 + sin(uTime * 4.0) * 0.1);
          
          // Outer shell structure
          vec3 p2 = p;
          p2.xz *= rot(-uTime * 0.2);
          p2.yz *= rot(uTime * 0.1);
          float shell = sdOctahedron(p2, 2.5);
          shell = max(shell, -sdOctahedron(p2, 2.3)); // hollow
          
          // Cutouts
          float cutout = length(p2.xz) - 0.5;
          shell = max(shell, -cutout);
          cutout = length(p2.xy) - 0.5;
          shell = max(shell, -cutout);
          
          return min(core, shell);
      }

      vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.005, 0.0);
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

          vec3 ro = vec3(0.0, 0.0, -5.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 2.0);
          rd.yz *= rot((m.y - 0.5) * 2.0);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          float glow = 0.0;
          
          for(int i = 0; i < 90; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.005) {
                  vec3 n = calcNormal(p);
                  vec3 lightDir = normalize(vec3(sin(uTime), 1.0, cos(uTime)));
                  
                  float diff = max(dot(n, lightDir), 0.0);
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
                  float spec = pow(max(dot(reflect(rd, n), lightDir), 0.0), 32.0);
                  
                  float dist = length(p);
                  vec3 baseColor = dist < 1.5 ? vec3(0.9, 0.1, 0.5) : vec3(0.1, 0.5, 0.9); // core vs shell
                  
                  col = baseColor * (diff * 0.4 + 0.1) + fre * vec3(1.0) + spec * vec3(1.0);
                  
                  // Faux refraction for outer shell
                  if (dist >= 1.5) {
                      col = mix(col, vec3(0.2, 0.0, 0.4), 0.5);
                  }
                  
                  break;
              }
              
              glow += 0.002 / (0.05 + abs(d));
              t += d * 0.7;
              if(t > 15.0) break;
          }
          
          // Core glow
          col += vec3(1.0, 0.2, 0.6) * glow * 0.6;
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const CrystallineVoidEngineHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#030105] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(3, 1, 5, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);