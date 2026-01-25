
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  hoverEffect?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', noPadding = false, hoverEffect = true }) => {
  return (
    <div className={`card-premium rounded-xl overflow-hidden 
      bg-white border border-slate-200/60 shadow-sm
      dark:bg-[#1e293b]/80 dark:backdrop-blur-xl dark:border-[#334155]/50 dark:shadow-none
      ${hoverEffect ? 'transition-all duration-200 hover:shadow-md hover:border-indigo-500/20' : ''} 
      ${hoverEffect && 'dark:hover:bg-[#253045] hover:bg-white'} 
      ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;
