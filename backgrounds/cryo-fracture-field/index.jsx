import React, { useRef, useEffect } from 'react';

export interface CryoFractureFieldProps {
  /** @title Animation Speed */
  speed?: number;
  /** @title Ice Color */
  iceColor?: string;
  /** @title Crack Glow Color */
  glowColor?: string;
  /** @title Cell Scale */
  scale?: number;
  /** @title React To Cursor */
  mouseReact?: boolean;
  /** @title Overlay Content */
  children?: React.ReactNode;
  /** @title Extra Classes */
  className?: string;
}

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255];
}

const VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// AFTER EFFECTS SIM: a scrolling Worley/Voronoi field acts like a "Fracture" + "Glow"
// pass — cell edges are the crack lines, distance-to-edge drives a pulsing rim light.
const FRAGMENT = `#version 300 es
precision highp float;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uSpeed;
uniform float uScale;
uniform vec3 uIceColor;
uniform vec3 uGlowColor;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}

vec2 voronoi(vec2 p) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(ip + g);
      o = 0.5 + 0.45 * sin(uTime * uSpeed * 0.3 + 6.2831 * o);
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }
  return vec2(sqrt(d1), sqrt(d2));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
  vec2 pull = (uMouse - 0.5) * 0.5;
  uv += pull * smoothstep(1.3, 0.0, length(uv));

  vec2 p = uv * uScale;
  vec2 v = voronoi(p);
  float edge = v.y - v.x;

  float crack = smoothstep(0.06, 0.0, edge);
  float pulse = 0.5 + 0.5 * sin(uTime * uSpeed * 1.4 - v.x * 10.0);

  vec3 base = mix(uIceColor * 0.4, uIceColor, v.x);
  vec3 col = mix(base, uGlowColor, crack * (0.6 + 0.4 * pulse));

  float vig = smoothstep(1.25, 0.25, length(uv));
  col *= vig;

  fragColor = vec4(col, 1.0);
}
`;

export const CryoFractureField = ({
  speed = 1.0,
  iceColor = '#8fd8ff',
  glowColor = '#e9fbff',
  scale = 6.0,
  mouseReact = true,
  children,
  className = '',
}: CryoFractureFieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) return;

    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.error(gl!.getShaderInfoLog(s));
      }
      return s;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    gl.useProgram(program);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uMouse = gl.getUniformLocation(program, 'uMouse');
    const uSpeed = gl.getUniformLocation(program, 'uSpeed');
    const uScale = gl.getUniformLocation(program, 'uScale');
    const uIceColor = gl.getUniformLocation(program, 'uIceColor');
    const uGlowColor = gl.getUniformLocation(program, 'uGlowColor');

    const [ir, ig, ib] = hexToVec3(iceColor);
    const [gr, gg, gb] = hexToVec3(glowColor);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas!.clientWidth * dpr);
      const h = Math.floor(canvas!.clientHeight * dpr);
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
        gl!.viewport(0, 0, w, h);
      }
    }
    resize();
    window.addEventListener('resize', resize);

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = 1.0 - (e.clientY - rect.top) / rect.height;
    }
    if (mouseReact) window.addEventListener('mousemove', onMove);

    let raf = 0;
    const start = performance.now();
    function render(now: number) {
      resize();
      const t = (now - start) * 0.001;
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(uTime, t);
      gl!.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl!.uniform1f(uSpeed, speed);
      gl!.uniform1f(uScale, scale);
      gl!.uniform3f(uIceColor, ir, ig, ib);
      gl!.uniform3f(uGlowColor, gr, gg, gb);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (mouseReact) window.removeEventListener('mousemove', onMove);
      gl!.deleteProgram(program);
      gl!.deleteBuffer(posBuf);
    };
  }, [speed, iceColor, glowColor, scale, mouseReact]);

  return (
    <div className={`relative w-full h-full min-h-screen overflow-hidden bg-black ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default CryoFractureField;
