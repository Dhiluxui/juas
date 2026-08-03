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
  color1 = '#2563eb', // Default Blue
  color2 = '#ec4899', // Default Pink
  ...props
}) {
  const canvasRef = React.useRef(null);
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
    const aPositionLocation = gl.getAttribLocation(program, 'a_position');
    const finalPosLoc = positionLocation >= 0 ? positionLocation : aPositionLocation;
    if (finalPosLoc >= 0) {
      gl.enableVertexAttribArray(finalPosLoc);
      gl.vertexAttribPointer(finalPosLoc, 2, gl.FLOAT, false, 0, 0);
    }

    const uTimeLocation = gl.getUniformLocation(program, 'uTime');
    const uResolutionLocation = gl.getUniformLocation(program, 'uResolution');
    const uSpeedLoc = gl.getUniformLocation(program, 'uSpeed');
    const uColor1Loc = gl.getUniformLocation(program, 'uColor1');
    const uColor2Loc = gl.getUniformLocation(program, 'uColor2');

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

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const t = (time - startTime) * 0.001;
      
      if (uTimeLocation !== null) gl.uniform1f(uTimeLocation, t);
      if (uResolutionLocation !== null) gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
      
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
      cancelAnimationFrame(animationFrameId);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
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
    uniform float uSpeed;
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    // Classic 2D rotation & noise 
    mat2 m = mat2( 0.80,  0.60, -0.60,  0.80 );
    
    float hash( vec2 p ) {
        float h = dot(p,vec2(127.1,311.7));
        return fract(sin(h)*43758.5453123);
    }
    
    float noise( in vec2 p ) {
        vec2 i = floor( p );
        vec2 f = fract( p );
        vec2 u = f*f*(3.0-2.0*f);
        return mix( mix( hash( i + vec2(0.0,0.0) ), 
                         hash( i + vec2(1.0,0.0) ), u.x),
                    mix( hash( i + vec2(0.0,1.0) ), 
                         hash( i + vec2(1.0,1.0) ), u.x), u.y);
    }
    
    // Fractal Brownian Motion for fluid complexity
    float fbm( vec2 p ) {
        float f = 0.0;
        f += 0.5000*noise( p ); p = m*p*2.02;
        f += 0.2500*noise( p ); p = m*p*2.03;
        f += 0.1250*noise( p ); p = m*p*2.01;
        f += 0.0625*noise( p );
        return f;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        float aspect = uResolution.x / uResolution.y;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= aspect;

        float t = uTime * (uSpeed > 0.0 ? uSpeed : 1.0) * 0.2;

        // Colors
        vec3 c1 = length(uColor1) > 0.0 ? uColor1 : vec3(0.03, 0.16, 0.45); // Primary Color
        vec3 c2 = length(uColor2) > 0.0 ? uColor2 : vec3(0.85, 0.2, 0.4);   // Secondary Color
        vec3 c3 = vec3(0.05, 0.02, 0.15); // Deep base for contrast

        // Domain warping for the fluid pattern
        vec2 q = vec2(0.);
        q.x = fbm(p + 0.00 * t);
        q.y = fbm(p + vec2(1.0));

        vec2 r = vec2(0.);
        r.x = fbm(p + 1.0 * q + vec2(1.7, 9.2) + 0.15 * t);
        r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + 0.126 * t);

        float f = fbm(p + r);

        // Mix the colors using the fluid patterns
        vec3 color = mix(c3, c1, clamp(f * 1.5, 0.0, 1.0));
        color = mix(color, c2, clamp(length(q) * 0.8, 0.0, 1.0));
        
        // Add subtle light gradients based on screen position
        color += c1 * (1.0 - uv.y) * 0.2;
        color += c2 * uv.x * 0.15;

        // Smooth contrast
        color = smoothstep(0.0, 1.1, color);

        // Very subtle film grain to prevent banding on HD displays
        float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.03;
        color += vec3(n);

        gl_FragColor = vec4(color, 1.0);
    }
  `
};

export default function FluidWallpaperHero({ 
  className = '', 
  children, 
  color1 = '#3b82f6', // Bright Blue
  color2 = '#8b5cf6', // Bright Purple
  speed = 1.0,
  ...props 
}) {
  return (
    <div className={`relative w-full h-screen bg-[#050505] overflow-hidden font-sans ${className}`}>
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <ShaderBackground 
          vertexShaderSource={shaderData.vertex} 
          fragmentShaderSource={shaderData.fragment} 
          color1={color1}
          color2={color2}
          speed={speed}
          {...props} 
        />
      </div>
      
    
    
    </div>
  );
}