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

    #define PI 3.14159265359

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Simplex noise inspired implementation for organic flow
    vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(.1031, .1030, .0973));
        p3 += dot(p3, p3.yxz+33.33);
        return fract((p3.xxy + p3.yxx)*p3.zyx);
    }

    float noise(in vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f*f*(3.0-2.0*f);
        
        return mix(
            mix(mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)), 
                    dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), f.x),
                mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)), 
                    dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), f.x), f.y),
            mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)), 
                    dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), f.x),
                mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)), 
                    dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), f.x), f.y), f.z
        ) * 0.5 + 0.5;
    }

    float fbm(vec3 p) {
        float f = 0.0;
        float amp = 0.5;
        for(int i = 0; i < 4; i++) {
            f += amp * noise(p);
            p *= 2.0;
            amp *= 0.5;
        }
        return f;
    }

    // Generates the vibrant, chromatic aberration style colors
    vec3 spectralColor(float t) {
        // Shift t to align colors with references (Cyan, Yellow, Red/Magenta)
        t = fract(t);
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.00, 0.33, 0.67);
        
        // Emphasize cyan/blue and red/orange transitions
        vec3 col = a + b * cos(2.0 * PI * (c * t + d));
        
        // Boost vibrancy
        return pow(col, vec3(1.5));
    }

    void main() {
        // Setup UV coordinates
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
        
        // Mouse interaction for subtle perspective shift
        vec2 m = uMouse.xy / uResolution.xy;
        if(m.x == 0.0 && m.y == 0.0) m = vec2(0.5);
        m = (m - 0.5) * 2.0;

        // Base flow direction (diagonal sweep)
        float baseAngle = -PI * 0.25 + m.x * 0.1;
        uv *= rot(baseAngle);
        
        // Time variables for smooth animation
        float t = uTime * 0.15;
        
        vec3 finalColor = vec3(0.0);
        
        // Number of distinct light bands/fibers
        const float NUM_BANDS = 8.0;
        
        for(float i = 0.0; i < NUM_BANDS; i++) {
            // Unique properties per band
            float bandOffset = i * 1.618; // Golden ratio offset
            float scale = 1.0 + i * 0.3;
            
            vec2 p = uv * scale;
            
            // Complex flow field using fbm
            vec3 noisePos = vec3(p.y * 1.5 - t * (1.0 + i * 0.1), p.x * 0.2 + t, bandOffset + t * 0.2);
            float distortion = fbm(noisePos) * 2.0 - 1.0;
            
            // Create the sweeping light threads
            // Use sin waves heavily distorted by noise
            float thread = sin(p.x * 3.0 + distortion * 4.0 + bandOffset * PI);
            
            // Sharpen the thread into a fine line
            float sharpness = 15.0 + i * 5.0; // Inner threads are sharper
            float intensity = exp(-sharpness * abs(thread));
            
            // Calculate chromatic dispersion/color for this thread
            // Color shifts along the length (y) and based on distortion
            float colorIndex = p.y * 0.3 + distortion * 0.5 + i * 0.15 + t * 0.5;
            vec3 col = spectralColor(colorIndex);
            
            // Add specific bright highlights where threads curve sharply
            float highlight = smoothstep(0.7, 1.0, abs(distortion));
            col += vec3(1.0) * highlight * 0.5;
            
            // Mix cyan and warm tones explicitly to match references
            vec3 cyanBlue = vec3(0.0, 0.5, 1.0);
            vec3 warmRed = vec3(1.0, 0.2, 0.0);
            vec3 mixedBase = mix(cyanBlue, warmRed, sin(colorIndex * PI * 2.0) * 0.5 + 0.5);
            
            // Blend the procedural spectral color with the forced cyan/red mix
            vec3 bandColor = mix(col, mixedBase, 0.6);
            
            // Add the thread to the final image
            // Depth/alpha sorting approximation
            float alpha = 1.0 / (1.0 + i * 0.5);
            finalColor += bandColor * intensity * alpha;
            
            // Add a soft, dispersed glow around the sharp thread
            float glow = exp(-3.0 * abs(thread));
            finalColor += bandColor * glow * 0.2 * alpha;
        }

        // Dark, deep background with a subtle ambient color
        vec3 bgColor = vec3(0.01, 0.01, 0.03);
        // Vignette effect to darken edges
        float vignette = 1.0 - smoothstep(0.5, 2.5, length(uv));
        bgColor *= vignette;
        
        finalColor += bgColor;
        
        // Contrast enhancement
        finalColor = smoothstep(0.0, 1.0, finalColor);
        // Subtle saturation boost
        vec3 lumWeights = vec3(0.299, 0.587, 0.114);
        float lum = dot(finalColor, lumWeights);
        finalColor = mix(vec3(lum), finalColor, 1.2);

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