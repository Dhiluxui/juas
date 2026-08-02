import React, { useEffect, useRef } from 'react';

// --- Utility: Convert Hex string to Normalized RGB Array for WebGL ---
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
};

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  varying vec2 v_uv;
  
  uniform float u_time;
  uniform float u_speed;
  uniform vec2 u_resolution;
  uniform vec2 u_imageResolution;
  uniform sampler2D u_chars;
  uniform sampler2D u_image;
  uniform int u_imageLoaded;
  
  // Customization Uniforms
  uniform vec2 u_mouse;
  uniform float u_enableMouse;
  uniform float u_grid;
  uniform float u_charCount;
  uniform vec3 u_colorDark;
  uniform vec3 u_colorLight;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    float scaledTime = u_time * u_speed;
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.y = 1.0 - st.y;
    
    vec2 imgUv = st;
    if (u_imageLoaded == 1) {
      float screenAspect = u_resolution.x / u_resolution.y;
      float imgAspect = u_imageResolution.x / u_imageResolution.y;
      
      if (screenAspect > imgAspect) {
        float scale = imgAspect / screenAspect;
        imgUv.y = (st.y - 0.5) * scale + 0.5;
      } else {
        float scale = screenAspect / imgAspect;
        imgUv.x = (st.x - 0.5) * scale + 0.5;
      }
    }
    
    vec4 imgColor = vec4(0.0, 0.0, 0.0, 1.0);
    if (u_imageLoaded == 1) {
      if (imgUv.x >= 0.0 && imgUv.x <= 1.0 && imgUv.y >= 0.0 && imgUv.y <= 1.0) {
        imgColor = texture2D(u_image, imgUv);
      }
    }

    float luma = dot(imgColor.rgb, vec3(0.299, 0.587, 0.114));

    // Calculate Aspect-Corrected Space for the Blob/Spotlight
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 center = vec2(0.0);

    if (u_enableMouse > 0.5) {
      // Use Interactive Mouse Follow (convert mouse pixels to uniform space)
      center = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    } else {
      // Use Procedural Noise Follow
      float rightSideOffset = (u_resolution.x / min(u_resolution.x, u_resolution.y)) * 0.25;
      center = vec2(rightSideOffset, 0.0);
      center.x += snoise(vec2(scaledTime * 0.1, 0.0)) * 0.15;
      center.y += snoise(vec2(0.0, scaledTime * 0.15)) * 0.5;
    }
    
    float dist = length(p - center);
    float blobNoise = snoise(p * 2.5 - scaledTime * 0.2) * 0.2;
    blobNoise += snoise(p * 5.0 + scaledTime * 0.4) * 0.05;
    dist += blobNoise;

    float blob = smoothstep(0.9, 0.0, dist);
    float core = smoothstep(0.4, 0.0, dist);
    float spotlight = clamp(blob + core, 0.0, 1.0);

    vec3 unBlobColor = vec3(luma) * vec3(0.3, 0.5, 0.9) * 0.4;
    vec3 revealedColor = imgColor.rgb * 1.2;
    vec3 finalBg = mix(unBlobColor, revealedColor, spotlight);

    vec2 st_aspect = st;
    st_aspect.x *= u_resolution.x / u_resolution.y; 
    
    vec2 cell = floor(st_aspect * u_grid);
    vec2 cellUv = fract(st_aspect * u_grid);

    float n = snoise(cell * 0.1 + scaledTime * 0.05);
    float charIndex = floor(mod((n * 20.0) + (scaledTime * 2.0), u_charCount));
    
    vec2 texUv = vec2((cellUv.x + charIndex) / u_charCount, cellUv.y);
    float charAlpha = texture2D(u_chars, texUv).r;

    float imgIntensity = smoothstep(0.05, 0.5, luma);
    float charMask = imgIntensity * (1.0 - spotlight * 0.9);
    
    float flicker = snoise(st * 3.0 + scaledTime * 0.5) * 0.2;
    charMask = clamp(charMask + flicker, 0.0, 1.0);

    vec3 charColor = mix(u_colorDark, u_colorLight, charMask * 1.5);
    vec3 finalColor = mix(finalBg, charColor, charAlpha * smoothstep(0.05, 0.4, charMask));
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

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

export interface WebGLAsciiProps {
  imageSrc?: string;
  chars?: string[];
  gridResolution?: number;
  interactive?: boolean;
  speed?: number;
  colorDark?: string;
  colorLight?: string;
}

