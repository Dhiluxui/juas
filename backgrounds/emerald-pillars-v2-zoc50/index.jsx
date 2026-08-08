import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// --- UTILITY ---
const hexToRgbVec3 = (hex) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? new THREE.Vector3(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      )
    : new THREE.Vector3(1.0, 1.0, 1.0);
};

export interface AbyssalMonolithsProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Light Intensity */
  intensity?: number;
  /** @title Pillar Density */
  density?: number;
  /** @title Base Color */
  colorBottom?: string;
  /** @title Void Color */
  colorTop?: string;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra Classes */
  className?: string;
}

export const AbyssalMonolithsBackground = ({
  speed = 1.0,
  intensity = 1.5,
  density = 18.0,
  colorBottom = '#0ea5e9', // Cyber Cyan
  colorTop = '#0f172a',    // Deep Slate
  children,
  className = '',
}: AbyssalMonolithsProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ 
    target: new THREE.Vector2(0.5, 0.5), 
    current: new THREE.Vector2(0.5, 0.5) 
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // High-DPI optimization
    
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 2. Uniforms & Shader Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_intensity: { value: intensity },
      u_density: { value: density },
      u_colorBottom: { value: hexToRgbVec3(colorBottom) },
      u_colorTop: { value: hexToRgbVec3(colorTop) },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_intensity;
      uniform float u_density;
      uniform vec3 u_colorBottom;
      uniform vec3 u_colorTop;

      // Pseudo-random noise for pillar height variation
      float rand(float n) { return fract(sin(n) * 43758.5453123); }

      void main() {
        // Normalize UVs
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // Aspect-ratio corrected coordinates for lighting
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;

        // Smooth mouse targeting for interactive lighting
        vec2 mouse = u_mouse * 2.0 - 1.0;
        mouse.x *= u_resolution.x / u_resolution.y;

        float t = u_time * u_speed;

        // --- DOMAIN WARPING ---
        // Bends the straight UV grid to make the pillars sway organically
        float warp = sin(uv.y * 3.0 + t * 0.8) * 0.08;
        float xWarped = uv.x + warp + ((u_mouse.x - 0.5) * 0.1);

        // --- PILLAR CALCULATIONS ---
        float numBars = u_density;
        float barIndex = floor(xWarped * numBars);
        float barUV = fract(xWarped * numBars);

        // Create a V-shape depth curve based on distance from screen center
        float normalizedIndex = barIndex / (numBars - 1.0);
        float centerDist = abs(normalizedIndex - 0.5) * 2.0;

        // Dynamic height calculation with random phase offsets per pillar
        float phase = rand(barIndex) * 6.2831;
        float individualWave = sin(t * 1.2 + phase) * 0.15;
        float globalWave = cos(t * 0.5 + centerDist * 3.0) * 0.1;
        float baseHeight = pow(centerDist, 1.4) * 0.5 + 0.35 + individualWave + globalWave;

        // --- MOUSE ILLUMINATION ---
        // A soft radial light attached to the cursor that highlights the glass edges
        float distToMouse = length(vec2(xWarped - (u_mouse.x + warp), uv.y - u_mouse.y));
        float mouseLight = exp(-distToMouse * 4.0) * u_intensity;

        // --- STYLING & SHADING ---
        // Smooth gradient fade into the black void
        float verticalFade = smoothstep(baseHeight + 0.25, baseHeight - 0.15, uv.y);
        float gradientPos = uv.y / max(baseHeight, 0.001);
        vec3 color = mix(u_colorBottom, u_colorTop, smoothstep(0.0, 1.0, gradientPos));

        // Create the physical gaps between monoliths
        float gap = 0.06;
        float barMask = smoothstep(gap, gap + 0.02, barUV) * smoothstep(1.0 - gap, 1.0 - gap - 0.02, barUV);

        // Glassy edge reflections (hottest at the absolute edges of the bar)
        float edgeGlow = pow(4.0 * barUV * (1.0 - barUV), 10.0) * 0.6;

        // Combine base color, vertical fade, mask, and lighting
        vec3 finalColor = color * barMask * verticalFade;
        finalColor += color * edgeGlow * barMask * verticalFade;
        
        // Add the interactive mouse bloom
        finalColor += mix(u_colorBottom, vec3(1.0), 0.5) * mouseLight * barMask * verticalFade;

        // --- POST-PROCESSING ---
        // Deep background void
        vec3 bg = vec3(0.01, 0.01, 0.03) * (1.0 - uv.y);
        finalColor = max(finalColor, bg);

        // Vignette to draw the eye to the center
        float vignette = length(uv - 0.5);
        finalColor *= 1.0 - smoothstep(0.5, 1.4, vignette);

        // Film grain to prevent banding and add cinematic texture
        float grain = fract(sin(dot(uv, vec2(12.9898, 78.233)) + t) * 43758.5453);
        finalColor += (grain - 0.5) * 0.035;

        // S-Curve Contrast boost
        finalColor = smoothstep(0.0, 1.0, finalColor);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 3. Animation Loop & Mouse Interpolation
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      uniforms.u_time.value = clock.getElapsedTime();

      // Liquid-smooth mouse parallax interpolation
      const { current, target } = mouseRef.current;
      current.lerp(target, 0.06);
      uniforms.u_mouse.value.copy(current);

      renderer.render(scene, camera);
    };

    animate();

    // 4. Event Listeners
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      mouseRef.current.target.set(x, y);
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMouseMove);

    // 5. Memory Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, intensity, density, colorBottom, colorTop]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
};