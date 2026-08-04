import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FloatingCardItem {
  id: string | number;
  type?: 'text' | 'image';
  title?: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  bgGradient?: string;
  textColor?: string;
  width?: number;
  height?: number;
  initialX?: number; // 0 to 100 percentage
  initialY?: number; // 0 to 100 percentage
}

export interface BouncingPhysicsCardsProps {
  /** @title Center Title */
  title?: string;
  /** @title Center Subtitle */
  subtitle?: string;
  /** @title Show Center Content */
  showCenterText?: boolean;
  /** @title Card Items */
  cards?: FloatingCardItem[];
  /** @title Background Image URL */
  bgImageUrl?: string;
  /** @title Background Overlay Opacity */
  bgOverlayOpacity?: number;
  /** @title Glass Effect for Cards */
  glassEffect?: boolean;
  /** @title Repel Distance Radius */
  repelRadius?: number;
  /** @title Repel Force Multiplier */
  repelForce?: number;
  /** @title Container Height */
  height?: string;
  /** @title Extra Container Classes */
  className?: string;
}

const DEFAULT_CARDS: FloatingCardItem[] = [
  {
    id: 'card-1',
    type: 'text',
    badge: 'Design System',
    title: 'Component Driven',
    subtitle: 'Parameter-driven React components for modern web UI',
    bgGradient: 'from-blue-600/30 to-cyan-500/30',
    width: 220,
    height: 140,
    initialX: 12,
    initialY: 18,
  },
  {
    id: 'card-2',
    type: 'image',
    title: '3D Spatial Shader',
    subtitle: 'Interactive Canvas',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    width: 200,
    height: 240,
    initialX: 75,
    initialY: 15,
  },
  {
    id: 'card-3',
    type: 'text',
    badge: 'Framer Motion',
    title: 'Fluid Physics',
    subtitle: 'Cursor hover repulsion & drag throwing inertia',
    bgGradient: 'from-purple-600/30 to-pink-500/30',
    width: 230,
    height: 150,
    initialX: 18,
    initialY: 65,
  },
  {
    id: 'card-4',
    type: 'image',
    title: 'Neon Prism',
    subtitle: 'Generative Art',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80',
    width: 210,
    height: 220,
    initialX: 72,
    initialY: 62,
  },
  {
    id: 'card-5',
    type: 'text',
    badge: 'Glassmorphism',
    title: 'Backdrop Blur',
    subtitle: 'High precision glass shadows and dynamic borders',
    bgGradient: 'from-emerald-500/30 to-teal-600/30',
    width: 210,
    height: 135,
    initialX: 45,
    initialY: 78,
  },
];

interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  lastMouseX: number;
  lastMouseY: number;
}

