import React, { useEffect, useRef } from 'react';

export interface AuroraVortexProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Color A */
  colorA?: string;
  /** @title Color B */
  colorB?: string;
  /** @title Color C */
  colorC?: string;
  /** @title Warp Intensity */
  warpIntensity?: number;
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

// Domain-warped FBM flow field, spiraled around the frame center to read as
// slow-moving aurora currents rather than radial ribbons.
const fragmentShaderSource = `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uWarp;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.23);
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
    for (int i = 0; i < 5; i++) {
      sum += amp * noise(p);
      p *= 2.02;
      amp *= 0.55;
    }
    return sum;
  }

  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

    vec2 m = uMouse / uResolution - 0.5;
    if (length(uMouse) == 0.0) m = vec2(0.0);
    uv += m * 0.08;

    float t = uTime * 0.15;
    float r = length(uv);

    float swirlAmt = uWarp * (0.6 - r * 0.4);
    vec2 p = uv * rot(swirlAmt * sin(t * 0.7) + r * 1.5);

    vec2 warpA = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 - t * 0.8));
    vec2 warpB = vec2(
      fbm(p * 2.0 + warpA * uWarp + t * 0.3),
      fbm(p * 2.0 - warpA * uWarp - t * 0.4)
    );

    float flow = fbm(p * 1.6 + warpB * (0.8 + uWarp * 0.5));

    vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.8, flow));
    col = mix(col, uColorC, smoothstep(0.55, 0.95, warpB.x + warpB.y * 0.5));

    float bands = sin(flow * 18.0 + t * 2.0) * 0.5 + 0.5;
    col += (bands - 0.5) * 0.12 * uColorC;

    float vignette = smoothstep(1.3, 0.1, r);
    col *= vignette;

    float grain = hash(uv * 300.0 + t);
    col += (grain - 0.5) * 0.03;

    col = pow(col, vec3(0.9));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function ShaderCanvas({
  className,
  speed,
  colorA,
  colorB,
  colorC,
  warpIntensity,
  mouseReact,
}: Required<Omit<AuroraVortexProps, 'children'>>) {
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
    const uColorALoc = gl.getUniformLocation(program, 'uColorA');
    const uColorBLoc = gl.getUniformLocation(program, 'uColorB');
    const uColorCLoc = gl.getUniformLocation(program, 'uColorC');
    const uWarpLoc = gl.getUniformLocation(program, 'uWarp');

    const [ar, ag, ab] = hexToVec3(colorA);
    const [br, bg, bb] = hexToVec3(colorB);
    const [cr, cg, cb] = hexToVec3(colorC);

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
      gl.uniform3f(uColorALoc, ar, ag, ab);
      gl.uniform3f(uColorBLoc, br, bg, bb);
      gl.uniform3f(uColorCLoc, cr, cg, cb);
      gl.uniform1f(uWarpLoc, warpIntensity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
    };
  }, [speed, colorA, colorB, colorC, warpIntensity, mouseReact]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
}

export default function AuroraVortexBackground({
  speed = 1.0,
  colorA = '#0b1d3a',
  colorB = '#1fb6c9',
  colorC = '#9b5de5',
  warpIntensity = 1.0,
  mouseReact = true,
  className = '',
  children,
}: AuroraVortexProps) {
  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      <div className="absolute inset-0 z-0">
        <ShaderCanvas
          className=""
          speed={speed}
          colorA={colorA}
          colorB={colorB}
          colorC={colorC}
          warpIntensity={warpIntensity}
          mouseReact={mouseReact}
        />
      </div>
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
}
