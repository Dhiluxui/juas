import React, { useEffect, useRef } from 'react';

// --- WebGL Utility Functions ---
function createShader(gl, type, source) {
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

// --- Fragment Shader ---
const fragmentShaderSource = `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uMouse;

  mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
  }

  float hash(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
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

  void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

      vec2 m = uMouse / uResolution - 0.5;
      if (length(uMouse) == 0.0) m = vec2(0.0);
      uv += m * 0.1;

      float r = length(uv);
      float a = atan(uv.y, uv.x);
      
      float t = uTime * 1.2;

      vec3 col = vec3(0.0);

      float twist = sin(r * 10.0 - t * 3.0) * 0.2;
      float twistedA = a + twist * exp(-r * 3.0);

      float rays = 0.0;
      for(float i = 0.0; i < 3.0; i++) {
          float rayNoise = noise(vec2(twistedA * (8.0 + i * 4.0), t * (3.0 + i) - r * 2.0));
          rays += pow(rayNoise, 4.0) * (1.0 - smoothstep(0.0, 0.9, r));
      }
      
      vec3 c1 = vec3(1.0, 0.05, 0.4);
      vec3 c2 = vec3(0.0, 0.8, 1.0);
      vec3 c3 = vec3(1.0, 0.6, 0.0);
      
      vec3 rayColor = mix(c1, c2, sin(twistedA * 2.0 + t) * 0.5 + 0.5);
      rayColor = mix(rayColor, c3, cos(twistedA * 3.0 - t) * 0.5 + 0.5);
      
      col += rayColor * rays * 3.5;

      for(float i = 1.0; i <= 5.0; i++) {
          float angOffset = t * 0.3 * (mod(i, 2.0) == 0.0 ? 1.0 : -0.8);
          float localA = a + angOffset + twist * (i * 0.2);
          
          float petals = sin(localA * 4.0) * 0.08 * (1.0 - r);
          float radius = 0.05 + i * 0.06 + petals;
          
          float ribbonDist = abs(r - radius);
          float ribbonGlow = 0.002 / (ribbonDist + 0.001);
          
          vec3 ribbonC = mix(c2, c1, i / 5.0);
          ribbonC = mix(ribbonC, vec3(0.6, 0.1, 1.0), sin(localA * 2.0 + t) * 0.5 + 0.5);
          
          float flares = smoothstep(0.95, 1.0, sin(localA * 12.0 + t * 5.0));
          
          float edgeFade = smoothstep(0.8, 0.2, r);
          col += ribbonC * ribbonGlow * edgeFade;
          col += vec3(1.0) * flares * ribbonGlow * 0.6 * edgeFade;
      }

      float coreR = 0.12;
      float coreMask = smoothstep(coreR, coreR + 0.02, r);
      col *= coreMask;

      float ring = smoothstep(coreR - 0.01, coreR, r) - smoothstep(coreR, coreR + 0.04, r);
      vec3 corona = vec3(1.0, 0.8, 0.9) * ring * 2.0;
      col += corona;

      col += rayColor * exp(-r * 10.0) * 1.2 * coreMask;

      float grain = hash(uv * 200.0 + t);
      col += (grain - 0.5) * 0.08;

      col = pow(col, vec3(0.85));
      col = smoothstep(0.0, 1.1, col);

      gl_FragColor = vec4(col, 1.0);
  }
`;

const vertexShaderSource = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

function ShaderBackground({ className = '' }) {
  const canvasRef = useRef(null);
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

    const uTimeLocation = gl.getUniformLocation(program, 'uTime');
    const uResolutionLocation = gl.getUniformLocation(program, 'uResolution');
    const uMouseLocation = gl.getUniformLocation(program, 'uMouse');
    
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        mouseRef.current.x = (e.touches[0].clientX - rect.left) * dpr;
        mouseRef.current.y = canvas.height - (e.touches[0].clientY - rect.top) * dpr;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    let animationFrameId;
    let startTime = performance.now();
    let initialSet = false;

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

    const render = (time) => {
      resize();

      if (!initialSet && canvas.width > 0) {
        mouseRef.current.x = canvas.width / 2;
        mouseRef.current.y = canvas.height / 2;
        initialSet = true;
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (time - startTime) * 0.001;
      
      gl.uniform1f(uTimeLocation, t);
      gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(uMouseLocation, mouseRef.current.x, mouseRef.current.y);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block pointer-events-auto ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
}

export default function App() {
  return (
    <div className="relative w-full h-screen bg-[#010002] overflow-hidden font-sans selection:bg-fuchsia-500 selection:text-white">
      <div className="absolute inset-0 z-0">
        <ShaderBackground />
      </div>

      <div 
        className="absolute inset-0 z-[1] pointer-events-none" 
        style={{ 
          background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.4) 100%)' 
        }} 
      />

      <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center mix-blend-lighten text-center px-4">
        <div className="pointer-events-auto flex flex-col items-center">
            <h2 className="text-white tracking-[0.5em] md:tracking-[0.8em] text-xs md:text-sm mb-4 uppercase opacity-80 font-medium translate-y-4">
            Hurtling Through Infinity
            </h2>
            
            <h1 
                className="text-white text-8xl md:text-[14rem] font-bold tracking-tighter opacity-90 leading-none"
                style={{ 
                    textShadow: '0 0 80px rgba(255, 255, 255, 0.2), 0 0 20px rgba(0, 180, 255, 0.5)'
                }}
            >
            Bloom
            </h1>
        </div>
      </div>
    </div>
  );
}
