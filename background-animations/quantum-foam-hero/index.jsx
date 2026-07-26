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

      float sdGyroid(vec3 p) {
          p *= 1.5;
          return abs(dot(sin(p), cos(p.zxy))) / 1.5 - 0.1;
      }

      float map(vec3 p) {
          float d1 = sdGyroid(p);
          float d2 = sdGyroid(p * 2.0 + uTime * 0.2) * 0.5;
          float d3 = sdGyroid(p * 4.0 - uTime * 0.4) * 0.25;
          return d1 * 0.6 + d2 * 0.3 + d3 * 0.1;
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);
          
          vec3 ro = vec3(0.0, 0.0, uTime * 0.3);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.5);
          rd.yz *= rot((m.y - 0.5) * 1.5);
          
          float t = 0.0, d;
          float glow = 0.0;
          
          for(int i = 0; i < 80; i++) {
              vec3 p = ro + rd * t;
              p.xy *= rot(p.z * 0.1); 
              d = map(p);
              
              if(d < 0.005) break;
              
              glow += 0.003 / (0.01 + abs(d));
              t += d * 0.5;
              if(t > 15.0) break;
          }
          
          vec3 p = ro + rd * t;
          vec3 baseColor = mix(vec3(0.05, 0.3, 1.0), vec3(0.9, 0.1, 0.8), sin(p.z * 0.5 + uTime) * 0.5 + 0.5);
          
          vec3 col = baseColor * glow * 0.9;
          col *= exp(-0.15 * t);
          
          // Vignette
          col *= 1.0 - length(uv) * 0.6;
          
          // Tone mapping (ACES filmic approx)
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const QuantumFoamHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#030107] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(3, 1, 7, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);