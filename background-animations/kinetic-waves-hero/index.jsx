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
          
          // Domain repetition for segmented columns
          vec3 c = vec3(1.0, 0.0, 1.0);
          vec2 id = floor(q.xz / c.xz);
          q.xz = mod(q.xz + 0.5*c.xz, c.xz) - 0.5*c.xz;
          
          // Kinetic wave math
          float wave = sin(id.x * 0.5 + id.y * 0.5 + uTime * 2.0) * 1.5;
          q.y -= wave;
          
          // Individual moving segments
          float segOffset = sin(id.x * 2.0 + uTime * 4.0) * 0.2;
          
          float col1 = sdBox(q, vec3(0.4, 0.1, 0.4)); // Top cap
          float col2 = sdBox(q - vec3(0.0, -0.5 + segOffset, 0.0), vec3(0.35, 0.3, 0.35)); // segment
          float col3 = sdBox(q - vec3(0.0, -1.2 - segOffset, 0.0), vec3(0.35, 0.3, 0.35)); // segment
          
          return min(col1, min(col2, col3)) - 0.02; // rounded edges
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

          vec3 ro = vec3(uTime * 0.5, 5.0, uTime * 0.5);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.yz *= rot(radians(50.0)); // look down
          rd.xy *= rot((m.x - 0.5) * 1.0);
          rd.xz *= rot(radians(45.0)); // isometric angle
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          
          for(int i = 0; i < 100; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.005) {
                  vec3 n = calcNormal(p);
                  
                  vec3 lightDir = normalize(vec3(1.0, 2.0, -1.0));
                  float diff = max(dot(n, lightDir), 0.0);
                  
                  vec3 halfVec = normalize(lightDir - rd);
                  float spec = pow(max(dot(n, halfVec), 0.0), 32.0);
                  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
                  
                  // Color mapped by height and position
                  vec3 baseColor = mix(vec3(0.1, 0.8, 1.0), vec3(0.9, 0.1, 0.5), sin(p.y * 0.5 + uTime) * 0.5 + 0.5);
                  
                  float ao = clamp(p.y * 0.2 + 1.0, 0.0, 1.0); // fake AO near ground
                  
                  col = baseColor * (diff * 0.5 + 0.2) * ao;
                  col += spec * baseColor + fre * vec3(1.0);
                  break;
              }
              
              t += d * 0.7;
              if(t > 20.0) break;
          }
          
          col = mix(col, vec3(0.01, 0.01, 0.03), smoothstep(10.0, 20.0, t)); // depth fog
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const KineticWavesHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
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