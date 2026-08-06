import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface EtherealGlassFluidProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Enable Mouse Interaction */
  interactive?: boolean;
  /** @title Palette Base Brightness */
  colorA?: [number, number, number];
  /** @title Palette Contrast */
  colorB?: [number, number, number];
  /** @title Palette Frequency */
  colorC?: [number, number, number];
  /** @title Palette Phase Shifts */
  colorD?: [number, number, number];
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra Classes */
  className?: string;
}

export const EtherealGlassFluid = ({
  speed = 1.0,
  interactive = true,
  colorA = [0.8, 0.8, 0.8],
  colorB = [0.4, 0.4, 0.4],
  colorC = [1.0, 1.0, 1.0],
  colorD = [0.0, 0.33, 0.67], // Default iridescent spread
  children,
  className = '',
}: EtherealGlassFluidProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Track mouse position for smooth interpolation (spring/lerp effect)
  const targetMouse = useRef({ x: 0.5, y: 0.5 });
  const currentMouse = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();

    // Orthographic camera for 2D flat shaders (avoids 3D perspective distortion)
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Optimize performance while keeping it sharp on Retina displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    mountRef.current.appendChild(renderer.domElement);

    // 2. Uniforms & Shader Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_colorA: { value: new THREE.Vector3(...colorA) },
      u_colorB: { value: new THREE.Vector3(...colorB) },
      u_colorC: { value: new THREE.Vector3(...colorC) },
      u_colorD: { value: new THREE.Vector3(...colorD) },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      
      uniform vec3 u_colorA;
      uniform vec3 u_colorB;
      uniform vec3 u_colorC;
      uniform vec3 u_colorD;

      // Inigo Quilez's Cosine Color Palette
      // Generates beautiful, continuous shifting colors based on a scalar value
      vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
          return a + b * cos( 6.28318 * (c * t + d) );
      }

      void main() {
        // Normalize pixel coordinates (-1 to 1)
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        uv = (uv - 0.5) * 2.0;
        
        // Correct aspect ratio to prevent stretching
        uv.x *= u_resolution.x / u_resolution.y;

        // Interactive mouse offset (subtle parallax/repulsion)
        vec2 mouseOffset = (u_mouse - 0.5) * 2.0;
        uv -= mouseOffset * 0.15;

        float t = u_time * 0.2 * u_speed; // Slow, viscous movement
        vec2 p = uv * 1.5; // Scale the coordinate space

        // Domain Warping Loop
        // Repeatedly offset the space based on sine/cosine of the space itself
        for(float i = 1.0; i <= 6.0; i++) {
            float offset = t * 0.5;
            // Complex space folding using time and spatial interference
            p.x += 0.25 / i * sin(i * p.y + offset + cos(t * 0.3));
            p.y += 0.25 / i * cos(i * p.x + offset + sin(t * 0.4));
        }

        // Color Generation:
        // Use the extensively warped coordinates to pick from the color palette
        float warpedValue = length(p) * 0.5 + t * 0.2;
        vec3 color = palette(warpedValue, u_colorA, u_colorB, u_colorC, u_colorD);

        // Metallic Sheen / Highlights:
        // Create sharp, glassy highlights based on the derivatives/ridges of the warp
        float sheen = abs(sin(p.x * 3.0 + p.y * 3.0 + t));
        sheen = pow(sheen, 8.0); // Sharpen into thin, bright lines
        
        // Add the white/silver sheen on top of the pastel colors
        color += vec3(sheen * 0.4);

        // Post-Processing directly in the fragment shader
        // 1. Cinematic Film Grain
        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        color -= (grain * 0.04); // Subtle noise subtraction

        // 2. Soft Vignetting to frame the piece and draw eyes to the center
        float dist = length(uv);
        color *= smoothstep(2.5, 0.5, dist);

        // 3. S-Curve Contrast (Curves adjustment for rich depth)
        color = color * color * (3.0 - 2.0 * color);

        // Output final luminous color
        gl_FragColor = vec4(color, 1.0);
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

    // 3. Mouse Interaction & Animation Loop
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      targetMouse.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: 1.0 - (e.clientY - rect.top) / rect.height // Flip Y for WebGL
      };
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Update time uniform
      uniforms.u_time.value = clock.getElapsedTime();
      
      // Smoothly interpolate mouse position (lerp)
      currentMouse.current.x += (targetMouse.current.x - currentMouse.current.x) * 0.05;
      currentMouse.current.y += (targetMouse.current.y - currentMouse.current.y) * 0.05;
      uniforms.u_mouse.value.set(currentMouse.current.x, currentMouse.current.y);

      renderer.render(scene, camera);
    };

    animate();

    // 4. Handle Resizing
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 5. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
      
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, interactive, colorA, colorB, colorC, colorD]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      {/* Background WebGL Canvas Layer */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Foreground Content Layer */}
      {children && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <EtherealGlassFluid>
      
    </EtherealGlassFluid>
  );
}