export function BouncingPhysicsCards({
  title = "Interactive Spatial Playground",
  subtitle = "Hover to repel cards, grab to throw them around, and build immersive hero experiences.",
  showCenterText = true,
  cards = DEFAULT_CARDS,
  bgImageUrl = "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80",
  bgOverlayOpacity = 0.85,
  glassEffect = true,
  repelRadius = 220,
  repelForce = 1.2,
  height = "min-h-[680px]",
  className = "",
}: BouncingPhysicsCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const physicsRef = useRef<PhysicsState[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const activeDragIndexRef = useRef<number | null>(null);

  // Initialize Physics State for Cards
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || 600;

    physicsRef.current = cards.map((card) => {
      const cardW = card.width || 200;
      const cardH = card.height || 140;
      const posX = ((card.initialX ?? 50) / 100) * (width - cardW);
      const posY = ((card.initialY ?? 50) / 100) * (height - cardH);

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.4;

      return {
        x: posX,
        y: posY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        width: cardW,
        height: cardH,
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        lastMouseX: 0,
        lastMouseY: 0,
      };
    });
  }, [cards]);

  // Main Physics Loop
  useEffect(() => {
    let animId: number;

    const updatePhysics = () => {
      const container = containerRef.current;
      if (!container) {
        animId = requestAnimationFrame(updatePhysics);
        return;
      }

      const rect = container.getBoundingClientRect();
      const containerW = rect.width;
      const containerH = rect.height;
      const mouse = mouseRef.current;

      physicsRef.current.forEach((p, idx) => {
        const cardEl = cardRefs.current[idx];
        if (!cardEl) return;

        if (p.isDragging) {
          // Velocity tracked during mouse move
        } else {
          // 1. Apply Cursor Repulsion
          if (mouse.active) {
            const cardCenterX = p.x + p.width / 2;
            const cardCenterY = p.y + p.height / 2;
            const dx = cardCenterX - mouse.x;
            const dy = cardCenterY - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < repelRadius && dist > 1) {
              const force = ((repelRadius - dist) / repelRadius) * repelForce * 1.5;
              const nx = dx / dist;
              const ny = dy / dist;
              p.vx += nx * force;
              p.vy += ny * force;
            }
          }

          // 2. Apply Inter-Card Separation / Repulsion
          physicsRef.current.forEach((otherP, otherIdx) => {
            if (idx === otherIdx) return;
            const c1x = p.x + p.width / 2;
            const c1y = p.y + p.height / 2;
            const c2x = otherP.x + otherP.width / 2;
            const c2y = otherP.y + otherP.height / 2;

            const dx = c1x - c2x;
            const dy = c1y - c2y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = (p.width + otherP.width) / 3;

            if (dist < minDist && dist > 1) {
              const overlap = (minDist - dist) * 0.05;
              p.vx += (dx / dist) * overlap;
              p.vy += (dy / dist) * overlap;
            }
          });

          // 3. Friction & Ambient Speed Floor
          p.vx *= 0.95;
          p.vy *= 0.95;

          const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (currentSpeed < 0.25) {
            const floatAngle = Math.random() * Math.PI * 2;
            p.vx += Math.cos(floatAngle) * 0.05;
            p.vy += Math.sin(floatAngle) * 0.05;
          }

          // 4. Update Position
          p.x += p.vx;
          p.y += p.vy;

          // 5. Container Boundary Collisions with Bounce
          const bounce = -0.75;
          if (p.x < 0) {
            p.x = 0;
            p.vx *= bounce;
          } else if (p.x + p.width > containerW) {
            p.x = containerW - p.width;
            p.vx *= bounce;
          }

          if (p.y < 0) {
            p.y = 0;
            p.vy *= bounce;
          } else if (p.y + p.height > containerH) {
            p.y = containerH - p.height;
            p.vy *= bounce;
          }
        }

        // Apply Transform directly to DOM for 60fps performance
        cardEl.style.transform = `translate3d(${p.x}px, ${p.y}px, 0px)`;
      });

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, [repelRadius, repelForce]);

  // Mouse / Touch Event Handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    mouseRef.current = { x: mx, y: my, active: true };

    const dragIdx = activeDragIndexRef.current;
    if (dragIdx !== null) {
      const p = physicsRef.current[dragIdx];
      if (p && p.isDragging) {
        const newX = mx - p.dragOffsetX;
        const newY = my - p.dragOffsetY;

        p.vx = (mx - p.lastMouseX) * 0.8;
        p.vy = (my - p.lastMouseY) * 0.8;

        p.lastMouseX = mx;
        p.lastMouseY = my;
        p.x = newX;
        p.y = newY;
      }
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.active = false;
    if (activeDragIndexRef.current !== null) {
      const p = physicsRef.current[activeDragIndexRef.current];
      if (p) p.isDragging = false;
      activeDragIndexRef.current = null;
    }
  }, []);

  const handleMouseDownCard = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const p = physicsRef.current[index];
    if (!p) return;

    p.isDragging = true;
    p.dragOffsetX = mx - p.x;
    p.dragOffsetY = my - p.y;
    p.lastMouseX = mx;
    p.lastMouseY = my;
    p.vx = 0;
    p.vy = 0;

    activeDragIndexRef.current = index;
  };

  const handleMouseUp = () => {
    if (activeDragIndexRef.current !== null) {
      const p = physicsRef.current[activeDragIndexRef.current];
      if (p) {
        p.isDragging = false;
      }
      activeDragIndexRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      className={`relative w-full ${height} overflow-hidden rounded-3xl bg-slate-950 select-none font-sans ${className}`}
    >
      {/* Background Image & Dark Overlay */}
      {bgImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${bgImageUrl})` }}
        />
      )}
      <div
        className="absolute inset-0 bg-slate-950 transition-opacity duration-500"
        style={{ opacity: bgOverlayOpacity }}
      />

      {/* Subtle Grid Ambient Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Animated Center Content */}
      {showCenterText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl flex flex-col items-center space-y-5"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md text-xs font-mono text-cyan-400 uppercase tracking-widest shadow-lg shadow-cyan-500/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Interactive Canvas
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-2xl leading-none">
              {title}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed max-w-lg drop-shadow">
              {subtitle}
            </p>
          </motion.div>
        </div>
      )}

      {/* Interactive Physics Cards */}
      {cards.map((card, idx) => {
        const cardW = card.width || 200;
        const cardH = card.height || 140;

        return (
          <div
            key={card.id}
            ref={(el) => (cardRefs.current[idx] = el)}
            onMouseDown={(e) => handleMouseDownCard(idx, e)}
            style={{
              width: `${cardW}px`,
              height: `${cardH}px`,
              position: 'absolute',
              top: 0,
              left: 0,
              willChange: 'transform',
            }}
            className="z-20 cursor-grab active:cursor-grabbing transition-shadow duration-300 hover:z-30"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full h-full rounded-2xl overflow-hidden p-4 flex flex-col justify-between transition-all ${
                glassEffect
                  ? 'bg-slate-900/60 backdrop-blur-xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-cyan-400/50 hover:shadow-[0_20px_50px_rgba(0,240,255,0.2)]'
                  : 'bg-slate-900 border border-slate-800 shadow-2xl'
              } ${card.bgGradient ? `bg-gradient-to-br ${card.bgGradient}` : ''}`}
            >
              {card.type === 'image' && card.imageUrl ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden group">
                  <img
                    src={card.imageUrl}
                    alt={card.title || 'Card Image'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent p-3 flex flex-col justify-end">
                    {card.title && (
                      <h3 className="text-sm font-bold text-white leading-tight drop-shadow">
                        {card.title}
                      </h3>
                    )}
                    {card.subtitle && (
                      <p className="text-xs text-slate-300 font-medium opacity-80">
                        {card.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    {card.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold uppercase bg-white/10 text-cyan-300 border border-white/10">
                        {card.badge}
                      </span>
                    )}
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_#00f0ff]" />
                  </div>

                  <div>
                    {card.title && (
                      <h3 className="text-base font-bold text-white tracking-tight leading-snug">
                        {card.title}
                      </h3>
                    )}
                    {card.subtitle && (
                      <p className="text-xs text-slate-300/80 mt-1 line-clamp-2 leading-relaxed">
                        {card.subtitle}
                      </p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

export default BouncingPhysicsCards;
