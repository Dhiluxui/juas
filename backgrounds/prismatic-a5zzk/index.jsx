import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);

  const customStyles = `
    @keyframes floatUp {
      0% { transform: translateY(40px) scale(0.95); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    .animate-float {
      animation: floatUp 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      animation-delay: 0.2s;
    }
    .wallpaper-glass {
      background: rgba(15, 15, 20, 0.4);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.9),
                  inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
    .rainbow-text {
      background: linear-gradient(135deg, #ff6b6b, #4facfe, #00f2fe, #a18cd1, #fbc2eb);
      background-size: 300% 300%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: rainbowShift 8s ease infinite;
    }
    @keyframes rainbowShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Cap pixel ratio to ensure 60fps even on heavy fluid calculations
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    mountRef.current.appendChild(renderer.domElement);

    // 2. Uniforms for the Shader
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // The core of the visual: Prismatic Liquid Glass Shader
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
          // Normalize pixel coordinates and adjust for screen aspect ratio
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          uv = (uv - 0.5) * 2.0;
          uv.x *= u_resolution.x / u_resolution.y;

          vec2 p = uv;
          float t = u_time * 0.12; // Slow, viscous time movement

          // 1. Fluid Dynamics Warping (Fractional Brownian Motion equivalent)
          // We iterate and warp the coordinate grid to create thick, organic mixing
          for(float i = 1.0; i <= 6.0; i++) {
              float fi = i * 1.3;
              p.x += 0.4 / fi * sin(fi * p.y * 1.5 + t + 0.3 * i);
              p.y += 0.4 / fi * cos(fi * p.x * 1.5 - t + 0.3 * i);
          }

          // 2. Generate the base structural ripple
          // Combining distance from center and diagonal wave for a swirling pool effect
          float density = sin(p.x * 2.0 - p.y * 2.0 + length(p) * 4.0);

          // 3. Prismatic Cosine Color Palette
          // This generates a shifting, seamless rainbow spectrum
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          // Phase shift based on position and time creates the holographic color separation
          vec3 d = vec3(0.0, 0.33, 0.67) + p.x * 0.1 + p.y * 0.1 + t * 0.4;
          
          vec3 prismaticColor = a + b * cos(6.28318 * (c * (density * 0.5 + 0.5) + d));

          // 4. Shading & Lighting 
          // Create a soft base glow for the fluid
          float softGlow = smoothstep(-1.0, 1.0, density);
          
          // Create incredibly sharp, bright highlights for the "glass/metallic" ridges
          float glassHighlight = pow(abs(density), 12.0);

          // Deep, rich obsidian slate background
          vec3 finalColor = vec3(0.01, 0.015, 0.03); 
          
          // Blend the prismatic colors onto the dark background
          finalColor = mix(finalColor, prismaticColor, softGlow * 0.85);
          // Add the sharp holographic reflections on top
          finalColor += prismaticColor * glassHighlight * 1.8;

          // 5. Global Vignette & Tone Mapping
          // Darken the edges significantly to focus on the center fluid
          float dist = length(uv);
          finalColor *= smoothstep(2.8, 0.1, dist);

          // Slight gamma adjustment to make the colors richer and deeper
          finalColor = pow(finalColor, vec3(0.9)); 

          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      uniforms.u_resolution.value.set(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans">
      <style>{customStyles}</style>
      
      {/* Container for the Three.js canvas */}
      <div 
        ref={mountRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />
    </div>
  );
}