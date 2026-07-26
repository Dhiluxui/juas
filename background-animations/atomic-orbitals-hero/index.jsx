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

      float sdTorus( vec3 p, vec2 t ) {
          vec2 q = vec2(length(p.xz)-t.x,p.y);
          return length(q)-t.y;
      }

      float map(vec3 p) {
          float d = 1e10;
          
          for(int i = 0; i < 4; i++) {
              vec3 q = p;
              float fi = float(i);
              
              // Rotate each orbital differently
              q.xy *= rot(uTime * 0.5 + fi * 1.2);
              q.xz *= rot(uTime * 0.3 + fi * 2.1);
              q.yz *= rot(uTime * 0.7 - fi * 0.8);
              
              float r1 = 1.0 + sin(uTime * 2.0 + fi) * 0.1;
              float r2 = 0.02 + sin(uTime * 5.0 + fi * 3.0) * 0.01;
              
              float torus = sdTorus(q, vec2(r1, r2));
              d = min(d, torus);
          }
          
          // Core nucleus
          float core = length(p) - (0.2 + sin(uTime * 8.0) * 0.05);
          d = min(d, core);
          
          return d;
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3(0.0, 0.0, -4.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.5);
          rd.yz *= rot((m.y - 0.5) * 1.5);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          float glow = 0.0;
          
          for(int i = 0; i < 80; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.005) {
                  // Solid hit (nucleus mostly)
                  vec3 n = normalize(p); // approx normal for sphere
                  col += vec3(0.1, 0.5, 1.0) * max(dot(n, vec3(0.0, 0.0, -1.0)), 0.0);
                  break;
              }
              
              // Quantum orbital glow
              glow += 0.0015 / (0.005 + d * d);
              t += d * 0.5;
              if(t > 8.0) break;
          }
          
          // Background stars
          float starNoise = fract(sin(dot(rd.xy, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 stars = vec3(pow(starNoise, 150.0)) * 2.0;

          vec3 glowColor = mix(vec3(0.0, 0.6, 1.0), vec3(0.8, 0.2, 1.0), sin(uTime * 0.5) * 0.5 + 0.5);
          col += glowColor * glow * 0.2;
          col += stars * (1.0 - glow * 0.1); // fade stars behind orbitals
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0); // ACES
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const AtomicOrbitalsHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#000002] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 2, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);