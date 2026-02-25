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

  useEffect(() => {
    window.electronAPI.settings.get('onboarding_complete').then(val => {
      setShowOnboarding(!val)
    })
  }, [])

  // Still checking
  if (showOnboarding === null) return null

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }

  return (
    <HashRouter>
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
