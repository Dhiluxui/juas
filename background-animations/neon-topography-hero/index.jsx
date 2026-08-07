import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, Waves, Layers, Feather, ShieldCheck, Zap } from 'lucide-react';

// Utility to convert hex to normalized RGB for GLSL shaders
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
  speed = 0.35,
  color1 = '#02133d', // Deep navy fold shadow
  color2 = '#005ce6', // Rich vibrant silk blue
  color3 = '#00d5ff', // Bright cyan sheen
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

    // Scene & Orthographic Camera setup for full-screen quad rendering
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      alpha: false,
      powerPreference: 'high-performance' 
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

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

      // 3D Simplex Noise Implementation
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

      float snoise(vec3 v){
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

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

        float n_ = 1.0/7.0;
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
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      // Smooth diagonal fabric drapery heightmap
      float getSilkHeight(vec2 pos, float t) {
          // Rotate coordinates ~ -42 degrees for diagonal drape orientation
          float angle = -0.72;
          float ca = cos(angle), sa = sin(angle);
          vec2 rp = vec2(pos.x * ca - pos.y * sa, pos.x * sa + pos.y * ca);

          // Soft organic warp across folds for natural drape curvature
          float warp1 = snoise(vec3(rp * 0.6, t * 0.12)) * 0.45;
          float warp2 = snoise(vec3(rp * 1.5 + vec2(3.1, 1.7), t * 0.18)) * 0.18;
          
          float x = rp.x + warp1 + warp2;

          // Continuous diagonal folds
          float wave1 = sin(x * 3.8 + t * 0.35);
          float wave2 = sin(x * 7.5 - t * 0.25) * 0.35;
          float wave3 = cos(x * 11.2 + t * 0.4) * 0.15;

          float yMod = 1.0 + 0.2 * sin(rp.y * 1.2 + t * 0.15);

          float h = (wave1 + wave2 + wave3) * yMod;

          return h * 0.42 + 0.5;
      }

      void main() {
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 p = uv * 2.0 - 1.0;
          p.x *= u_resolution.x / u_resolution.y;

          p += u_mouse * 0.03; // Interactive subtle mouse drift

          float t = u_time * u_speed;

          // Compute surface height
          float h = getSilkHeight(p, t);

          // Calculate surface normals
          float eps = 0.008;
          float hR = getSilkHeight(p + vec2(eps, 0.0), t);
          float hL = getSilkHeight(p - vec2(eps, 0.0), t);
          float hT = getSilkHeight(p + vec2(0.0, eps), t);
          float hB = getSilkHeight(p - vec2(0.0, eps), t);

          vec3 dx = vec3(2.0 * eps, 0.0, hR - hL);
          vec3 dy = vec3(0.0, 2.0 * eps, hT - hB);
          
          vec3 normal = normalize(cross(dx, dy));

          // Directional lighting
          vec3 lightDir = normalize(vec3(-0.4, 0.6, 0.8));
          vec3 viewDir = vec3(0.0, 0.0, 1.0);
          vec3 halfVec = normalize(lightDir + viewDir);

          float NdotL = dot(normal, lightDir);
          float wrapDiffuse = NdotL * 0.5 + 0.5;

          // Satin specular & sheen highlights
          float NdotH = max(dot(normal, halfVec), 0.0);
          float satinSheen = pow(NdotH, 14.0) * 0.7;
          float broadGloss  = pow(NdotH, 5.0) * 0.35;

          // Base color ramp: Deep Shadow -> Mid Blue Silk -> Sky Sheen
          vec3 baseColor = mix(u_color1, u_color2, smoothstep(0.15, 0.85, wrapDiffuse));
          
          vec3 finalColor = mix(baseColor, u_color3, smoothstep(0.4, 0.95, h) * 0.65);
          
          finalColor += u_color3 * (satinSheen + broadGloss);
          finalColor += u_color2 * 0.15;

          // Gentle vignette
          float vig = length(uv - 0.5);
          finalColor *= 1.0 - pow(vig, 2.0) * 0.15;

          gl_FragColor = vec4(finalColor, 1.0);
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

    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
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
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      
      targetMouseRef.current.set((x - 0.5) * 2.0, (y - 0.5) * 2.0);
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMouseMove);

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

  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_color1.value = hexToRgbVec3(color1);
      uniformsRef.current.u_color2.value = hexToRgbVec3(color2);
      uniformsRef.current.u_color3.value = hexToRgbVec3(color3);
    }
  }, [speed, color1, color2, color3]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#000514] font-sans ${className}`}>
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Optional Overlay Content Wrapper */}
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

export default function App() {
  return (
    <FluidPlasmaBackground 
      speed={0.35}
      color1="#02133d" // Deep navy fold shadow
      color2="#005ce6" // Rich vibrant silk blue
      color3="#00d5ff" // Bright cyan sheen
    >
    </FluidPlasmaBackground>
  );
}