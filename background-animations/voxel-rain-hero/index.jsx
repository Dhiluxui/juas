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

      float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float map(vec3 p) {
          vec3 q = p;
          
          // Create grid
          vec3 c = vec3(1.5, 0.0, 1.5);
          vec2 id = floor(q.xz / c.xz);
          q.xz = mod(q.xz + 0.5*c.xz, c.xz) - 0.5*c.xz;
          
          float h = hash(id);
          
          // Falling speed based on id
          float yOffset = fract(uTime * (0.2 + h * 0.5) + h) * 15.0 - 5.0;
          q.y -= yOffset;
          
          // Voxel box
          vec3 d = abs(q) - vec3(0.3, 0.8 * h + 0.2, 0.3);
          return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0) - 0.05;
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

          vec3 ro = vec3(uTime, 8.0, uTime); // flying above
          vec3 rd = normalize(vec3(uv, 1.0));
          
          // Look down
          rd.yz *= rot(radians(60.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.5);
          rd.xz *= rot((m.y - 0.5) * 1.0);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          float glow = 0.0;
          
          for(int i = 0; i < 90; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.002) {
                  vec3 n = calcNormal(p);
                  vec2 id = floor(p.xz / 1.5);
                  float h = hash(id);
                  
                  // Cyberpunk colors
                  vec3 baseCol = mix(vec3(0.0, 0.8, 1.0), vec3(1.0, 0.1, 0.5), h);
                  
                  float diff = max(dot(n, normalize(vec3(1.0, 2.0, 1.0))), 0.0);
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
                  
                  // Fake window/neon lights
                  float lights = step(0.95, fract(p.y * 10.0 + h)) * step(0.8, hash(vec2(p.y, h)));
                  
                  col = baseCol * (diff * 0.2 + 0.1) + fre * baseCol + lights * baseCol * 2.0;
                  
                  // Ground plane reflection (faux)
                  if(p.y < -5.0) {
                      col = mix(col, vec3(0.0), 0.5);
                  }
                  break;
              }
              
              // Neon fog / glow
              glow += 0.001 / (0.05 + abs(d));
              t += d * 0.7;
              if(t > 30.0) break;
          }
          
          col += vec3(0.1, 0.4, 0.8) * glow * 0.2;
          col = mix(col, vec3(0.01, 0.01, 0.05), smoothstep(10.0, 30.0, t)); // depth fog
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const VoxelRainHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#030107] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 10%, rgba(3, 1, 7, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);