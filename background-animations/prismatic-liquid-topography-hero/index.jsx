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

      float noise(vec2 p) {
          return sin(p.x * 1.5 + uTime * 0.5) * sin(p.y * 1.5 - uTime * 0.3);
      }
      
      float map(vec3 p) {
          // Topography heightmap
          float h = 0.0;
          h += sin(p.x * 2.0 + uTime * 0.5) * 0.5;
          h += cos(p.z * 1.5 - uTime * 0.3) * 0.5;
          h += sin((p.x + p.z) * 4.0 + uTime) * 0.1;
          
          return p.y - h;
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

          vec3 ro = vec3(uTime * 0.5, 3.0, uTime * 0.5);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.yz *= rot(radians(50.0)); // look down
          
          rd.xy *= rot((m.x - 0.5) * 1.5);
          rd.xz *= rot((m.y - 0.5) * 1.0);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          
          for(int i = 0; i < 90; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.01) {
                  vec3 n = calcNormal(p);
                  
                  // Caustic-like light pattern on the topography
                  float caustic = sin(p.x * 10.0 + uTime) * cos(p.z * 10.0 - uTime);
                  caustic = smoothstep(0.8, 1.0, caustic);
                  
                  vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
                  float diff = max(dot(n, lightDir), 0.0);
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
                  float spec = pow(max(dot(reflect(rd, n), lightDir), 0.0), 64.0);
                  
                  // Prismatic color mapping
                  vec3 prism = 0.5 + 0.5 * cos(3.14159 * 2.0 * (p.y * 0.5 + p.z * 0.1 + vec3(0.0, 0.33, 0.67)));
                  
                  col = prism * (diff * 0.5 + 0.5) + vec3(1.0) * spec * 2.0;
                  col += caustic * prism * 3.0;
                  col += fre * vec3(1.0, 0.9, 1.0);
                  break;
              }
              
              t += d * 0.6;
              if(t > 15.0) break;
          }
          
          col = mix(col, vec3(0.02, 0.0, 0.05), smoothstep(5.0, 15.0, t));
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const PrismaticLiquidTopographyHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#05000a] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(5, 0, 10, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);