import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);

  const customStyles = `
    @keyframes slideUpFade {
      0% { transform: translateY(60px) scale(0.95); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    .animate-reveal {
      animation: slideUpFade 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      animation-delay: 0.2s;
    }
    .holo-glass {
      background: rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(30px) saturate(150%);
      -webkit-backdrop-filter: blur(30px) saturate(150%);
      border: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.15),
                  inset 0 2px 2px rgba(255, 255, 255, 0.8),
                  inset 0 -1px 4px rgba(255, 255, 255, 0.3);
    }
  `;

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    
    // Orthographic camera for 2D flat shaders
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Optimize performance while keeping it sharp on Retina displays
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

      // Inigo Quilez's Cosine Color Palette
      // Generates beautiful, continuous shifting colors based on a scalar value
      vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
          return a + b * cos( 6.28318 * (c * t + d) );
      }

      void main() {
        // Normalize pixel coordinates
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        uv = (uv - 0.5) * 2.0;
        
        // Correct aspect ratio to prevent stretching
        uv.x *= u_resolution.x / u_resolution.y;

        float t = u_time * 0.2; // Slow, viscous movement

        vec2 p = uv * 1.5; // Scale the coordinate space

        // Domain Warping Loop
        // Repeatedly offset the space based on sine/cosine of the space itself
        for(int i = 1; i <= 7; i++) {
            float fi = float(i);
            // Complex space folding using time and spatial interference
            float offset = t * 0.5;
            p.x += 0.25 / fi * sin(fi * p.y + offset + cos(t * 0.3));
            p.y += 0.25 / fi * cos(fi * p.x + offset + sin(t * 0.4));
        }

        // Color Generation:
        // Use the extensively warped coordinates to pick from a pastel color palette
        // Palette parameters for Iridescent Pastels (Cyan, Magenta, Yellow, Pink)
        vec3 a = vec3(0.8, 0.8, 0.8); // Base brightness (high for pastels)
        vec3 b = vec3(0.4, 0.4, 0.4); // Contrast
        vec3 c = vec3(1.0, 1.0, 1.0); // Frequency
        vec3 d = vec3(0.00, 0.33, 0.67); // Phase shifts (RGB spread)

        // The input to the palette is the length of the heavily warped vector
        float warpedValue = length(p) * 0.5 + t * 0.2;
        vec3 color = palette(warpedValue, a, b, c, d);

        // Metallic Sheen / Highlights:
        // Create sharp, glassy highlights based on the derivatives/ridges of the warp
        float sheen = abs(sin(p.x * 3.0 + p.y * 3.0 + t));
        sheen = pow(sheen, 8.0); // Sharpen into thin, bright lines
        
        // Add the white/silver sheen on top of the pastel colors
        color += vec3(sheen * 0.4);

        // Soft vignetting to frame the piece
        float dist = length(uv);
        color -= smoothstep(1.5, 3.5, dist) * 0.3;

        // Output final luminous color
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    // 2x2 Plane to cover the entire orthographic camera view
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
    <div className="relative w-screen h-screen overflow-hidden bg-white font-sans">
      <style>{customStyles}</style>
      
      {/* Background Canvas */}
      <div 
        ref={mountRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />

    </div>
  );
}