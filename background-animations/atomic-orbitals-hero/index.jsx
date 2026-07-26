import React, { useEffect, useRef } from 'react';

// ============================================================================
// Core WebGL Renderer
// ============================================================================

export function createShader(gl: WebGLRenderingContext, type: number, source: string) {
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

export interface ShaderBackgroundProps {
  vertexShaderSource: string;
  fragmentShaderSource: string;
  className?: string;
}

export function ShaderBackground({ vertexShaderSource, fragmentShaderSource, className = '' }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
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
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    
    gl.useProgram(program);

    // Geometry
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    const aPositionLocation = gl.getAttribLocation(program, 'a_position');
    const finalPosLoc = positionLocation >= 0 ? positionLocation : aPositionLocation;
    if (finalPosLoc >= 0) {
      gl.enableVertexAttribArray(finalPosLoc);
      gl.vertexAttribPointer(finalPosLoc, 2, gl.FLOAT, false, 0, 0);
    }

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    
    const uvLocation = gl.getAttribLocation(program, 'uv');
    if (uvLocation >= 0) {
      gl.enableVertexAttribArray(uvLocation);
      gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
    }

    // Uniforms
    const timeLocation = gl.getUniformLocation(program, 'iTime');
    const resolutionLocation = gl.getUniformLocation(program, 'iResolution');
    const mouseLocation = gl.getUniformLocation(program, 'iMouse');
    
    const uTimeLocation = gl.getUniformLocation(program, 'u_time');
    const uResolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const uMouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const uResLocation = gl.getUniformLocation(program, 'u_res');

    const uTimeCamel = gl.getUniformLocation(program, 'uTime');
    const uResolutionCamel = gl.getUniformLocation(program, 'uResolution');
    const uMouseCamel = gl.getUniformLocation(program, 'uMouse');

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr; // flip Y for standard webgl
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Initial mouse center
    let initialSet = false;

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

      if (!initialSet && canvas.width > 0) {
        mouseRef.current.x = canvas.width / 2;
        mouseRef.current.y = canvas.height / 2;
        initialSet = true;
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (timeLocation !== null) gl.uniform1f(timeLocation, (time - startTime) * 0.001);
      if (resolutionLocation !== null) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      if (mouseLocation !== null) gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);

      if (uTimeLocation !== null) gl.uniform1f(uTimeLocation, (time - startTime) * 0.001);
      if (uResolutionLocation !== null) gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
      if (uMouseLocation !== null) gl.uniform2f(uMouseLocation, mouseRef.current.x, mouseRef.current.y);
      if (uResLocation !== null) gl.uniform2f(uResLocation, canvas.width, canvas.height);

      if (uTimeCamel !== null) gl.uniform1f(uTimeCamel, (time - startTime) * 0.001);
      if (uResolutionCamel !== null) gl.uniform2f(uResolutionCamel, canvas.width, canvas.height);
      if (uMouseCamel !== null) gl.uniform2f(uMouseCamel, mouseRef.current.x, mouseRef.current.y);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(uvBuffer);
    };
  }, [vertexShaderSource, fragmentShaderSource]);

  return (
    <canvas
      ref={canvasRef}
      className={\`w-full h-full block pointer-events-auto \${className}\`}
      style={{ touchAction: 'none' }}
    />
  );
}

const shaderData = {
  vertex: \`
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  \`,
  fragment: \`
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;

      mat2 rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }

      float sdTorus( vec3 p, vec2 t ) {
          vec2 q = vec2(length(p.xz)-t.x,p.y);
          return length(q)-t.y;
      }

      float map(vec3 p) {
          float d = 1e10;
          
          for(int i = 0; i < 4; i++) {
              vec3 q = p;
              float fi = float(i);
              
              // Rotate each orbital differently
              q.xy *= rot(uTime * 0.5 + fi * 1.2);
              q.xz *= rot(uTime * 0.3 + fi * 2.1);
              q.yz *= rot(uTime * 0.7 - fi * 0.8);
              
              float r1 = 1.0 + sin(uTime * 2.0 + fi) * 0.1;
              float r2 = 0.02 + sin(uTime * 5.0 + fi * 3.0) * 0.01;
              
              float torus = sdTorus(q, vec2(r1, r2));
              d = min(d, torus);
          }
          
          // Core nucleus
          float core = length(p) - (0.2 + sin(uTime * 8.0) * 0.05);
          d = min(d, core);
          
          return d;
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
          vec2 m = uMouse.xy / uResolution.xy;
          if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

          vec3 ro = vec3(0.0, 0.0, -4.0);
          vec3 rd = normalize(vec3(uv, 1.0));
          
          rd.xy *= rot((m.x - 0.5) * 1.5);
          rd.yz *= rot((m.y - 0.5) * 1.5);
          
          float t = 0.0;
          vec3 col = vec3(0.0);
          float glow = 0.0;
          
          for(int i = 0; i < 80; i++) {
              vec3 p = ro + rd * t;
              float d = map(p);
              
              if(d < 0.005) {
                  // Solid hit (nucleus mostly)
                  vec3 n = normalize(p); // approx normal for sphere
                  col += vec3(0.1, 0.5, 1.0) * max(dot(n, vec3(0.0, 0.0, -1.0)), 0.0);
                  break;
              }
              
              // Quantum orbital glow
              glow += 0.0015 / (0.005 + d * d);
              t += d * 0.5;
              if(t > 8.0) break;
          }
          
          // Background stars
          float starNoise = fract(sin(dot(rd.xy, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 stars = vec3(pow(starNoise, 150.0)) * 2.0;

          vec3 glowColor = mix(vec3(0.0, 0.6, 1.0), vec3(0.8, 0.2, 1.0), sin(uTime * 0.5) * 0.5 + 0.5);
          col += glowColor * glow * 0.2;
          col += stars * (1.0 - glow * 0.1); // fade stars behind orbitals
          
          col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0); // ACES
          gl_FragColor = vec4(col, 1.0);
      }
  \`
};

export interface AtomicOrbitalsHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export const AtomicOrbitalsHero = ({ className = '', children, ...props }: AtomicOrbitalsHeroProps) => (
  <div className={\`relative w-full h-full bg-[#000002] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 2, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);