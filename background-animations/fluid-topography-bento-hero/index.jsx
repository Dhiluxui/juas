import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export interface AmbientAuraWallpaperProps {
  /** @title Primary Glow Color */
  primaryColor?: string;
  /** @title Secondary Glow Color */
  secondaryColor?: string;
  /** @title Accent Color */
  accentColor?: string;
  /** @title Background Color */
  backgroundColor?: string;
  /** @title Animation Speed */
  speed?: number;
  /** @title Glow Radius (px) */
  glowRadius?: number;
  /** @title Edge Border Thickness */
  borderWidth?: number;
  /** @title Show Floating Particles */
  showParticles?: boolean;
  /** @title Show Subtle Grid */
  showGrid?: boolean;
  /** @title Hero Title */
  title?: string;
  /** @title Hero Subtitle */
  subtitle?: string;
  /** @title Children Content */
  children?: React.ReactNode;
  /** @title Extra Class Name */
  className?: string;
}

export function AmbientAuraWallpaper({
  primaryColor = '#00f0ff',
  secondaryColor = '#3b82f6',
  accentColor = '#8b5cf6',
  backgroundColor = '#030712',
  speed = 1,
  glowRadius = 40,
  borderWidth = 3,
  showParticles = true,
  showGrid = true,
  title = "NEXT-GEN WALLPAPER",
  subtitle = "Fluid ambient border motion background with dynamic neon aura effects.",
  children,
  className = '',
}: AmbientAuraWallpaperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const particleCount = 40;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.0003,
      speedY: (Math.random() - 0.5) * 0.0003,
      alpha: Math.random() * 0.5 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
    }));

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
        : { r: 0, g: 240, b: 255 };
    };

    const rgb1 = hexToRgb(primaryColor);
    const rgb2 = hexToRgb(secondaryColor);
    const rgb3 = hexToRgb(accentColor);

    const render = () => {
      time += 0.01 * speed;

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

      if (showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      if (showParticles) {
        particles.forEach((p) => {
          p.x += p.speedX * speed;
          p.y += p.speedY * speed;

          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;
          if (p.y < 0) p.y = 1;
          if (p.y > 1) p.y = 0;

          const px = p.x * width;
          const py = p.y * height;
          const currentAlpha = Math.abs(Math.sin(time * p.pulseSpeed)) * p.alpha;

          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, ${currentAlpha})`;
          ctx.fill();
        });
      }

      const pad = 12;
      const rectW = width - pad * 2;
      const rectH = height - pad * 2;
      const rx = pad;
      const ry = pad;
      const cornerRadius = 16;

      const passes = [
        { blur: glowRadius * 1.5, alpha: 0.35, width: borderWidth * 6 },
        { blur: glowRadius * 0.8, alpha: 0.6, width: borderWidth * 3 },
        { blur: glowRadius * 0.3, alpha: 0.85, width: borderWidth * 1.5 },
        { blur: 4, alpha: 1.0, width: borderWidth },
      ];

      const colorProgress = (Math.sin(time * 0.5) + 1) / 2;
      const currR = Math.round(rgb1.r + (rgb2.r - rgb1.r) * colorProgress);
      const currG = Math.round(rgb1.g + (rgb2.g - rgb1.g) * colorProgress);
      const currB = Math.round(rgb1.b + (rgb2.b - rgb1.b) * colorProgress);

      passes.forEach((pass) => {
        ctx.save();
        ctx.shadowColor = `rgb(${currR}, ${currG}, ${currB})`;
        ctx.shadowBlur = pass.blur;
        ctx.strokeStyle = `rgba(${currR}, ${currG}, ${currB}, ${pass.alpha})`;
        ctx.lineWidth = pass.width;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rx, ry, rectW, rectH, cornerRadius);
        } else {
          ctx.rect(rx, ry, rectW, rectH);
        }
        ctx.stroke();
        ctx.restore();
      });

      const perimeter = (rectW + rectH) * 2;
      const headPos = (time * 180) % perimeter;
      const tailLength = perimeter * 0.25;

      ctx.save();
      ctx.lineWidth = borderWidth * 2;
      ctx.shadowColor = `rgb(${rgb3.r}, ${rgb3.g}, ${rgb3.b})`;
      ctx.shadowBlur = glowRadius;

      const getPointAt = (dist: number) => {
        let d = (dist + perimeter) % perimeter;
        if (d < rectW) return { x: rx + d, y: ry };
        d -= rectW;
        if (d < rectH) return { x: rx + rectW, y: ry + d };
        d -= rectH;
        if (d < rectW) return { x: rx + rectW - d, y: ry + rectH };
        d -= rectW;
        return { x: rx, y: ry + rectH - d };
      };

      const numSegments = 60;
      for (let i = 0; i < numSegments; i++) {
        const segDist = headPos - (i / numSegments) * tailLength;
        const p1 = getPointAt(segDist);
        const p2 = getPointAt(segDist - tailLength / numSegments);

        const segAlpha = (1 - i / numSegments) * 0.9;
        ctx.strokeStyle = `rgba(${rgb3.r}, ${rgb3.g}, ${rgb3.b}, ${segAlpha})`;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();

      const centerX = width / 2;
      const centerY = height / 2;
      const innerRadius = Math.min(width, height) * 0.2;
      const outerRadius = Math.max(width, height) * 0.65;

      const vignette = ctx.createRadialGradient(
        centerX,
        centerY,
        innerRadius,
        centerX,
        centerY,
        outerRadius
      );
      vignette.addColorStop(0, 'rgba(3, 7, 18, 0.4)');
      vignette.addColorStop(0.7, 'rgba(3, 7, 18, 0.85)');
      vignette.addColorStop(1, 'rgba(3, 7, 18, 0.98)');

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [primaryColor, secondaryColor, accentColor, backgroundColor, speed, glowRadius, borderWidth, showParticles, showGrid]);

  return (
    <div className={`relative w-full h-full min-h-[500px] overflow-hidden bg-[#030712] font-sans flex flex-col items-center justify-center p-6 ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      <div className="relative z-10 max-w-3xl text-center flex flex-col items-center justify-center space-y-6 p-4">
        {children || (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs tracking-wider font-mono text-cyan-400 uppercase shadow-inner"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Motion Background Wallpaper
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
              className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm"
            >
              {title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className="text-base sm:text-lg text-slate-300 max-w-xl font-normal leading-relaxed"
            >
              {subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="flex items-center gap-4 pt-2"
            >
              <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                Get Started
              </button>
              <button className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-medium text-sm backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                Explore Wallpaper
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

export default AmbientAuraWallpaper;
