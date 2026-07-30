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
  color1 = '#ffffff',
  color2 = '#000000',
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
  }, [vertexShaderSource, fragmentShaderSource, speed]);

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

    // 2D Rotation
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Octahedron SDF for crystals
    float sdOctahedron(vec3 p, float s) {
        p = abs(p);
        return (p.x + p.y + p.z - s) * 0.57735027; // 1 / sqrt(3)
    }

    // Map function (The Geometry)
    float map(vec3 p) {
        // Slow continuous rotation
        p.xz *= rot(uTime * 0.2);
        p.xy *= rot(uTime * 0.15);
        
        // Kaleidoscopic space folding (KIFS)
        for(int i = 0; i < 4; i++) {
            p = abs(p) - 1.2;
            p.xz *= rot(0.5);
            p.yz *= rot(0.7);
        }
        
        // Massive central crystal
        float d1 = sdOctahedron(p, 2.5);
        
        // Subtractive smaller crystals to create intricate facets
        float d2 = sdOctahedron(p - vec3(0.5, 0.0, -0.5), 2.2);
        
        // Combine with smooth max for a fractured glass look
        return max(d1, -d2 + 0.2); 
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.005, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }

    // Simple environment map based on ray direction (simulates studio lights/nebula)
    vec3 envMap(vec3 dir) {
        vec3 col1 = vec3(0.1, 0.8, 1.0); // Cyan
        vec3 col2 = vec3(1.0, 0.2, 0.8); // Magenta
        float t = dir.y * 0.5 + 0.5;
        // Add artificial light spots
        float s = pow(max(dot(dir, normalize(vec3(1.0, 1.0, -1.0))), 0.0), 10.0);
        float s2 = pow(max(dot(dir, normalize(vec3(-1.0, -0.5, 1.0))), 0.0), 20.0);
        return mix(col1, col2, t) * 0.3 + vec3(s) + vec3(s2) * vec3(0.8, 0.9, 1.0);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        // Camera setup
        vec3 ro = vec3(0.0, 0.0, -6.0);
        vec3 rd = normalize(vec3(uv.x, uv.y, 1.0));
        
        // Interactive Orbit
        float pan = (m.x - 0.5) * 4.0;
        float tilt = (m.y - 0.5) * 2.0;
        ro.yz *= rot(tilt);
        rd.yz *= rot(tilt);
        ro.xz *= rot(pan);
        rd.xz *= rot(pan);
        
        // Raymarch
        float dTotal = 0.0;
        float d;
        vec3 p;
        
        // Volumetric accumulation for the core's inner fire
        float glow = 0.0;
        
        for(int i = 0; i < 80; i++) {
            p = ro + rd * dTotal;
            d = map(p);
            
            // Inner volumetric fire when near the surface
            glow += 0.015 / (0.01 + abs(d)) * exp(-dTotal * 0.2);
            
            if(d < 0.001 || dTotal > 20.0) break;
            dTotal += d;
        }
        
        // Deep background void
        vec3 col = vec3(0.02, 0.01, 0.03); 
        
        if (dTotal < 20.0) {
            vec3 n = getNormal(p);
            vec3 v = -rd;
            
            // FAKE CHROMATIC DISPERSION (Glass shading)
            // We bend the ray slightly differently for Red, Green, Blue channels
            float iorR = 1.15; // Index of Refraction for Red
            float iorG = 1.20; // Index of Refraction for Green
            float iorB = 1.25; // Index of Refraction for Blue
            
            vec3 refR = refract(rd, n, 1.0 / iorR);
            vec3 refG = refract(rd, n, 1.0 / iorG);
            vec3 refB = refract(rd, n, 1.0 / iorB);
            
            // Fetch environment colors through the refracted rays
            float r = envMap(refR).r;
            float g = envMap(refG).g;
            float b = envMap(refB).b;
            
            vec3 refractionCol = vec3(r, g, b) * 2.5;
            
            // Surface Specular Reflection
            vec3 reflection = reflect(rd, n);
            vec3 specularCol = envMap(reflection) * 1.5;
            
            // Fresnel Effect (more reflective at grazing angles)
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            
            // Combine glass layers
            col = mix(refractionCol, specularCol, fresnel);
            
            // Add internal geometry glow (hot core)
            col += vec3(1.0, 0.4, 0.1) * glow * 0.1;
        } else {
            // Background ambient glow from the crystal
            col += vec3(0.2, 0.0, 0.4) * glow * 0.05;
        }
        
        // Post-processing
        col *= 1.0 - dot(uv, uv) * 0.4; // Vignette
        col = pow(col, vec3(1.0 / 2.2)); // Gamma correction
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const PrismaticCrystalCoreHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#05020a] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(5, 2, 10, 0.9) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
