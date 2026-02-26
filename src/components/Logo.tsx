
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
    return (
        <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="fluxoGradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4F46E5" />
                    <stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Bar 1: Short */}
            <rect x="14" y="32" width="10" height="20" rx="5" fill="url(#fluxoGradient)" />

            {/* Bar 2: Medium */}
            <rect x="27" y="20" width="10" height="32" rx="5" fill="url(#fluxoGradient)" />

            {/* Bar 3: Tall */}
            <rect x="40" y="8" width="10" height="44" rx="5" fill="url(#fluxoGradient)" />

            {/* Pulse Line / Connection effect (Subtle) */}
            <path d="M19 42L32 36L45 30" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        </svg>
    );
};
