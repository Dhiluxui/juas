import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface AstralFlare2DProps {
  /* @title Animation Speed */
  speed?: number;
  /* @title Overall Hue Shift (-1.0 to 1.0) */
  hueShift?: number;
  /* @title Children Content Overlay */
  children?: React.ReactNode;
  /* @title Additional CSS Classes */
  className?: string;
}

export const AstralFlare2D = ({
speed = 1.0,
hueShift = 0.0,
children,
className = '',
}: AstralFlare2DProps) => {
const mountRef = useRef(null);

// Use refs to track smooth mouse interpolation
const mouseTarget = useRef(new THREE.Vector2(0, 0));
const mouseCurrent = useRef(new THREE.Vector2(0, 0));

useEffect(() => {
const container = mountRef.current;
if (!container) return;

// 1. Scene, Camera, Renderer Setup
const scene = new THREE.Scene();
// Orthographic camera flawlessly bounds our full-screen 2D shader
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
// Cap pixel ratio for performance while maintaining crispness on Retina
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const updateSize = () => {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  renderer.setSize(width, height);
  return { width, height };
};

const { width, height } = updateSize();
container.appendChild(renderer.domElement);

// 2. Uniform Setup
const uniforms = {
  u_time: { value: 0.0 },
  u_resolution: { value: new THREE.Vector2(width, height) },
  u_mouse: { value: new THREE.Vector2(0, 0) },
  u_speed: { value: speed },
  u_hueShift: { value: hueShift },
};

// 3. Shaders
const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

// The Fragment Shader recreates the entire After Effects composition in one pass
const fragmentShader = `
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_speed;
  uniform float u_hueShift;

  // Coordinate rotation matrix
  mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
  }

  // 2D Random generator
  float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
  }

  // 2D Value Noise
  float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      // Quintic interpolation curve
      vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
      return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                 mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
  }

  // Fractional Brownian Motion for the organic "Fractal Noise" texture
  float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 r = rot(0.37); // Rotate layers to reduce grid artifacts
      for(int i = 0; i < 6; i++) {
          v += a * noise(p);
          p = r * p * 2.0;
          a *= 0.5;
      }
      return v;
  }

  // Hue shifting utility
  vec3 hueShift(vec3 color, float shift) {
      vec3 P = vec3(0.55735) * dot(vec3(0.55735), color);
      vec3 U = color - P;
      vec3 V = cross(vec3(0.55735), U);    
      color = U * cos(shift * 6.2832) + V * sin(shift * 6.2832) + P;
      return color;
  }

  void main() {
      // Normalize pixel coordinates (-1 to 1) and correct aspect ratio
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
      
      // Smooth, subtle mouse interaction (parallax tilt)
      vec2 m = u_mouse / u_resolution.xy;
      m = (m - 0.5) * 2.0;
      uv -= m * 0.08;

      float t = u_time * u_speed;

      // --- AFTER EFFECTS SIM: Transform & Composition Setup ---
      // Rotate the coordinate space diagonally so the flare shoots from bottom-left to top-right
      vec2 p = uv * rot(-0.65);
      
      // Offset the head of the comet slightly off-center
      p.x -= 0.15; 
      p.y += 0.05;

      // --- AFTER EFFECTS SIM: S. Shake & Mesh Warp ---
      // Domain Warping: Distort the Y axis based on X and Time to make a wavy, organic tail
      // The smoothstep ensures the "head" (x=0) stays solid, while the tail (x<0) violently waves
      float warp = fbm(vec2(p.x * 2.5 - t * 3.0, p.y * 6.0 + t * 1.5));
      p.y += (warp - 0.5) * 0.35 * smoothstep(0.2, -1.5, p.x); 
      
      // --- AFTER EFFECTS SIM: Polar Coordinates & Optical Flares ---
      // Convert to polar to create sweeping radial streaks
      float r = length(p);
      float a = atan(p.y, p.x);
      
      // Create fast-moving streaky noise radiating from the center
      float streakNoise = fbm(vec2(a * 5.0, r * 2.0 - t * 5.0));
      // Sharpen the noise into distinct bands/rays
      float streaks = smoothstep(0.3, 0.9, streakNoise);

      // --- SHAPE GENERATION: The Comet Body ---
      // Head falls off extremely fast in +X. Tail extends slowly into -X.
      float headFalloff = exp(-p.x * 12.0) * step(0.0, p.x);
      float tailFalloff = exp(p.x * 1.8) * step(p.x, 0.0);
      float xMask = headFalloff + tailFalloff;
      
      // Thickness expands smoothly along the tail to create a fan effect
      float thickness = mix(0.04, 0.65, smoothstep(0.1, -2.5, p.x));
      
      // Y-axis mask: Use exponential decay modulated by our radial streaks
      // This breaks the solid shape into hundreds of wispy, fiery tendrils
      float yMask = exp(-abs(p.y) / (thickness * (0.2 + 0.8 * streaks)));
      
      float body = xMask * yMask;

      // --- COLOR MAPPING ---
      vec3 finalColor = vec3(0.0);
      
      // 1. Outer Cosmic Aura (Deep Magenta/Purple)
      vec3 auraCol = vec3(0.4, 0.0, 0.8);
      finalColor += auraCol * pow(body, 0.7) * 1.5;
      
      // 2. Mid Energy Flare (Electric Cyan / Blue)
      vec3 midCol = vec3(0.1, 0.7, 1.0);
      float midMask = exp(-abs(p.y) / (thickness * 0.35)) * xMask;
      finalColor = mix(finalColor, midCol, midMask * 0.9 * streaks);
      
      // 3. Ultra-hot Inner Core (Bright Pink/White)
      vec3 coreCol = vec3(1.0, 0.8, 0.95);
      float coreMask = exp(-abs(p.y) / (thickness * 0.08)) * exp(p.x * 5.0) * step(p.x, 0.2);
      finalColor += coreCol * coreMask * 2.5;

      // --- AFTER EFFECTS SIM: Lens Flare 4-Point Star ---
      // Placed exactly at the head of the comet
      float starR = length(p);
      float starA = atan(p.y, p.x);
      // Soft ambient spherical glow
      float starGlow = exp(-starR * 15.0);
      // Sharp intersecting horizontal/vertical light spikes
      float starCross = exp(-starR * 45.0) * (pow(abs(cos(starA * 2.0)), 40.0) + pow(abs(cos(starA * 2.0 + 1.57)), 40.0));
      
      finalColor += vec3(1.0, 0.9, 1.0) * (starGlow * 0.6 + starCross * 4.0);

      // Apply user-defined hue shift
      finalColor = hueShift(finalColor, u_hueShift);

      // --- BACKGROUND ---
      // Very dark, deep cosmic void
      vec3 bg = vec3(0.005, 0.002, 0.015);
      finalColor = max(finalColor, bg);

      // --- AFTER EFFECTS SIM: Camera Lens Blur & Post Processing ---
      // S-Curve Contrast for deep, cinematic colors
      finalColor = finalColor * finalColor * (3.0 - 2.0 * finalColor);
      
      // Subtle Vignette based on screen distance
      finalColor *= 1.0 - smoothstep(1.0, 2.5, length(uv));

      // Film Grain / Dither to prevent color banding in dark gradients
      finalColor += hash(uv * 100.0 + t) * 0.025;

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

// 4. Input & Animation Loop
const handleMouseMove = (event: MouseEvent) => {
  const rect = container.getBoundingClientRect();
  mouseTarget.current.x = event.clientX - rect.left;
  mouseTarget.current.y = rect.height - (event.clientY - rect.top);
};

window.addEventListener('mousemove', handleMouseMove);

const clock = new THREE.Clock();
let animationFrameId: number;

const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  
  uniforms.u_time.value = clock.getElapsedTime();
  uniforms.u_speed.value = speed;
  uniforms.u_hueShift.value = hueShift;

  // Interpolate mouse movement for buttery smooth parallax
  mouseCurrent.current.lerp(mouseTarget.current, 0.05);
  uniforms.u_mouse.value.copy(mouseCurrent.current);

  renderer.render(scene, camera);
};

animate();

// 5. Resize & Cleanup
const handleResize = () => {
  if (!container) return;
  const { width, height } = updateSize();
  uniforms.u_resolution.value.set(width, height);
};

window.addEventListener('resize', handleResize);

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


}, [speed, hueShift]);

return (
<div className={`relative w-full h-full min-h-[500px] overflow-hidden bg-[#010004] font-sans ${className}`}>
{/* 2D WebGL Canvas Layer */}
<div ref={mountRef} className="absolute inset-0 w-full h-full" />

  {/* Content Overlay Layer */}
  {children && (
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto h-full w-full">
        {children}
      </div>
    </div>
  )}
</div>


);
};

export default AstralFlare2D;