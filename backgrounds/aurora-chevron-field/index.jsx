import React, { useEffect, useRef } from 'react';

export interface AuroraChevronFieldProps {
  /** @title Primary Color */
  colorA?: string;
  /** @title Secondary Color */
  colorB?: string;
  /** @title Animation Speed */
  speed?: number;
  /** @title Wave Amplitude */
  amplitude?: number;
  /** @title Glow Intensity */
  glow?: number;
  /** @title Mirror Symmetry */
  mirror?: boolean;
  /** @title Mouse Reactive */
  mouseReact?: boolean;
  /** @title Extra Classes */
  className?: string;
  /** @title Overlay Content */
  children?: React.ReactNode;
}

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Layered chevron/arc ripples, mirrored on the x-axis, with soft additive
// glow and a cosine color palette — a domain-warped riff on the concentric
// glowing wave motion in the reference clips (not a copy of any single one).
const fragmentShaderSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uGlow;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uMirror;

vec3 palette(float t, vec3 a, vec3 b) {
  return a + (b - a) * (0.5 + 0.5 * sin(t * 3.14159265));
}

void main() {
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  uv *= 2.0;

  vec2 m = (uMouse - 0.5 * res) / min(res.x, res.y) * 2.0;
  uv += (uv - m) * 0.025;

  if (uMirror > 0.5) {
    uv.x = abs(uv.x);
  }

  float t = uTime * uSpeed;
  vec3 col = vec3(0.0);

  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float freq = 1.35 + fi * 0.34;
    float phase = fi * 0.85 - t * (0.55 + fi * 0.09);

    float arc = uv.x * freq - (uv.y * 1.6 + sin(phase) * uAmplitude);
    float d = abs(sin(arc));
    float g = uGlow * 0.022 / (d * d + 0.014);

    float band = 0.5 + 0.5 * sin(fi * 1.1 + t * 0.3 + uv.y * 0.6);
    col += palette(band, uColorA, uColorB) * g * 0.15;
  }

  float vignette = smoothstep(1.7, 0.15, length(uv));
  col *= mix(0.55, 1.15, vignette);
  col += uColorA * 0.015;

  col = col / (1.0 + col);
  col = pow(col, vec3(0.85));

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean,
    16
  );
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
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function AuroraChevronField({
  colorA = '#7c1fd9',
  colorB = '#1f5fff',
  speed = 1.0,
  amplitude = 1.0,
  glow = 1.0,
  mirror = true,
  mouseReact = true,
  className = '',
  children,
}: AuroraChevronFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uMouse = gl.getUniformLocation(program, 'uMouse');
    const uSpeed = gl.getUniformLocation(program, 'uSpeed');
    const uAmplitude = gl.getUniformLocation(program, 'uAmplitude');
    const uGlow = gl.getUniformLocation(program, 'uGlow');
    const uColorA = gl.getUniformLocation(program, 'uColorA');
    const uColorB = gl.getUniformLocation(program, 'uColorB');
    const uMirror = gl.getUniformLocation(program, 'uMirror');

    const [ar, ag, ab] = hexToRgb01(colorA);
    const [br, bg, bb] = hexToRgb01(colorB);

    let initialized = false;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    if (mouseReact) window.addEventListener('mousemove', handleMouseMove);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    let rafId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      resize();
      if (!initialized && canvas.width > 0) {
        mouseRef.current.x = canvas.width / 2;
        mouseRef.current.y = canvas.height / 2;
        initialized = true;
      }
      const t = (now - startTime) * 0.001;

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.uniform1f(uSpeed, speed);
      gl.uniform1f(uAmplitude, amplitude);
      gl.uniform1f(uGlow, glow);
      gl.uniform3f(uColorA, ar, ag, ab);
      gl.uniform3f(uColorB, br, bg, bb);
      gl.uniform1f(uMirror, mirror ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      if (mouseReact) window.removeEventListener('mousemove', handleMouseMove);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [colorA, colorB, speed, amplitude, glow, mirror, mouseReact]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" style={{ touchAction: 'none' }} />
      {children && <div className="relative z-10 w-full h-full pointer-events-none">
        <div className="pointer-events-auto">{children}</div>
      </div>}
    </div>
  );
}
