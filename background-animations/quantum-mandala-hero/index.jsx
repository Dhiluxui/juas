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

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      targetMouseRef.current.x = (e.clientX - rect.left) * dpr;
      targetMouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    
    // Add touch support for mobile
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
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.03;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.03;

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


// ============================================================================
// Shader Data: Iridescent Obsidian
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

    // 2D Rotation Matrix
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Advanced Fluid Domain Warping
    // Iterates multiple times to create organic, overlapping folds
    vec2 fluidWarp(vec2 p, float t, float offset) {
        vec2 q = p;
        for(float i = 1.0; i <= 5.0; i++) {
            float fi = i;
            // The X/Y offsets create the diagonal stretching typical of liquid reflections
            q.x += (0.35 / fi) * sin(fi * 1.8 * q.y + t + offset);
            q.y += (0.35 / fi) * cos(fi * 1.8 * q.x - t + offset);
        }
        return q;
    }

    void main() {
        // Normalize coordinates and account for aspect ratio
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= uResolution.x / uResolution.y;
        
        // Mouse parallax integration
        vec2 mouse = (uMouse * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
        if(length(uMouse) < 0.1) mouse = vec2(0.0); // Default to 0 if unused
        p += mouse * 0.15; // Shift the domain based on mouse

        // Diagonal stretch to match the sweeping aesthetic of the reference image
        p *= rot(0.7); // Rotate approximately 45 degrees
        p.y *= 1.4;    // Stretch vertically to make long flowing liquid streaks

        float t = uTime * uSpeed * 0.15;
        
        // --- CHROMATIC ABERRATION SETUP ---
        // By calculating the fluid distortion three times with a slight spatial offset,
        // we force the sharp ridges to separate into RGB channels at the edges.
        float caOffset = 0.06; 
        
        vec2 qR = fluidWarp(p, t, 0.0);
        vec2 qG = fluidWarp(p, t, caOffset);
        vec2 qB = fluidWarp(p, t, caOffset * 2.0);

        // --- SPECULAR RIDGE CALCULATION ---
        // The core math for the "liquid glass" look.
        // sin() creates waves, 1.0 - abs(sin()) inverts them into sharp ridges.
        float freq = 2.0;
        float rWave = 1.0 - abs(sin(qR.x * freq + qR.y * freq));
        float gWave = 1.0 - abs(sin(qG.x * freq + qG.y * freq));
        float bWave = 1.0 - abs(sin(qB.x * freq + qB.y * freq));
        
        // pow() sharpens the peaks into razor-thin specular highlights.
        float rSharp = pow(rWave, 18.0);
        float gSharp = pow(gWave, 18.0);
        float bSharp = pow(bWave, 18.0);
        
        // A secondary, softer power creates the glowing "dispersion" rainbow bleed
        float rGlow = pow(rWave, 3.0);
        float gGlow = pow(gWave, 3.0);
        float bGlow = pow(bWave, 3.0);

        // --- CORE HIGHLIGHT ---
        // Where all three RGB channels overlap perfectly, it creates a blinding white-hot core
        float core = pow(rWave * gWave * bWave, 3.0) * 4.0; 

        // --- COMPOSITION ---
        vec3 bg = vec3(0.005, 0.005, 0.01); // Deep, rich obsidian black

        // Assemble the optical layers
        // We add a warm golden tint to the glow layer to match the reference image
        vec3 glowColor = vec3(rGlow * 1.0, gGlow * 0.8, bGlow * 0.5) * 0.6;
        vec3 sharpColor = vec3(rSharp, gSharp, bSharp) * 1.5;
        
        vec3 col = bg + glowColor + sharpColor + vec3(core);

        // --- ENVIRONMENTAL LIGHTING ---
        // Adds a very subtle, broad gradient to simulate a studio light environment
        float envLight = sin(uv.x * 2.0 - uv.y * 2.0 + t);
        col += vec3(0.08, 0.1, 0.15) * smoothstep(0.4, 1.0, envLight) * 0.3;

        // --- POST PROCESSING ---
        // Vignette to frame the composition and draw the eye to the bright streaks
        float vignette = length(uv - 0.5);
        col *= 1.0 - smoothstep(0.4, 1.2, vignette);
        
        // Cinematic ACES-style Tone Mapping for rich highlights and deep shadows
        col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
        
        // Slight Gamma Correction for extra vibrancy
        col = pow(col, vec3(1.1)); 

        gl_FragColor = vec4(col, 1.0);
    }
  `
};


export const IridescentObsidianHero = ({ className = '', children }) => (
  <div className={`relative w-full h-full bg-[#030305] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
      />
    </div>
    
    {/* Optional Subtle Overlay Gradient to ensure UI elements pop */}
    <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/20" />
    
    {/* Foreground Children Slot */}
    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>
  </div>
);


// ============================================================================
// Main App Component
// ============================================================================
export default function App() {
  return (
    <div className="w-screen h-screen">
      <IridescentObsidianHero>
        {/* Demonstration UI to show integration */}
      </IridescentObsidianHero>
    </div>
  );
}