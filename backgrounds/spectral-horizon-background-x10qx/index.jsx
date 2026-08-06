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
  const targetMouseRef = React.useRef({ x: 0, y: 0 });

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

    // Setup full-screen quad
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

    // Smooth Mouse Interaction
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      targetMouseRef.current.x = (e.clientX - rect.left) * dpr;
      targetMouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
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
        targetMouseRef.current.x = canvas.width / 2;
        targetMouseRef.current.y = canvas.height / 2;
        initialSet = true;
      }

      // Lerp mouse for smoothness
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

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
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
  `,
  fragment: `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uMouse;

    // Smooth HSV to RGB conversion for vibrant spectral colors
    vec3 hsv2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return c.z * mix(vec3(1.0), rgb, c.y);
    }

    void main() {
        // Normalize coordinates and fix aspect ratio
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        
        // Mouse interaction for subtle horizon tilting
        vec2 m = (uMouse.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        float tilt = m.x * 0.15;
        float s = sin(tilt), c = cos(tilt);
        uv = mat2(c, -s, s, c) * uv;

        float t = uTime * 0.2;
        vec2 p = uv;

        // 1. DOMAIN WARPING (X-Axis)
        // This creates the organic, shifting vertical columns
        float warpX = p.x;
        warpX += sin(warpX * 2.5 + t) * 0.2;
        warpX += sin(warpX * 4.0 - t * 0.7) * 0.1;

        // 2. THE HORIZON FOLD
        // Add a slight sweeping curve to the center axis
        float hLine = p.y + sin(warpX * 1.8) * 0.06;
        float hDist = abs(hLine);

        // 3. COLOR PALETTE GENERATION
        // Generating spectral colors based on the warped X coordinate
        float hue = fract(warpX * 0.6 + t * 0.15 + 0.65); 
        
        // Base palette: Deep Blue, Vivid Orange, Cyan/White, Magenta
        vec3 colorA = vec3(0.0, 0.25, 1.0); // Deep Blue
        vec3 colorB = vec3(1.0, 0.25, 0.0); // Vivid Orange
        vec3 colorC = vec3(1.0, 0.95, 0.4); // Bright Yellow/White
        vec3 colorD = vec3(0.8, 0.05, 1.0); // Neon Magenta
        
        // Mix colors dynamically across the horizon
        float mix1 = sin(warpX * 3.5 + t * 1.2) * 0.5 + 0.5;
        float mix2 = cos(warpX * 2.2 - t * 0.8) * 0.5 + 0.5;
        float mix3 = sin(warpX * 5.0 + t * 2.0) * 0.5 + 0.5;
        
        vec3 finalCol = mix(colorA, colorB, smoothstep(0.2, 0.8, mix1));
        finalCol = mix(finalCol, colorC, smoothstep(0.8, 1.0, mix1) * mix3);
        finalCol = mix(finalCol, colorD, smoothstep(0.6, 1.0, mix2) * 0.7);

        // 4. VERTICAL COLUMNS MASK
        // Creates discrete "blocks" or "pillars" of light along the horizon
        float columns = sin(warpX * 14.0);
        columns = smoothstep(0.1, 0.9, columns); 
        
        // 5. VOLUMETRIC BLOOM / LIGHT LEAK
        // Light bleeds vertically, extending further where columns exist
        float bleedRange = 8.0 - columns * 6.0; 
        float verticalBloom = exp(-hDist * bleedRange);
        
        // 6. THE RAZOR SHARP HORIZON LINE
        float razorEdge = exp(-hDist * 400.0);

        // --- COMPOSITION ---
        vec3 bg = vec3(0.005, 0.01, 0.03); // Void background
        vec3 renderColor = bg;
        
        // Add the glowing light columns
        renderColor += finalCol * verticalBloom * 1.8;
        
        // Add the intense, blinding horizon line
        renderColor += vec3(1.0, 0.95, 0.9) * razorEdge * 1.5;
        
        // Add a secondary sweeping flare (holographic reflection)
        float flare = exp(-abs(hLine - sin(warpX * 5.0 + t * 3.0) * 0.15) * 25.0);
        renderColor += finalCol * flare * 0.5;

        // --- POST-PROCESSING ---
        // Radial Vignette
        float vignette = length(uv * vec2(0.6, 1.2));
        renderColor *= smoothstep(1.8, 0.1, vignette);
        
        // Tone Mapping & Contrast
        renderColor = pow(renderColor, vec3(1.15)); 

        gl_FragColor = vec4(renderColor, 1.0);
    }
  `
};

export const SpectralHorizonHero = ({ className = '', children, ...props }) => (
  <div className={`relative w-full h-full bg-[#020306] overflow-hidden font-sans ${className}`}>
    
    {/* Base WebGL Layer */}
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        {...props} 
      />
    </div>

    {/* Subtle Darkening Overlay to ensure text readability */}
    <div 
      className="absolute inset-0 z-[1] pointer-events-none" 
      style={{ 
        background: 'linear-gradient(to bottom, rgba(2, 3, 6, 0.8) 0%, transparent 30%, transparent 70%, rgba(2, 3, 6, 0.8) 100%)' 
      }} 
    />
    
    {/* Foreground Children Slot */}
    <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <div className="w-screen h-screen">
      <SpectralHorizonHero>
        
      </SpectralHorizonHero>
    </div>
  );
}