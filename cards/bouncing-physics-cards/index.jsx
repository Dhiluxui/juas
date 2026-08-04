import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface AbyssalFluidPlasmaProps {
  /** Speed multiplier for fluid movement */
  speed?: number;
  /** Intensity of the glowing plasma folds */
  intensity?: number;
  /** Color of the electric blue plasma highlights in Hex */
  electricBlue?: string;
  /** Color of the cyan liquid highlights in Hex */
  cyanHighlight?: string;
  /** Intensity of the film grain post-processing (0.0 to 0.1) */
  grainIntensity?: number;
  /** Content overlay slot */
  children?: React.ReactNode;
  /** Additional CSS class names for wrapper container */
  className?: string;
}

export function AbyssalFluidPlasma({
  speed = 1.0,
  intensity = 1.25,
  electricBlue = '#0D99FF',
  cyanHighlight = '#00F0FF',
  grainIntensity = 0.02,
  children,
  className = '',
}: AbyssalFluidPlasmaProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseTargetRef = useRef<THREE.Vector2>(new THREE.Vector2(0.5, 0.5));
  const mouseCurrentRef = useRef<THREE.Vector2>(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Helper: Convert Hex string to THREE.Vector3 RGB [0..1]
    const hexToVec3 = (hex: string) => {
      const cleanHex = hex.replace('#', '');
      const fullHex =
        cleanHex.length === 3
          ? cleanHex
              .split('')
              .map((c) => c + c)
              .join('')
          : cleanHex;
      const num = parseInt(fullHex, 16);
      return new THREE.Vector3(
        ((num >> 16) & 255) / 255,
        ((num >> 8) & 255) / 255,
        (num & 255) / 255
      );
    };

    // 1. Setup Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);

    // 2. Uniforms Setup
    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(width * 0.5, height * 0.5) },
      u_speed: { value: speed },
      u_intensity: { value: intensity },
      u_electricBlue: { value: hexToVec3(electricBlue) },
      u_cyanHighlight: { value: hexToVec3(cyanHighlight) },
      u_grain: { value: grainIntensity },
    };

    // 3. GLSL Vertex Shader
    const vertexShader = `
      varying vec2 v_uv;
      void main() {
        v_uv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    // 4. GLSL Fragment Shader (Abyssal Fluid Plasma)
    const fragmentShader = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_intensity;
      uniform vec3 u_electricBlue;
      uniform vec3 u_cyanHighlight;
      uniform float u_grain;

      varying vec2 v_uv;

      // --- MATHEMATICAL NOISE & FBM HELPERS ---
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f); // Hermite curve smoothing
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      // Fractional Brownian Motion (4 Octaves)
      float fbm(vec2 p) {
        float value = 0.0;
        float amp = 0.5;
        float freq = 1.0;
        mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
        for (int i = 0; i < 4; i++) {
          value += amp * noise(p * freq);
          p = rot * p * 2.02;
          amp *= 0.5;
        }
        return value;
      }

      void main() {
        // Normalize aspect-corrected UV coordinates
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 raw_uv = gl_FragCoord.xy / u_resolution.xy;
        
        // Mouse coordinate mapping
        vec2 mouse = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        float mouseDist = length(uv - mouse);
        float mouseInteraction = exp(-mouseDist * mouseDist * 8.0); // Radial push strength

        float t = u_time * 0.25 * u_speed;

        // Base Void Palette (#030008 background)
        vec3 voidBg = vec3(0.011, 0.0, 0.031);
        vec3 sapphireBase = vec3(0.02, 0.08, 0.25);

        // --- 1. DOMAIN WARPING (Fluid Dynamics) ---
        vec2 p = uv * 2.5;
        
        // Localized interactive force from cursor
        p += (uv - mouse) * mouseInteraction * 0.4;

        // First warp stage
        vec2 q = vec2(
          fbm(p + vec2(0.0, 0.0) + t * 0.4),
          fbm(p + vec2(5.2, 1.3) - t * 0.3)
        );

        // Second double-nested warp stage (creates fluid swirl turbulence)
        vec2 r = vec2(
          fbm(p + 3.2 * q + vec2(1.7, 9.2) + t * 0.5),
          fbm(p + 3.2 * q + vec2(8.3, 2.8) - t * 0.4)
        );

        float fluidVal = fbm(p + 2.8 * r);

        // --- 2. PRISMATIC LIQUID GLASS FOLDS ---
        // Exponentiated sine peaks simulate sharp reflective ridges on liquid glass
        float foldPattern1 = pow(1.0 - abs(sin(r.x * 6.0 + r.y * 4.0 + t * 2.0)), 8.0);
        float foldPattern2 = pow(abs(sin(q.x * 5.0 - r.y * 5.0 - t * 1.5)), 10.0);

        vec3 liquidFolds = mix(u_electricBlue, u_cyanHighlight, r.x * 0.8 + 0.2) * foldPattern1 * 1.8;
        liquidFolds += u_cyanHighlight * foldPattern2 * 1.4;

        // Soft volumetric fluid body glow
        vec3 fluidBody = mix(sapphireBase, u_electricBlue, smoothstep(-0.2, 0.8, fluidVal));

        // --- 3. NEON PLASMA BORDER ---
        float edgeX = min(raw_uv.x, 1.0 - raw_uv.x);
        float edgeY = min(raw_uv.y, 1.0 - raw_uv.y);
        float edgeDist = min(edgeX, edgeY);

        // Exponential border glow decay
        float borderGlow = exp(-edgeDist * 16.0);
        float innerBorderGlow = exp(-edgeDist * 40.0);
        
        // Turbulent animation along the border frame
        float borderTurbulence = fbm(raw_uv * 10.0 + t * 2.0);
        float plasmaBorderMask = borderGlow * (0.8 + 0.4 * borderTurbulence);

        vec3 borderPlasma = mix(u_electricBlue, u_cyanHighlight, borderTurbulence) * plasmaBorderMask * 2.5;
        borderPlasma += vec3(0.9, 0.95, 1.0) * innerBorderGlow * 2.0; // Hot core plasma edge

        // --- 4. COMPOSITION & COMBINATION ---
        vec3 color = voidBg;
        
        // Blend fluid structure into void
        color = mix(color, fluidBody, smoothstep(0.1, 0.9, fluidVal) * 0.8);
        color += liquidFolds * smoothstep(0.2, 1.0, length(q));
        color += borderPlasma;

        // In-shader Exponential Masking Bloom on luminous ridges
        color += pow(max(liquidFolds + borderPlasma, vec3(0.0)), vec3(2.0)) * 0.35;

        // --- 5. IN-SHADER POST-PROCESSING ---
        // Radial Vignette
        float dist = length(uv);
        float vignette = smoothstep(1.6, 0.2, dist);
        color *= vignette;

        // S-Curve Tone Mapping & Contrast
        color = 1.0 - exp(-color * u_intensity);
        color = pow(color, vec3(1.1)); // Subtle gamma adjustment

        // Micro Film Grain
        float grain = (hash(raw_uv * 100.0 + u_time) - 0.5) * u_grain;
        color += grain;

        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `;

    // 5. Material & Plane Mesh
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 6. Event Handlers & Smooth Pointer Tracking
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = rect.height - (event.clientY - rect.top); // Invert Y for WebGL
      mouseTargetRef.current.set(x, y);
    };

    container.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 7. Render Loop
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      uniforms.u_time.value = elapsedTime;

      // Lerp mouse coordinates smoothly
      mouseCurrentRef.current.lerp(mouseTargetRef.current, 0.05);
      uniforms.u_mouse.value.copy(mouseCurrentRef.current);

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup & Resource Management
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [speed, intensity, electricBlue, cyanHighlight, grainIntensity]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-[#030008] ${className}`}>
      {/* WebGL Render Target */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      
      {/* UI Overlay Slot */}
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
}

export default AbyssalFluidPlasma;