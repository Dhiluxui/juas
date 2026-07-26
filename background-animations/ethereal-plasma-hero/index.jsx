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
          float f = 0.0, w = 0.5;
          for(int i = 0; i < 5; i++) {
              f += w * noise(p);
              p *= 2.0; w *= 0.5;
          }
          return f;
      }

      float map(vec3 p) {
          // Twist space
          p.xy *= rot(p.z * 0.1 + uTime * 0.1);
          float n = fbm(p + vec3(uTime * 0.2, uTime * 0.1, 0.0));
          
          // Form a dense cloud tube
          float tube = length(p.xy) - (2.0 + n * 4.0);
          return tube;
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3(0.0, 0.0, -3.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 2.0);
          rd.yz *= rot((m.y - 0.5) * 2.0);
          
          float t = 0.0;
          float density = 0.0;
          vec3 col = vec3(0.0);
          
          // Volumetric raymarching
          for(int i = 0; i < 70; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.0) {
                  // Inside the plasma cloud
                  float localDensity = -d * 0.1;
                  density += localDensity;
                  
                  // Color gradient through the volume based on position and time
                  vec3 c1 = vec3(0.8, 0.1, 0.9); // Magenta
                  vec3 c2 = vec3(0.1, 0.6, 1.0); // Cyan
                  vec3 c3 = vec3(0.0, 0.05, 0.3); // Deep blue
                  
                  float mixFactor = sin(p.z * 0.5 + uTime) * 0.5 + 0.5;
                  vec3 baseCol = mix(c3, mix(c1, c2, mixFactor), smoothstep(0.0, 2.0, density));
                  
                  col += baseCol * localDensity * exp(-0.1 * density); // Faux scattering
              }
              
              t += max(abs(d) * 0.5, 0.1); // Step safely
              if(t > 15.0 || density > 5.0) break;
          }
          
          // Outer cosmic background glow
          col += vec3(0.1, 0.0, 0.2) * (1.0 - length(uv));
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0); // ACES
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const EtherealPlasmaBackgroundHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#050010] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(5, 0, 16, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);