export function WebGLAscii({ 
  imageSrc = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop',
  chars = ['2', 'e', '+', '=', '*', '/', '#', '@', '%', '&'],
  gridResolution = 70.0,
  interactive = true,
  speed = 1.0,
  colorDark = "#0d1a4d",
  colorLight = "#2463ff"
}: WebGLAsciiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetMouse = useRef({ x: 0, y: 0 });
  const currentMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Track mouse dynamically over the canvas
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse.current = {
        x: e.clientX - rect.left,
        y: rect.height - (e.clientY - rect.top) // Flip Y for WebGL coordinates
      };
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
      // Initialize to center
      const rect = canvas.getBoundingClientRect();
      targetMouse.current = { x: rect.width / 2, y: rect.height / 2 };
      currentMouse.current = { x: rect.width / 2, y: rect.height / 2 };
    }

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // 1. Generate ASCII sprite map dynamically based on props
    const charSize = 64;
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = charSize * chars.length;
    spriteCanvas.height = charSize;
    const ctx = spriteCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, spriteCanvas.width, spriteCanvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${charSize * 0.8}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      chars.forEach((char, i) => {
        ctx.fillText(char, i * charSize + charSize / 2, charSize / 2 + 4);
      });
    }

    // 2. Setup WebGL Program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // 3. Geometry (Full screen quad)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 4. Uniform Locations
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const imgResolutionLocation = gl.getUniformLocation(program, 'u_imageResolution');
    const charsLocation = gl.getUniformLocation(program, 'u_chars');
    const imageLocation = gl.getUniformLocation(program, 'u_image');
    const imageLoadedLocation = gl.getUniformLocation(program, 'u_imageLoaded');
    
    // Custom Prop Locations
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const enableMouseLocation = gl.getUniformLocation(program, 'u_enableMouse');
    const gridLocation = gl.getUniformLocation(program, 'u_grid');
    const charCountLocation = gl.getUniformLocation(program, 'u_charCount');
    const speedLocation = gl.getUniformLocation(program, 'u_speed');
    const colorDarkLocation = gl.getUniformLocation(program, 'u_colorDark');
    const colorLightLocation = gl.getUniformLocation(program, 'u_colorLight');

    // 5. Upload Sprite Texture
    const spriteTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, spriteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spriteCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(charsLocation, 0);

    // 6. Setup Background Image Texture
    const bgTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.uniform1i(imageLocation, 1);
    gl.uniform1i(imageLoadedLocation, 0);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bgTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.uniform2f(imgResolutionLocation, img.width, img.height);
      gl.uniform1i(imageLoadedLocation, 1);
    };

    // 7. Render Loop
    let animationFrameId: number;
    let startTime = performance.now();
    const rgbDark = hexToRgb(colorDark);
    const rgbLight = hexToRgb(colorLight);

    const render = (time: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Lerp Mouse for smooth follow
      currentMouse.current.x += (targetMouse.current.x - currentMouse.current.x) * 0.1;
      currentMouse.current.y += (targetMouse.current.y - currentMouse.current.y) * 0.1;

      // Pass updated uniforms
      gl.uniform1f(timeLocation, (time - startTime) * 0.001);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(mouseLocation, currentMouse.current.x * dpr, currentMouse.current.y * dpr);
      
      // Static custom props
      gl.uniform1f(enableMouseLocation, interactive ? 1.0 : 0.0);
      gl.uniform1f(gridLocation, gridResolution);
      gl.uniform1f(charCountLocation, chars.length);
      gl.uniform1f(speedLocation, speed);
      gl.uniform3f(colorDarkLocation, rgbDark[0], rgbDark[1], rgbDark[2]);
      gl.uniform3f(colorLightLocation, rgbLight[0], rgbLight[1], rgbLight[2]);

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
      gl.deleteTexture(spriteTexture);
      gl.deleteTexture(bgTexture);
      gl.deleteBuffer(positionBuffer);
    };
  }, [imageSrc, chars, gridResolution, interactive, speed, colorDark, colorLight]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: 'none' }}
    />
  );
}

export const AsciiShaderHero = ({ 
  children, 
  ...webGLProps
}: { 
  children?: React.ReactNode
} & WebGLAsciiProps) => {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <WebGLAscii {...webGLProps} />
      </div>
      <div className="relative z-10 w-full h-full flex items-center justify-start px-8 md:px-16 lg:px-32 pointer-events-none">
        {children}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="w-screen h-screen m-0 p-0 overflow-hidden bg-black text-white">
      <AsciiShaderHero 
        // 1. Image
        imageSrc="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop"
        
        // 2. Cursor Interaction (true = follows cursor seamlessly, false = standard blob noise animation)
        interactive={true} 
        
        // 3. Grid sizing / fidelity (default is 70)
        gridResolution={85} 
        
        // 4. Character Set Mapping (Left is darkest area mapping, Right is brightest)
        chars={['-', '+', '>', '<', '*', '#', '@']}
        
        // 5. Colors (Hex codes seamlessly map to the shader output)
        colorDark="#111827" 
        colorLight="#10b981" 
        
        // 6. Overall Speed (Affects flicker and secondary noise)
        speed={1.5}
      >

      </AsciiShaderHero>
    </div>
  );
}