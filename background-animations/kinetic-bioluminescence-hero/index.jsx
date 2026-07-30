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
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uMouse;

    mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

    // Map intertwined bioluminescent tendrils/vines
    float map(vec3 p) {
        // Bend the entire coordinate space to make the vines twist and curve organically
        p.xy *= rot(p.z * 0.1);
        p.xz *= rot(sin(p.y * 0.2 + uTime * 0.2) * 0.5);
        
        // Create 3 separate vines twisting around each other (Triple Helix)
        vec3 p1 = p; p1.xy *= rot(uTime + p.z * 0.5); p1.x -= 1.5;
        vec3 p2 = p; p2.xy *= rot(uTime + p.z * 0.5 + 2.094); p2.x -= 1.5;
        vec3 p3 = p; p3.xy *= rot(uTime + p.z * 0.5 + 4.188); p3.x -= 1.5;
        
        // Add high-frequency noise/bumps to the surface of the vines
        float bump1 = sin(p1.z * 10.0) * sin(p1.y * 10.0) * 0.1;
        float bump2 = sin(p2.z * 10.0) * sin(p2.x * 10.0) * 0.1;
        float bump3 = sin(p3.x * 10.0) * sin(p3.y * 10.0) * 0.1;
        
        float vine1 = length(p1.xy) - 0.4 + bump1;
        float vine2 = length(p2.xy) - 0.4 + bump2;
        float vine3 = length(p3.xy) - 0.4 + bump3;
        
        // Smooth minimum to organically fuse them if they touch
        // Wait, they shouldn't touch in a perfect helix, but just in case
        float vines = min(vine1, min(vine2, vine3));
        
        // Add tiny floating bioluminescent spores around the vines
        vec3 q = mod(p, 4.0) - 2.0;
        float spores = length(q) - 0.05;
        
        return min(vines, spores);
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p+e.xyy)-map(p-e.xyy), 
            map(p+e.yxy)-map(p-e.yxy), 
            map(p+e.yyx)-map(p-e.yyx)
        ));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
        
        // Fly forward along the Z axis, following the vines
        vec3 ro = vec3(0.0, 0.0, uTime * 3.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        vec2 m = uMouse / uResolution;
        if(length(uMouse) > 10.0) { 
            ro.yz *= rot((m.y - 0.5)*2.0); ro.xz *= rot((m.x - 0.5)*2.0); 
            rd.yz *= rot((m.y - 0.5)*2.0); rd.xz *= rot((m.x - 0.5)*2.0); 
        }
        
        rd.xy *= rot(sin(uTime * 0.2) * 0.2); // Barrel roll
        
        float dTotal = 0.0;
        vec3 p;
        
        // Accumulate glowing light escaping from the vines
        float bioluminescence = 0.0;
        
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            
            // Subsurface scattering / Volumetric glow from the vines
            // Pulses intense light based on Z position
            float pulse = sin(p.z * 0.5 - uTime * 5.0) * 0.5 + 0.5;
            bioluminescence += (0.005 * pulse) / (0.01 + abs(d));
            
            if(d < 0.01 || dTotal > 30.0) break;
            dTotal += d * 0.8;
        }
        
        vec3 col = vec3(0.0); // Deep ocean / space
        
        if (dTotal < 30.0) {
            vec3 n = getNormal(p);
            
            // Dark, slick organic material (like wet rubber or alien skin)
            col = vec3(0.01, 0.03, 0.02);
            
            vec3 l = normalize(vec3(1.0, 2.0, -1.0));
            float diff = max(dot(n, l), 0.0);
            
            // Glossy specular highlight
            vec3 ref = reflect(rd, n);
            float spec = pow(max(dot(ref, l), 0.0), 32.0);
            col += vec3(1.0, 1.0, 1.0) * spec * 0.5;
            
            // Edge rim light to pop the 3D shapes from the dark background
            float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
            col += vec3(0.0, 1.0, 0.8) * fresnel * 0.5;
        }
        
        // Add the accumulated volumetric bioluminescence globally
        // Colors shift between neon green and deep cyan
        vec3 bioColor = mix(vec3(0.0, 1.0, 0.5), vec3(0.0, 0.8, 1.0), sin(p.z * 0.2) * 0.5 + 0.5);
        col += bioColor * bioluminescence * 0.8;
        
        // Distance fog
        col = mix(col, vec3(0.005, 0.01, 0.02), smoothstep(15.0, 30.0, dTotal));
        
        col = pow(col, vec3(0.85)); // Gamma correction
        col *= 1.0 - dot(uv, uv) * 0.6; // Heavy vignette for a cinematic, creepy feel
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const KineticBioluminescenceHero = ({ className = '', children, ...props }: any) => (
  <div className={`relative w-full h-full bg-[#000000] overflow-hidden font-sans ${className}`}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground vertexShaderSource={shaderData.vertex} fragmentShaderSource={shaderData.fragment} {...props} />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
