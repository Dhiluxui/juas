import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);

  // Custom styling for the elegant wallpaper typography and floating effects
  const customStyles = `
    @keyframes fadeIn {
      0% { opacity: 0; filter: blur(10px); transform: scale(0.95); }
      100% { opacity: 1; filter: blur(0px); transform: scale(1); }
    }
    @keyframes pulseGlow {
      0%, 100% { text-shadow: 0 0 20px rgba(255, 100, 200, 0.3), 0 0 40px rgba(100, 150, 255, 0.2); }
      50% { text-shadow: 0 0 30px rgba(255, 100, 200, 0.6), 0 0 60px rgba(100, 150, 255, 0.4); }
    }
    .animate-hero {
      animation: fadeIn 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .glow-text {
      animation: pulseGlow 4s ease-in-out infinite;
    }
    .glass-pill {
      background: rgba(255, 255, 255, 0.02);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
  `;

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
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

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;

      // 2D Rotation matrix function
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      void main() {
        // Normalize coordinates and adjust for aspect ratio
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        uv = (uv - 0.5) * 2.0;
        uv.x *= u_resolution.x / u_resolution.y;

        vec2 p = uv;
        
        // 1. ROTATE AND STRETCH
        // Rotate the coordinate space diagonally to match the reference video
        p *= rot(-0.5); 
        
        // STRETCH the Y axis heavily. This is the secret to making 
        // the noise look like long, flowing threads/silk instead of round blobs.
        p.y *= 0.25; 

        float t = u_time * 0.3; // Animation speed
        vec3 finalColor = vec3(0.0);
        
        // Deep, dark void background
        vec3 bg = vec3(0.02, 0.0, 0.05);

        // 2. SPATIAL COLOR MAPPING
        // Base the overall color mix on the X coordinate so blue is mostly 
        // on one side and pink is on the other, seamlessly blending in the middle.
        float colorMix = smoothstep(-1.2, 1.2, uv.x);
        vec3 colorLeft = vec3(0.0, 0.3, 1.0);   // Electric Blue
        vec3 colorRight = vec3(1.0, 0.1, 0.7);  // Neon Pink/Magenta
        vec3 baseGradient = mix(colorLeft, colorRight, colorMix);

        // 3. FRACTAL DOMAIN WARPING (The Flow)
        for(float i = 1.0; i <= 5.0; i++) {
            // Warp the stretched space using sine waves
            p.x += 0.4 / i * sin(i * p.y * 4.0 + t);
            p.y += 0.4 / i * cos(i * p.x * 4.0 - t);
            
            // Calculate the foundational wave for the current iteration
            float wave = sin(p.x * 3.0 + i * 2.0);
            
            // ASYMMETRIC SHADING FOR GLASS/SILK FOLDS
            // The Ridge: Extremely sharp, highly exponentiated peak for the glossy reflection
            float ridge = pow(1.0 - abs(wave), 14.0);
            
            // The Body: Soft, offset gradient for the deep shadowed fabric body
            float body = smoothstep(-0.2, 1.0, wave);
            
            // Slightly shift the color per layer for iridescent depth
            vec3 layerColor = mix(baseGradient, vec3(0.6, 0.2, 1.0), sin(i * 1.5 + t) * 0.2);
            
            // Accumulate the light (Soft body light + Intense sharp ridge highlights)
            finalColor += (layerColor * body * 0.15 + layerColor * ridge * 1.8) / i;
        }

        // Add the dark void background
        finalColor += bg;

        // 4. POST-PROCESSING
        // Apply a vignette to darken the edges and draw focus to the center streaks
        float dist = length(uv);
        finalColor *= smoothstep(2.5, 0.6, dist);

        // Tone mapping / Contrast boost for a premium glossy pop
        finalColor = pow(finalColor, vec3(1.15));

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
    <div className="relative w-screen h-screen overflow-hidden bg-[#020005] font-sans selection:bg-pink-500/30">
      <style>{customStyles}</style>
      
      {/* Background Canvas */}
      <div 
        ref={mountRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />
      </div>
  );
}