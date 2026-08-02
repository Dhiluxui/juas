import React, { useState, useEffect } from 'react';

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

        /* 
         * ENTRANCE ANIMATION 
         * Words come from below, tilted back, blurred, and slightly scaled down.
         */
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

        /* 
         * EXIT ANIMATION 
         * Words drift upwards, tilt forward, and dissolve into a blur.
         */
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

        /* 
         * SHIMMER EFFECT FOR EMPHASIS 
         * A beautiful sweeping gradient mask over specific text.
         */
        .aurora-text {
            background: linear-gradient(
                to right,
                #818cf8 20%,  /* Indigo */
                #c084fc 40%,  /* Purple */
                #f472b6 60%,  /* Pink */
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
}) => {
    // Split text into words, preserving spaces
    const words = text.split(/(\s+)/);

    return (
        <span className={`perspective-stage inline-block ${isActive ? 'is-active' : 'is-leaving'} ${className}`}>
            {words.map((word, i) => {
                // If it's just whitespace, render it directly
                if (word.trim() === '') {
                    return <span key={i}>{word}</span>;
                }

                // Check for our custom markdown-style emphasis to apply the aurora effect
                const isEmphasized = word.startsWith('*') && word.endsWith('*');
                const cleanWord = isEmphasized ? word.slice(1, -1) : word;
                
                // Calculate precise stagger based only on actual words, not spaces
                const wordIndex = words.slice(0, i).filter(w => w.trim() !== '').length;
                const delay = baseDelay + (wordIndex * staggerDelay);

                return (
                    <span 
                        key={i} 
                        className={`word-unit ${isEmphasized ? 'aurora-text font-bold' : 'text-neutral-100'}`}
                        style={{ 
                            animationDelay: `${delay}s`,
                            // Ensure initial state before animation starts is completely invisible
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

export default function App() {
    const [isActive, setIsActive] = useState(false);
    
    // Animation Timing Constants
    const CYCLE_DURATION = 6000; // Total time for one full loop (ms)
    const VISIBLE_DURATION = 4000; // How long the text stays visible before leaving (ms)

    useEffect(() => {
        // Initial start
        const initialTimer = setTimeout(() => setIsActive(true), 400);

        // Continuous Loop
        const loopInterval = setInterval(() => {
            setIsActive(false); // Trigger exit animation
            
            setTimeout(() => {
                setIsActive(true); // Trigger entrance animation
            }, CYCLE_DURATION - VISIBLE_DURATION);
            
        }, CYCLE_DURATION);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(loopInterval);
        };
    }, []);

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden font-sans selection:bg-purple-500/30">
            <StyleInject />
            
            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl">
                
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.15]">
                    <CinematicText 
                        text="Design is not how it *looks.*" 
                        isActive={isActive} 
                        baseDelay={0}
                    />
                    <br />
                    <CinematicText 
                        text="It is how it *works.*" 
                        isActive={isActive} 
                        baseDelay={0.5} 
                    />
                </h1>
            </div>
        </div>
    );
}