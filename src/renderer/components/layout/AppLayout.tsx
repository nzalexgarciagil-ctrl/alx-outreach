import React, { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAppStore } from '@/stores/app.store'
import DarkVeil from '@/components/ui/DarkVeil'

export function AppLayout() {
  const { setGmailStatus, setUnreadReplies } = useAppStore()

  useEffect(() => {
    const init = async () => {
      try {
        const status = await window.electronAPI.auth.gmailStatus()
        setGmailStatus(status.connected, status.email)

        const unread = await window.electronAPI.replies.getUnreadCount()
        setUnreadReplies(unread)
      } catch (err) {
        console.error('Failed to load initial state:', err)
      }
    }
    init()

    const unsub = window.electronAPI.on('inbox:new-replies', (data: unknown) => {
      const { unreadTotal } = data as { unreadTotal: number }
      setUnreadReplies(unreadTotal)
    })

    return unsub
  }, [setGmailStatus, setUnreadReplies])

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      {/* DarkVeil animated background — very subtle */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <DarkVeil speed={0.15} resolutionScale={0.5} />
      </div>

      {/* App content on top */}
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <div className="titlebar-drag h-9 shrink-0" />
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
