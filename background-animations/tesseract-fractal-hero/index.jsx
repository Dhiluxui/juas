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
          float t = uTime * 0.2;
          p.xy *= rot(t);
          p.xz *= rot(t * 0.7);

          float d = length(max(abs(p) - vec3(0.8), 0.0)) - 0.1; 
          float s = 1.0;
          for(int i = 0; i < 5; i++) {
              vec3 a = mod(p * s, 2.0) - 1.0;
              s *= 2.5; 
              vec3 r = abs(1.0 - 3.0 * abs(a));
              float da = max(r.x, r.y);
              float db = max(r.y, r.z);
              float dc = max(r.z, r.x);
              float c = (min(da, min(db, dc)) - 1.0) / s;
              d = max(d, c);
          }
          return d;
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

          vec3 ro = vec3(0.0, 0.0, -3.5);
          vec3 rd = normalize(vec3(uv, 1.0)); 
          
          rd.xy *= rot((m.x - 0.5) * 1.5);
          rd.yz *= rot((m.y - 0.5) * 1.5);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          float glow = 0.0;
          
          for(int i = 0; i < 90; i++) {
              vec3 p = ro + rd * t;
              float d = map(p); 
              
              if(d < 0.001) {
                  vec3 n = calcNormal(p);
                  vec3 lightDir = normalize(vec3(sin(uTime), 1.0, cos(uTime)));
                  float diff = max(dot(n, lightDir), 0.0);
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
                  
                  vec3 base = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.0, 0.5), length(p) * 0.4);
                  col = base * (diff + 0.2) + fre * vec3(1.0);
                  break;
              }
              
              glow += 0.002 / (0.01 + abs(d));
              t += d * 0.6; 
              if(t > 8.0) break;
          }

          col += vec3(0.1, 0.4, 0.9) * glow * 0.5;
          col *= exp(-0.15 * t);
          
          // Chromatic aberration / Tone mapping
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const TesseractFractalHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#010103] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(1, 1, 3, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);