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
          // Accretion disk
          float disk = length(vec2(length(p.xz) - 2.0, p.y)) - 0.05;
          return disk;
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3(0.0, 1.5, -6.0); // Slightly above
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.0);
          rd.yz *= rot((m.y - 0.5) * 1.0);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          float glow = 0.0;
          
          // Black hole event horizon (sphere at origin)
          vec3 bhPos = vec3(0.0);
          float bhRadius = 1.0;
          
          for(int i = 0; i < 90; i++) {
              vec3 p = ro + rd * t;
              
              // Gravitational lensing - bend ray towards black hole
              vec3 toBH = bhPos - p;
              float distBH = length(toBH);
              
              if(distBH < bhRadius) {
                  col *= 0.0; // absolute black inside horizon
                  break; 
              }
              
              // Deflect ray based on gravity
              float gravity = 0.08 / (distBH * distBH); // Inverse square law approx
              rd = normalize(rd + normalize(toBH) * gravity);
              
              // Distance to accretion disk
              float d = map(p);
              
              // Volumetric accretion disk rendering
              if(d < 0.2) {
                  float density = smoothstep(0.2, 0.0, d);
                  float r = length(p.xz);
                  // Color gradient across the disk
                  vec3 diskCol = mix(vec3(1.0, 0.8, 0.2), vec3(0.8, 0.1, 0.9), smoothstep(1.5, 2.5, r));
                  
                  // Swirling motion
                  float swirl = sin(atan(p.z, p.x) * 10.0 + r * 5.0 - uTime * 4.0);
                  diskCol *= 1.0 + swirl * 0.5;
                  
                  glow += density * 0.05;
                  col += diskCol * density * 0.05;
              }
              
              t += 0.05; // fixed small steps for volumetric raymarching
              if(t > 12.0) break;
          }
          
          // Starfield (warped by gravity!)
          float starNoise = fract(sin(dot(rd.xy, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 stars = vec3(pow(starNoise, 120.0)) * 2.0;
          
          // Photon sphere glow (ring of trapped light)
          vec3 finalRayDist = ro + rd * 12.0;
          float toCenter = length(cross(rd, bhPos - ro)) / length(rd);
          float photonSphere = smoothstep(bhRadius + 0.1, bhRadius, toCenter);
          col += vec3(1.0, 0.5, 0.2) * photonSphere * 2.0 * (1.0 - glow);
          
          col += stars * (1.0 - glow);
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);
          
          gl_FragColor = vec4(col, 1.0);
      }
  `
};

export const CosmicSingularityHero = ({ className = '', children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative w-full h-full bg-[#000000] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);