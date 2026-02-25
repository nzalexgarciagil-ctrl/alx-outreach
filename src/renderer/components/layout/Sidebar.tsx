import React from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app.store'
import {
  LayoutDashboard,
  Megaphone,
  Users,
  FileText,
  Send,
  Inbox,
  Settings,
  ImagePlay
} from 'lucide-react'

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/portfolio', icon: ImagePlay, label: 'Examples' }
]

const activityNav = [
  { to: '/queue', icon: Send, label: 'Send Queue' },
  { to: '/inbox', icon: Inbox, label: 'Inbox' }
]

export function Sidebar() {
  const { gmailConnected, gmailEmail, unreadReplies } = useAppStore()

  return (
    <aside className="sidebar-glass flex flex-col w-56 lg:w-60 h-full shrink-0 border-r border-white/[0.06]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 titlebar-drag border-b border-white/[0.06]">
        <div className="titlebar-no-drag flex items-center gap-3">
          <img
            src="alx-icon.png"
            alt="ALX"
            className="w-7 h-7"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            ALX Outreach
          </span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Main
        </p>
        {mainNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}

        <p className="px-3 mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Activity
        </p>
        {activityNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
            {label === 'Inbox' && unreadReplies > 0 && (
              <span className="ml-auto bg-cyan-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadReplies > 9 ? '9+' : unreadReplies}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-1 border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-2 px-3 py-2 text-xs">
          <div
            className={cn(
              'w-2 h-2 rounded-full shrink-0',
              gmailConnected ? 'bg-green-400' : 'bg-zinc-600'
            )}
          />
          <span className="text-zinc-400 truncate">
            {gmailConnected ? gmailEmail || 'Gmail Connected' : 'Gmail Disconnected'}
          </span>
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
              isActive
                ? 'bg-cyan-500/10 text-cyan-400'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            )
          }
        >
          <Settings className="w-4 h-4" />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
