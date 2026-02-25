import React from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: boolean
}

export function GlassCard({
  className,
  hover,
  glow,
  children,
  onClick,
  ...props
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card rounded-xl p-4',
        hover && 'glass-card-hover',
        glow && 'glass-card-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
