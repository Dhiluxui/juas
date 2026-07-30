import React from 'react';

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

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ] : [1, 1, 1];
}

function ShaderBackground({ 
  vertexShaderSource, 
  fragmentShaderSource, 
  className = '',
  speed = 1.0,
  color1 = '#ff0000',
  color2 = '#0000ff',
  ...props
}: any) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const mouseRef = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) return;

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
    
    const uSpeedLoc = gl.getUniformLocation(program, 'uSpeed');
    const uColor1Loc = gl.getUniformLocation(program, 'uColor1');
    const uColor2Loc = gl.getUniformLocation(program, 'uColor2');

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    window.addEventListener('mousemove', handleMouseMove);

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

      const t = (time - startTime) * 0.001;
      
      if (timeLocation !== null) gl.uniform1f(timeLocation, t);
      if (resolutionLocation !== null) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      if (mouseLocation !== null) gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);

      if (uTimeLocation !== null) gl.uniform1f(uTimeLocation, t);
      if (uResolutionLocation !== null) gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
      if (uMouseLocation !== null) gl.uniform2f(uMouseLocation, mouseRef.current.x, mouseRef.current.y);
      if (uResLocation !== null) gl.uniform2f(uResLocation, canvas.width, canvas.height);

      if (uTimeCamel !== null) gl.uniform1f(uTimeCamel, t);
      if (uResolutionCamel !== null) gl.uniform2f(uResolutionCamel, canvas.width, canvas.height);
      if (uMouseCamel !== null) gl.uniform2f(uMouseCamel, mouseRef.current.x, mouseRef.current.y);
      
      if (uSpeedLoc !== null) gl.uniform1f(uSpeedLoc, speed);
      if (uColor1Loc !== null) {
        const c1 = hexToRgb(color1);
        gl.uniform3f(uColor1Loc, c1[0], c1[1], c1[2]);
      }
      if (uColor2Loc !== null) {
        const c2 = hexToRgb(color2);
        gl.uniform3f(uColor2Loc, c2[0], c2[1], c2[2]);
      }

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
  }, [vertexShaderSource, fragmentShaderSource, speed, color1, color2]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block pointer-events-auto ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
}

const shaderData = {
  vertex: `
    attribute vec2 position;
    varying vec2 vUv;
    void main() { 
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0); 
    }
  `,
  fragment: `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    varying vec2 vUv;

    // Pseudo-random function
    float hash(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    // Draw a line segment
    float line(vec2 p, vec2 a, vec2 b, float width) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return smoothstep(width, width - 0.002, length(pa - ba * h));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        vec2 mouse = (uMouse - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        // Grid setup (10x10)
        float grid = 10.0;
        vec2 cell = floor(uv * grid);
        vec2 local = fract(uv * grid) - 0.5;
        
        vec3 col = vec3(0.01, 0.02, 0.04); // Deep abyss
        
        // Animate nodes
        float t = uTime * 0.5;
        vec2 nodes[9];
        
        // Sample 3x3 grid around cell
        // Unrolling to ensure compatibility with WebGL 1.0 (no dynamic array indexing)
        nodes[0] = (cell + vec2(-1.0, -1.0) + 0.5 + vec2(sin(t + hash(cell + vec2(-1.0, -1.0)) * 6.28) * 0.3, cos(t + hash(cell + vec2(-1.0, -1.0)) * 6.28) * 0.3)) / grid;
        nodes[1] = (cell + vec2(-1.0,  0.0) + 0.5 + vec2(sin(t + hash(cell + vec2(-1.0,  0.0)) * 6.28) * 0.3, cos(t + hash(cell + vec2(-1.0,  0.0)) * 6.28) * 0.3)) / grid;
        nodes[2] = (cell + vec2(-1.0,  1.0) + 0.5 + vec2(sin(t + hash(cell + vec2(-1.0,  1.0)) * 6.28) * 0.3, cos(t + hash(cell + vec2(-1.0,  1.0)) * 6.28) * 0.3)) / grid;
        nodes[3] = (cell + vec2( 0.0, -1.0) + 0.5 + vec2(sin(t + hash(cell + vec2( 0.0, -1.0)) * 6.28) * 0.3, cos(t + hash(cell + vec2( 0.0, -1.0)) * 6.28) * 0.3)) / grid;
        nodes[4] = (cell + vec2( 0.0,  0.0) + 0.5 + vec2(sin(t + hash(cell + vec2( 0.0,  0.0)) * 6.28) * 0.3, cos(t + hash(cell + vec2( 0.0,  0.0)) * 6.28) * 0.3)) / grid;
        nodes[5] = (cell + vec2( 0.0,  1.0) + 0.5 + vec2(sin(t + hash(cell + vec2( 0.0,  1.0)) * 6.28) * 0.3, cos(t + hash(cell + vec2( 0.0,  1.0)) * 6.28) * 0.3)) / grid;
        nodes[6] = (cell + vec2( 1.0, -1.0) + 0.5 + vec2(sin(t + hash(cell + vec2( 1.0, -1.0)) * 6.28) * 0.3, cos(t + hash(cell + vec2( 1.0, -1.0)) * 6.28) * 0.3)) / grid;
        nodes[7] = (cell + vec2( 1.0,  0.0) + 0.5 + vec2(sin(t + hash(cell + vec2( 1.0,  0.0)) * 6.28) * 0.3, cos(t + hash(cell + vec2( 1.0,  0.0)) * 6.28) * 0.3)) / grid;
        nodes[8] = (cell + vec2( 1.0,  1.0) + 0.5 + vec2(sin(t + hash(cell + vec2( 1.0,  1.0)) * 6.28) * 0.3, cos(t + hash(cell + vec2( 1.0,  1.0)) * 6.28) * 0.3)) / grid;
        
        // Draw connections
        float glow = 0.0;
        // Iterate through nodes using constant bounds
        for(int i = 0; i < 9; i++) {
            // Node glow
            float d = length(uv - nodes[i]);
            glow += 0.015 / (d * d * 50.0 + 0.1);
            
            // Mouse influence
            float md = length(nodes[i] - mouse);
            float mAttr = smoothstep(0.5, 0.0, md);
            
            // Lines between neighbors
            for(int j = 0; j < 9; j++) {
                if(j > i) {
                    float dist = length(nodes[i] - nodes[j]);
                    if(dist < 0.3) {
                        float l = line(uv, nodes[i], nodes[j], 0.003);
                        glow += l * (1.0 - dist / 0.3);
                    }
                }
            }
        }
        
        // Bioluminescent coloring
        vec3 pulseColor = mix(vec3(0.0, 0.6, 0.8), vec3(0.8, 0.2, 0.9), sin(t) * 0.5 + 0.5);
        col += glow * pulseColor * 1.5;
        
        // Vignette
        col *= 1.0 - length(uv) * 0.5;
        
        gl_FragColor = vec4(col, 1.0);
    }
  `
};

export const LuminousNeuralLatticeHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#020406] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(2, 4, 6, 0.8) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
