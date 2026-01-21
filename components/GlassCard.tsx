
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', noPadding = false }) => {
  return (
    <div className={`glass rounded-[20px] overflow-hidden transition-all duration-300 ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;
