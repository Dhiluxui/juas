import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface EtherealFluidProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Base Void Color */
  colorVoid?: string;
  /** @title Primary Neon Color */
  colorPrimary?: string;
  /** @title Secondary Neon Color */
  colorSecondary?: string;
  /** @title Mouse Interaction Strength */
  mouseStrength?: number;
  /** @title Children (Overlay) */
  children?: React.ReactNode;
  /** @title Extra Classes */
  className?: string;
}

export default function App({
  speed = 0.5,
  colorVoid = '#030008',
  colorPrimary = '#0D99FF',
  colorSecondary = '#FF007F',
  mouseStrength = 0.8,
  children,
  className = '',
}: EtherealFluidProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouseRef = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    
    // Orthographic camera is perfect for 2D flat shaders
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    
    mountRef.current.appendChild(renderer.domElement);

    // Helper to convert hex to normalized RGB for GLSL
    const hexToRgbVec3 = (hex: string) => {
      const color = new THREE.Color(hex);
      return new THREE.Vector3(color.r, color.g, color.b);
    };

    // 2. Uniforms & Shader Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_colorVoid: { value: hexToRgbVec3(colorVoid) },
      u_color1: { value: hexToRgbVec3(colorPrimary) },
      u_color2: { value: hexToRgbVec3(colorSecondary) },
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      
      uniform vec3 u_colorVoid;
      uniform vec3 u_color1;
      uniform vec3 u_color2;

      varying vec2 vUv;

      // 2D Rotation matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      void main() {
        // Normalize pixel coordinates
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        uv = (uv - 0.5) * 2.0;
        
        // Correct aspect ratio to prevent stretching
        uv.x *= u_resolution.x / u_resolution.y;

        float t = u_time * u_speed;

        // Apply mouse interaction offset
        vec2 mouseOffset = (u_mouse - 0.5) * 2.0;
        vec2 p = uv - mouseOffset * 0.3;
        
        // Initial diagonal rotation for dynamic flow
        p *= rot(-0.4);

        // --- DOMAIN WARPING (Fluid Simulation) ---
        // Iterate through sine/cosine layers to fold space
        for(float i = 1.0; i <= 5.0; i++) {
            float fi = i * 1.2;
            p.x += 0.35 / fi * sin(fi * p.y * 2.0 + t + i);
            p.y += 0.35 / fi * cos(fi * p.x * 2.0 - t * 0.8 + i);
        }

        // --- COLOR & SHADING ---
        // Generate a fluid structural map
        float structure = sin(p.x * 2.5 + p.y * 2.5 + t);
        
        // Base gradient mix depending on spatial warping
        float colorMix = smoothstep(-1.0, 1.0, p.x + p.y);
        vec3 baseGradient = mix(u_color1, u_color2, colorMix);

        // AFTER EFFECTS SIM: Specular Glass Highlights (Ridges)
        // High exponent creates sharp, thin, glossy light reflections
        float ridge = pow(1.0 - abs(structure), 12.0);
        
        // Volume / Body of the fluid (soft ambient light)
        float body = smoothstep(-0.2, 1.0, structure);

        // Combine void background, soft fluid body, and intense sharp ridges
        vec3 finalColor = u_colorVoid;
        finalColor += baseGradient * body * 0.4;
        finalColor += mix(baseGradient, vec3(1.0), 0.5) * ridge * 2.5;

        // --- POST-PROCESSING ---
        // Radial Vignette
        float dist = length(uv);
        finalColor *= smoothstep(2.5, 0.4, dist);

        // S-Curve Contrast (Color Grading)
        finalColor = finalColor * finalColor * (3.0 - 2.0 * finalColor);

        // Add subtle film grain for premium texture
        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        finalColor += (grain - 0.5) * 0.04;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    // 2x2 Plane to cover the entire orthographic camera view
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Smoothly interpolate mouse position (lerp)
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;
      
      uniforms.u_time.value = clock.getElapsedTime();
      uniforms.u_mouse.value.copy(mouseRef.current);
      
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - ((e.clientY - rect.top) / rect.height);
      targetMouseRef.current.set(x, y);
    };

    const handleMouseLeave = () => {
      targetMouseRef.current.set(0.5, 0.5);
    };

    window.addEventListener('resize', handleResize);
    mountRef.current.addEventListener('mousemove', handleMouseMove);
    mountRef.current.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousemove', handleMouseMove);
        mountRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, colorVoid, colorPrimary, colorSecondary, mouseStrength]);

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-black font-sans ${className}`}>
      {/* GLSL Canvas Background */}
      <div 
        ref={mountRef} 
        className="absolute inset-0 w-full h-full z-0 cursor-crosshair"
      />

    </div>
  );
}