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
  color1 = '#ff8800',
  color2 = '#0066ff',
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
    uniform vec3 uColor1; // High energy dust (Orange/Gold)
    uniform vec3 uColor2; // Deep cold gas (Blue/Cyan)

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // 3D Noise for Volumetric Clouds
    float hash(float n) { return fract(sin(n)*43758.5453); }
    float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f*f*(3.0-2.0*f);
        float n = p.x + p.y*57.0 + 113.0*p.z;
        return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                       mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
                   mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                       mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
    }

    float fbm(vec3 p) {
        float f = 0.0;
        float amp = 0.5;
        for(int i = 0; i < 5; i++) {
            f += amp * noise(p);
            p = p * 2.01;
            amp *= 0.5;
        }
        return f;
    }

    // Map function for the cloud density
    float map(vec3 p) {
        // Create massive pillars by masking noise with a cylinder-like SDF
        float pillarMask = length(p.xz) - 2.5 + sin(p.y * 0.5) * 1.5;
        
        // Add huge structural noise
        float structuralNoise = fbm(p * 0.4 - vec3(0.0, uTime * uSpeed * 0.2, 0.0)) * 4.0;
        
        // Combine mask and noise
        float density = -pillarMask + structuralNoise;
        
        // Return density (clamped below)
        return density;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        // Camera setup
        vec3 ro = vec3(0.0, -2.0, -8.0);
        vec3 rd = normalize(vec3(uv, 1.0));
        
        float pan = (m.x - 0.5) * 2.0;
        float tilt = (m.y - 0.5) * 2.0;
        ro.yz *= rot(tilt);
        rd.yz *= rot(tilt);
        ro.xz *= rot(pan + uTime * 0.05);
        rd.xz *= rot(pan + uTime * 0.05);
        
        // Move camera slowly up the pillars
        ro.y += uTime * uSpeed * 0.5;
        
        // Light Sources (Stars inside the nebula)
        vec3 lightPos1 = vec3(2.0, ro.y + 4.0, 2.0);
        vec3 lightPos2 = vec3(-2.0, ro.y + 1.0, -1.0);
        
        // Volumetric Raymarching
        vec4 sum = vec4(0.0);
        float t = 0.0;
        
        // Dither to prevent banding
        float dither = hash(uv.x * 100.0 + uv.y * 100.0 + uTime) * 0.1;
        t += dither;
        
        for(int i = 0; i < 60; i++) {
            if (sum.a > 0.99 || t > 15.0) break;
            
            vec3 p = ro + rd * t;
            float density = map(p);
            
            if (density > 0.0) {
                // Calculate lighting (cheap subsurface scattering by sampling towards light)
                float lDist1 = length(lightPos1 - p);
                float lDist2 = length(lightPos2 - p);
                
                vec3 lDir1 = normalize(lightPos1 - p);
                vec3 lDir2 = normalize(lightPos2 - p);
                
                float shadow1 = map(p + lDir1 * 0.5);
                float shadow2 = map(p + lDir2 * 0.5);
                
                // Color mapping based on density and light proximity
                vec3 dustCol = mix(uColor2, uColor1, smoothstep(-1.0, 2.0, density));
                
                // Add light contribution
                vec3 lighting = uColor1 * (1.0 / (1.0 + lDist1 * lDist1)) * max(0.0, 1.0 - shadow1) * 2.0;
                lighting += uColor2 * (1.0 / (1.0 + lDist2 * lDist2)) * max(0.0, 1.0 - shadow2) * 2.0;
                
                // Ambient glow
                lighting += vec3(0.05, 0.1, 0.2); 
                
                // Combine
                vec4 col = vec4(dustCol * lighting, density * 0.15);
                col.rgb *= col.a; // Premultiply alpha
                
                sum += col * (1.0 - sum.a); // Accumulate
            }
            
            t += max(0.1, 0.05 * t); // Step size increases with distance
        }
        
        // Add distant stars
        float stars = pow(hash(uv.x * 456.0 + uv.y * 789.0), 200.0) * 10.0;
        vec3 bg = vec3(0.01, 0.015, 0.02) + vec3(stars);
        
        // Blend nebula over background
        vec3 finalCol = sum.rgb + bg * (1.0 - sum.a);
        
        // Cinematic Post
        finalCol = pow(finalCol, vec3(1.0 / 2.2));
        finalCol *= 1.2 - dot(uv, uv) * 0.5;
        
        gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
    }
  `
};

export const CosmicPillarsOfCreationHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#010203] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#ffaa55"
        color2="#0066ff"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 10%, rgba(1, 2, 3, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
