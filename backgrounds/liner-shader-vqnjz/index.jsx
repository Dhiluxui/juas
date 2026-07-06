import React, { useRef, useEffect, useState } from 'react';

// --- WebGL Shader Sources ---

const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_speed;
  uniform float u_lines;
  uniform float u_glow;
  uniform float u_amplitude;
  uniform float u_frequency;
  uniform float u_thickness;
  uniform float u_colorShift;

  void main() {
    // Normalize coordinates (-1 to 1) and correct aspect ratio
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    vec3 color = vec3(0.0);
    float t = u_time * u_speed;

    // Iterate through lines
    for(float i = 0.0; i < 100.0; i++) {
      if (i >= u_lines) break;
      
      // Calculate complex waves incorporating u_frequency and u_amplitude
      float wave1 = sin(uv.x * 1.5 * u_frequency + t + i * 0.15) * 0.4 * u_amplitude;
      float wave2 = cos(uv.x * 2.5 * u_frequency - t * 0.7 + i * 0.25) * 0.3 * u_amplitude;
      float y = uv.y + wave1 + wave2;

      // Distance to the line
      float lineDist = abs(y);
      
      // Calculate glow utilizing u_thickness and u_glow
      float thicknessScale = max(0.01, u_thickness);
      float line = (u_glow * 0.005 * thicknessScale) / (lineDist + 0.001 * thicknessScale);

      // Color computation cycling over u_colorShift
      vec3 col = 0.5 + 0.5 * cos(t * 0.3 + uv.xyx + vec3(u_colorShift, u_colorShift + 2.0, u_colorShift + 4.0) + i * 0.12);
      
      color += col * line;
    }

    // Gentle vignette
    color *= 1.0 - (length(uv) * 0.2);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Shader Component ---

const LinerShader = ({ speed, lines, glow, amplitude, frequency, thickness, colorShift }) => {
  const canvasRef = useRef(null);
  
  // Store all props in a ref for frame loop access
  const paramsRef = useRef({ speed, lines, glow, amplitude, frequency, thickness, colorShift });
  
  useEffect(() => {
    paramsRef.current = { speed, lines, glow, amplitude, frequency, thickness, colorShift };
  }, [speed, lines, glow, amplitude, frequency, thickness, colorShift]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');

    if (!gl) {
      console.error('WebGL is not supported on this browser');
      return;
    }

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking failed:', gl.getProgramInfoLog(program));
      return;
    }

    // Screen Quad geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get Uniform Locations
    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      speed: gl.getUniformLocation(program, 'u_speed'),
      lines: gl.getUniformLocation(program, 'u_lines'),
      glow: gl.getUniformLocation(program, 'u_glow'),
      amplitude: gl.getUniformLocation(program, 'u_amplitude'),
      frequency: gl.getUniformLocation(program, 'u_frequency'),
      thickness: gl.getUniformLocation(program, 'u_thickness'),
      colorShift: gl.getUniformLocation(program, 'u_colorShift')
    };

    let animationFrameId;
    let startTime = performance.now();

    const resizeCanvas = () => {
      const displayWidth  = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
      }
    };

    const render = (time) => {
      resizeCanvas();
      
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.01, 0.01, 0.03, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      const currentTime = (time - startTime) * 0.001;
      
      // Update basic uniforms
      gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(uniforms.time, currentTime);
      
      // Update dynamic live props
      gl.uniform1f(uniforms.speed, paramsRef.current.speed);
      gl.uniform1f(uniforms.lines, paramsRef.current.lines);
      gl.uniform1f(uniforms.glow, paramsRef.current.glow);
      gl.uniform1f(uniforms.amplitude, paramsRef.current.amplitude);
      gl.uniform1f(uniforms.frequency, paramsRef.current.frequency);
      gl.uniform1f(uniforms.thickness, paramsRef.current.thickness);
      gl.uniform1f(uniforms.colorShift, paramsRef.current.colorShift);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block touch-none" />;
};

// --- Main Interface Wrapper ---

