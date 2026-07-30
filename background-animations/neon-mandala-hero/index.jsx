import React, { useRef, useEffect, useState } from 'react';

// WebGL utility to compile shaders
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

// Utility to convert hex colors to RGB for WebGL
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
  ...props
}) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: false });
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

    // Full screen quad
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    // Bind position attribute
    const positionLocation = gl.getAttribLocation(program, 'position');
    const aPositionLocation = gl.getAttribLocation(program, 'a_position');
    const finalPosLoc = positionLocation >= 0 ? positionLocation : aPositionLocation;
    if (finalPosLoc >= 0) {
      gl.enableVertexAttribArray(finalPosLoc);
      gl.vertexAttribPointer(finalPosLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // Uniform locations
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
    const uSpeedLoc = gl.getUniformLocation(program, 'uSpeed');

    // Interactive mouse tracking
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

      gl.clearColor(0.0, 0.0, 0.0, 1); // Pure black background
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (time - startTime) * 0.001;
      
      if (uTimeLoc !== null) gl.uniform1f(uTimeLoc, t);
      if (uResolutionLoc !== null) gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      if (uMouseLoc !== null) gl.uniform2f(uMouseLoc, mouseRef.current.x, mouseRef.current.y);
      if (uSpeedLoc !== null) gl.uniform1f(uSpeedLoc, speed);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, [vertexShaderSource, fragmentShaderSource, speed]);

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
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uMouse;

    // 2D Rotation matrix
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Hash and Noise for Fluid Generation
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
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

    // Fractional Brownian Motion for complex organic shapes
    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 r = rot(0.65); // rotation per octave
        for (int i = 0; i < 6; i++) {
            v += a * noise(p);
            p = r * p * 2.0;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        // Mouse interaction for subtle parallax shift
        vec2 mouse = uMouse / uResolution;
        if (length(uMouse) > 10.0) {
            uv += (mouse - 0.5) * 0.1;
        }
        
        // Sweeping diagonal setup to match the reference images flow
        uv *= rot(0.7);
        vec2 p = uv * 2.2; 
        
        float t = uTime * 0.15; // Animation speed
        
        // Domain warping magic (recursive noise) to simulate fluid folds
        vec2 q = vec2(0.0);
        q.x = fbm(p + t);
        q.y = fbm(p + vec2(1.0) - t);
        
        vec2 r = vec2(0.0);
        r.x = fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 1.2);
        r.y = fbm(p + 2.0 * q + vec2(8.3, 2.8) - t * 1.1);
        
        // The master heightmap/field
        float f = fbm(p + r * 2.5);
        
        // --- The Ridges / Striations ---
        // High frequency sine based on the noise field to create topographic metallic lines
        float freq = 250.0; // Density of the ridges
        // Sharpen the lines using a power function
        float lines = pow(abs(sin(f * freq + t * 8.0)), 1.5); 
        
        // --- Color Palette ---
        // Vibrant neon/iridescent colors from your references
        vec3 colorPink  = vec3(1.0, 0.0, 0.4); // Hot Pink
        vec3 colorCyan  = vec3(0.0, 0.9, 1.0); // Electric Cyan
        vec3 colorGold  = vec3(1.0, 0.6, 0.0); // Warm Gold/Orange
        vec3 colorDark  = vec3(0.0, 0.0, 0.0); // Pure Black for the voids
        
        // Organically blend colors based on the domain warp fields
        vec3 col = mix(colorDark, colorPink, smoothstep(0.2, 0.6, q.x));
        col = mix(col, colorCyan, smoothstep(0.3, 0.9, r.y));
        col = mix(col, colorGold, smoothstep(0.5, 0.8, q.y * r.x * 1.5));
        
        // --- Shading & Lighting (DEEP ONLY) ---
        // Create the deep dark background voids where 'f' is low (Valleys are pure black)
        // This extreme smoothstep is what creates the "deep only" high contrast look.
        float shadowMask = smoothstep(0.38, 0.68, f);
        
        // Combine everything: Apply lines as a modulation of the brightness
        vec3 finalCol = col * lines * shadowMask * 4.0;
        
        // Add metallic specular highlights to the very peaks of the ridges
        float spec = pow(abs(sin(f * freq + 1.57 + t * 8.0)), 8.0); 
        finalCol += vec3(1.0, 0.9, 0.9) * spec * shadowMask * 2.0;
        
        // Ambient colorful glow bleeding slightly into the dark areas
        finalCol += col * pow(f, 4.0) * 1.2;
        
        // Vignette to match the dark, dramatic framing
        float dist = length(uv);
        finalCol *= smoothstep(1.5, 0.1, dist);
        
        // Ensure pure blacks remain pitch black for high contrast
        finalCol = max(finalCol - 0.05, 0.0);
        
        // Post-processing Gamma correction to make colors pop vibrantly
        finalCol = pow(finalCol, vec3(0.95));
        
        gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
    }
  `
};

export const NeonMandalaHero = ({ className = '', children, ...props }) => (
  <div className={`relative w-full h-screen bg-black overflow-hidden font-sans ${className}`}>
    {/* Canvas Background */}
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        {...props} 
      />
    </div>
    
    {/* Content Container */}
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center p-6">
      <div className="pointer-events-auto w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        {children}
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <NeonMandalaHero speed={1.0}>
      {/* You can add text or UI elements here. They will appear over the shader. */}
    </NeonMandalaHero>
  );
}