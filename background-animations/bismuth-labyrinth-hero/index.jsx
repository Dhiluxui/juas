import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { 
  Sliders, 
  Sparkles, 
  Activity, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Palette, 
  Zap, 
  Camera, 
  Eye, 
  EyeOff, 
  Layers, 
  Volume2, 
  VolumeX,
  Play,
  Pause,
  Info,
  ChevronRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';

// Helper to parse hex strings into THREE.Vector3 RGB values normalized to 0.0 - 1.0
const hexToRgbVec3 = (hex) => {
  const cleanHex = hex.replace('#', '');
  let r = 1, g = 1, b = 1;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  }
  return new THREE.Vector3(r, g, b);
};

// Preset Configurations for quick aesthetic swapping
const PRESETS = [
  {
    name: 'Quantum Hologram',
    speed: 1.2,
    morph: 0.5,
    folds: 5.0,
    gyroidScale: 1.6,
    glow: 1.3,
    hueShift: 0.15,
    color1: '#00F0FF', // Cyber Cyan
    color2: '#FF007F', // Neon Pink
    specular: 2.2,
    iridescence: 1.8,
  },
  {
    name: 'Bismuth Crystal Palace',
    speed: 0.7,
    morph: 0.1,
    folds: 6.5,
    gyroidScale: 1.2,
    glow: 0.8,
    hueShift: 0.65,
    color1: '#FFE600', // Gold Yellow
    color2: '#9D00FF', // Vivid Violet
    specular: 3.5,
    iridescence: 2.5,
  },
  {
    name: 'Gyroid Cyber Void',
    speed: 1.5,
    morph: 0.9,
    folds: 3.0,
    gyroidScale: 2.2,
    glow: 2.0,
    hueShift: 0.0,
    color1: '#00FF66', // Matrix Green
    color2: '#0066FF', // Deep Blue
    specular: 1.2,
    iridescence: 1.0,
  },
  {
    name: 'Solar Flare Core',
    speed: 2.0,
    morph: 0.65,
    folds: 4.5,
    gyroidScale: 1.8,
    glow: 1.8,
    hueShift: 0.82,
    color1: '#FF3300', // Crimson Red
    color2: '#FFCC00', // Amber Yellow
    specular: 2.8,
    iridescence: 1.5,
  },
  {
    name: 'Opal Twilight',
    speed: 0.5,
    morph: 0.4,
    folds: 5.5,
    gyroidScale: 1.4,
    glow: 1.1,
    hueShift: 0.42,
    color1: '#A8FF78', // Mint Green
    color2: '#78FFD6', // Pastel Teal
    specular: 1.9,
    iridescence: 2.2,
  },
];

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_speed;
  uniform float u_morph;          // 0.0 = Bismuth Labyrinth, 1.0 = Gyroid Void
  uniform float u_bismuthFolds;   // 2.0 to 8.0 iterations
  uniform float u_gyroidScale;    // Gyroid frequency scale
  uniform float u_glowIntensity;  // Volumetric glow multiplier
  uniform float u_hueShift;       // Color palette hue phase
  uniform vec3 u_color1;          // Primary accent RGB
  uniform vec3 u_color2;          // Secondary accent RGB
  uniform float u_iridescence;    // Fresnel iridescence strength
  uniform float u_specular;       // Metallic specular intensity
  uniform float u_lightZ;         // Mouse Light Depth
  uniform float u_audioPulse;     // Pulse reactivity factor

  // 2D Matrix Rotation Helper
  mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
  }

  // Cosine Palette with dynamic dual color interpolation
  vec3 palette(float t) {
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = mix(u_color1, u_color2, sin(t * 3.141592) * 0.5 + 0.5) + u_hueShift;
      return a + b * cos(6.283185 * (c * t + d));
  }

  // Gyroid Signed Distance Function
  float sdGyroid(vec3 p) {
      p.z -= u_time * u_speed * 0.35;
      p.xy *= rot(p.z * 0.1 + u_time * 0.06 * u_speed);
      
      vec3 q = p * (u_gyroidScale + u_audioPulse * 0.15);
      float g = abs(dot(sin(q), cos(q.zxy))) * 0.5 - 0.05;
      return g / (u_gyroidScale + u_audioPulse * 0.15);
  }

  // Bismuth Labyrinth Space Folding SDF
  float sdBismuth(vec3 p) {
      vec3 q = p;
      q.z -= u_time * u_speed * 0.25;
      q.xy *= rot(u_time * 0.04 * u_speed);
      
      float scale = 1.0;
      float d = 0.0;
      float maxFolds = clamp(u_bismuthFolds, 2.0, 8.0);
      
      for (int i = 0; i < 8; i++) {
          if (float(i) >= maxFolds) break;
          // Space folding
          q.xy = abs(q.xy) - vec2(0.35, 0.35);
          if (q.x < q.y) q.xy = q.yx;
          
          q.xy *= 1.38;
          scale *= 1.38;
          q.xy *= rot(0.06 * sin(u_time * 0.2 + float(i)));
          q.y -= u_time * 0.12 * u_speed;
          
          float edge = max(abs(q.x), abs(q.y));
          d += edge / scale;
      }
      return (d - 0.18) * 0.35;
  }

  // Blended SDF combining Gyroid and Bismuth geometries
  float map(vec3 p) {
      float gyroidD = sdGyroid(p);
      float bismuthD = sdBismuth(p);
      return mix(bismuthD, gyroidD, u_morph);
  }

  // Calculate surface normal for metallic bump reflections
  vec3 calcNormal(vec3 p) {
      vec2 e = vec2(0.003, 0.0);
      return normalize(vec3(
          map(p + e.xyy) - map(p - e.xyy),
          map(p + e.yxy) - map(p - e.yxy),
          map(p + e.yyx) - map(p - e.yyx)
      ));
  }

  void main() {
      // Normalize UVs (-1 to 1) with aspect ratio fix
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
      vec2 mouse = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

      // Parallax ray camera position
      vec3 ro = vec3(mouse.x * 0.7, mouse.y * 0.7, -3.2);
      vec3 rd = normalize(vec3(uv, 1.0));

      // Fisheye lens distortion fold
      rd.xy *= rot(length(uv) * 0.12);

      float t = 0.0;
      vec3 finalColor = vec3(0.0);
      vec3 lightPos = vec3(mouse.x * 2.5, mouse.y * 2.5, u_lightZ);

      // VOLUMETRIC RAYMARCHING LOOP
      for(int i = 0; i < 75; i++) {
          vec3 p = ro + rd * t;
          float d = map(p);
          
          // Glowing Raymarch Accumulation (Gyroid signature glow)
          float glow = (0.012 * u_glowIntensity) / (abs(d) + 0.007);
          
          // Iridescent Color Palette sampling along ray trajectory
          float colorPhase = p.z * 0.5 + u_time * u_speed * 0.15;
          vec3 layerColor = palette(colorPhase + length(p.xy) * 0.2);
          
          // Crisp Surface Hit Detection for Bismuth Specular & Bump Normal
          if (abs(d) < 0.012) {
              vec3 N = calcNormal(p);
              vec3 L = normalize(lightPos - p);
              vec3 V = -rd;
              vec3 H = normalize(L + V);
              
              float diff = max(dot(N, L), 0.0);
              float spec = pow(max(dot(N, H), 0.0), 36.0) * u_specular;
              float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0) * u_iridescence;
              
              vec3 metallicSurface = layerColor * (diff * 0.8 + 0.2) + vec3(spec) + layerColor * fresnel;
              finalColor += metallicSurface * 0.08 * exp(-t * 0.12);
          }
          
          // Accumulate fog light glow
          finalColor += layerColor * glow * exp(-t * 0.16);
          
          // Advance ray step safely
          t += max(abs(d) * 0.75, 0.02);
          if (t > 15.0) break;
      }

      // Deep void background tint
      vec3 bg = mix(vec3(0.01, 0.005, 0.02), u_color1 * 0.04, smoothstep(0.0, 1.0, u_morph));
      finalColor += bg * smoothstep(0.0, 4.0, t);

      // Film Grain Texture Effect
      float grain = (fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.035;
      finalColor += grain;

      // Radial Vignette
      float vignette = length(uv);
      finalColor *= smoothstep(1.8, 0.25, vignette);

      // Contrast S-Curve & Gamma Exposure Adjustment
      finalColor = finalColor * finalColor * (3.0 - 2.0 * finalColor);
      finalColor = pow(clamp(finalColor, 0.0, 1.0), vec3(0.92));

      gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export default function App() {
  const mountRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const targetMouseRef = useRef(new THREE.Vector2(0, 0));
  const uniformsRef = useRef(null);
  
  // Audio Simulator pulse state
  const [audioPulse, setAudioPulse] = useState(0);
  const [isAudioActive, setIsAudioActive] = useState(false);

  // App Controls State
  const [params, setParams] = useState({
    speed: 1.0,
    morph: 0.5,          // 0 = Pure Bismuth, 1 = Pure Gyroid
    bismuthFolds: 5.0,
    gyroidScale: 1.5,
    glowIntensity: 1.2,
    hueShift: 0.0,
    color1: '#00D9FF',
    color2: '#FF007F',
    specular: 2.0,
    iridescence: 1.5,
    lightZ: 1.5,
  });

  // UI Visibility and Performance States
  const [showControls, setShowControls] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [activeTab, setActiveTab] = useState('morph'); // 'morph' | 'colors' | 'lighting' | 'presets'
  const [fps, setFps] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Orthographic Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);

    const uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(width / 2, height / 2) },
      u_speed: { value: params.speed },
      u_morph: { value: params.morph },
      u_bismuthFolds: { value: params.bismuthFolds },
      u_gyroidScale: { value: params.gyroidScale },
      u_glowIntensity: { value: params.glowIntensity },
      u_hueShift: { value: params.hueShift },
      u_color1: { value: hexToRgbVec3(params.color1) },
      u_color2: { value: hexToRgbVec3(params.color2) },
      u_specular: { value: params.specular },
      u_iridescence: { value: params.iridescence },
      u_lightZ: { value: params.lightZ },
      u_audioPulse: { value: 0.0 },
    };

    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: uniforms,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let animationFrameId;
    let frameCount = 0;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isPaused) {
        // Smooth lerp mouse tracking
        mouseRef.current.lerp(targetMouseRef.current, 0.06);
        uniforms.u_mouse.value.set(mouseRef.current.x, mouseRef.current.y);

        const delta = clock.getDelta();
        uniforms.u_time.value += delta;

        // Simulate periodic beat pulse if audio pulse mode is enabled
        if (isAudioActive) {
          const p = Math.pow(Math.sin(clock.getElapsedTime() * 4.5) * 0.5 + 0.5, 3.0);
          uniforms.u_audioPulse.value = p * 1.5;
          setAudioPulse(p);
        } else {
          uniforms.u_audioPulse.value = 0.0;
        }

        renderer.render(scene, camera);

        // FPS Calculation
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          setFps(Math.round((frameCount * 1000) / (now - lastTime)));
          frameCount = 0;
          lastTime = now;
        }
      }
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      targetMouseRef.current.set(
        e.clientX - rect.left,
        rect.height - (e.clientY - rect.top)
      );
    };

    // Touch support for mobile swipe gesture tracking
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const rect = container.getBoundingClientRect();
        targetMouseRef.current.set(
          e.touches[0].clientX - rect.left,
          rect.height - (e.touches[0].clientY - rect.top)
        );
      }
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [isPaused, isAudioActive]);

  // Sync state changes with shader uniforms in real-time
  useEffect(() => {
    if (!uniformsRef.current) return;
    const u = uniformsRef.current;
    u.u_speed.value = params.speed;
    u.u_morph.value = params.morph;
    u.u_bismuthFolds.value = params.bismuthFolds;
    u.u_gyroidScale.value = params.gyroidScale;
    u.u_glowIntensity.value = params.glowIntensity;
    u.u_hueShift.value = params.hueShift;
    u.u_color1.value.copy(hexToRgbVec3(params.color1));
    u.u_color2.value.copy(hexToRgbVec3(params.color2));
    u.u_specular.value = params.specular;
    u.u_iridescence.value = params.iridescence;
    u.u_lightZ.value = params.lightZ;
  }, [params]);

  const applyPreset = useCallback((preset) => {
    setParams({
      speed: preset.speed,
      morph: preset.morph,
      bismuthFolds: preset.folds,
      gyroidScale: preset.gyroidScale,
      glowIntensity: preset.glow,
      hueShift: preset.hueShift,
      color1: preset.color1,
      color2: preset.color2,
      specular: preset.specular,
      iridescence: preset.iridescence,
      lightZ: 1.5,
    });
  }, []);

  const handleReset = () => {
    applyPreset(PRESETS[0]);
  };

  const handleParamChange = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const takeScreenshot = () => {
    const canvas = mountRef.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `gyroid-bismuth-quantum-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#030108] text-white font-sans select-none">
      {/* WebGL Mount Point */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair" />
    </div>
  );
}