import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
}

function Progress({ value, max = 100, className, ...props }: ProgressProps) {
  const percentage = Math.min(100, (value / max) * 100)

  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-white/10', className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export { Progress }
