import React, { useState, useEffect } from 'react';

export interface Cinematic3DTextRevealProps {
  /** @title First Line Text */
  line1?: string;
  /** @title Second Line Text */
  line2?: string;
  /** @title Stagger Delay per Word (s) */
  staggerDelay?: number;
  /** @title Display Duration per Loop (ms) */
  visibleDuration?: number;
}

const StyleInject = () => (
    <style dangerouslySetInnerHTML={{ __html: `
        :root {
            --reveal-ease: cubic-bezier(0.19, 1, 0.22, 1);
            --hide-ease: cubic-bezier(0.8, 0, 0.2, 1);
        }

        .perspective-stage {
            perspective: 1200px;
            transform-style: preserve-3d;
        }

        .word-unit {
            display: inline-block;
            white-space: pre;
            transform-origin: 50% 100%;
            will-change: transform, opacity, filter;
        }

        .is-active .word-unit {
            animation: cinematicReveal 1.4s var(--reveal-ease) forwards;
        }

        @keyframes cinematicReveal {
            0% {
                opacity: 0;
                transform: translateY(60px) translateZ(-80px) rotateX(-60deg) scale(0.9);
                filter: blur(12px);
            }
            100% {
                opacity: 1;
                transform: translateY(0) translateZ(0) rotateX(0deg) scale(1);
                filter: blur(0px);
            }
        }

        .is-leaving .word-unit {
            animation: cinematicHide 1.2s var(--hide-ease) forwards;
        }

        @keyframes cinematicHide {
            0% {
                opacity: 1;
                transform: translateY(0) translateZ(0) rotateX(0deg) scale(1);
                filter: blur(0px);
            }
            100% {
                opacity: 0;
                transform: translateY(-40px) translateZ(40px) rotateX(40deg) scale(1.05);
                filter: blur(8px);
            }
        }

        .aurora-text {
            background: linear-gradient(
                to right,
                #818cf8 20%,
                #c084fc 40%,
                #f472b6 60%,
                #818cf8 80%
            );
            background-size: 200% auto;
            color: transparent;
            -webkit-background-clip: text;
            background-clip: text;
        }

        .is-active .aurora-text {
            animation: 
                cinematicReveal 1.4s var(--reveal-ease) forwards,
                shimmerSweep 4s linear infinite;
        }

        @keyframes shimmerSweep {
            to { background-position: 200% center; }
        }
    `}} />
);

const CinematicText = ({ 
    text, 
    isActive, 
    staggerDelay = 0.08, 
    baseDelay = 0,
    className = "" 
}: { text: string; isActive: boolean; staggerDelay?: number; baseDelay?: number; className?: string }) => {
    const words = text.split(/(\s+)/);

    return (
        <span className={`perspective-stage inline-block ${isActive ? 'is-active' : 'is-leaving'} ${className}`}>
            {words.map((word, i) => {
                if (word.trim() === '') {
                    return <span key={i}>{word}</span>;
                }

                const isEmphasized = word.startsWith('*') && word.endsWith('*');
                const cleanWord = isEmphasized ? word.slice(1, -1) : word;
                
                const wordIndex = words.slice(0, i).filter(w => w.trim() !== '').length;
                const delay = baseDelay + (wordIndex * staggerDelay);

                return (
                    <span 
                        key={i} 
                        className={`word-unit ${isEmphasized ? 'aurora-text font-bold' : 'text-neutral-100'}`}
                        style={{ 
                            animationDelay: `${delay}s`,
                            opacity: 0 
                        }}
                    >
                        {cleanWord}
                    </span>
                );
            })}
        </span>
    );
};

export function Cinematic3DTextReveal({
  line1 = "Design is not how it *looks.*",
  line2 = "It is how it *works.*",
  staggerDelay = 0.08,
  visibleDuration = 4000
}: Cinematic3DTextRevealProps) {
    const [isActive, setIsActive] = useState(false);
    const CYCLE_DURATION = visibleDuration + 2000;

    useEffect(() => {
        const initialTimer = setTimeout(() => setIsActive(true), 400);

        const loopInterval = setInterval(() => {
            setIsActive(false);
            
            setTimeout(() => {
                setIsActive(true);
            }, CYCLE_DURATION - visibleDuration);
            
        }, CYCLE_DURATION);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(loopInterval);
        };
    }, [visibleDuration, CYCLE_DURATION]);

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden font-sans selection:bg-purple-500/30 bg-zinc-950">
            <StyleInject />
            
            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.15]">
                    <CinematicText 
                        text={line1} 
                        isActive={isActive} 
                        baseDelay={0}
                        staggerDelay={staggerDelay}
                    />
                    <br />
                    <CinematicText 
                        text={line2} 
                        isActive={isActive} 
                        baseDelay={0.5} 
                        staggerDelay={staggerDelay}
                    />
                </h1>
            </div>
        </div>
    );
}

export default Cinematic3DTextReveal;
