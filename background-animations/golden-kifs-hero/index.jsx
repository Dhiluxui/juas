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

      // highly structured folding
      vec3 fold(vec3 p) {
          for(int i = 0; i < 5; i++) {
              p = abs(p) - 0.5;
              float r2 = dot(p, p);
              p *= 1.3 / r2;
          }
          return p;
      }

      float map(vec3 p) {
          float scale = 1.0;
          for(int i = 0; i < 8; i++) {
              p = 2.0 * clamp(p, -vec3(0.5, 0.8, 0.5), vec3(0.5, 0.8, 0.5)) - p;
              float r2 = dot(p, p);
              float k = max(0.5 / r2, 1.0);
              p *= k;
              scale *= k;
              
              // rotate
              p.xy *= rot(0.2);
              p.yz *= rot(0.1);
          }
          return (length(p) - 0.2) / scale;
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

          vec3 ro = vec3(0.0, 0.0, -1.8);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.0);
          rd.yz *= rot((m.y - 0.5) * 1.0);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          float glow = 0.0;
          
          for(int i = 0; i < 120; i++) {
              vec3 p = ro + rd * t;
              p.xy *= rot(uTime * 0.05);
              p.xz *= rot(uTime * 0.08);
              
              float d = map(p);
              
              if(d < 0.001) {
                  vec3 n = calcNormal(p);
                  
                  // Intense lighting
                  vec3 light1 = normalize(vec3(1.0, 1.0, -1.0));
                  vec3 light2 = normalize(vec3(-1.0, -0.5, -0.5));
                  
                  float diff1 = max(dot(n, light1), 0.0);
                  float diff2 = max(dot(n, light2), 0.0);
                  
                  float spec1 = pow(max(dot(reflect(rd, n), light1), 0.0), 64.0);
                  float spec2 = pow(max(dot(reflect(rd, n), light2), 0.0), 32.0);
                  
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
                  
                  float ao = 1.0 - float(i) / 120.0;
                  
                  // Hyper-polished gold
                  vec3 gold = vec3(1.0, 0.7, 0.2);
                  vec3 darkGold = vec3(0.3, 0.1, 0.0);
                  
                  col = mix(darkGold, gold, diff1) * ao;
                  col += gold * spec1 * 3.0; // intense specular
                  col += vec3(1.0, 0.5, 0.1) * diff2 * 0.5 * ao;
                  col += vec3(1.0, 0.9, 0.5) * fre * 2.0 * ao;
                  break;
              }
              
              glow += 0.0005 / (0.01 + abs(d)); // inner structural glow
              
              t += d * 0.6;
              if(t > 4.0) break;
          }
          
          // Outer bloom/glow
          col += vec3(1.0, 0.6, 0.1) * glow * 0.5;
          col *= exp(-0.3 * t); // fade to black
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const GoldenKifsHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#000000] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);