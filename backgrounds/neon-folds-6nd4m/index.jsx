import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);

  // We'll use a standard style tag for the custom keyframe animation
  const customStyles = `
    @keyframes floatUp {
      0% { transform: translateY(40px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    .animate-float {
      animation: floatUp 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;

  useEffect(() => {
    // Safety check for mount node
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    
    // Orthographic camera is perfect for 2D full-screen shaders
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Cap pixel ratio to 2 for performance on high-DPI displays (retina)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Append renderer to our DOM node
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

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        // Normalize pixel coordinates (from 0 to 1) and center them
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        uv = (uv - 0.5) * 2.0;
        
        // Correct aspect ratio so the waves don't stretch on wide screens
        uv.x *= u_resolution.x / u_resolution.y;

        float t = u_time * 0.35; // Global speed control

        // 1. Distort UVs to create the flowing/curtain effect
        vec2 p = uv;
        
        // Domain warping: Add multiple layers of sine waves to distort space
        for(float i = 1.0; i < 4.0; i++) {
            p.x += 0.3 / i * sin(i * p.y * 3.0 + t);
            p.y += 0.3 / i * cos(i * p.x * 3.0 - t);
        }

        // 2. Calculate a flowing, banded value (the "folds")
        float v = sin(p.x * 4.0 + p.y * 4.0 + t);

        // Convert to sharp banded ridges (satin/silk folds)
        float folds = abs(v);
        folds = smoothstep(0.0, 1.0, 1.0 - folds); // Invert and smooth
        folds = pow(folds, 2.5); // Sharpen the peaks of the folds

        // 3. Define Colors - Matching the reference video
        vec3 pink = vec3(0.95, 0.1, 0.7); // Bright Neon Pink
        vec3 blue = vec3(0.1, 0.35, 1.0); // Bright Neon Blue
        vec3 purple = vec3(0.6, 0.0, 1.0); // Deep Purple
        vec3 dark = vec3(0.02, 0.0, 0.05); // Very dark void color

        // 4. Mix colors based on the distorted space
        float colorMix = sin(p.x * 2.0 - p.y * 2.0 + t) * 0.5 + 0.5;
        vec3 baseColor = mix(pink, blue, colorMix);
        baseColor = mix(baseColor, purple, sin(p.y * 3.0 + t) * 0.5 + 0.5);

        // Apply the folds to the base color to create lighting/highlights
        vec3 finalColor = baseColor * (folds + 0.15) * 2.2;

        // 5. Create the dark central void (Curved vignette)
        float dist = length(uv);
        // Distort the void calculation slightly so it's not a perfect circle
        float voidDist = length(vec2(uv.x, uv.y * 1.5)) + sin(uv.x * 2.0 + t) * 0.15;
        float voidMask = smoothstep(0.25, 2.0, voidDist);

        // Apply the dark center mask
        finalColor = mix(dark, finalColor, voidMask);

        // Subtle extra darkening at the far corners
        finalColor *= 1.0 - smoothstep(1.5, 3.0, dist);

        // Output to screen
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    // Apply shader to a full-screen plane (2x2 covers Orthographic -1 to 1)
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 3. Animation Loop
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    // 4. Handle Window Resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      renderer.setSize(width, height);
      uniforms.u_resolution.value.set(width, height);
    };

    window.addEventListener('resize', handleResize);

    // 5. Cleanup Function (Crucial for React strict mode / re-renders)
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose of WebGL resources to prevent memory leaks
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030008] font-sans">
      <style>{customStyles}</style>
      
      {/* Container for the Three.js canvas */}
      <div 
        ref={mountRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />
      
      {/* UI Overlay (Glassmorphism) */}
    </div>
  );
}