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
  color1 = '#ff5500', // Gas giant planet glow
  color2 = '#00ffff', // Megastructure neon lights
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
    uniform vec3 uColor1; // Planet (Orange/Red)
    uniform vec3 uColor2; // Ring Tech (Cyan)

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Lissajous curve modified into a 3D orbital ring structure
    float sdTorus(vec3 p, vec2 t) {
        vec2 q = vec2(length(p.xz)-t.x,p.y);
        return length(q)-t.y;
    }

    float map(vec3 p) {
        // Create massive, interlocking planetary rings
        vec3 rp = p;
        
        // Tilt the rings
        rp.xz *= rot(0.5);
        rp.xy *= rot(0.2);
        
        // Ring 1 (Main structure)
        float d1 = sdTorus(rp, vec2(10.0, 0.2));
        
        // Ring 2 (Inner rotating track)
        vec3 rp2 = rp;
        rp2.xz *= rot(uTime * uSpeed * 0.2);
        float d2 = sdTorus(rp2, vec2(9.6, 0.05));
        
        // Ring 3 (Outer track)
        vec3 rp3 = rp;
        rp3.xz *= rot(-uTime * uSpeed * 0.1);
        float d3 = sdTorus(rp3, vec2(10.4, 0.05));
        
        // Add structural greebles to the main ring by cutting it with sine waves (Lissajous influence)
        float greebles = sin(atan(rp.x, rp.z) * 100.0) * sin(rp.y * 50.0) * 0.02;
        d1 += greebles;
        
        return min(d1, min(d2, d3));
    }

    vec3 getNormal(vec3 p) {
        vec2 e = vec2(0.01, 0.0);
        return normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
    }
    
    // Gas Giant background noise
    float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
    float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(p+vec3(0,0,0)), hash(p+vec3(1,0,0)),f.x),
                       mix(hash(p+vec3(0,1,0)), hash(p+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(p+vec3(0,0,1)), hash(p+vec3(1,0,1)),f.x),
                       mix(hash(p+vec3(0,1,1)), hash(p+vec3(1,1,1)),f.x),f.y),f.z);
    }
    float fbm(vec3 p) {
        float f = 0.0;
        f += 0.5000*noise(p); p = p*2.01;
        f += 0.2500*noise(p); p = p*2.02;
        f += 0.1250*noise(p);
        return f;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec2 m = uMouse / uResolution;

        // Camera is very close to the ring, looking along it
        // The ring is at radius 10.0, so place camera at 9.8
        vec3 ro = vec3(9.8, 1.0, uTime * uSpeed * 2.0); // Moving along the Z-axis gives the illusion of orbital flight
        vec3 rd = normalize(vec3(uv, 1.0));
        
        float pan = (m.x - 0.5) * 2.0;
        float tilt = (m.y - 0.5) * 2.0;
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        // We actually want the camera to fly along the ring curve
        // Instead of moving the camera in a circle, we move it forward and curve the space!
        // To do this simply, we will use a straight raymarch but the map() is enormous.
        // Wait, if camera is at x=9.8, it will fly out of the ring very fast.
        // Let's actually put the camera on the ring mathematically.
        float camAngle = uTime * uSpeed * 0.1;
        ro = vec3(sin(camAngle)*9.8, 0.5, cos(camAngle)*9.8);
        
        // Look ahead along the curve
        vec3 target = vec3(sin(camAngle + 0.1)*10.0, 0.0, cos(camAngle + 0.1)*10.0);
        vec3 forward = normalize(target - ro);
        vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
        vec3 up = cross(forward, right);
        
        // Apply mouse look
        mat3 viewMat = mat3(right, up, forward);
        rd = viewMat * normalize(vec3(uv, 1.0));
        
        // Manual mouse rotation on top
        rd.yz *= rot(tilt);
        rd.xz *= rot(pan);
        
        float dTotal = 0.0;
        vec3 p;
        
        for(int i = 0; i < 90; i++) {
            p = ro + rd * dTotal;
            float d = map(p);
            if(d < 0.01 || dTotal > 40.0) break;
            dTotal += d * 0.8;
        }
        
        // Background: Massive Gas Giant planet taking up half the sky
        vec3 bgDir = rd;
        vec3 bgCol = vec3(0.01, 0.01, 0.02); // Deep space
        
        // Ray-sphere intersection for the gas giant
        vec3 planetCenter = vec3(0.0, -10.0, 0.0);
        float planetRadius = 8.0;
        vec3 oc = ro - planetCenter;
        float b = dot(oc, rd);
        float c = dot(oc, oc) - planetRadius * planetRadius;
        float h = b*b - c;
        
        if (h > 0.0) {
            float tPlanet = -b - sqrt(h);
            if (tPlanet > 0.0 && tPlanet > dTotal) {
                // We hit the planet behind the rings
            } else if (tPlanet > 0.0) {
                vec3 pp = ro + rd * tPlanet;
                vec3 pn = normalize(pp - planetCenter);
                
                // Gas bands
                float bands = fbm(pn * vec3(10.0, 1.0, 10.0) + uTime * 0.05);
                vec3 pCol = mix(uColor1, uColor1 * 0.3, bands);
                
                // Planet lighting (sun is off to the side)
                vec3 sunDir = normalize(vec3(1.0, 0.5, 1.0));
                float pDiff = max(dot(pn, sunDir), 0.0);
                float pTerm = smoothstep(-0.2, 0.2, dot(pn, sunDir)); // Soft terminator
                
                bgCol = pCol * pDiff * pTerm;
                
                // Atmosphere rim glow
                float pRim = pow(1.0 - max(dot(pn, -rd), 0.0), 4.0);
                bgCol += uColor1 * pRim * pTerm;
            }
        } else {
            // Starfield
            float stars = pow(hash(rd * 100.0), 100.0) * 10.0;
            bgCol += vec3(stars);
        }
        
        vec3 col = bgCol;
        
        if (dTotal < 40.0) {
            vec3 n = getNormal(p);
            
            // Lighting on the megastructure
            vec3 sunDir = normalize(vec3(1.0, 0.5, 1.0));
            float diff = max(dot(n, sunDir), 0.0);
            
            // Dark metal
            vec3 matCol = vec3(0.1, 0.15, 0.2);
            col = matCol * diff;
            
            // Ambient from the planet below
            float amb = max(dot(n, normalize(planetCenter - p)), 0.0);
            col += matCol * amb * uColor1 * 0.5;
            
            // Neon lights on the tracks
            float trackLight = smoothstep(0.9, 1.0, sin(p.z * 10.0 - uTime * 5.0));
            // Only light up the inner/outer thin tracks
            if (abs(length(p.xz) - 10.0) > 0.3) {
                col += uColor2 * trackLight;
            }
            
            // Distance fog
            col = mix(col, bgCol, smoothstep(15.0, 40.0, dTotal));
        }
        
        // Post
        col = pow(col, vec3(1.0 / 2.2));
        col *= 1.2 - dot(uv, uv) * 0.5;
        
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

export const OrbitalDefenseRingHero = ({ className = '', children, ...props }: any) => (
  <div className={\`relative w-full h-full bg-[#030101] overflow-hidden font-sans \${className}\`} {...props}>
    <div className="absolute inset-0 z-0">
      <ShaderBackground 
        vertexShaderSource={shaderData.vertex} 
        fragmentShaderSource={shaderData.fragment} 
        speed={1.0}
        color1="#ff5500"
        color2="#00ffff"
      />
    </div>
    <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(3, 1, 1, 0.95) 100%)' }} />
    <div className="relative z-10 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      <div className="pointer-events-auto">{children}</div>
    </div>
  </div>
);
