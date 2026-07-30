import React, { useEffect, useRef } from 'react';

// ============================================================================
// Core WebGL Renderer
// ============================================================================

export function createShader(gl, type, source) {
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

export function ShaderBackground({ vertexShaderSource, fragmentShaderSource, className = '' }) {
  const canvasRef = useRef(null);
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

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        mouseRef.current.x = (e.touches[0].clientX - rect.left) * dpr;
        mouseRef.current.y = canvas.height - (e.touches[0].clientY - rect.top) * dpr;
      }
    }, { passive: true });

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
      
      // Support multiple uniform naming conventions
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
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;

    // Rotation matrix for angling the streaks
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // 2D Noise function for fluid distortion
    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }
    
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    // Fractional Brownian Motion for complex flow
    float fbm(vec2 p) {
        float f = 0.0, w = 0.5;
        for(int i = 0; i < 5; i++) {
            f += w * noise(p);
            p *= 2.0;
            w *= 0.5;
        }
        return f;
    }

    // Dynamic Iridescent Palette based on the reference images
    // Shifting through deep reds, bright cyans, and warm yellows
    vec3 palette(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        // Custom phases for cyan, magenta/red, yellow
        vec3 d = vec3(0.0, 0.33, 0.67); 
        return a + b * cos(6.28318 * (c * t + d));
    }

    void main() {
        // Normalize coordinates and account for aspect ratio
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
        
        // Interactive mouse input for slight perspective/flow shifts
        vec2 m = uMouse.xy / uResolution.xy;
        if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);

        // Apply a diagonal rotation similar to the reference images
        uv *= rot(-0.5 + m.x * 0.2); 
        
        // Base color accumulator
        vec3 finalColor = vec3(0.0);

        // Create multiple layers of light streaks
        for(float i = 0.0; i < 4.0; i++) {
            // Layer-specific offset and scale
            float scale = 1.0 + i * 0.5;
            vec2 p = uv * scale;
            
            // Flow animation
            float t = uTime * (0.2 + i * 0.1);
            
            // Distort the vertical coordinates (x-axis after rotation) to create streaks
            // Use noise to make them waver and blend like fluid or smoke
            float distortion = fbm(vec2(p.y * 0.5 + t, p.x * 0.1 - t * 0.5));
            
            // The "core" of the streak, clamped to create sharp light edges
            float streak = sin(p.x * 10.0 + distortion * 8.0 + i * 1.5);
            streak = smoothstep(0.8, 1.0, streak); // Sharpen the bright parts
            
            // Chromatic aberration / dispersion effect
            // Sample slightly offset palettes to create rainbow edges
            float colorIndex = p.y * 0.2 + t * 0.1 + i * 0.2;
            vec3 layerColor = palette(colorIndex + distortion * 0.2);
            
            // Add a burst of specific colors (reds and cyans prominent in references)
            vec3 highlight = mix(vec3(0.1, 0.8, 1.0), vec3(1.0, 0.1, 0.2), sin(colorIndex * 3.14) * 0.5 + 0.5);
            layerColor = mix(layerColor, highlight, 0.6);

            // Attenuate brightness based on layer depth and add to total
            finalColor += layerColor * streak * (1.0 / (i + 1.0));
            
            // Add wide, soft glow around the streaks
            float softGlow = max(0.0, sin(p.x * 5.0 + distortion * 4.0));
            finalColor += layerColor * pow(softGlow, 4.0) * 0.2;
        }

        // Deepen the background to a rich, dark tone instead of pure black
        vec3 bgColor = mix(vec3(0.02, 0.01, 0.05), vec3(0.0, 0.05, 0.1), length(uv));
        finalColor += bgColor;

        // Contrast and vibrancy boost (ACES tonemapping approx)
        finalColor *= 1.2;
        finalColor = clamp((finalColor * (2.51 * finalColor + 0.03)) / (finalColor * (2.43 * finalColor + 0.59) + 0.14), 0.0, 1.0);

        // Vignette to frame the light
        finalColor *= 1.0 - length(uv) * 0.3;

        gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

export const EtherealPlasmaBackgroundHero = ({ className = '', ...props }) => (
  <div className={`relative w-full h-full bg-[#030008] overflow-hidden font-sans ${className}`} {...props}>
    {/* Base Shader Layer */}
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} />
    </div>
  </div>
);

export default function App() {
  return (
    <div className="w-full h-screen bg-black">
      <EtherealPlasmaBackgroundHero />
    </div>
  );
}