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
  color1 = '#00ffff',
  color2 = '#ff0055',
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
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    if (positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
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

    let animationFrameId: number;
    let startTime = performance.now();
    let initialSet = false;

    const render = (time: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      if (!initialSet && canvas.width > 0) {
        mouseRef.current.x = canvas.width / 2;
        mouseRef.current.y = canvas.height / 2;
        initialSet = true;
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (time - startTime) * 0.001;
      
      if (uTimeLoc !== null) gl.uniform1f(uTimeLoc, t);
      if (uResolutionLoc !== null) gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      if (uMouseLoc !== null) gl.uniform2f(uMouseLoc, mouseRef.current.x, mouseRef.current.y);
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
    uniform float uSpeed;
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // A Menger Sponge variant that looks like a dense Cyberpunk City block
    // We replace the useless Mandelbulb formula with an architectural Iterated Function System
    float map(vec3 p) {
        // Ground plane
        float d = p.y + 1.0; 
        
        vec3 z = p;
        // Repeat space to make infinite city blocks
        z.xz = mod(z.xz + 4.0, 8.0) - 4.0;
        
        // Iterated Box Fold (Menger-like)
        float scale = 1.0;
        for (int i = 0; i < 4; i++) {
            z = abs(z);
            
            // Box fold
            if (z.x < z.y) z.xy = z.yx;
            if (z.x < z.z) z.xz = z.zx;
            if (z.y < z.z) z.yz = z.zy;
            
            z = z * 2.0 - vec3(1.0, 1.5, 1.0);
            scale *= 2.0;
        }
        
        float box = (length(max(abs(z) - vec3(0.5, 2.0, 0.5), 0.0)) - 0.1) / scale;
        
        // Combine building structures with the ground
        return min(d, box);
    }

    // Material ID map for lighting (to find "windows")
    float materialInfo(vec3 p) {
        vec3 z = p;
        z.xz = mod(z.xz + 4.0, 8.0) - 4.0;
        for (int i = 0; i < 3; i++) {
            z = abs(z) * 2.0 - vec3(1.0, 1.5, 1.0);
        }
        // Returns a repeating pattern based on height and depth to simulate windows
        return sin(z.y * 20.0) * sin(z.x * 20.0) * sin(z.z * 20.0);
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        // Camera flies forward over the city
        vec3 ro = vec3(0.0, 3.0, uTime * uSpeed * 2.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        // Mouse look around (Look down at the city)
        float pan = (m.x - 0.5) * 2.0;
        float tilt = (m.y - 0.5) * 1.5 - 0.4; // Default tilt down
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        float dTotal = 0.0;
        vec3 p;
        float d;
        float cityGlow = 0.0;
        
        for(int i = 0; i < 80; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            if(d < 0.01 || dTotal > 40.0) break;
            dTotal += d * 0.7; // Avoid overstepping fractal
        }
        
        // Cyberpunk night sky / Fog color
        vec3 skyCol = vec3(0.01, 0.0, 0.05);
        vec3 col = skyCol;
        
        if (dTotal < 40.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            // Lighting (Neon street lights from below)
            vec3 l1 = normalize(vec3(0.0, -1.0, 1.0)); // Street level
            float diff1 = max(dot(n, l1), 0.0);
            
            vec3 l2 = normalize(vec3(1.0, 0.5, -1.0)); // Moonlight / Distant glow
            float diff2 = max(dot(n, l2), 0.0);
            
            // Base concrete/metal building color
            vec3 baseCol = vec3(0.05, 0.05, 0.07);
            
            col = baseCol * diff2 * 0.2;
            
            // Add intense street under-lighting
            col += uColor1 * diff1 * 0.5 * smoothstep(2.0, -1.0, p.y); 
            
            // Neon Windows
            float mat = materialInfo(p);
            if (mat > 0.8 && p.y > -0.5) {
                // Flickering window lights
                float flicker = sin(p.x * 100.0 + p.z * 50.0 + uTime * 10.0) * 0.5 + 0.5;
                // Mix colors based on position
                vec3 windowCol = mix(uColor1, uColor2, sin(p.x * 0.5)*0.5+0.5);
                col += windowCol * flicker * 2.0;
            }
            
            // Laser scanning line passing over the city
            float scan = smoothstep(0.1, 0.0, abs(fract(p.z * 0.1 - uTime * 0.5) - 0.5));
            col += uColor2 * scan * max(0.0, n.y) * 2.0;
            
            // Fresnel edge highlight
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
            col += uColor1 * fresnel * 0.5;
        }
        
        // Smog / Volumetric Fog (Heavy towards the ground)
        float fogFactor = smoothstep(5.0, 40.0, dTotal);
        // Ground fog is brighter (light pollution)
        vec3 fogColor = mix(uColor1 * 0.1, skyCol, smoothstep(-1.0, 5.0, ro.y + rd.y * dTotal));
        col = mix(col, fogColor, fogFactor);

        // Post-processing
        col = pow(col, vec3(1.0 / 2.2)); // Gamma correction
        col *= 1.2 - dot(uv, uv) * 0.6; // Vignette
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const FractalCyberMetacityHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#050010] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#00ffff"
        color2="#ff0055"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(5, 0, 16, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
