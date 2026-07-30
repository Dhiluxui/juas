import React, { useEffect, useRef } from 'react';

const AuroraNeonFlow = ({
  className = '',
  color1 = [0.9, 0.1, 0.4],
  color2 = [0.0, 0.6, 0.8]
}) => {
  const canvasRef = useRef(null);
  const mouseRef = useRef([0, 0]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Convert screen coordinates to canvas-relative coordinates, flipping Y for WebGL
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current = [
          e.clientX - rect.left,
          rect.height - (e.clientY - rect.top) 
        ];
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const vertexShaderSource = `
      attribute vec2 position; 
      void main() { 
        gl_Position = vec4(position, 0.0, 1.0); 
      }`;

    const fragmentShaderSource = `
      precision highp float;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec3 uColor1;
      uniform vec3 uColor2;

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse.xy / uResolution.xy;
        if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5); // Default to center if no mouse input
        m = (m - 0.5) * 2.0;
        uv += m * 0.05; 

        float t = uTime * 0.4;
        vec3 col = vec3(0.01, 0.0, 0.05);

        vec2 p = uv;
        p.x += sin(p.y * 1.5 + t * 0.8) * 0.2;
        p.y += cos(p.x * 2.0 + t * 0.6) * 0.2;
        
        float flow1 = smoothstep(-1.0, 1.0, sin(p.x * 3.0 + t) * cos(p.y * 2.0 - t));
        col = mix(col, vec3(0.2, 0.0, 0.5), flow1 * 0.6);
        
        float flow2 = smoothstep(-1.0, 1.0, sin(p.y * 2.5 - t * 1.2) * cos(p.x * 1.5 + t));
        col = mix(col, vec3(0.0, 0.15, 0.5), flow2 * 0.5);

        float horizonY = uv.y + sin(uv.x * 1.5 - t * 0.5) * 0.15 + cos(uv.x * 3.0 + t) * 0.05;
        float streak1 = exp(-abs(horizonY) * 6.0);
        float streak2 = exp(-abs(horizonY + 0.05 * sin(uv.x * 5.0 + t * 2.0)) * 18.0);
        float colorMix = smoothstep(-1.0, 1.0, uv.x + sin(t)*0.2);
        
        vec3 streakColor = mix(uColor1, uColor2, colorMix);
        vec3 coreColor = mix(vec3(1.0, 0.7, 0.2), vec3(0.6, 0.9, 1.0), colorMix);
        
        col += streakColor * streak1 * 0.9;
        col += coreColor * streak2 * 1.5;

        float flareMask = exp(-abs(horizonY) * 2.5);
        float flares = sin(uv.x * 8.0 + t * 1.5) * cos(uv.x * 4.0 - t);
        flares = smoothstep(0.5, 1.0, flares) * flareMask;
        col += mix(vec3(0.8, 0.0, 0.9), vec3(0.0, 0.8, 1.0), colorMix) * flares * 0.8;

        float vignette = 1.0 - dot(uv, uv) * 0.15;
        col *= vignette;
        col = pow(col, vec3(1.2));
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const createShader = (gl, type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const program = gl.createProgram();
    const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "uTime");
    const resLoc = gl.getUniformLocation(program, "uResolution");
    const mouseLoc = gl.getUniformLocation(program, "uMouse");
    const col1Loc = gl.getUniformLocation(program, "uColor1");
    const col2Loc = gl.getUniformLocation(program, "uColor2");

    let frameId;
    const render = (t) => {
      // Resize canvas if needed to match display size
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
      
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, t * 0.001);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform2f(mouseLoc, mouseRef.current[0], mouseRef.current[1]);
      gl.uniform3fv(col1Loc, color1);
      gl.uniform3fv(col2Loc, color2);
      
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frameId = requestAnimationFrame(render);
    };
    
    frameId = requestAnimationFrame(render);
    
    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      gl.deleteProgram(program);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buffer);
    };
  }, [color1, color2]); // Re-initialize if colors change drastically, though uniforms update dynamically

  // Fixed className template literal syntax
  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} />;
};

export default function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505]">
      <AuroraNeonFlow 
        color1={[0.9, 0.2, 0.8]} 
        color2={[0.1, 0.6, 1.0]} 
      />
    </div>
  );
}