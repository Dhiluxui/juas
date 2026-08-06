import React, { useEffect, useRef } from 'react';

/* STREAMING_CHUNK:Initializing core WebGL helpers... */

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

export function ShaderBackground({ vertexShaderSource, fragmentShaderSource, className = '', speed = 1.0 }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });

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

    /* STREAMING_CHUNK:Setting up geometry and buffers... */
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

    const timeLocation = gl.getUniformLocation(program, 'uTime');
    const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
    const mouseLocation = gl.getUniformLocation(program, 'uMouse');
    const speedLocation = gl.getUniformLocation(program, 'uSpeed');

    /* STREAMING_CHUNK:Configuring mouse interactions... */
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      targetMouseRef.current.x = (e.clientX - rect.left) * dpr;
      targetMouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        targetMouseRef.current.x = (e.touches[0].clientX - rect.left) * dpr;
        targetMouseRef.current.y = canvas.height - (e.touches[0].clientY - rect.top) * dpr;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });

    let initialSet = false;
    let animationFrameId;
    let startTime = performance.now();

    /* STREAMING_CHUNK:Defining the render loop... */
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
        targetMouseRef.current.x = canvas.width / 2;
        targetMouseRef.current.y = canvas.height / 2;
        initialSet = true;
      }

      // Silky smooth mouse interpolation
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (time - startTime) * 0.001;
      
      if (timeLocation !== null) gl.uniform1f(timeLocation, t);
      if (resolutionLocation !== null) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      if (mouseLocation !== null) gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);
      if (speedLocation !== null) gl.uniform1f(speedLocation, speed);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(uvBuffer);
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

/* STREAMING_CHUNK:Writing the custom fragment shader... */
// ============================================================================
// Shader Data: Iridescent Contour / Fluted Glass Topography
// ============================================================================

const shaderData = {
  vertex: `
    attribute vec2 position;
    void main() { 
      gl_Position = vec4(position, 0.0, 1.0); 
    }
  `,
  fragment: `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uSpeed;

    // 2D Rotation Matrix for domain tilting
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Heavy Domain Warping for the fluid shape
    vec2 fluidWarp(vec2 p, float t, float offset) {
        vec2 q = p;
        for(float i = 1.0; i <= 5.0; i++) {
            float fi = i;
            // The sine/cosine loops create the complex folding and sweeping structure
            q.x += (0.4 / fi) * sin(fi * 2.0 * q.y + t + offset);
            q.y += (0.4 / fi) * cos(fi * 2.0 * q.x - t + offset);
        }
        return q;
    }

    void main() {
        // Normalize coordinates, adjusting for aspect ratio
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
        
        // Mouse parallax integration
        vec2 mouse = (uMouse * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
        if(length(uMouse) < 0.1) mouse = vec2(0.0);
        uv += mouse * 0.08;

        // Base domain rotation - tilting the whole fluid field
        vec2 p = uv * rot(0.4);

        float t = uTime * uSpeed * 0.2;
        
        // --- CHROMATIC ABERRATION SETUP ---
        // Calculate the fluid distortion 3 times with a spatial offset.
        // This splits the high-frequency ridges into distinct RGB channels.
        float caOffset = 0.035; 
        
        vec2 qR = fluidWarp(p, t, 0.0);
        vec2 qG = fluidWarp(p, t, caOffset);
        vec2 qB = fluidWarp(p, t, caOffset * 2.0);

        // --- HIGH-FREQUENCY CONTOUR LINES ---
        // We push the warped coordinates through a high-frequency sine function.
        // predominantly based on the Y-axis to create predominantly horizontal sweeping lines.
        float lineFreq = 75.0;
        
        // Use 1.0 - abs(sin) to create incredibly sharp peaks
        float rWave = 1.0 - abs(sin(qR.y * lineFreq + qR.x * 20.0));
        float gWave = 1.0 - abs(sin(qG.y * lineFreq + qG.x * 20.0));
        float bWave = 1.0 - abs(sin(qB.y * lineFreq + qB.x * 20.0));
        
        // Exponentiate the waves to make them razor-thin, glowing specular ridges
        float sharpness = 5.0;
        float rSharp = pow(rWave, sharpness);
        float gSharp = pow(gWave, sharpness);
        float bSharp = pow(bWave, sharpness);

        // --- MACRO COLOR MASKS ---
        // We use the macro structure of the warp to define where certain colors appear
        // so it isn't a uniform rainbow, creating structured ribbons of color.
        float maskR = smoothstep(-0.5, 1.0, sin(qR.x * 2.5 + t));
        float maskG = smoothstep(-0.5, 1.0, cos(qG.y * 2.5 - t));
        float maskB = smoothstep(-0.5, 1.0, sin(qB.x * 2.0 + qB.y * 2.5 + t));

        // --- THE COLOR PALETTE ---
        // Exactly matching the reference: Neon Magenta, Vibrant Gold, Electric Cyan
        vec3 colMagenta = vec3(1.0, 0.0, 0.8) * 1.5;
        vec3 colGold    = vec3(1.0, 0.8, 0.1) * 1.8;
        vec3 colCyan    = vec3(0.0, 0.8, 1.0) * 1.5;
        vec3 colPurple  = vec3(0.4, 0.0, 1.0) * 1.2;

        vec3 color = vec3(0.0);
        
        // Apply the sharp ridges mixed with their respective color masks
        color += colMagenta * rSharp * maskR;
        color += colGold * gSharp * maskG;
        color += colCyan * bSharp * maskB;
        
        // Where Red and Blue mix intensely, force a deep neon purple glow
        color += colPurple * (rSharp * bSharp * 0.8);

        // --- PURE WHITE CORES ---
        // Where the ridges align perfectly across all channels, it means the fluid 
        // hasn't split the spectrum there. We blow this out to pure white specular.
        float core = pow(rWave * gWave * bWave, 2.0) * 2.5;
        color += vec3(1.0) * core;

        // --- GLOBAL STRUCTURAL MASK ---
        // Create the dark empty void on the right/bottom side of the screen 
        // to mimic the striking composition of the reference image.
        float globalMask = smoothstep(1.8, -0.4, qG.x * 0.8 - qG.y * 0.5);
        color *= globalMask;

        // Deep void background for the empty areas
        vec3 bg = vec3(0.005, 0.001, 0.015);
        color += bg * (1.0 - globalMask);

        // --- POST PROCESSING ---
        // Soft vignette to frame the piece
        float vignette = length(uv);
        color *= 1.0 - smoothstep(1.2, 2.8, vignette);
        
        // Tone Mapping & Contrast
        // S-Curve to enrich the darks and make the neon lights pop
        color = color * color * (3.0 - 2.0 * color); 
        color = pow(color, vec3(1.15)); 

        gl_FragColor = vec4(color, 1.0);
    }
  `
};

/* STREAMING_CHUNK:Building the hero component... */
export const IridescentContourHero = ({ className = '', children }) => (
  <div className={`relative w-full h-full bg-[#030105] overflow-hidden font-sans ${className}`}>
    {/* Base WebGL Layer */}
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
      />
    </div>
  </div>
);

// ============================================================================
// Main App Component
// ============================================================================
export default function App() {
  return (
    <div className="w-screen h-screen">
      <IridescentContourHero />
    </div>
  );
}