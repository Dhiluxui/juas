import React, { useState, useEffect } from 'react';

const CinematicStyles = () => (
    <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap');
        
        .kinetic-text {
            font-family: 'Inter', sans-serif;
            letter-spacing: -0.06em;
            line-height: 1;
        }

        /* 
           Custom 'Focus' animation: 
           Starts with a slight skew and heavy blur, 
           snapping into sharp focus with zero skew.
        */
        @keyframes focusIn {
            0% { 
                opacity: 0; 
                transform: translateY(30px) skewX(20deg); 
                filter: blur(12px); 
            }
            100% { 
                opacity: 1; 
                transform: translateY(0) skewX(0deg); 
                filter: blur(0px); 
            }
        }

        .animate-focus {
            animation: focusIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
    `}} />
);

export default function App() {
    const [key, setKey] = useState(0);

    // Auto-loop the animation every 3.5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setKey(prev => prev + 1);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    const title = "Kinetic Motion";
    const subtext = "Design for the future of interaction";

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center p-6 overflow-hidden">
            <CinematicStyles />
            
            <div className="text-center">
                {/* Main Heading */}
                <h1 className="kinetic-text text-6xl md:text-8xl text-white mb-6">
                    {title.split('').map((char, i) => (
                        <span 
                            key={`${key}-${i}`} 
                            className="inline-block animate-focus"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            {char === ' ' ? '\u00A0' : char}
                        </span>
                    ))}
                </h1>

                {/* Subheading */}
                <div className="relative">
                    <p className="text-zinc-500 text-lg md:text-xl font-medium tracking-wide">
                        {subtext.split('').map((char, i) => (
                            <span 
                                key={`${key}-sub-${i}`} 
                                className="inline-block animate-focus"
                                style={{ animationDelay: `${0.5 + (i * 0.02)}s` }}
                            >
                                {char === ' ' ? '\u00A0' : char}
                            </span>
                        ))}
                    </p>
                </div>
            </div>
        </div>
    );
}