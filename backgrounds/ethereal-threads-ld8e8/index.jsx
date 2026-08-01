import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);

  const customStyles = `
    @keyframes fadeUp {
      0% { opacity: 0; filter: blur(12px); transform: translateY(30px); }
      100% { opacity: 1; filter: blur(0px); transform: translateY(0); }
    }
    @keyframes pulseGlow {
      0%, 100% { text-shadow: 0 0 20px rgba(168, 230, 207, 0.2), 0 0 40px rgba(168, 230, 207, 0.1); }
      50% { text-shadow: 0 0 30px rgba(168, 230, 207, 0.5), 0 0 60px rgba(168, 230, 207, 0.3); }
    }
    .animate-hero {
      animation: fadeUp 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .glow-text {
      animation: pulseGlow 4s ease-in-out infinite;
    }
    .dark-glass-pill {
      background: rgba(10, 20, 15, 0.3);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(168, 230, 207, 0.15);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 8px 24px rgba(0, 0, 0, 0.4);
    }
  `;

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene & Orthographic Camera for 2D Shader
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Renderer setup with optimized pixel ratio
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    mountRef.current.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        // Normalize coordinates from -1 to 1 and adjust for aspect ratio
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = (uv - 0.5) * 2.0;
        p.x *= u_resolution.x / u_resolution.y;

        float t = u_time * 0.15; // Slow, ethereal drift speed
        vec3 finalColor = vec3(0.0);
        
        // Deep abyss background (Dark Teal/Black)
        vec3 bg = vec3(0.01, 0.02, 0.015);

        // Light source originating from the bottom-left corner
        float lightIntensity = smoothstep(2.5, 0.0, length(p - vec2(-1.2, -1.0)));
        vec3 baseGlow = vec3(0.1, 0.4, 0.25) * lightIntensity * 0.6;
        finalColor += baseGlow;

        // MULTI-LAYERED HORIZONTAL STRINGS
        for(float i = 1.0; i <= 6.0; i++) {
            vec2 q = p;
            
            // Warp the Y coordinate significantly based on the X coordinate
            // This creates the horizontal, undulating waves
            q.y += sin(q.x * (0.8 * i) + t * (1.2 + i * 0.2)) * (0.2 / i);
            q.y += cos(q.x * (1.5 * i) - t * 0.8) * (0.15 / i);
            
            // Add a little localized warp to make strings split and merge
            q.y += sin(q.x * 4.0 + t) * 0.05;

            // Calculate the foundational sine wave for the string
            float wave = sin(q.y * (12.0 + i * 3.0));
            
            // THE STRING: Extremely sharp exponentiation creates a razor-thin line
            float thread = pow(1.0 - abs(wave), 30.0);
            
            // THE GLOW: A softer falloff around the sharp thread
            float glow = pow(1.0 - abs(wave), 4.0);
            
            // Color palette: Transitions from shadowy deep sea green to bright glowing mint
            vec3 stringColor = mix(vec3(0.0, 0.1, 0.05), vec3(0.6, 1.0, 0.8), thread);
            
            // Add depth fading so layers in the "back" are darker
            float depthFade = 1.0 / (i * 0.8);
            
            // Light amplification: Strings glow much brighter when they pass near the bottom-left light
            float flare = 1.0 + lightIntensity * 4.0;
            
            // Accumulate the threads and glow onto the canvas
            finalColor += (stringColor * thread * 1.5 + stringColor * glow * 0.2) * depthFade * flare;
        }

        // Post-Processing
        finalColor += bg;
        
        // Subtle Vignette to darken edges and frame the flow
        float dist = length(uv - 0.5);
        finalColor *= smoothstep(0.8, 0.2, dist * 0.8);

        // Tone mapping / Contrast boost
        finalColor = pow(finalColor, vec3(1.1));

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
    <div className="relative w-screen h-screen overflow-hidden bg-[#030604] font-sans selection:bg-teal-500/30">
      <style>{customStyles}</style>
      
      {/* Background Canvas */}
      <div 
        ref={mountRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />
    </div>
  );
}