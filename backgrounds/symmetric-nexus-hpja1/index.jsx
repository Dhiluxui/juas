import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);

  // Custom styling for the glassmorphism UI card overlay
  const customStyles = `
    @keyframes floatUp {
      0% { transform: translateY(50px) scale(0.95); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    .animate-float {
      animation: floatUp 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .glass-panel {
      background: rgba(10, 5, 25, 0.3);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(100, 150, 255, 0.15);
      box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.9),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
  `;

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Cap pixel ratio to 2 for optimal performance while maintaining sharp ridges
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

    // The core math engine generating the symmetrical, prismatic waves
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;

      void main() {
        // Normalize pixel coordinates and center them
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);

        // 1. PERFECT SYMMETRY (from the video references)
        // By taking the absolute value of X, we mirror the entire left side to the right side
        vec2 p = uv;
        p.x = abs(p.x);

        float t = u_time * 0.4; // Global animation speed
        vec3 finalColor = vec3(0.0);

        // Layering 5 overlapping symmetrical folds/chevrons
        for(float i = 1.0; i <= 5.0; i++) {
            vec2 q = p;

            // 2. PARABOLIC WING SHAPE
            // Adding x^2 to y makes the straight horizontal waves bend downwards at the edges.
            // When combined with upward motion, this forms the distinct ^ chevron/wing shapes.
            q.y += (q.x * q.x) * (0.8 + i * 0.15);

            // 3. FLUID DISTORTION
            // Subtle sine waves distort the perfect math to make it feel like liquid glass
            q.x += sin(q.y * 3.0 + t) * 0.08;
            q.y += cos(q.x * 3.0 - t) * 0.12;

            // Calculate the phase of the wave (moving upwards over time)
            float freq = 3.0 + i * 0.5;
            float phase = q.y * freq - t * (1.0 + i * 0.2); 

            // 4. PRISMATIC CHROMATIC ABERRATION (The Glass Highlight)
            // Instead of one white highlight, we split it into Red, Green, and Blue
            // by offsetting the phase slightly for each color channel.
            float rR = pow(1.0 - abs(sin(phase - 0.1)), 10.0);
            float rG = pow(1.0 - abs(sin(phase)), 16.0);       // Center is sharpest
            float rB = pow(1.0 - abs(sin(phase + 0.1)), 10.0);
            vec3 prismRidge = vec3(rR, rG, rB) * 1.5;

            // 5. THE BODY (Soft liquid glow behind the sharp ridge)
            float body = smoothstep(-0.8, 1.0, sin(phase));

            // 6. COLOR MAPPING (Electric Blue to Deep Purple/Magenta)
            // Center is blue, fading into purple as it moves outward (based on X)
            vec3 colBase = mix(vec3(0.0, 0.4, 1.0), vec3(0.6, 0.0, 0.8), smoothstep(0.0, 0.8, p.x));

            // 7. SPATIAL MASKING
            // Fade the entire structure out towards the horizontal edges and the bottom
            float mask = smoothstep(1.3, 0.0, p.x) * smoothstep(1.0, -1.0, p.y);

            // Accumulate the layers, fading opacity based on layer index
            finalColor += (colBase * body * 0.7 + prismRidge) * mask * (1.2 / i);
        }

        // Add a subtle glowing central spine where the symmetry meets
        float spine = pow(max(0.0, 1.0 - p.x * 6.0), 3.0) * smoothstep(1.0, -1.0, p.y);
        finalColor += vec3(0.2, 0.6, 1.0) * spine * 0.3;

        // Base void background (Deep midnight violet)
        vec3 bg = vec3(0.01, 0.0, 0.03);
        finalColor = bg + finalColor;

        // Post-Processing: Heavy Vignette and Contrast Boost
        float dist = length(uv);
        finalColor *= smoothstep(1.6, 0.3, dist); // Darken edges dramatically
        finalColor = pow(finalColor, vec3(1.15)); // Boost gamma contrast

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    // A single full-screen quad is all we need for a 2D fragment shader
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 3. Animation Loop Setup
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    // Start rendering
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
      
      {/* WebGL Canvas Container */}
      <div 
        ref={mountRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />
    </div>
  );
}