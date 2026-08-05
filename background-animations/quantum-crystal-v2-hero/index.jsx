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

// --- Fragment Shader (The Magic) ---
// This combines the "Bloom" colorful twisting ribbons with the "Hurtling" 3D infinite tunnel effect.
const fragmentShaderSource = `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uMouse;

  // 2D Rotation Matrix
  mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
  }

  // Pseudo-random hash
  float hash(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
  }

  // Value Noise
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
      // Normalize coordinates
      vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

      // Subtle Parallax based on Mouse
      vec2 m = uMouse / uResolution - 0.5;
      if (length(uMouse) == 0.0) m = vec2(0.0);
      uv += m * 0.15;

      float r = length(uv);
      float a = atan(uv.y, uv.x);

      // Core timing
      float t = uTime * 2.5; // Speed of hurtling

      // Pseudo-3D Tunnel Mapping: 
      // depth approaches infinity as r approaches 0
      float depth = 1.0 / max(r, 0.01);
      float z = depth - t; // Move forward through the tunnel

      // Swirl the tunnel based on depth to create the twisting "Bloom" aesthetic
      float twist = sin(depth * 0.05 - t * 0.1) * 0.5;
      a += twist;

      vec3 col = vec3(0.0);

      // --- Volumetric Beams/Ribbons ---
      float numBeams = 50.0;
      float beamId = floor(a * numBeams / 6.28318);
      
      // Organic noise on the edges so they look like fluid ribbons instead of rigid blocks
      float edgeNoise = noise(vec2(z * 0.4, beamId)) * 0.4 - 0.2;
      float beamLocal = fract(a * numBeams / 6.28318 + edgeNoise);

      // Random seed for the current beam
      float h = hash(vec2(beamId, 1.0));

      // Break beams along Z-axis into discrete zooming streaks
      float zScale = 0.4 + h * 2.0; 
      float zId = floor(z * zScale);
      float zFract = fract(z * zScale);

      // Decide if a streak exists in this segment
      float beamActive = hash(vec2(beamId, zId));

      if (beamActive > 0.25) {
          // Vibrant Bloom Color Palette
          vec3 c1 = vec3(1.0, 0.05, 0.4); // Neon Magenta
          vec3 c2 = vec3(0.0, 0.8, 1.0);  // Cyan
          vec3 c3 = vec3(1.0, 0.6, 0.0);  // Bright Orange
          vec3 c4 = vec3(0.5, 0.0, 1.0);  // Deep Purple

          // Interpolate colors based on angular position and time
          vec3 beamCol = mix(c1, c2, sin(beamId * 0.15 + t) * 0.5 + 0.5);
          beamCol = mix(beamCol, c3, cos(beamId * 0.4 - t * 0.6) * 0.5 + 0.5);
          if (h > 0.8) beamCol = c4;
          if (h < 0.15) beamCol = vec3(1.0, 0.9, 0.2); // Searing Yellow

          // Add a ribbed texture across the beam surface (from Bloom ref)
          float ribbed = sin(z * 30.0 + beamId * 15.0) * 0.5 + 0.5;

          // Build streak intensity
          float intensity = 1.0;
          
          // Edge taper (makes them look like solid, glass-like ribbons)
          float profile = smoothstep(0.0, 0.15, beamLocal) * smoothstep(1.0, 0.85, beamLocal);
          intensity *= profile;

          // Z-axis taper (fades the ends of the streak)
          intensity *= smoothstep(0.0, 0.15, zFract) * smoothstep(1.0, 0.7, zFract);
          intensity *= mix(0.7, 1.0, ribbed);

          // Intense white/chromatic edge glints
          float edgeHighlight = smoothstep(0.8, 1.0, abs(beamLocal - 0.5) * 2.0);
          vec3 highlightCol = vec3(1.0) * edgeHighlight;

          // Output color
          col += beamCol * intensity * (0.6 + h);
          col += highlightCol * intensity * 0.8;

          // Energy pulse traveling along the beam
          float pulse = smoothstep(0.9, 1.0, sin(z * 4.0 + t * 8.0 + beamId));
          col += beamCol * pulse * 2.0 * intensity;
      }

      // --- Ambient Volumetric Glow ---
      float glowNoise = noise(vec2(a * 3.0, z * 1.5 - t));
      vec3 glowCol = mix(vec3(0.8, 0.0, 1.0), vec3(0.0, 0.6, 1.0), sin(a * 2.0)*0.5+0.5);
      col += glowCol * glowNoise * 0.15 / (r + 0.2);

      // --- Central Eclipse / Void ---
      float coreR = 0.18; // Size of the black hole
      float coreMask = smoothstep(coreR, coreR + 0.02, r);
      col *= coreMask;

      // Bright glowing corona ring around the void
      float ring = smoothstep(coreR - 0.02, coreR, r) - smoothstep(coreR, coreR + 0.05, r);
      vec3 corona = vec3(1.0, 0.8, 0.9) * ring;
      corona += vec3(0.2, 0.7, 1.0) * smoothstep(coreR, coreR + 0.1, r) * (1.0 - smoothstep(coreR + 0.05, coreR + 0.3, r));
      col += corona * 1.5;

      // Fade to black at screen edges for depth effect
      col *= exp(-r * 1.2);

      // --- Post-Processing ---
      // Cinematic film grain
      float grain = hash(uv * 200.0 + t);
      col += (grain - 0.5) * 0.08;

      // Tonemapping & Contrast
      col = pow(col, vec3(0.85)); // Gamma correction
      col = smoothstep(0.0, 1.1, col);

      gl_FragColor = vec4(col, 1.0);
  }
`;

const vertexShaderSource = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// --- Shader Canvas Component ---
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

    // Setup geometry (full screen quad)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uTimeLocation = gl.getUniformLocation(program, 'uTime');
    const uResolutionLocation = gl.getUniformLocation(program, 'uResolution');
    const uMouseLocation = gl.getUniformLocation(program, 'uMouse');
    
    // Mouse interaction tracking
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

// --- Main Exported Component ---
export default function App() {
  return (
    <div className="relative w-full h-screen bg-[#010002] overflow-hidden font-sans selection:bg-fuchsia-500 selection:text-white">
      {/* 3D WebGL Background Layer */}
      <div className="absolute inset-0 z-0">
        <ShaderBackground />
      </div>

      {/* Subtle vignette/gradient overlay to anchor the text */}
      <div 
        className="absolute inset-0 z-[1] pointer-events-none" 
        style={{ 
          background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.4) 100%)' 
        }} 
      />


    </div>
  );
}