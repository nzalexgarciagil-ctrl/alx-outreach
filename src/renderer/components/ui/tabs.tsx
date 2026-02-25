import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={className} data-value={value} data-onchange={onValueChange as unknown}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ activeTab?: string; onTabChange?: (v: string) => void }>, {
            activeTab: value,
            onTabChange: onValueChange
          })
        }
        return child
      })}
    </div>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
  activeTab?: string
  onTabChange?: (value: string) => void
}

function TabsList({ children, className, activeTab, onTabChange }: TabsListProps) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg bg-white/5 p-1', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ activeTab?: string; onTabChange?: (v: string) => void }>, {
            activeTab,
            onTabChange
          })
        }
        return child
      })}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  activeTab?: string
  onTabChange?: (value: string) => void
}

function TabsTrigger({ value, children, className, activeTab, onTabChange }: TabsTriggerProps) {
  const isActive = activeTab === value
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
        isActive
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-zinc-400 hover:text-white hover:bg-white/5',
        className
      )}
      onClick={() => onTabChange?.(value)}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
  activeTab?: string
}

function TabsContent({ value, children, className, activeTab }: TabsContentProps) {
  if (activeTab !== value) return null
  return <div className={cn('mt-4', className)}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
