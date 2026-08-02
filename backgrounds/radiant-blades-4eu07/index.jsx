import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);

  // Custom keyframe animation for the floating UI card
  const customStyles = `
    @keyframes floatUp {
      0% { transform: translateY(40px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .animate-float {
      animation: floatUp 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .glass-panel {
      background: rgba(10, 0, 0, 0.4);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 100, 0, 0.15);
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9),
                  inset 0 1px 0 rgba(255, 150, 50, 0.1);
    }
  `;

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Cap pixel ratio to 2 for performance on high-DPI displays while keeping it sharp
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    mountRef.current.appendChild(renderer.domElement);

    // 2. Shader Setup
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // The core math to generate the pinched glowing vertical blades
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        // Normalize coordinates and adjust for aspect ratio
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = (uv - 0.5) * 2.0;
        p.x *= u_resolution.x / u_resolution.y;

        float t = u_time * 0.4;
        vec3 finalColor = vec3(0.0);

        // 1. Structural Warping (The "Pinch")
        // Apply a parabolic curve to the X coordinate based on Y.
        // This causes the straight vertical lines to bow inward at the center (y=0).
        p.x -= (p.y * p.y) * 0.15; 
        
        // Add a very subtle, slow breathing motion to the Y axis
        p.x += sin(p.y * 2.0 + t) * 0.04;

        // 2. Define the "Core" Focus Area (Left side)
        // The image has a massive, bright focal point on the left.
        float coreX = -0.4;
        float distToCore = abs(p.x - coreX);
        
        // 3. Generate the 3D Blades
        float freq = 50.0; // How many blades exist across the screen
        
        // Loop to create overlapping, layered blades for depth
        for(float i = 1.0; i <= 3.0; i++) {
            vec2 q = p;
            
            // Parallax offset for each layer, and horizontal scrolling
            q.x += i * 0.015;
            q.x -= t * (0.08 * i); 
            
            // The foundational vertical wave
            float wave = sin(q.x * freq);
            
            // DYNAMIC THICKNESS & SHARPNESS
            // Close to the core, the blades are thick (low exponent).
            // Far away, the blades are razor-thin (high exponent).
            float sharpness = mix(1.5, 35.0, smoothstep(0.0, 1.0, distToCore));
            float blade = pow(max(0.0, wave), sharpness);
            
            // 3D HIGHLIGHT: Offset the wave slightly to create a bright leading edge
            float edge = pow(max(0.0, sin(q.x * freq + 0.8)), sharpness * 1.5);
            
            // 4. Color Mapping (Deep Red -> Hot Orange -> White/Yellow)
            vec3 color = mix(vec3(0.6, 0.0, 0.0), vec3(1.0, 0.3, 0.0), smoothstep(1.0, 0.2, distToCore)); // Red to Orange
            color = mix(color, vec3(1.0, 0.9, 0.4), smoothstep(0.2, 0.0, distToCore)); // Orange to Yellow/White Core
            
            // Accumulate the blade and its shiny edge onto the canvas
            finalColor += (color * blade * 1.2 + vec3(1.0, 0.8, 0.2) * edge * 0.6) * (1.0 / i);
        }

        // 5. Global Core Glow & Masking
        // Add an ambient fiery glow behind the blades in the core
        float coreGlow = exp(-distToCore * distToCore * 12.0);
        finalColor += vec3(1.0, 0.2, 0.0) * coreGlow * 0.15;
        
        // Match the image by fading everything aggressively into pitch black on the right side
        float darkMask = smoothstep(1.0, -0.2, p.x);
        finalColor *= darkMask;

        // Post-processing: Boost contrast to make the brights pop and blacks deep
        finalColor = pow(finalColor, vec3(1.3));

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