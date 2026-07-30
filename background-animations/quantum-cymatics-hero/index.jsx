import React from 'react';

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
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

function hexToRgb(hex: string) {
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
}: any) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const mouseRef = React.useRef({ x: 0, y: 0 });

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

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = canvas.height - (e.clientY - rect.top) * dpr;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let initialSet = false;
    let animationFrameId: number;
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

    const render = (time: number) => {
      resize();

      if (!initialSet && canvas.width > 0) {
        mouseRef.current.x = canvas.width / 2;
        mouseRef.current.y = canvas.height / 2;
        initialSet = true;
      }

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
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `,
  fragment: `
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;

    // 2D Rotation Matrix
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Hash for quantum sand noise
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // 2D Value Noise for environmental reflections
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }

    // FBM for environmental reflections
    float fbm(vec2 p) {
        float f = 0.0;
        float amp = 0.5;
        for(int i = 0; i < 4; i++) {
            f += amp * noise(p);
            p *= 2.0;
            amp *= 0.5;
        }
        return f;
    }

    // Complex Chladni Resonance Pattern (Cymatics)
    float chladni(vec2 uv, float t) {
        // Dynamically shifting quantum frequencies
        float n1 = 3.0 + sin(t * 0.2) * 2.0;
        float m1 = 4.0 + cos(t * 0.3) * 2.0;
        float n2 = 5.0 + cos(t * 0.1) * 3.0;
        float m2 = 2.0 + sin(t * 0.4) * 1.0;
        
        // Classic Chladni formulas
        float c1 = cos(n1 * uv.x) * cos(m1 * uv.y) - cos(m1 * uv.x) * cos(n1 * uv.y);
        float c2 = cos(n2 * uv.x) * cos(m2 * uv.y) - cos(m2 * uv.x) * cos(n2 * uv.y);
        
        // Quantum interference blending
        return c1 * 0.6 + c2 * 0.4;
    }

    // Map the 3D scene (Distance Field)
    float map(vec3 p) {
        // Base plane height
        float d = p.y + 1.0;
        
        // Time scalar
        float t = uTime * 0.4;
        
        // Circular plate mask to fade out the waves at the edges
        float r = length(p.xz);
        float mask = smoothstep(12.0, 7.0, r); 
        
        // The primary cymatic wave displacement
        float wave = chladni(p.xz * 1.2, t);
        
        // High frequency micro-ripple for liquid surface tension
        float ripple = sin(r * 25.0 - uTime * 15.0) * 0.02;
        
        // Final displacement combined
        float disp = (wave * 0.6 + ripple) * mask;
        
        // Subtract displacement from plane
        return (d - disp) * 0.6; // Dampen step size slightly for sharp wave accuracy
    }

    // Calculate Surface Normals
    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        // Camera setup (looking down at the resonant plate)
        vec3 ro = vec3(0.0, 6.0, -9.0); 
        vec3 rd = normalize(vec3(uv.x, uv.y - 0.6, 1.0)); 
        
        // Interactive Orbit Camera
        vec2 m = uMouse / uResolution;
        float camAng = uTime * 0.05 + m.x * 6.28;
        ro.xz *= rot(camAng);
        rd.xz *= rot(camAng);
        
        // Raymarching variables
        float dTotal = 0.0;
        float d;
        vec3 p;
        
        // Volumetric energy accumulation at the cymatic nodes
        float nodeEnergy = 0.0;
        
        // Raymarching Loop
        for(int i = 0; i < 120; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Accumulate glowing quantum energy where the standing wave is zero (the nodes)
            float wave = chladni(p.xz * 1.2, uTime * 0.4);
            if (abs(wave) < 0.2 && p.y > -2.0) {
                // Glow intensity falls off based on distance to zero and camera distance
                nodeEnergy += 0.008 / (0.02 + abs(wave)) * exp(-dTotal * 0.05);
            }
            
            if(d < 0.002 || dTotal > 35.0) break;
            dTotal += d;
        }
        
        // Base Void Space Color
        vec3 col = vec3(0.01, 0.005, 0.02);
        
        if (dTotal < 35.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            // Dynamic Light Source
            vec3 l = normalize(vec3(sin(uTime), 4.0, cos(uTime)));
            
            // Liquid Titanium Base Albedo
            vec3 albedo = vec3(0.04, 0.04, 0.06);
            float diff = max(dot(n, l), 0.0);
            
            // Fake Environment Reflection (A spectral quantum nebula)
            vec3 ref = reflect(rd, n);
            float env = fbm(ref.xz * 2.0 + uTime * 0.1);
            vec3 envCol = mix(vec3(0.0, 0.6, 1.0), vec3(1.0, 0.0, 0.6), env); // Cyan to Pink iridescence
            
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
            
            // Combine Physical Lighting
            col = albedo * diff;
            col += envCol * fresnel * 2.0; // Extreme glossy reflection
            
            // Render Luminous Quantum "Sand" at the cymatic nodes
            float wave = chladni(p.xz * 1.2, uTime * 0.4);
            float nodeDist = abs(wave);
            float sandMask = smoothstep(0.15, 0.0, nodeDist);
            
            // Add high-frequency noise to simulate physical sand/particles aggregating
            float sandNoise = step(0.6, hash(p.xz * 60.0 + uTime));
            
            // Color of the quantum sand shifts over space and time
            vec3 nodeCol = mix(vec3(0.0, 1.0, 0.8), vec3(1.0, 0.2, 0.9), fbm(p.xz * 0.3 - uTime * 0.2));
            col += nodeCol * sandMask * sandNoise * 5.0; // Bright, hot particles
            
            // Draw a glowing boundary ring for the resonant plate
            float r = length(p.xz);
            float ring = smoothstep(9.8, 10.0, r) * smoothstep(10.2, 10.0, r);
            col += nodeCol * ring * 3.0;
            
            // Distance fog to blend into the void
            col = mix(col, vec3(0.01, 0.005, 0.02), smoothstep(20.0, 35.0, dTotal));
        }
        
        // Add Volumetric Node Glow over the entire image
        vec3 glowCol = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.0, 0.8), sin(uTime * 0.5) * 0.5 + 0.5);
        col += glowCol * nodeEnergy * 0.15;
        
        // Optical Chromatic Aberration & Vignette
        col *= 1.0 - dot(uv, uv) * 0.4;

        // Cinematic ACES-like Tone Mapping & Gamma
        col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
        col = pow(col, vec3(1.0 / 2.2));
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const QuantumCymaticsHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#010002] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(1, 0, 2, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
