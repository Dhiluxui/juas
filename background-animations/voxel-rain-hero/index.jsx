import React, { useRef, useEffect, useState } from 'react';

// The 2D WebGL Fluid Background Component
const FluidMotionWallpaper = ({
  speed = 0.5,
  complexity = 1.5,
  hue = 0.6,
  className = '',
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false, alpha: false });
    if (!gl) return;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    // Standard 2D Vertex Shader (Passes through geometry)
    const vertSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // 2D Fluid Domain Warping Fragment Shader
    const fragSource = `
      precision highp float;

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_complexity;
      uniform float u_hue;

      // Cosine based color palette generator
      vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
          return a + b * cos( 6.28318 * (c * t + d) );
      }

      void main() {
        // Normalize pixel coordinates (from -1 to 1) and fix aspect ratio
        vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
        
        // Gentle Parallax from mouse
        vec2 m = u_mouse * 2.0 - 1.0;
        uv -= m * 0.1; 
        
        float t = u_time * u_speed;
        
        // Domain warping / Fluid Math
        vec2 p = uv * u_complexity;
        for(float i = 1.0; i < 5.0; i++){
            p.x += 0.5 / i * cos(i * 2.0 * p.y + t);
            p.y += 0.5 / i * cos(i * 2.0 * p.x + t);
        }
        
        // Generate Colors
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        // Shift base hue based on slider
        vec3 d = vec3(u_hue, u_hue + 0.15, u_hue + 0.3); 
        
        // Apply palette based on warped space and time
        vec3 col = palette(length(p) * 0.15 + t * 0.2, a, b, c, d);
        
        // Add dynamic contrast and soft vignette
        col *= 1.2; 
        float vignette = smoothstep(2.5, 0.0, length(uv));
        col *= vignette;
        
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const vertShader = createShader(gl.VERTEX_SHADER, vertSource);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fragSource);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Fullscreen Quad Geometry
    const positions = new Float32Array([
      -1.0, -1.0,  1.0, -1.0,  -1.0, 1.0,
      -1.0,  1.0,  1.0, -1.0,   1.0, 1.0
    ]);
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uResLoc = gl.getUniformLocation(program, 'u_resolution');
    const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const uSpeedLoc = gl.getUniformLocation(program, 'u_speed');
    const uComplexityLoc = gl.getUniformLocation(program, 'u_complexity');
    const uHueLoc = gl.getUniformLocation(program, 'u_hue');

    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      mouseRef.current = { x, y };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth * dpr;
      const h = container.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    let animFrameId;
    const startTime = performance.now();

    const render = (now) => {
      const elapsed = (now - startTime) * 0.001;
      const dt = 0.016; // Fixed timestep for smoothing

      // Lerp mouse for soft parallax
      smoothMouseRef.current.x += (mouseRef.current.x - smoothMouseRef.current.x) * dt * 5.0;
      smoothMouseRef.current.y += (mouseRef.current.y - smoothMouseRef.current.y) * dt * 5.0;

      gl.useProgram(program);
      gl.uniform1f(uTimeLoc, elapsed);
      gl.uniform2f(uResLoc, canvas.width, canvas.height);
      gl.uniform2f(uMouseLoc, smoothMouseRef.current.x, smoothMouseRef.current.y);
      gl.uniform1f(uSpeedLoc, speed);
      gl.uniform1f(uComplexityLoc, complexity);
      gl.uniform1f(uHueLoc, hue);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animFrameId);
      gl.deleteBuffer(posBuffer);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
      gl.deleteProgram(program);
    };
  }, [speed, complexity, hue]);

  return (
    <div ref={containerRef} className={`absolute inset-0 w-full h-full bg-[#030107] overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" style={{ touchAction: 'none' }} />
      {/* Subtle Grain Overlay for texture */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20 mix-blend-overlay" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />
    </div>
  );
};

export default function App() {
  const [speed, setSpeed] = useState(0.5);
  const [complexity, setComplexity] = useState(1.5);
  const [hue, setHue] = useState(0.6); // Default blue/purple vibe

  return (
    <div className="relative w-screen h-screen overflow-hidden text-slate-200 font-sans selection:bg-white/30">
      
      {/* 2D Fluid Wallpaper Background */}
      <FluidMotionWallpaper 
        speed={speed} 
        complexity={complexity} 
        hue={hue} 
        className="z-0"
      />
    </div>
  );
}