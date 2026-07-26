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
          vec3 q = fract(p) - 0.5;
          
          for(int i = 0; i < 4; i++) {
              q = abs(q) - 0.15;
              if (q.x < q.y) q.xy = q.yx;
              if (q.y < q.z) q.yz = q.zy;
              if (q.x < q.z) q.xz = q.zx;
          }
          
          vec3 d = abs(q) - 0.04;
          return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
      }

      vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.001, 0.0);
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
          
          vec3 ro = vec3(uTime * 0.1, uTime * 0.05, uTime * 0.2);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot(uTime * 0.05 + (m.x - 0.5));
          rd.xz *= rot(uTime * 0.05 + (m.y - 0.5));
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          float ao = 0.0;
          
          for(int i = 0; i < 100; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if (d < 0.001) {
                  vec3 n = calcNormal(p);
                  float fresnel = max(dot(n, -rd), 0.0);
                  
                  // Faux ambient occlusion based on step count
                  ao = 1.0 - float(i) / 100.0;
                  
                  // Rich iridescence
                  vec3 iridescence = 0.5 + 0.5 * cos(3.14159 * 2.0 * (fresnel * 1.8 + p.z * 0.2 + vec3(0.0, 0.33, 0.67) + uTime * 0.1));
                  
                  vec3 lightDir = normalize(vec3(1.0, 2.0, -3.0));
                  float spec = pow(max(dot(reflect(rd, n), lightDir), 0.0), 64.0);
                  float diff = max(dot(n, lightDir), 0.0);
                  
                  col = iridescence * (diff * 0.6 + 0.4) * ao + spec * iridescence * 2.0;
                  break;
              }
              
              t += d * 0.6; 
              if (t > 8.0) break; 
          }
          
          col = mix(col, vec3(0.0), smoothstep(2.0, 8.0, t));
          col = pow(col, vec3(0.4545)); // Gamma

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
  `
};

export const BismuthLabyrinthHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#000000] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(0, 0, 0, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);