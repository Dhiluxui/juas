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

      float sdBox(vec3 p, vec3 b) {
          vec3 q = abs(p) - b;
          return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
      }

      float map(vec3 p) {
          vec3 q = p;
          q.xy *= rot(uTime * 0.1);
          q.xz *= rot(uTime * 0.15);
          
          float d = 1e10;
          for(int i = 0; i < 4; i++) {
              q = abs(q) - 0.4;
              q.xy *= rot(0.5);
              d = min(d, sdBox(q, vec3(0.2, 1.5, 0.2)));
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

      // Chromatic dispersion raymarching
      vec3 render(vec3 ro, vec3 rd, vec2 uv) {
          vec3 col = vec3(0.0);
          float t = 0.0;
          
          for(int i = 0; i < 70; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.001) {
                  vec3 n = calcNormal(p);
                  
                  // Fake internal refraction / dispersion
                  vec3 refR = reflect(rd, n);
                  vec3 refG = reflect(rd, n + vec3(0.01));
                  vec3 refB = reflect(rd, n + vec3(0.02));
                  
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
                  
                  // Ambient environment sampling (fake)
                  vec3 envR = vec3(0.8, 0.2, 0.1) * (refR.y * 0.5 + 0.5);
                  vec3 envG = vec3(0.1, 0.8, 0.3) * (refG.y * 0.5 + 0.5);
                  vec3 envB = vec3(0.1, 0.3, 0.9) * (refB.y * 0.5 + 0.5);
                  
                  vec3 glassCol = vec3(envR.r, envG.g, envB.b);
                  
                  col = glassCol * (1.0 - fre) + vec3(1.0) * fre * 0.5;
                  
                  // Transparency - continue ray
                  ro = p + rd * 0.01;
                  t = 0.0; // reset local t
                  // return col; // if opaque
              }
              
              t += d * 0.7;
              if(t > 6.0) break;
          }
          
          return col * exp(-0.2 * t);
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3(0.0, 0.0, -3.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.5);
          rd.yz *= rot((m.y - 0.5) * 1.5);
          
          vec3 col = render(ro, rd, uv);
          
          // Background glow
          float bgGlow = max(0.0, 1.0 - length(uv));
          col += mix(vec3(0.1, 0.0, 0.2), vec3(0.0, 0.2, 0.4), uv.y + 0.5) * bgGlow;
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const PrismaticDepthHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#0a0510] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(10, 5, 16, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);