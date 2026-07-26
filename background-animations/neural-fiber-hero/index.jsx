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

      float hash(vec3 p) {
          p = fract(p * vec3(123.34, 456.21, 567.89));
          p += dot(p, p.zyx + 31.32);
          return fract(p.x * p.y * p.z);
      }

      float map(vec3 p) {
          vec3 q = p;
          q.xz *= rot(q.y * 0.1 + uTime * 0.2);
          
          vec3 c = vec3(1.5);
          vec3 id = floor(q / c);
          q = mod(q + 0.5*c, c) - 0.5*c;
          
          float h = hash(id);
          
          // Connect neighboring nodes (fake by using cross cylinders)
          float d1 = length(q.xy) - 0.02;
          float d2 = length(q.xz) - 0.02;
          float d3 = length(q.yz) - 0.02;
          
          float lines = min(d1, min(d2, d3));
          
          // Nodes
          float nodes = length(q) - (0.05 + h * 0.05);
          
          return min(lines, nodes);
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3(uTime * 0.5, uTime * 0.3, uTime * 0.8);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.5);
          rd.xz *= rot((m.y - 0.5) * 1.5);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          float glow = 0.0;
          
          for(int i = 0; i < 90; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.005) {
                  // Basic hit color
                  col += vec3(0.05, 0.4, 0.9) * 0.1;
              }
              
              glow += 0.001 / (0.01 + d * d);
              t += d * 0.6 + 0.005; // prevent sticking
              if(t > 12.0) break;
          }
          
          // Data pulses
          vec3 p = ro + rd * t;
          float pulse = sin(p.x * 2.0 + uTime * 5.0) * sin(p.y * 2.0 - uTime * 4.0) * sin(p.z * 2.0 + uTime * 3.0);
          pulse = smoothstep(0.8, 1.0, pulse);
          
          vec3 glowCol = mix(vec3(0.1, 0.5, 1.0), vec3(0.9, 0.2, 1.0), sin(p.z * 0.5 + uTime) * 0.5 + 0.5);
          
          col += glowCol * glow * 0.3;
          col += vec3(1.0, 0.9, 1.0) * pulse * glow * 1.5; // Bright data packets
          
          col *= exp(-0.2 * t);
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const NeuralFiberHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#020104] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(2, 1, 4, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);