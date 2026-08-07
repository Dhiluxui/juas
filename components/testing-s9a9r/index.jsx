import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

export interface PrismaticAuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  // ==========================================
  // SHADER PROPS (15+)
  // ==========================================
  /** @title Animation Speed */
  speed?: number;
  /** @title Color Intensity */
  intensity?: number;
  /** @title Primary Aurora Color (Green) */
  color1?: string;
  /** @title Secondary Aurora Color (Cyan) */
  color2?: string;
  /** @title Tertiary Aurora Color (Purple) */
  color3?: string;
  /** @title Quaternary Aurora Color (Bright Green) */
  color4?: string;
  /** @title Background Color */
  backgroundColor?: string;
  /** @title Star Dust Color */
  dustColor?: string;
  /** @title Star Dust Density */
  dustDensity?: number;
  /** @title Star Dust Movement Speed */
  dustSpeed?: number;
  /** @title Amplitude of the Domain Warping */
  waveAmplitude?: number;
  /** @title Frequency of the Waves */
  waveFrequency?: number;
  /** @title Width of the Aurora Cone */
  coneWidth?: number;
  /** @title Fade Out Length from Apex */
  fadeLength?: number;
  /** @title X Origin of the Aurora (0 to 1) */
  apexX?: number;
  /** @title Y Origin of the Aurora (0 to 1) */
  apexY?: number;
  /** @title Complexity/Strength of the folds */
  foldComplexity?: number;

  // ==========================================
  // COMMON DOM PROPS (25+)
  // ==========================================
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
  onMouseMove?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  onMouseOver?: React.MouseEventHandler<HTMLDivElement>;
  onMouseOut?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLDivElement>;
  onFocus?: React.FocusEventHandler<HTMLDivElement>;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  tabIndex?: number;
  role?: React.AriaRole;
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
  title?: string;
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  onAnimationStart?: React.AnimationEventHandler<HTMLDivElement>;
  onTransitionEnd?: React.TransitionEventHandler<HTMLDivElement>;
}

