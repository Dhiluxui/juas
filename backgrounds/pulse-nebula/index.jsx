import React, { useEffect, useRef } from 'react';

export interface PulseNebulaProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Base Color */
  baseColor?: string;
  /** @title Accent Color */
  accentColor?: string;
  /** @title Pulse Count */
  pulseCount?: number;
  /** @title Glow Intensity */
  glowIntensity?: number;
  /** @title Mouse Reactive */
  mouseReact?: boolean;
  /** @title Extra Classes */
  className?: string;
  children?: React.ReactNode;
}

function hexToVec3(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return [r, g, b];
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const vertexShaderSource = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// Concentric distance-field pulse rings drifting through a noise nebula,
// deliberately additive/field-based rather than angular ribbons.
const fragmentShaderSource = `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform float uPulseCount;
  uniform float uGlow;

  float hash(vec2 p) {
    p = fract(p * vec2(443.8975, 397.2973));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amp * noise(p);
      p *= 2.1;
      amp *= 0.5;
    }
    return sum;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

    vec2 m = uMouse / uResolution - 0.5;
    if (length(uMouse) == 0.0) m = vec2(0.0);
    vec2 center = m * 0.35;

    vec2 p = uv - center;
    float r = length(p);
    float t = uTime * 0.4;

    float cloud = fbm(p * 1.8 + vec2(t * 0.05, -t * 0.03));
    vec3 col = mix(uBase * 0.15, uAccent * 0.35, cloud);

    float rings = 0.0;
    for (float i = 0.0; i < 6.0; i++) {
      if (i >= uPulseCount) break;
      float phase = fract(t * 0.35 + i / uPulseCount);
      float ringR = phase * 1.4;
      float thickness = 0.02 + 0.03 * (1.0 - phase);
      float ringDist = abs(r - ringR);
      float fade = 1.0 - phase;
      rings += smoothstep(thickness, 0.0, ringDist) * fade * fade;
    }

    vec3 ringColor = mix(uAccent, uBase, sin(r * 6.0 - t * 2.0) * 0.5 + 0.5);
    col += ringColor * rings * uGlow;

    float core = exp(-r * 6.0);
    col += uAccent * core * 0.8;

    float vignette = smoothstep(1.4, 0.2, r);
    col *= vignette;

    float grain = hash(uv * 300.0 + t);
    col += (grain - 0.5) * 0.025;

    col = pow(col, vec3(0.9));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function ShaderCanvas({
  className,
  speed,
  baseColor,
  accentColor,
  pulseCount,
  glowIntensity,
  mouseReact,
}: Required<Omit<PulseNebulaProps, 'children'>>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
    const uBaseLoc = gl.getUniformLocation(program, 'uBase');
    const uAccentLoc = gl.getUniformLocation(program, 'uAccent');
    const uPulseCountLoc = gl.getUniformLocation(program, 'uPulseCount');
    const uGlowLoc = gl.getUniformLocation(program, 'uGlow');

    const [br, bg, bb] = hexToVec3(baseColor);
    const [ar, ag, ab] = hexToVec3(accentColor);

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseReact) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    let startTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const render = (time: number) => {
      resize();
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (time - startTime) * 0.001 * speed;
      gl.uniform1f(uTimeLoc, t);
      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      gl.uniform2f(uMouseLoc, mouseRef.current.x, mouseRef.current.y);
      gl.uniform3f(uBaseLoc, br, bg, bb);
      gl.uniform3f(uAccentLoc, ar, ag, ab);
      gl.uniform1f(uPulseCountLoc, pulseCount);
      gl.uniform1f(uGlowLoc, glowIntensity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
    };
  }, [speed, baseColor, accentColor, pulseCount, glowIntensity, mouseReact]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
}

export default function PulseNebulaBackground({
  speed = 1.0,
  baseColor = '#04070f',
  accentColor = '#ff5da2',
  pulseCount = 4,
  glowIntensity = 1.0,
  mouseReact = true,
  className = '',
  children,
}: PulseNebulaProps) {
  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      <div className="absolute inset-0 z-0">
        <ShaderCanvas
          className=""
          speed={speed}
          baseColor={baseColor}
          accentColor={accentColor}
          pulseCount={pulseCount}
          glowIntensity={glowIntensity}
          mouseReact={mouseReact}
        />
      </div>
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
}
