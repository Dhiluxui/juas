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

      float sdCylinder( vec3 p, vec3 c ) {
          return length(p.xz-c.xy)-c.z;
      }

      float map(vec3 p) {
          // Magnetic flux lines
          vec3 q = p;
          
          // Warp field based on time
          q.x += sin(q.z * 2.0 + uTime) * 0.2;
          q.y += cos(q.z * 1.5 + uTime * 0.8) * 0.2;
          
          // Domain repetition
          vec3 c = vec3(0.5, 0.5, 0.0);
          q.xy = mod(q.xy + 0.5*c.xy, c.xy) - 0.5*c.xy;
          
          return length(q.xy) - 0.015; // thin lines
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3(0.0, 0.0, uTime * 1.5);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.0);
          rd.yz *= rot((m.y - 0.5) * 1.0);
          
          float t = 0.0;
          float glow = 0.0;
          float minD = 1e10;
          
          for(int i = 0; i < 90; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              minD = min(minD, d);
              
              if(d < 0.002) break;
              
              glow += 0.001 / (0.005 + d * d);
              t += d * 0.5 + 0.01; // prevent stepping too slow
              if(t > 15.0) break;
          }
          
          vec3 p = ro + rd * t;
          
          // Color based on Z position and distance
          vec3 baseColor = mix(vec3(0.9, 0.2, 0.1), vec3(0.1, 0.5, 1.0), sin(p.z * 0.2) * 0.5 + 0.5);
          
          vec3 col = baseColor * glow * 0.5;
          
          // Add a central magnetic "core" glow
          float coreDist = length(uv - vec2((m.x - 0.5)*2.0, (m.y - 0.5)*2.0));
          col += vec3(0.2, 0.6, 1.0) * (0.1 / (0.1 + coreDist * coreDist)) * 0.5;
          
          col *= exp(-0.1 * t);
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const MagneticFieldHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#020105] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(2, 1, 5, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);