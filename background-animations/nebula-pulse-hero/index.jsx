import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, Fingerprint, Aperture, Layers } from 'lucide-react';

// Utility to convert hex to normalized RGB for GLSL
const hexToRgbVec3 = (hex) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? new THREE.Vector3(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      )
    : new THREE.Vector3(1.0, 1.0, 1.0);
};

export const FluidPlasmaBackground = ({
  speed = 1.0,
  color1 = '#02000a', // Deep void indigo/black
  color2 = '#0c14ff', // Glowing electric blue
  color3 = '#df3bff', // Neon pink/purple rim
  children,
  className = '',
}) => {
  const mountRef = useRef(null);
  const uniformsRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      alpha: false,
      powerPreference: 'high-performance' 
    });

    // Cap pixel ratio to ensure smooth performance on heavy fragment shaders
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 2. Uniforms & Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.0, 0.0) },
      u_speed: { value: speed },
      u_color1: { value: hexToRgbVec3(color1) },
      u_color2: { value: hexToRgbVec3(color2) },
      u_color3: { value: hexToRgbVec3(color3) },
    };

    uniformsRef.current = uniforms;

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;

      // ==========================================
      // 3D SIMPLEX NOISE (Ashima Arts)
      // ==========================================
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

      float snoise(vec3 v){
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

        i = mod(i, 289.0 );
        vec4 p = permute( permute( permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        float n_ = 1.0/7.0; // N=7
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                      dot(p2,x2), dot(p3,x3) ) );
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;

          // Parallax mouse effect
          vec2 mouse = u_mouse * 0.1;
          p += mouse;

          float t = u_time * u_speed;

          // ==========================================
          // DOMAIN WARPING (Fluid Motion)
          // ==========================================
          // Warp the coordinates heavily to create fluid, glass-like folds
          vec3 warpP = vec3(p * 1.2, t * 0.2);
          vec2 warp = vec2(
              snoise(warpP),
              snoise(warpP + vec3(43.2, 12.1, 5.3))
          );
          
          vec2 wp = p + warp * 1.5;

          // ==========================================
          // BASE HEIGHT MAP
          // ==========================================
          // Scale determines the size of the blobs
          vec3 hP = vec3(wp * 0.7, t * 0.15);
          float h = snoise(hP);

          // ==========================================
          // FAKE 3D NORMALS
          // ==========================================
          // We compute the slope of the noise to fake a 3D surface
          float eps = 0.08; // Higher = broader, softer glow edges
          float hx = snoise(hP + vec3(eps, 0.0, 0.0));
          float hy = snoise(hP + vec3(0.0, eps, 0.0));
          
          // Z value controls the "steepness" or contrast of the rim light
          vec3 N = normalize(vec3(hx - h, hy - h, 0.1));

          // ==========================================
          // LIGHTING (FRESNEL RIM GLOW)
          // ==========================================
          vec3 V = vec3(0.0, 0.0, 1.0); // View direction (straight into screen)
          // Fresnel calculates how close the surface normal is to perpendicular to the camera
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0); 

          // ==========================================
          // COLOR MIXING
          // ==========================================
          float depth = h * 0.5 + 0.5; // Map noise [-1, 1] to [0, 1]
          
          vec3 colorWhite = vec3(1.0, 0.95, 1.0); // Pure hot core

          // Base void/plasma colors
          vec3 base = mix(u_color1, u_color2, smoothstep(0.1, 0.6, depth));
          
          // Add purple/pink hues into the midtones
          base = mix(base, u_color3, smoothstep(0.4, 0.8, depth) * 0.4);

          // Intense Rim Glow (The magic part)
          vec3 rimColor = mix(u_color3, colorWhite, smoothstep(0.3, 1.0, fresnel));
          base += rimColor * fresnel * 1.8; // Boost intensity

          // ==========================================
          // POST PROCESSING
          // ==========================================
          // ACES Film Tonemapping (prevents white clipping)
          base = clamp((base * (2.51 * base + 0.03)) / (base * (2.43 * base + 0.59) + 0.14), 0.0, 1.0);

          // Subtle vignette
          float vig = length(uv - 0.5) * 2.0;
          base *= 1.0 - pow(vig, 3.0) * 0.3;

          // Heavy Cinematic Grain (matches reference)
          float grain = fract(sin(dot(uv, vec2(12.9898,78.233))) * 43758.5453);
          base += (grain - 0.5) * 0.18;

          gl_FragColor = vec4(base, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 3. Animation & Interaction Loop
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Smooth mouse follow
      mouseRef.current.lerp(targetMouseRef.current, 0.05);
      uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);
      
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // Invert Y
      
      targetMouseRef.current.set((x - 0.5) * 2.0, (y - 0.5) * 2.0);
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMouseMove);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // Graceful prop syncing without rebuilding context
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_color1.value = hexToRgbVec3(color1);
      uniformsRef.current.u_color2.value = hexToRgbVec3(color2);
      uniformsRef.current.u_color3.value = hexToRgbVec3(color3);
    }
  }, [speed, color1, color2, color3]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black font-sans ${className}`}>
      {/* 3D Canvas Background */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Foreground Content Wrapper */}
      {children && (
        <div className="relative z-10 w-full h-full min-h-screen flex items-center justify-center pointer-events-none p-6">
          <div className="pointer-events-auto w-full max-w-7xl">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};


// ==========================================
// DEMO UI TO SHOWCASE THE BACKGROUND
// ==========================================
export default function App() {
  return (
    <FluidPlasmaBackground 
      speed={0.8}
      color1="#02000a" // Deep void indigo
      color2="#0c14ff" // Glowing electric blue
      color3="#df3bff" // Neon pink/purple rim
    >
    </FluidPlasmaBackground>
  );
}