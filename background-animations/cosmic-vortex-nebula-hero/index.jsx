import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface EmeraldPillarsBackgroundProps {
  // ── Standard Common Props ──
  /** @title Animation Speed */
  speed?: number;
  /** @title Rotation (Degrees) */
  rotation?: number;
  /** @title Enable Mouse Interaction */
  interactive?: boolean;
  /** @title Manual Mouse X (0-1) */
  mouseX?: number;
  /** @title Manual Mouse Y (0-1) */
  mouseY?: number;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra CSS Classes */
  className?: string;

  // ── Standard Shader Props (Physics & Math) ──
  /** @title Number of Vertical Pillars */
  barCount?: number;
  /** @title Gap Width Between Pillars */
  gapWidth?: number;
  /** @title Domain Distortion (Wobble) */
  distortion?: number;
  /** @title Individual Wave Amplitude */
  amplitude?: number;
  /** @title Individual Wave Frequency */
  frequency?: number;
  /** @title Global Wave Amplitude */
  globalWaveAmplitude?: number;
  /** @title Global Wave Frequency */
  globalWaveFrequency?: number;
  /** @title V-Shape Steepness Exponent */
  vShapeExponent?: number;

  // ── Visual / Lighting ──
  /** @title Bright Bottom Color */
  colorBottom?: string;
  /** @title Dark Top Color */
  colorTop?: string;
  /** @title Background Void Color */
  backgroundColor?: string;
  /** @title Volumetric Glow Intensity */
  glowIntensity?: number;
  /** @title Volumetric Glow Falloff */
  glowFalloff?: number;
  /** @title Center Depth Dimming (0.0 to 1.0) */
  depthDimming?: number;
  /** @title Film Grain Intensity */
  filmGrainIntensity?: number;

  // ── Interaction Settings ──
  /** @title Mouse Parallax Strength */
  mouseParallaxStrength?: number;
  /** @title Mouse Smoothing (0.01 to 1.0) */
  mouseParallaxSmoothing?: number;
}

