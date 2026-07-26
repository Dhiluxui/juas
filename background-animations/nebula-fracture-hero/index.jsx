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
      
      // 3D Noise for nebula
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
          for(int i = 0; i < 4; i++) {
              f += w * noise(p);
              p *= 2.0; w *= 0.5;
          }
          return f;
      }

      // Voronoi-based fracturing
      float voronoi(vec3 p) {
          vec3 n = floor(p);
          vec3 f = fract(p);
          float d = 1.0;
          for(int y = -1; y <= 1; y++)
          for(int x = -1; x <= 1; x++)
          for(int z = -1; z <= 1; z++) {
              vec3 g = vec3(float(x), float(y), float(z));
              vec3 r = g - f + hash(n + g);
              float d2 = dot(r, r);
              if(d2 < d) d = d2;
          }
          return d;
      }

      float mapGlass(vec3 p) {
          // A wall of fractured glass
          float d = p.z; // infinite plane
          float v = voronoi(p * 2.0);
          d += smoothstep(0.0, 0.1, v) * 0.1; // Add displacement from fractures
          
          return max(d, p.z - 0.2); // make it a thin slab
      }

      vec3 calcNormal(vec3 p) {
          vec2 e = vec2(0.005, 0.0);
          return normalize(vec3(
              mapGlass(p + e.xyy) - mapGlass(p - e.xyy),
              mapGlass(p + e.yxy) - mapGlass(p - e.yxy),
              mapGlass(p + e.yyx) - mapGlass(p - e.yyx)
          ));
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3((m.x - 0.5) * 2.0, (m.y - 0.5) * 2.0, -3.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          bool hitGlass = false;
          vec3 glassNormal = vec3(0.0);
          
          for(int i = 0; i < 60; i++) {
              vec3 p = ro + rd * t;
              float d = mapGlass(p);
              
              if(d < 0.002) {
                  hitGlass = true;
                  glassNormal = calcNormal(p);
                  break;
              }
              
              t += d * 0.5;
              if(t > 5.0) break;
          }
          
          if (hitGlass) {
              // Refract ray through the glass
              vec3 rdIn = refract(rd, glassNormal, 1.0 / 1.5);
              if (length(rdIn) == 0.0) rdIn = reflect(rd, glassNormal); // TIR
              
              vec3 p = ro + rd * t;
              
              // Raymarch the nebula behind the glass
              vec3 ro2 = p + rdIn * 0.01;
              float t2 = 0.0;
              float nebulaDensity = 0.0;
              
              for(int i = 0; i < 40; i++) {
                  vec3 p2 = ro2 + rdIn * t2;
                  float n = fbm(p2 * 1.5 + vec3(0.0, 0.0, uTime * 0.2));
                  float mask = smoothstep(0.4, 0.8, n);
                  nebulaDensity += mask * 0.05;
                  t2 += 0.1;
              }
              
              // Nebula color
              vec3 nebulaColor = mix(vec3(0.1, 0.6, 1.0), vec3(0.8, 0.1, 1.0), sin(uTime * 0.5) * 0.5 + 0.5);
              
              // Crack edge highlighting
              float v = voronoi(p * 2.0);
              float cracks = smoothstep(0.05, 0.0, v);
              
              float fre = pow(1.0 - max(dot(glassNormal, -rd), 0.0), 3.0);
              
              col = nebulaColor * nebulaDensity;
              col += vec3(1.0) * cracks * 2.0 * nebulaColor; // Glowing cracks
              col += vec3(1.0) * fre * 0.5; // Glass reflection
          }
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const NebulaFractureHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#010103] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(1, 1, 3, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);