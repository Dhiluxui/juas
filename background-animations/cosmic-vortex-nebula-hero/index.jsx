import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

// --- SHADER BACKGROUND COMPONENT ---

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
    : new THREE.Vector3(0.0, 1.0, 0.0);
};

export function EmeraldPillarsBackground({
  speed = 1.0,
  barCount = 15.0,
  colorBottom = '#34d399', // Bright Mint/Emerald
  colorTop = '#022c22',    // Deep Dark Green
  className = '',
}) {
  const mountRef = useRef(null);
  const mouseRef = useRef({ target: new THREE.Vector2(0.5, 0.5), current: new THREE.Vector2(0.5, 0.5) });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    // Cap pixel ratio to ensure smooth 60fps on high-DPI displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 2. Uniforms & Shader
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_speed: { value: speed },
      u_bars: { value: barCount },
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
      uniform float u_bars;
      uniform vec3 u_colorBottom;
      uniform vec3 u_colorTop;

      // Pseudo-random noise function
      float rand(float n) { return fract(sin(n) * 43758.5453123); }

      void main() {
        // Normalize UV coordinates (0.0 to 1.0)
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // Mouse shift for subtle parallax interaction
        float mouseShift = (u_mouse.x - 0.5) * 0.08;

        // Discretize the X-axis into distinct bars
        float numBars = u_bars;
        float barX = uv.x + mouseShift;
        
        float barIndex = floor(barX * numBars);
        float barUV = fract(barX * numBars); // UV within the specific bar

        // Mask out bars that fall completely outside the screen bounds (optional cleanup)
        float screenEdgeMask = smoothstep(0.0, 0.001, barX) * smoothstep(1.0, 0.999, barX);

        // Normalized distance from the exact center bar (0.0 at center, 1.0 at edges)
        float normalizedIndex = barIndex / (numBars - 1.0);
        float centerDist = abs(normalizedIndex - 0.5) * 2.0; 

        // --- THE V-SHAPE MATH ---
        // Exponentiate the center distance to create a smooth parabolic curve
        float baseHeight = pow(centerDist, 1.5) * 0.6 + 0.15; 

        // --- ANIMATION ---
        float timeStr = u_time * u_speed;
        
        // Give each bar a random phase offset so they undulate naturally
        float phase = rand(barIndex) * 6.2831;
        float individualWave = sin(timeStr * 0.8 + phase) * 0.08;
        
        // Add a macroscopic wave that travels across all bars
        float globalWave = cos(timeStr * 0.4 + centerDist * 3.0) * 0.05;

        // Final dynamic height of the current bar
        float finalHeight = baseHeight + individualWave + globalWave;

        // --- VERTICAL GRADIENT FADE ---
        // Smoothly fade the bar into the black void at its calculated height
        float verticalFade = smoothstep(finalHeight + 0.15, finalHeight - 0.25, uv.y);

        // --- BAR SEPARATION (GAPS) ---
        // Create the dark gaps between the pillars
        float gap = 0.04;
        float barMask = smoothstep(gap, gap + 0.02, barUV) * smoothstep(1.0 - gap, 1.0 - gap - 0.02, barUV);
        barMask *= screenEdgeMask;

        // --- COLOR MIXING ---
        // Map color from the bright bottom to the dark top based on the bar's specific height
        float gradientPos = uv.y / max(finalHeight, 0.001);
        vec3 color = mix(u_colorBottom, u_colorTop, smoothstep(0.0, 1.0, gradientPos));

        // Depth dimming: center bars are slightly darker to enhance the 3D void effect
        float depthDim = mix(0.25, 1.0, centerDist + 0.15);
        color *= depthDim;

        // --- VOLUMETRIC GLOW ---
        // Add a soft glow that bleeds slightly above the hard fade
        float glowFade = smoothstep(finalHeight + 0.4, finalHeight - 0.5, uv.y);
        vec3 glow = u_colorBottom * glowFade * 0.08 * depthDim;

        // Combine layers
        vec3 finalColor = (color * barMask * verticalFade) + glow;

        // --- FILM GRAIN ---
        // Prevents color banding in the dark gradients and adds cinematic texture
        float grain = fract(sin(dot(uv, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
        finalColor += (grain - 0.5) * 0.035;

        // Pure black void background
        vec3 bg = vec3(0.01, 0.01, 0.02);
        finalColor = max(finalColor, bg * (1.0 - verticalFade * barMask));

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

    // 3. Animation Loop & Mouse Smoothing
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Update time
      uniforms.u_time.value = clock.getElapsedTime();

      // Smooth mouse interpolation for liquid-like parallax
      const { current, target } = mouseRef.current;
      current.lerp(target, 0.05);
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

    const handleMouseMove = (e) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // Normalize mouse coordinates (0 to 1)
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      mouseRef.current.target.set(x, y);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // 5. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, barCount, colorBottom, colorTop]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      {/* The WebGL Canvas mounts here */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
    </div>
  );
}


// --- MAIN APP / DEMO OVERLAY ---

export default function App() {
  return (
    <div className="relative w-screen h-screen bg-black font-sans text-white overflow-hidden selection:bg-emerald-500/30">
      
      {/* Background Component */}
      <EmeraldPillarsBackground 
        speed={1.0} 
        barCount={15.0} // Adjust this to make columns thinner or thicker
        colorBottom="#34d399" // Tailwind Emerald-400
        colorTop="#022c22"    // Tailwind Emerald-950
      />
    </div>
  );
}