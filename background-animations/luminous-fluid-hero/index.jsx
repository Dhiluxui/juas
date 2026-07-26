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

      // 3D Value Noise for fluid
      float hash(vec3 p) {
          p = fract(p * vec3(123.34, 456.21, 567.89));
          p += dot(p, p.zyx + 31.32);
          return fract(p.x * p.y * p.z);
      }
      
      float noise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          
          return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                         mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                         mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }

      float fbm(vec3 p) {
          float f = 0.0;
          float w = 0.5;
          for(int i = 0; i < 4; i++) {
              f += w * noise(p);
              p *= 2.0;
              w *= 0.5;
          }
          return f;
      }

      float map(vec3 p) {
          float n = fbm(p + vec3(0.0, uTime * 0.2, uTime * 0.1));
          return length(p) - (1.0 + n * 2.0); // Fluid blob
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3(0.0, 0.0, -4.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          // Mouse interaction (warp the ray direction)
          rd.xy += (m - 0.5) * 0.5;
          rd = normalize(rd);
          
          float t = 0.0;
          float glow = 0.0;
          
          for(int i = 0; i < 70; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.01) {
                  // Volumetric accumulation instead of solid hit
                  glow += 0.05 / (0.01 + abs(d));
              }
              
              glow += 0.01 / (0.1 + abs(d)); // ambient glow
              t += max(d * 0.5, 0.05); // step forward
              
              if(t > 8.0) break;
          }
          
          vec3 col1 = vec3(0.1, 0.8, 0.4); // Neon green
          vec3 col2 = vec3(0.9, 0.2, 0.8); // Magenta
          
          vec3 baseColor = mix(col1, col2, sin(uTime * 0.5 + uv.x) * 0.5 + 0.5);
          vec3 col = baseColor * glow * 0.15;
          
          col *= exp(-0.2 * t);
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const LuminousFluidHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#020301] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(2, 3, 1, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);