export default function App() {
  // All shader props are preserved in the state
  const [speed, setSpeed] = useState(1.0);
  const [lines, setLines] = useState(24.0);
  const [glow, setGlow] = useState(1.8);
  const [amplitude, setAmplitude] = useState(1.0);
  const [frequency, setFrequency] = useState(1.0);
  const [thickness, setThickness] = useState(1.2);
  const [colorShift, setColorShift] = useState(0.0);

  // Tracks smooth target states for interactive movement
  const targetState = useRef({
    speed: 1.0,
    lines: 24.0,
    glow: 1.8,
    amplitude: 1.0,
    frequency: 1.0,
    thickness: 1.2,
    colorShift: 0.0,
  });

  // Track if mouse is active to decide whether to run the gentle ambient idle shift
  const lastInteraction = useRef(Date.now());

  // Handles dynamic mapping of pointer position to all of your props
  const handlePointerMove = (clientX, clientY) => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Normalized coordinates (0 to 1)
    const normX = Math.max(0, Math.min(1, clientX / width));
    const normY = Math.max(0, Math.min(1, clientY / height));

    lastInteraction.current = Date.now();

    // Dynamically calculate the parameters using the full system of props:
    targetState.current = {
      speed: 0.4 + normX * 1.8,                  // Speed ranges smoothly from slow to fast
      lines: Math.round(8 + (1 - normY) * 32),   // Line count increases dynamically as you move up
      glow: 0.8 + normY * 2.2,                   // Glowing grows warmer as you move down
      amplitude: 0.3 + normY * 1.7,              // Wave height ranges from flat to deep
      frequency: 0.4 + normX * 2.1,              // Wave tightness adapts horizontally
      thickness: 0.6 + normX * 1.8,              // Line profile thickens on horizontal movement
      colorShift: normX * 6.28,                  // Cycles completely through the color spectrum
    };
  };

  const onMouseMove = (e) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const onTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Interpolate state smoothly toward the targets for ultra-fluid cinematic transitions
  useEffect(() => {
    let active = true;

    const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

    const tick = () => {
      if (!active) return;

      const now = Date.now();
      // If idle for more than 4 seconds, introduce subtle ambient oscillations
      if (now - lastInteraction.current > 4000) {
        const t = now * 0.0006;
        targetState.current = {
          speed: 0.8,
          lines: 20 + Math.sin(t * 0.5) * 6,
          glow: 1.6 + Math.cos(t * 0.8) * 0.5,
          amplitude: 1.0 + Math.sin(t * 0.4) * 0.4,
          frequency: 1.2 + Math.cos(t * 0.6) * 0.4,
          thickness: 1.2 + Math.sin(t * 0.3) * 0.3,
          colorShift: (t * 0.2) % 6.28,
        };
      }

      setSpeed((prev) => lerp(prev, targetState.current.speed, 0.05));
      setLines((prev) => lerp(prev, targetState.current.lines, 0.05));
      setGlow((prev) => lerp(prev, targetState.current.glow, 0.05));
      setAmplitude((prev) => lerp(prev, targetState.current.amplitude, 0.05));
      setFrequency((prev) => lerp(prev, targetState.current.frequency, 0.05));
      setThickness((prev) => lerp(prev, targetState.current.thickness, 0.05));
      setColorShift((prev) => lerp(prev, targetState.current.colorShift, 0.05));

      requestAnimationFrame(tick);
    };

    tick();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div 
      className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans select-none cursor-pointer"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      {/* Background WebGL canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <LinerShader 
          speed={speed} 
          lines={lines} 
          glow={glow} 
          amplitude={amplitude}
          frequency={frequency}
          thickness={thickness}
          colorShift={colorShift}
        />
      </div>

      {/* Subtle Hint Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none mix-blend-difference text-center">
        <p className="text-slate-400/65 font-medium tracking-widest text-xs uppercase select-none">
          Move cursor or drag finger to sculpt lines
        </p>
      </div>
    </div>
  );
}