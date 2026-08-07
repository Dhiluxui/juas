import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface EclipseAuraBackgroundProps {
  /** Animation Speed */
  speed?: number;
  /** Top Ray Color (Orange) */
  colorTop?: string;
  /** Middle Ray Color (Pink/Magenta) */
  colorMid?: string;
  /** Bottom Ray Color (Blue) */
  colorBottom?: string;
  /** Eclipse Radius Size */
  eclipseRadius?: number;
  /** Overlay Content */
  children?: React.ReactNode;
  /** Extra CSS Classes */
  className?: string;
}

export const EclipseAuraBackground = ({
  speed = 1.0,
  colorTop = '#FF7A00',    // Warm vibrant orange
  colorMid = '#FF007F',    // Hot neon pink
  colorBottom = '#0066FF', // Deep electric blue
  eclipseRadius = 0.85,    // Size of the dark curved mask
  children,
  className = '',
}: EclipseAuraBackgroundProps) => {
  const mountRef = useRef(null);
  const mouseTarget = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseCurrent = useRef(new THREE.Vector2(0.5, 0.5));

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

    // Utility to convert hex strings to THREE.Vector3 RGB values for shaders
    const hexToVec3 = (hex: string) => {
      const color = new THREE.Color(hex);
      return new THREE.Vector3(color.r, color.g, color.b);
    };

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_speed: { value: speed },
      u_eclipseRadius: { value: eclipseRadius },
      u_colorTop: { value: hexToVec3(colorTop) },
      u_colorMid: { value: hexToVec3(colorMid) },
      u_colorBottom: { value: hexToVec3(colorBottom) },
    };

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    // This shader recreates the soft, volumetric light rays and the sharp 
    // eclipse mask using polar coordinates and fractional brownian motion.
    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_eclipseRadius;
      
      uniform vec3 u_colorTop;
      uniform vec3 u_colorMid;
      uniform vec3 u_colorBottom;

      // 2D Rotation Matrix
      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      // Simple 2D Hash for Noise
      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

      // Smooth Value Noise
      float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
              mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
              u.y
          );
      }

      // Fractional Brownian Motion (FBM)
      float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 r = rot(0.37);
          for (int i = 0; i < 5; i++) {
              v += a * noise(p);
              p = r * p * 2.0;
              a *= 0.5;
          }
          return v;
      }

      void main() {
          // Normalize pixel coordinates (-1 to 1)
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          vec2 p = uv * 2.0 - 1.0;
          
          // Aspect correction
          p.x *= u_resolution.x / u_resolution.y;

          // Parallax effect driven by smooth mouse coordinates
          vec2 m = u_mouse * 0.15;
          p += m;

          float t = u_time * u_speed;

          // --- 1. SPATIAL SETUP (The Eclipse Center) ---
          // Position the dark celestial body slightly to the right of center
          vec2 center = vec2(0.3, 0.0);
          vec2 d = p - center;
          
          // Convert to Polar Coordinates (Radius and Angle)
          float r = length(d);
          float a = atan(d.y, d.x);

          // --- 2. THE VOLUMETRIC RAYS (SEAMLESS FIXED) ---
          // Evaluate warp using continuous cartesian coordinates to avoid polar seams (the horizontal cutoff bug)
          float warp = fbm(d * 1.5 - t * 0.4); 
          float rayAngle = a + warp * 0.9;
          
          // Map back to continuous circular coordinates to evaluate the ray noise seamlessly
          vec2 rayPos = vec2(cos(rayAngle), sin(rayAngle));
          
          // Multiply by a factor to control the number of rays. 
          // Adding time creates a subtle evolving shimmer without breaking continuity.
          float rayNoise = fbm(rayPos * 3.0 + vec2(t * 0.15)); 
          
          // Exponentiate the noise to make the rays sharper and more distinct
          float rayStrength = pow(rayNoise, 2.5) * 2.5;

          // --- 3. THE COLOR GRADIENT (SMOOTHED OVERLAP) ---
          // Using wider, overlapping smoothstep bounds prevents horizontal banding
          vec3 baseColor = u_colorBottom;
          baseColor = mix(baseColor, u_colorMid, smoothstep(-0.8, 0.3, d.y));
          baseColor = mix(baseColor, u_colorTop, smoothstep(-0.1, 0.9, d.y));

          // --- 4. THE ECLIPSE MASK & LIGHT FALLOFF ---
          // Creates the sharp cutoff of the dark sphere blocking the light
          float planetMask = smoothstep(u_eclipseRadius, u_eclipseRadius + 0.03, r);
          
          // Light scatters and fades exponentially as it travels away from the source
          float falloff = exp(-(r - u_eclipseRadius) * 1.4);
          
          // Combine base glow and textured rays
          vec3 light = baseColor * (rayStrength + 0.4) * falloff;
          light *= planetMask;

          // --- 5. THE CRESCENT RIM HIGHLIGHT ---
          // A razor-thin, incredibly bright line right on the edge of the sphere
          float rimWidth = 0.015;
          float rim = smoothstep(u_eclipseRadius - rimWidth, u_eclipseRadius, r) * 
                      smoothstep(u_eclipseRadius + rimWidth * 2.0, u_eclipseRadius, r);
          
          // Ensure the rim only appears on the left side of the sphere
          rim *= smoothstep(0.2, -0.4, d.x);
          
          // Make the rim slightly cyan/white for a magical glowing edge
          vec3 rimColor = mix(vec3(0.5, 0.8, 1.0), baseColor, 0.4); 
          light += rimColor * rim * 3.5;

          // --- 6. POST-PROCESSING & COMPOSITING ---
          // Fade everything to absolute black on the far right (the deep void)
          float voidFade = smoothstep(0.2, -0.4, d.x);
          light *= voidFade;

          // Base void color (Deep Space Black)
          vec3 bg = vec3(0.005, 0.0, 0.01);
          vec3 finalColor = max(light, bg);

          // S-Curve Contrast to make the brights pop and deep darks richer
          finalColor = finalColor * finalColor * (3.0 - 2.0 * finalColor);

          // Film Grain / Dither to prevent color banding in the smooth gradients
          finalColor += (hash(uv * 100.0 + t) - 0.5) * 0.035;

          gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
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

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      // Calculate normalized mouse coordinates (-1 to 1)
      const x = ((event.clientX - rect.left) / rect.width) * 2.0 - 1.0;
      const y = -(((event.clientY - rect.top) / rect.height) * 2.0 - 1.0);
      
      mouseTarget.current.set(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Update Uniforms
      uniforms.u_time.value = clock.getElapsedTime();
      uniforms.u_speed.value = speed;
      uniforms.u_eclipseRadius.value = eclipseRadius;
      
      uniforms.u_colorTop.value.copy(hexToVec3(colorTop));
      uniforms.u_colorMid.value.copy(hexToVec3(colorMid));
      uniforms.u_colorBottom.value.copy(hexToVec3(colorBottom));

      // Interpolate mouse movement for buttery smooth, delayed magnetic parallax
      mouseCurrent.current.lerp(mouseTarget.current, 0.05);
      uniforms.u_mouse.value.copy(mouseCurrent.current);

      renderer.render(scene, camera);
    };

    animate();

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
  }, [speed, colorTop, colorMid, colorBottom, eclipseRadius]);

  return (
    <div className={`relative w-full h-full min-h-[500px] overflow-hidden bg-[#000000] font-sans ${className}`}>
      {/* 2D WebGL Canvas Layer - Fixed React ref assignment */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Content Overlay Layer - Safely wrapping children */}
      {children && (
        <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-full h-full">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <div className="w-screen h-screen bg-black">
      {/* 
        Instantiating the background with slightly tweaked colors 
        and radius to closely match the provided reference image 
      */}
      <EclipseAuraBackground 
        eclipseRadius={0.72} 
        speed={0.4}
        colorTop="#ff8c00"    // Slightly softer amber/orange
        colorMid="#df00ff"    // Vibrant magenta
        colorBottom="#1954ff" // Deep rich blue
      >
      </EclipseAuraBackground>
    </div>
  );
}