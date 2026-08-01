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

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      void main() {
        // Normalize pixel coordinates (from 0 to 1) and center them
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        uv = (uv - 0.5) * 2.0;
        
        // Correct aspect ratio so the folds don't stretch on wide screens
        uv.x *= u_resolution.x / u_resolution.y;

        float t = u_time * 0.15; // Elegant, sweeping speed
        vec3 finalColor = vec3(0.0);
        
        // Deep space/ocean blue background
        vec3 bg = vec3(0.01, 0.02, 0.06);

        vec2 p = uv;

        // Create multiple sweeping blades/folds of light
        for(float i = 1.0; i <= 5.0; i++) {
            // Rotate the space for intersecting folds over time
            float angle = t * (0.05 + i * 0.02) + i * 1.5;
            p *= rot(angle);
            
            // Bend the space (creating the curved petal/fold shapes)
            p.x += sin(p.y * 1.5 + t) * 0.6;
            p.y += cos(p.x * 1.2 - t) * 0.4;
            
            // Calculate the foundational wave for the fold
            float fold = sin(p.x * (2.0 + i * 0.3));
            
            // ASYMMETRIC SHADING:
            // 1. The Ridge: Sharp, glowing, icy peak on one side
            float ridge = 1.0 - abs(fold);
            ridge = pow(ridge, 6.0); // Sharpen the peak intensely
            
            // 2. The Body: Soft, deep shadow and gradient on the other side
            float shadow = smoothstep(-0.6, 1.0, fold);
            
            // Color mapping: Deep royal blue transitioning to vivid cyan
            vec3 baseBlue = mix(vec3(0.0, 0.05, 0.3), vec3(0.0, 0.4, 1.0), shadow);
            // Icy cyan/white highlights for the ridge
            vec3 highlight = vec3(0.6, 0.85, 1.0) * ridge * 1.5;
            
            // Accumulate layers with depth fading
            finalColor += (baseBlue * shadow + highlight) * (0.7 / i);
        }

        // Blend with the deep background
        finalColor += bg;

        // Subtle film grain for a premium, textured feel
        float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        finalColor += grain * 0.025;

        // Apply a gentle vignette to darken the outer edges
        float dist = length(uv);
        finalColor *= smoothstep(2.0, 0.5, dist);

        // Boost overall contrast and richness
        finalColor = smoothstep(0.0, 1.0, finalColor);
        finalColor = pow(finalColor, vec3(1.1)); // Slight gamma adjustment

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
    <div className="relative w-screen h-screen overflow-hidden bg-[#010308] font-sans">
      <style>{customStyles}</style>
      
      {/* Container for the Three.js canvas */}
      <div 
        ref={mountRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />
      
     
    </div>
  );
}