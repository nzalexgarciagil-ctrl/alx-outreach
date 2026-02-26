import React, { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Leads from '@/pages/Leads'
import Templates from '@/pages/Templates'
import Campaigns from '@/pages/Campaigns'
import CampaignDetail from '@/pages/CampaignDetail'
import SendQueue from '@/pages/SendQueue'
import Inbox from '@/pages/Inbox'
import Settings from '@/pages/Settings'
import Portfolio from '@/pages/Portfolio'
import Onboarding from '@/pages/Onboarding'

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)
  const [updateInfo, setUpdateInfo] = useState<{ version: string; ready: boolean; percent?: number } | null>(null)

  useEffect(() => {
    window.electronAPI.settings.get('onboarding_complete').then(val => {
      setShowOnboarding(!val)
    })

    const unsubAvailable = window.electronAPI.on('updater:update-available', (data: unknown) => {
      const { version } = data as { version: string }
      setUpdateInfo({ version, ready: false })
    })
    const unsubProgress = window.electronAPI.on('updater:download-progress', (data: unknown) => {
      const { percent } = data as { percent: number }
      setUpdateInfo(prev => prev ? { ...prev, percent } : null)
    })
    const unsubDownloaded = window.electronAPI.on('updater:update-downloaded', (data: unknown) => {
      const { version } = data as { version: string }
      setUpdateInfo({ version, ready: true })
    })

    return () => { unsubAvailable(); unsubProgress(); unsubDownloaded() }
  }, [])

  // Still checking
  if (showOnboarding === null) return null

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }

  return (
    <HashRouter>
      {updateInfo && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <div className="bg-zinc-900 border border-cyan-500/30 rounded-xl px-4 py-3 shadow-xl space-y-2">
            {updateInfo.ready ? (
              <>
                <p className="text-sm font-medium text-zinc-100">Update ready — v{updateInfo.version}</p>
                <p className="text-xs text-zinc-400">Restart the app to apply the update.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.electronAPI.updater.install()}
                    className="flex-1 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Restart & update
                  </button>
                  <button
                    onClick={() => setUpdateInfo(null)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-2 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-100">Downloading update v{updateInfo.version}...</p>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${updateInfo.percent ?? 0}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500">{updateInfo.percent ?? 0}%</p>
              </>
            )}
          </div>
        </div>
      )}
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/queue" element={<SendQueue />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
