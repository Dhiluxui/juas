import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);

  // Custom keyframes for the floating UI overlay
  const customStyles = `
    @keyframes floatUp {
      0% { transform: translateY(50px); opacity: 0; filter: blur(10px); }
      100% { transform: translateY(0); opacity: 1; filter: blur(0px); }
    }
    .animate-float {
      animation: floatUp 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .glass-panel {
      background: rgba(0, 10, 30, 0.25);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.8),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
  `;

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    
    // Orthographic camera is ideal for full-screen 2D shader effects
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Cap pixel ratio to 2 to maintain smooth 60fps on high-res displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    mountRef.current.appendChild(renderer.domElement);

    // 2. Uniforms and Shader Setup
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // The Fragment Shader: Calculates the sweeping, folding blue gradients
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
          // Normalize coordinates and adjust for screen aspect ratio
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          uv = uv * 2.0 - 1.0;
          uv.x *= u_resolution.x / u_resolution.y;

          // Slow down time for a majestic, elegant rolling effect
          float t = u_time * 0.15;
          
          vec3 finalColor = vec3(0.0);
          
          // Color Palette (Deep sapphires to glowing cyans/whites)
          vec3 darkBlue = vec3(0.0, 0.02, 0.1);
          vec3 midBlue = vec3(0.0, 0.2, 0.8);
          vec3 brightBlue = vec3(0.2, 0.6, 1.0);
          vec3 whiteGlow = vec3(0.8, 0.95, 1.0);

          // We scale the UVs to make the shapes larger and more sweeping
          vec2 p = uv * 0.8;

          // Create multiple overlapping sweeping layers
          for (float i = 1.0; i <= 4.0; i++) {
              // Domain warping: drastically distort the space using sine/cosine waves
              // This is what makes the straight lines turn into complex fluid curves
              p.x += 0.5 / i * cos(i * 1.5 * p.y + t);
              p.y += 0.5 / i * cos(i * 1.5 * p.x + t);
              
              // Calculate a combined coordinate for the "wave"
              float v = p.x + p.y;
              
              // 1. Ridge generation: abs(sin()) creates sharp, bouncing peaks (the "folds")
              float ridge = abs(sin(v * 2.0)); 
              
              // 2. The Core Highlight: invert the ridge and sharpen it exponentially 
              // This creates the glowing, thin white/cyan edge of the fold
              float edgeGlow = pow(1.0 - ridge, 3.5); 
              
              // 3. The Soft Shadow: smoothstep creates a soft gradient on one side 
              // This provides the 3D volume, making it look like a folded physical object
              float volumeGradient = smoothstep(0.0, 1.0, sin(v * 2.0)); 
              
              // Mix colors based on the volume and edges
              vec3 layerColor = mix(darkBlue, midBlue, volumeGradient);
              layerColor = mix(layerColor, brightBlue, edgeGlow * 0.6);
              layerColor = mix(layerColor, whiteGlow, edgeGlow * 0.9); // Hottest part of the fold
              
              // Accumulate colors. Dividing by a factor prevents blowing out to pure white
              finalColor += layerColor / 2.5; 
          }

          // Apply a radial vignette to darken the corners, drawing focus to the center
          float dist = length(uv);
          finalColor *= smoothstep(2.2, 0.3, dist);

          // Deepen the blacks slightly for richer contrast
          finalColor = finalColor * finalColor * 1.2;

          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    // Use a simple 2x2 plane that covers the entire orthographic camera view
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

    // 5. Cleanup on Unmount
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
      
      {/* Background Canvas Layer */}
      <div 
        ref={mountRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />
      
      {/* Foreground UI Layer */}
      
    </div>
  );
}