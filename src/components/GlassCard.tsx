
import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  hoverEffect?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', noPadding = false, hoverEffect = true, ...props }) => {
  return (
    <div className={`card-premium rounded-2xl overflow-hidden 
      bg-white shadow-md border-0
      dark:bg-[#1e1e2e] dark:shadow-slate-900/20
      ${hoverEffect ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1' : ''} 
      ${noPadding ? '' : 'p-6'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
