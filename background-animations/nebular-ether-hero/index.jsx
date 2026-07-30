import React from 'react';

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

function hexToRgb(hex) {
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
}) {
  const canvasRef = React.useRef(null);
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

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let initialSet = false;
    let animationFrameId;
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
      
      // Inject standard shadertoy-style uniforms
      if (timeLocation !== null) gl.uniform1f(timeLocation, t);
      if (resolutionLocation !== null) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      if (mouseLocation !== null) gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);

      // Support alternative uniform names
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
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `,
  fragment: `
    precision highp float;
    uniform float iTime;
    uniform vec2 iResolution;

    // 2D Rotation matrix
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / iResolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= iResolution.x / iResolution.y;

        // Angle the entire composition exactly like the reference
        p *= rot(0.65); 
        float t = iTime * 0.15; 

        // BASE BACKGROUND: Deep space void
        vec3 col = vec3(0.005, 0.002, 0.04);
        
        // Dynamic pixel size for perfect vector-like anti-aliasing
        float px = 3.0 / iResolution.y; 

        // --- LAYER 1: Deep Purple Back Fold ---
        float w1 = sin(p.x * 1.2 + t * 0.8) * 0.3 + cos(p.x * 0.7 - t * 0.5) * 0.2;
        float d1 = p.y - w1 - 0.4;
        
        vec3 c1 = mix(vec3(0.01, 0.0, 0.1), vec3(0.3, 0.0, 0.7), smoothstep(-0.8, 0.0, d1));
        c1 += vec3(0.5, 0.2, 0.8) * exp(-abs(d1) * 15.0) * 0.5; // Inner glow / Rim light
        
        float m1 = smoothstep(px, -px, d1);
        col = mix(col, c1, m1);

        // --- LAYER 2: The Hero Wave (Magenta/White Glowing Crest) ---
        float w2 = sin(p.x * 1.5 - t * 1.1) * 0.25 + cos(p.x * 0.9 + t * 0.7) * 0.3;
        float d2 = p.y - w2 + 0.1;
        
        // AFTER EFFECTS SIM: Drop Shadow cast *from* Layer 2 *onto* Layer 1
        float shadow2 = smoothstep(-0.4, 0.2, d2); 
        col *= mix(0.15, 1.0, shadow2); // Multiply blend mode for soft shadow
        
        vec3 c2 = mix(vec3(0.1, 0.0, 0.4), vec3(0.9, 0.1, 0.8), smoothstep(-0.7, 0.0, d2));
        
        // AFTER EFFECTS SIM: Bloom / Intense Inner Glow at the crest
        float rim2 = exp(-abs(d2) * 18.0);
        c2 += vec3(1.0, 0.8, 1.0) * rim2 * 1.2;
        
        // Stark white edge highlight for the sharp peak
        float edgeHighlight = exp(-abs(d2) * 50.0);
        c2 += vec3(1.0, 1.0, 1.0) * edgeHighlight;

        float m2 = smoothstep(px, -px, d2);
        col = mix(col, c2, m2);

        // --- LAYER 3: Foreground Royal Blue / Purple Wave ---
        float w3 = sin(p.x * 1.3 + t * 1.3) * 0.3 + cos(p.x * 1.1 - t * 0.6) * 0.25;
        float d3 = p.y - w3 + 0.7;
        
        // AFTER EFFECTS SIM: Drop Shadow from Layer 3 onto Layer 2
        float shadow3 = smoothstep(-0.4, 0.15, d3);
        col *= mix(0.1, 1.0, shadow3); // Deep shadow
        
        vec3 c3 = mix(vec3(0.00, 0.0, 0.15), vec3(0.4, 0.2, 1.0), smoothstep(-0.6, 0.0, d3));
        float rim3 = exp(-abs(d3) * 12.0);
        c3 += vec3(0.7, 0.6, 1.0) * rim3 * 0.8;

        float m3 = smoothstep(px, -px, d3);
        col = mix(col, c3, m3);
        
        // AFTER EFFECTS SIM: Post-Processing / Color Grading
        
        // 1. Soft Vignette (Lens/Focus simulation)
        float vignette = length(uv - 0.5);
        col *= 1.0 - smoothstep(0.4, 1.2, vignette);
        
        // 2. S-Curve Contrast (Levels/Curves adjustment for depth)
        col = col * col * (3.0 - 2.0 * col);
        
        // 3. Gamma Correction (Exposure boost making neons incredibly vibrant)
        col = pow(col, vec3(0.85));

        gl_FragColor = vec4(col, 1.0);
    }
  `
};

export const NebularEtherHero = ({ className = '' }) => (
  <div className={`relative w-full h-full bg-[#050505] overflow-hidden ${className}`}>
    <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
  </div>
);

// Main App export to render the pure background
export default function App() {
  return (
    <div className="w-screen h-screen">
      <NebularEtherHero />
    </div>
  );
}