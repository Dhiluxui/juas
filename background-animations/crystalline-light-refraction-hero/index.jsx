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

      float sdOctahedron( vec3 p, float s) {
          p = abs(p);
          return (p.x+p.y+p.z-s)*0.57735027;
      }

      float map(vec3 p) {
          vec3 q = p;
          
          // Giant central crystal cluster
          q.xy *= rot(uTime * 0.1);
          q.xz *= rot(uTime * 0.15);
          
          float d = 1e10;
          
          // Main crystal
          d = min(d, sdOctahedron(q, 2.0));
          
          // Intersecting shards
          for(int i = 0; i < 4; i++) {
              vec3 c = q;
              float fi = float(i);
              c.xy *= rot(fi * 1.618);
              c.xz *= rot(fi * 2.14);
              c += vec3(0.5, 0.0, 0.0); // offset
              float shard = sdOctahedron(c, 1.5);
              d = min(d, shard);
          }
          
          // Slice it with planes for sharp edges
          float plane1 = dot(q, normalize(vec3(1.0, 1.0, 1.0))) - 1.2;
          float plane2 = dot(q, normalize(vec3(-1.0, 1.0, -0.5))) - 1.0;
          d = max(d, -plane1);
          d = max(d, -plane2);
          
          return d;
      }

      vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.005, 0.0);
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

          vec3 ro = vec3(0.0, 0.0, -5.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.5);
          rd.yz *= rot((m.y - 0.5) * 1.5);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          
          for(int i = 0; i < 100; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.002) {
                  vec3 n = calcNormal(p);
                  
                  // Intense chromatic aberration via 3 distinct refract rays
                  vec3 rdR = refract(rd, n, 1.0 / 1.4);
                  vec3 rdG = refract(rd, n, 1.0 / 1.45);
                  vec3 rdB = refract(rd, n, 1.0 / 1.5);
                  
                  if (length(rdR) == 0.0) rdR = reflect(rd, n);
                  if (length(rdG) == 0.0) rdG = reflect(rd, n);
                  if (length(rdB) == 0.0) rdB = reflect(rd, n);
                  
                  // Sample environmental light based on refracted rays
                  float r = max(0.0, sin(rdR.x * 10.0 + uTime) * sin(rdR.y * 10.0));
                  float g = max(0.0, sin(rdG.x * 10.0 + uTime + 1.0) * sin(rdG.y * 10.0));
                  float b = max(0.0, sin(rdB.x * 10.0 + uTime + 2.0) * sin(rdB.y * 10.0));
                  
                  vec3 refractionColor = vec3(r, g, b) * 2.0;
                  
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
                  vec3 spec = vec3(1.0) * pow(max(dot(reflect(rd, n), normalize(vec3(1.0, 1.0, -1.0))), 0.0), 64.0);
                  
                  col = refractionColor * (1.0 - fre) + vec3(1.0) * fre + spec * 2.0;
                  break;
              }
              
              t += d * 0.6;
              if(t > 10.0) break;
          }
          
          // Outer glow
          col += vec3(0.2, 0.5, 1.0) * 0.02 * exp(-t * 0.5);
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const CrystallineLightRefractionHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#010204] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(1, 2, 4, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);