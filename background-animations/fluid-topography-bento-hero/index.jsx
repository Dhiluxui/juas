import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface FluidMotionWallpaperProps {
  /** @title Primary Fluid Color */
  primaryColor?: string;
  /** @title Secondary Fluid Color */
  secondaryColor?: string;
  /** @title Accent Highlight Color */
  accentColor?: string;
  /** @title Background Color */
  backgroundColor?: string;
  /** @title Wave Speed */
  speed?: number;
  /** @title Wave Complexity */
  complexity?: number;
  /** @title Grain Noise Overlay */
  showGrain?: boolean;
  /** @title Interactive Mouse Effect */
  interactive?: boolean;
  /** @title Hero Title */
  title?: string;
  /** @title Hero Subtitle */
  subtitle?: string;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function FluidMotionWallpaper({
  primaryColor = '#3b82f6',
  secondaryColor = '#8b5cf6',
  accentColor = '#06b6d4',
  backgroundColor = '#030712',
  speed = 1.0,
  complexity = 3,
  showGrain = true,
  interactive = true,
  title = "AURORA FLUID WALLPAPER",
  subtitle = "Dynamic organic liquid motion background with ambient color blending.",
  children,
  className = '',
}: FluidMotionWallpaperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const hexToRgb = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 59, g: 130, b: 246 };
    };

    const c1 = hexToRgb(primaryColor);
    const c2 = hexToRgb(secondaryColor);
    const c3 = hexToRgb(accentColor);
    const bg = hexToRgb(backgroundColor);

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = (e.clientX - rect.left) / rect.width;
      mouseRef.current.targetY = (e.clientY - rect.top) / rect.height;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      time += 0.008 * speed;

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      const mx = mouseRef.current.x * width;
      const my = mouseRef.current.y * height;

      const nodes = [
        {
          x: width * 0.3 + Math.sin(time * 0.7) * width * 0.2 + (mx - width * 0.5) * 0.1,
          y: height * 0.3 + Math.cos(time * 0.5) * height * 0.15 + (my - height * 0.5) * 0.1,
          radius: Math.min(width, height) * 0.55,
          color: `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.65)`,
        },
        {
          x: width * 0.7 + Math.cos(time * 0.6) * width * 0.25 - (mx - width * 0.5) * 0.15,
          y: height * 0.6 + Math.sin(time * 0.8) * height * 0.2 - (my - height * 0.5) * 0.15,
          radius: Math.min(width, height) * 0.6,
          color: `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.55)`,
        },
        {
          x: width * 0.5 + Math.sin(time * 1.1) * width * 0.3,
          y: height * 0.4 + Math.cos(time * 0.9) * height * 0.25,
          radius: Math.min(width, height) * 0.45,
          color: `rgba(${c3.r}, ${c3.g}, ${c3.b}, 0.45)`,
        },
        {
          x: mx,
          y: my,
          radius: Math.min(width, height) * 0.3,
          color: `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.3)`,
        },
      ];

      ctx.globalCompositeOperation = 'screen';

      nodes.forEach((node) => {
        const grad = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          node.radius
        );
        grad.addColorStop(0, node.color);
        grad.addColorStop(0.5, node.color.replace(/[\d\.]+\)$/, '0.25)'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
      const waves = Math.max(1, Math.min(6, complexity));

      for (let w = 0; w < waves; w++) {
        ctx.beginPath();
        const waveY = height * (0.2 + (w / waves) * 0.6);
        ctx.moveTo(0, height);

        for (let x = 0; x <= width; x += 15) {
          const freq = 0.003 + w * 0.001;
          const amp = 30 + w * 15;
          const y =
            waveY +
            Math.sin(x * freq + time * (1 + w * 0.3)) * amp +
            Math.cos(x * 0.002 - time * 0.5) * 20;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, waveY - 50, width, waveY + 150);
        waveGrad.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${0.08 - w * 0.01})`);
        waveGrad.addColorStop(0.5, `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${0.05 - w * 0.01})`);
        waveGrad.addColorStop(1, `rgba(${bg.r}, ${bg.g}, ${bg.b}, 0.2)`);

        ctx.fillStyle = waveGrad;
        ctx.fill();

        ctx.strokeStyle = `rgba(${c3.r}, ${c3.g}, ${c3.b}, ${0.25 - w * 0.03})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.3,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, `rgba(${bg.r}, ${bg.g}, ${bg.b}, 0.8)`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [primaryColor, secondaryColor, accentColor, backgroundColor, speed, complexity, interactive]);

  return (
    <div className={`relative w-full h-full min-h-[500px] overflow-hidden bg-[#030712] font-sans flex flex-col items-center justify-center p-6 ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto z-0" />

      {showGrain && (
        <div
          className="absolute inset-0 pointer-events-none z-[1] opacity-25 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      <div className="relative z-10 max-w-3xl text-center flex flex-col items-center justify-center space-y-6 p-4">
        {children || (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs tracking-wider font-mono text-cyan-300 uppercase shadow-lg"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Fluid Motion Wallpaper
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
              className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white drop-shadow-md"
            >
              {title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className="text-base sm:text-lg text-slate-200 max-w-xl font-normal leading-relaxed drop-shadow"
            >
              {subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="flex items-center gap-4 pt-2"
            >
              <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white font-medium text-sm shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                Explore Motion
              </button>
              <button className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium text-sm backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                Custom Background
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

export default FluidMotionWallpaper;
