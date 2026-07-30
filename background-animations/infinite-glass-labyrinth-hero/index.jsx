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
    
    // Smooth Min (Polynomial)
    float smin(float a, float b, float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k * h * (1.0 - h);
    }

    // SDF for an Infinite Gyroid Labyrinth
    float map(vec3 p) {
        // Gyroid formula: sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x)
        float scale = 1.5;
        p *= scale;
        
        // Add a gentle wave to the architecture
        p.z += sin(p.x * 0.5 + uTime * 0.5) * 0.5;
        p.x += cos(p.y * 0.5 + uTime * 0.4) * 0.5;
        
        float gyroid = dot(sin(p), cos(p.yzx));
        
        // Make it a thick glassy structure
        float thickness = 0.3 + sin(uTime * 0.3) * 0.1;
        float d = abs(gyroid) - thickness;
        
        return d / scale;
    }

    // Surface Normals
    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
        vec2 m = (uMouse * 2.0 - uResolution.xy) / uResolution.y;
        if (length(uMouse) < 10.0) m = vec2(0.0);
        
        // Endless Forward Motion Camera
        vec3 ro = vec3(0.0, 0.0, uTime * 1.5);
        
        // Mouse look around
        vec3 rd = normalize(vec3(uv, 1.0));
        rd.xy *= rot(m.x * 0.5);
        rd.xz *= rot(m.y * -0.5 + sin(uTime * 0.2) * 0.2); // Auto gentle pan
        rd.yz *= rot(cos(uTime * 0.1) * 0.1);
        
        float dTotal = 0.0;
        float d;
        vec3 p;
        
        // Volumetric Light Accumulation
        float glow = 0.0;
        
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Add internal volumetric neon glow to the air
            glow += 0.005 / (0.05 + abs(d)) * exp(-dTotal * 0.1);
            
            if(d < 0.005 || dTotal > 25.0) break;
            
            dTotal += d * 0.7; // Under-step slightly for complex SDF
        }
        
        // Cosmic Void Background
        vec3 col = vec3(0.02, 0.01, 0.05);
        
        if(dTotal < 25.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            // Lighting
            vec3 l1 = normalize(vec3(1.0, 1.0, -1.0));
            vec3 l2 = normalize(vec3(-1.0, -1.0, 1.0));
            
            float diff1 = max(dot(n, l1), 0.0);
            float diff2 = max(dot(n, l2), 0.0);
            
            // Fresnel Edge Glow for Glass
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            
            // Iridescent glass coloring based on normal direction
            vec3 iridescence = 0.5 + 0.5 * cos(uTime + n.xyx * 3.0 + vec3(0, 2, 4));
            
            // Deep glassy albedo
            col = vec3(0.05, 0.02, 0.1);
            
            // Specular highlights
            vec3 h1 = normalize(l1 + v);
            float spec = pow(max(dot(n, h1), 0.0), 32.0);
            
            col += iridescence * diff1 * 0.5;
            col += vec3(0.1, 0.5, 1.0) * diff2 * 0.3; // Cyan fill light
            col += vec3(1.0) * spec * 1.5;
            col += iridescence * fresnel * 2.0; // Extreme glowing edges
            
            // Fog fade out
            col = mix(col, vec3(0.02, 0.01, 0.05), smoothstep(15.0, 25.0, dTotal));
        }
        
        // Add Volumetric Neon Atmosphere
        vec3 atmosphere = mix(vec3(0.8, 0.1, 1.0), vec3(0.1, 0.8, 1.0), sin(uTime * 0.3) * 0.5 + 0.5);
        col += atmosphere * glow * 0.3;
        
        // Vignette
        col *= 1.0 - dot(uv, uv) * 0.3;
        
        // ACES Tonemap
        col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
        col = pow(col, vec3(1.0 / 2.2));
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const InfiniteGlassLabyrinthHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#000000] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.8) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
