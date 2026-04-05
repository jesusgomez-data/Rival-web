import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isOfficial?: boolean;
}

export default function VerifiedBadge({ size = 'md', className, isOfficial = true }: VerifiedBadgeProps) {
  if (!isOfficial) return null;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const containerSizes = {
    sm: 'p-0.5 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    md: 'p-1 shadow-[0_0_12px_rgba(59,130,246,0.6)]',
    lg: 'p-1.5 shadow-[0_0_20px_rgba(59,130,246,0.7)]'
  };

  return (
    <div className={clsx(
      "inline-flex items-center justify-center rounded-full bg-blue-500 border border-white/20 relative group",
      containerSizes[size],
      className
    )}>
      {/* Glow / Particle effect */}
      <div className="absolute inset-0 rounded-full bg-blue-400 blur-md opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
      
      <CheckCircle2 className={clsx("text-white relative z-10", sizeClasses[size])} strokeWidth={3} />
      
      {/* Tooltip or Label on hover */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap tracking-wider pointer-events-none">
        Cuenta Oficial
      </div>
    </div>
  );
}