export function PrismaticAuroraBackground({
  // Shader Props with Defaults
  speed = 0.4,
  intensity = 1.2,
  color1 = '#1ACC66',
  color2 = '#1AB3FF',
  color3 = '#FF1ACC',
  color4 = '#4DFF1A',
  backgroundColor = '#000000',
  dustColor = '#FFFFFF',
  dustDensity = 100.0,
  dustSpeed = 0.1,
  waveAmplitude = 0.7,
  waveFrequency = 2.5,
  coneWidth = 1.5,
  fadeLength = 1.5,
  apexX = 0.5,
  apexY = 1.0,
  foldComplexity = 1.0,

  // Common DOM Props
  id,
  className = '',
  style,
  children,
  onClick,
  onDoubleClick,
  onMouseDown,
  onMouseUp,
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  onMouseOver,
  onMouseOut,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  tabIndex,
  role,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  'aria-describedby': ariaDescribedby,
  title,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onAnimationStart,
  onTransitionEnd,
  ...rest
}: PrismaticAuroraBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Keep a persistent reference to the uniforms so we can update them 
  // without rebuilding the entire WebGL scene
  const uniformsRef = useRef({
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2() },
    u_speed: { value: speed },
    u_intensity: { value: intensity },
    u_color1: { value: new THREE.Color(color1) },
    u_color2: { value: new THREE.Color(color2) },
    u_color3: { value: new THREE.Color(color3) },
    u_color4: { value: new THREE.Color(color4) },
    u_bgColor: { value: new THREE.Color(backgroundColor) },
    u_dustColor: { value: new THREE.Color(dustColor) },
    u_dustDensity: { value: dustDensity },
    u_dustSpeed: { value: dustSpeed },
    u_waveAmplitude: { value: waveAmplitude },
    u_waveFrequency: { value: waveFrequency },
    u_coneWidth: { value: coneWidth },
    u_fadeLength: { value: fadeLength },
    u_apexX: { value: apexX },
    u_apexY: { value: apexY },
    u_foldComplexity: { value: foldComplexity },
  });

  // Scene initialization (Runs exactly once)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    uniformsRef.current.u_resolution.value.set(width, height);

    container.appendChild(renderer.domElement);

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_speed;
      uniform float u_intensity;
      
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform vec3 u_color4;
      uniform vec3 u_bgColor;
      uniform vec3 u_dustColor;
      
      uniform float u_dustDensity;
      uniform float u_dustSpeed;
      uniform float u_waveAmplitude;
      uniform float u_waveFrequency;
      uniform float u_coneWidth;
      uniform float u_fadeLength;
      uniform float u_apexX;
      uniform float u_apexY;
      uniform float u_foldComplexity;

      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }

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

      float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          for(int i = 0; i < 5; i++) {
              value += amplitude * noise(p * frequency);
              frequency *= 2.0;
              amplitude *= 0.5;
          }
          return value;
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        vec2 raw_uv = gl_FragCoord.xy / u_resolution.xy; 
        
        float t = u_time * u_speed;

        vec2 apex_uv = raw_uv - vec2(u_apexX, u_apexY);
        apex_uv.x *= u_resolution.x / u_resolution.y;

        float angle = atan(apex_uv.x, -apex_uv.y);
        float dist = length(apex_uv);

        float fold = fbm(vec2(angle * u_waveFrequency, dist * 2.0 - t));
        float fold2 = fbm(vec2(angle * (u_waveFrequency * 2.0) - t * 1.5, dist * 1.0));
        
        float warpedAngle = angle + (fold - 0.5) * u_waveAmplitude * u_foldComplexity + (fold2 - 0.5) * (u_waveAmplitude * 0.428) * u_foldComplexity;
        
        vec3 auroraColor = vec3(0.0);
        
        auroraColor += smoothstep(0.8, 0.1, abs(warpedAngle + 0.4)) * u_color1;
        auroraColor += smoothstep(0.4, 0.05, abs(warpedAngle + 0.15)) * u_color2;
        auroraColor += smoothstep(0.25, 0.02, abs(warpedAngle - 0.05)) * u_color3 * 1.5;
        auroraColor += smoothstep(0.5, 0.05, abs(warpedAngle - 0.35)) * u_color4;
        
        float coneMask = smoothstep(u_coneWidth, 0.0, abs(angle));
        float fadeOut = smoothstep(u_fadeLength, 0.0, dist);
        
        vec3 auroraFinal = auroraColor * coneMask * fadeOut * 1.5;

        float dust = hash(uv * u_dustDensity + t * u_dustSpeed);
        vec3 dustFinal = u_dustColor * smoothstep(0.99, 1.0, dust) * fadeOut * 0.5;

        vec3 finalColor = u_bgColor + auroraFinal + dustFinal;
        
        finalColor = 1.0 - exp(-finalColor * u_intensity);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: uniformsRef.current,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      uniformsRef.current.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniformsRef.current.u_resolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []); // Only run once on mount

  // React to prop changes dynamically
  useEffect(() => {
    const u = uniformsRef.current;
    u.u_speed.value = speed;
    u.u_intensity.value = intensity;
    u.u_color1.value.set(color1);
    u.u_color2.value.set(color2);
    u.u_color3.value.set(color3);
    u.u_color4.value.set(color4);
    u.u_bgColor.value.set(backgroundColor);
    u.u_dustColor.value.set(dustColor);
    u.u_dustDensity.value = dustDensity;
    u.u_dustSpeed.value = dustSpeed;
    u.u_waveAmplitude.value = waveAmplitude;
    u.u_waveFrequency.value = waveFrequency;
    u.u_coneWidth.value = coneWidth;
    u.u_fadeLength.value = fadeLength;
    u.u_apexX.value = apexX;
    u.u_apexY.value = apexY;
    u.u_foldComplexity.value = foldComplexity;
  }, [
    speed, intensity, color1, color2, color3, color4, backgroundColor, 
    dustColor, dustDensity, dustSpeed, waveAmplitude, waveFrequency, 
    coneWidth, fadeLength, apexX, apexY, foldComplexity
  ]);

  return (
    <div 
      id={id}
      className={`relative w-full h-full min-h-screen overflow-hidden font-sans text-white ${className}`}
      style={{ backgroundColor, ...style }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      aria-describedby={ariaDescribedby}
      title={title}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onAnimationStart={onAnimationStart}
      onTransitionEnd={onTransitionEnd}
      {...rest}
    >
      {/* WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />
      
      {/* Child Elements Container */}
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
}

export default PrismaticAuroraBackground;