// Helper to convert hex strings to normalized RGB vectors for the shader
const hexToRgbVec3 = (hex: string) => {
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

export default function EmeraldPillarsBackground({
  // Common
  speed = 1.0,
  rotation = 0.0,
  interactive = true,
  mouseX = 0.5,
  mouseY = 0.5,
  children,
  className = '',
  
  // Physics / Geometry
  barCount = 15.0,
  gapWidth = 0.04,
  distortion = 0.0, // 0.0 by default to retain original rigid look
  amplitude = 0.08,
  frequency = 0.8,
  globalWaveAmplitude = 0.05,
  globalWaveFrequency = 0.4,
  vShapeExponent = 1.5,
  
  // Visual / Colors
  colorBottom = '#34d399',
  colorTop = '#022c22',
  backgroundColor = '#000201',
  glowIntensity = 0.08,
  glowFalloff = 0.5,
  depthDimming = 0.25,
  filmGrainIntensity = 0.035,
  
  // Interaction Config
  mouseParallaxStrength = 0.08,
  mouseParallaxSmoothing = 0.05,
}: EmeraldPillarsBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<any>(null);
  // Default to the manual mouse coordinates on boot
  const mouseRef = useRef({ 
    target: new THREE.Vector2(mouseX, mouseY), 
    current: new THREE.Vector2(mouseX, mouseY) 
  });
  const smoothingRef = useRef(mouseParallaxSmoothing);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
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
      u_mouse: { value: new THREE.Vector2(mouseX, mouseY) },
      u_speed: { value: speed },
      u_rotation: { value: (rotation * Math.PI) / 180.0 },
      
      u_bars: { value: barCount },
      u_gapWidth: { value: gapWidth },
      u_distortion: { value: distortion },
      
      u_amplitude: { value: amplitude },
      u_frequency: { value: frequency },
      u_globalWaveAmplitude: { value: globalWaveAmplitude },
      u_globalWaveFrequency: { value: globalWaveFrequency },
      u_vShapeExponent: { value: vShapeExponent },
      
      u_colorBottom: { value: hexToRgbVec3(colorBottom) },
      u_colorTop: { value: hexToRgbVec3(colorTop) },
      u_backgroundColor: { value: hexToRgbVec3(backgroundColor) },
      
      u_glowIntensity: { value: glowIntensity },
      u_glowFalloff: { value: glowFalloff },
      u_depthDimming: { value: depthDimming },
      u_filmGrainIntensity: { value: filmGrainIntensity },
      
      u_mouseParallaxStrength: { value: mouseParallaxStrength },
    };

    uniformsRef.current = uniforms;

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
      uniform float u_rotation;
      
      // Geometry Uniforms
      uniform float u_bars;
      uniform float u_gapWidth;
      uniform float u_distortion;
      
      // Physics/Wave Uniforms
      uniform float u_amplitude;
      uniform float u_frequency;
      uniform float u_globalWaveAmplitude;
      uniform float u_globalWaveFrequency;
      uniform float u_vShapeExponent;
      
      // Visual Uniforms
      uniform vec3 u_colorBottom;
      uniform vec3 u_colorTop;
      uniform vec3 u_backgroundColor;
      uniform float u_glowIntensity;
      uniform float u_glowFalloff;
      uniform float u_depthDimming;
      uniform float u_filmGrainIntensity;
      
      // Interaction Uniforms
      uniform float u_mouseParallaxStrength;

      // Pseudo-random noise function
      float rand(float n) { return fract(sin(n) * 43758.5453123); }

      void main() {
        // Normalize UV coordinates (0.0 to 1.0)
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // --- ASPECT-CORRECTED ROTATION ---
        vec2 centered = uv - 0.5;
        // Fix aspect ratio before rotating so the bars don't stretch
        centered.x *= u_resolution.x / u_resolution.y; 
        
        float s = sin(u_rotation);
        float c = cos(u_rotation);
        centered *= mat2(c, -s, s, c);
        
        // Revert aspect ratio fix
        centered.x *= u_resolution.y / u_resolution.x; 
        uv = centered + 0.5;
        
        // Mouse shift for subtle parallax interaction
        float mouseShift = (u_mouse.x - 0.5) * u_mouseParallaxStrength;
        
        // Time with speed applied
        float timeStr = u_time * u_speed;

        // Domain Distortion - adding a subtle sine wave warp before calculating bars
        float warp = sin(uv.y * 5.0 + timeStr * 0.5) * u_distortion;

        // Discretize the X-axis into distinct bars
        float numBars = u_bars;
        float barX = uv.x + mouseShift + warp;
        
        float barIndex = floor(barX * numBars);
        float barUV = fract(barX * numBars); // UV within the specific bar

        // Mask out bars that fall completely outside the screen bounds
        float screenEdgeMask = smoothstep(0.0, 0.001, barX) * smoothstep(1.0, 0.999, barX);

        // Normalized distance from the exact center bar (0.0 at center, 1.0 at edges)
        float normalizedIndex = barIndex / (numBars - 1.0);
        float centerDist = abs(normalizedIndex - 0.5) * 2.0; 

        // --- THE V-SHAPE MATH ---
        // Exponentiate the center distance to create a smooth curve
        float baseHeight = pow(centerDist, u_vShapeExponent) * 0.6 + 0.15; 

        // --- ANIMATION / WAVES ---
        // Give each bar a random phase offset so they undulate naturally
        float phase = rand(barIndex) * 6.2831;
        float individualWave = sin(timeStr * u_frequency + phase) * u_amplitude;
        
        // Add a macroscopic wave that travels across all bars
        float globalWave = cos(timeStr * u_globalWaveFrequency + centerDist * 3.0) * u_globalWaveAmplitude;

        // Final dynamic height of the current bar
        float finalHeight = baseHeight + individualWave + globalWave;

        // --- VERTICAL GRADIENT FADE ---
        // Smoothly fade the bar into the black void at its calculated height
        float verticalFade = smoothstep(finalHeight + 0.15, finalHeight - 0.25, uv.y);

        // --- BAR SEPARATION (GAPS) ---
        // Create the dark gaps between the pillars
        float gap = u_gapWidth;
        float barMask = smoothstep(gap, gap + 0.02, barUV) * smoothstep(1.0 - gap, 1.0 - gap - 0.02, barUV);
        barMask *= screenEdgeMask;

        // --- COLOR MIXING ---
        // Map color from the bright bottom to the dark top based on the bar's specific height
        float gradientPos = uv.y / max(finalHeight, 0.001);
        vec3 color = mix(u_colorBottom, u_colorTop, smoothstep(0.0, 1.0, gradientPos));

        // Depth dimming: center bars are slightly darker to enhance the 3D void effect
        float depthDim = mix(u_depthDimming, 1.0, centerDist + 0.15);
        color *= depthDim;

        // --- VOLUMETRIC GLOW ---
        // Add a soft glow that bleeds slightly above the hard fade based on u_glowFalloff
        float glowFade = smoothstep(finalHeight + u_glowFalloff * 0.8, finalHeight - u_glowFalloff, uv.y);
        vec3 glow = u_colorBottom * glowFade * u_glowIntensity * depthDim;

        // Combine layers
        vec3 finalColor = (color * barMask * verticalFade) + glow;

        // --- FILM GRAIN ---
        // Prevents color banding in the dark gradients and adds cinematic texture
        float grain = fract(sin(dot(uv, vec2(12.9898, 78.233)) + u_time) * 43758.5453);
        finalColor += (grain - 0.5) * u_filmGrainIntensity;

        // Void background
        vec3 bg = u_backgroundColor;
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
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Update time
      uniforms.u_time.value = clock.getElapsedTime();

      // Smooth mouse interpolation for liquid-like parallax
      const { current, target } = mouseRef.current;
      current.lerp(target, smoothingRef.current);
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
      if (!container || !interactive) return;
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
  }, [interactive]); // Only rebuild if interactivity mode changes fundamentally

  // Gracefully sync dynamic props to uniforms without rebuilding WebGL context
  useEffect(() => {
    smoothingRef.current = mouseParallaxSmoothing;
    
    // If interactivity is disabled, smoothly transition to the manual mouse coordinates
    if (!interactive) {
      mouseRef.current.target.set(mouseX, mouseY);
    }

    if (uniformsRef.current) {
      // Common & Physics
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_rotation.value = (rotation * Math.PI) / 180.0;
      uniformsRef.current.u_bars.value = barCount;
      uniformsRef.current.u_gapWidth.value = gapWidth;
      uniformsRef.current.u_distortion.value = distortion;
      uniformsRef.current.u_amplitude.value = amplitude;
      uniformsRef.current.u_frequency.value = frequency;
      uniformsRef.current.u_globalWaveAmplitude.value = globalWaveAmplitude;
      uniformsRef.current.u_globalWaveFrequency.value = globalWaveFrequency;
      uniformsRef.current.u_vShapeExponent.value = vShapeExponent;
      
      // Visuals
      uniformsRef.current.u_colorBottom.value = hexToRgbVec3(colorBottom);
      uniformsRef.current.u_colorTop.value = hexToRgbVec3(colorTop);
      uniformsRef.current.u_backgroundColor.value = hexToRgbVec3(backgroundColor);
      uniformsRef.current.u_glowIntensity.value = glowIntensity;
      uniformsRef.current.u_glowFalloff.value = glowFalloff;
      uniformsRef.current.u_depthDimming.value = depthDimming;
      uniformsRef.current.u_filmGrainIntensity.value = filmGrainIntensity;
      
      // Interaction
      uniformsRef.current.u_mouseParallaxStrength.value = mouseParallaxStrength;
    }
  }, [
    speed, rotation, interactive, mouseX, mouseY, 
    barCount, gapWidth, distortion, amplitude, frequency, globalWaveAmplitude, globalWaveFrequency, vShapeExponent,
    colorBottom, colorTop, backgroundColor, glowIntensity, glowFalloff, depthDimming, filmGrainIntensity, 
    mouseParallaxStrength, mouseParallaxSmoothing
  ]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black font-sans text-white ${className}`}>
      {/* The WebGL Canvas mounts here */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 pointer-events-auto" />
    </div>
  );
}