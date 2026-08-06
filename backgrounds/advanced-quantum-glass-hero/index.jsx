import React, { useRef, useEffect } from 'react';

// WebGL Shader Compilation Helper
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

// Utility to convert hex colors to normalized RGB arrays for WebGL uniforms
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
  numPanels = 7.0,    // Defines the number of vertical glass flutes
  ...props
}) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
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

    // Setup full-screen quad (2 triangles covering -1 to 1 in both axes)
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
    const uSpeedLoc = gl.getUniformLocation(program, 'uSpeed');
    const uPanelsLoc = gl.getUniformLocation(program, 'uPanels');

    // Smooth Mouse Interaction Event Listener
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

      // Linear interpolation for silky smooth mouse tracking
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (time - startTime) * 0.001;
      
      if (timeLocation !== null) gl.uniform1f(timeLocation, t);
      if (resolutionLocation !== null) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      if (mouseLocation !== null) gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);
      if (uSpeedLoc !== null) gl.uniform1f(uSpeedLoc, speed);
      if (uPanelsLoc !== null) gl.uniform1f(uPanelsLoc, numPanels);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(uvBuffer);
    };
  }, [vertexShaderSource, fragmentShaderSource, speed, numPanels]);

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
    uniform float uSpeed;
    uniform float uPanels;

    // --- BACKGROUND FLUID FUNCTION ---
    // Simulates the colorful, wavy liquid gradients behind the glass
    vec3 getBackground(vec2 uv, float t) {
        vec2 p = uv;
        
        // Fluid Domain Warping
        for(float i = 1.0; i <= 4.0; i++) {
            p.x += 0.3 / i * cos(i * 3.0 * p.y + t * 0.8);
            p.y += 0.3 / i * cos(i * 1.5 * p.x - t * 0.5);
        }
        
        // Base fluid wave value
        float v = sin(p.x * 2.0 + p.y * 2.0 + t * 0.5);
        
        // Colors matching the reference image perfectly
        vec3 deepBlue  = vec3(0.02, 0.1, 0.7);
        vec3 vividMag  = vec3(0.8, 0.05, 0.9);
        vec3 hotOrange = vec3(1.0, 0.5, 0.1);
        vec3 brightWht = vec3(1.0, 0.9, 0.8);
        vec3 deepPurp  = vec3(0.2, 0.0, 0.4);

        // Mix the colors based on the fluid wave and screen position
        vec3 color = mix(deepPurp, deepBlue, smoothstep(-1.0, -0.4, v));
        color = mix(color, vividMag, smoothstep(-0.4, 0.1, v));
        color = mix(color, hotOrange, smoothstep(0.1, 0.6, v));
        color = mix(color, brightWht, smoothstep(0.6, 1.0, v));
        
        // Add a vertical gradient to ground it
        color = mix(color, deepBlue, smoothstep(0.8, 0.0, uv.y) * 0.5);
        
        return color;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        float aspect = uResolution.x / uResolution.y;
        float t = uTime * uSpeed;
        
        // Mouse interaction for parallax
        vec2 mouse = uMouse / uResolution.xy;
        if(length(mouse) < 0.01) mouse = vec2(0.5); 
        float mouseOffset = (mouse.x - 0.5) * 0.1;

        // --- GLASS PANEL GEOMETRY ---
        // Slicing the screen into vertical panels
        float panelCount = uPanels;
        float px = (uv.x + mouseOffset) * panelCount;
        float panelId = floor(px);
        float localX = fract(px); // 0.0 to 1.0 inside each panel

        // --- CALCULATE VIRTUAL 3D NORMALS ---
        // Simulating a curved semi-cylinder for each panel
        // The curve is sharp at the edges and flatter in the middle
        float nx = sign(localX - 0.5) * pow(abs((localX - 0.5) * 2.0), 1.2); 
        float nz = sqrt(max(1.0 - nx * nx, 0.0)); // Z normal derived from X
        vec3 normal = normalize(vec3(nx, 0.0, nz));

        // --- REFRACTION OFFSET ---
        float refrStrength = 0.06;
        vec2 refrOffset = normal.xy * refrStrength;
        
        // Break fluid continuity slightly across panels to enforce the physical pane separation
        vec2 baseUV = uv;
        baseUV.y += panelId * 0.02; // Vertical stagger per panel
        baseUV.x += panelId * 0.005; // Slight horizontal shift

        // --- CHROMATIC ABERRATION ---
        // Sample the background 3 times with slightly different refraction strengths
        // This creates the realistic prismatic edge splitting
        float caSpread = 0.015;
        vec3 glassColor;
        glassColor.r = getBackground(baseUV + refrOffset * (1.0 - caSpread), t).r;
        glassColor.g = getBackground(baseUV + refrOffset * 1.0, t).g;
        glassColor.b = getBackground(baseUV + refrOffset * (1.0 + caSpread), t).b;

        // --- REALISTIC SHADING & LIGHTING ---
        // 1. Edge Specular Highlights (Catchlights)
        float edgePeak = pow(abs(nx), 8.0); // Extremely sharp near the seams
        vec3 highlight = vec3(1.0, 0.95, 0.9) * edgePeak * 0.6;
        glassColor += highlight;

        // 2. Seam Shadows (Total Internal Reflection/Occlusion)
        // Darkens the very edges where panels meet
        float seamMask = smoothstep(0.92, 1.0, abs((localX - 0.5) * 2.0));
        glassColor = mix(glassColor, vec3(0.0), seamMask * 0.6);

        // 3. Volumetric Core Brightness
        // Makes the center of the cylinder slightly brighter, enhancing the 3D pop
        float core = smoothstep(1.0, 0.0, abs((localX - 0.5) * 2.0));
        glassColor += glassColor * core * 0.15;

        // --- POST PROCESSING ---
        // Vignette to frame the composition
        vec2 centerUV = uv * 2.0 - 1.0;
        float vignette = 1.0 - smoothstep(0.5, 1.5, length(centerUV * vec2(0.8, 1.2)));
        glassColor *= mix(0.5, 1.0, vignette);

        // Tone Mapping for cinematic contrast
        glassColor = pow(glassColor, vec3(1.1)); 

        gl_FragColor = vec4(glassColor, 1.0);
    }
  `
};

export const RealisticFlutedGlassHero = ({ className = '', children, ...props }) => (
  <div className={`relative w-full h-full bg-[#030105] overflow-hidden font-sans ${className}`}>
    
    {/* Base WebGL Shader Layer */}
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        numPanels={8.0} // 8 visible vertical panels precisely matching the reference
        {...props} 
      />
    </div>

    {/* Subtle Ambient Shadow Overlay for overlaying Text/UI cleanly */}
    <div 
      className="absolute inset-0 z-[1] pointer-events-none" 
      style={{ 
        background: 'linear-gradient(to bottom, rgba(3, 1, 5, 0.4) 0%, transparent 25%, transparent 75%, rgba(3, 1, 5, 0.6) 100%)' 
      }} 
    />
    
    {/* Foreground Content Slot */}
    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none">
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <div className="w-screen h-screen">
      <RealisticFlutedGlassHero>
        {/* Example overlay content to show it works properly as a background */}
          {/* Subtle interior glow for the glass card */}
      </RealisticFlutedGlassHero>
    </div>
  );
}