import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/stores/app.store'
import {
  Mail,
  Key,
  Gauge,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  LogOut
} from 'lucide-react'

export default function Settings() {
  const { gmailConnected, gmailEmail, setGmailStatus } = useAppStore()
  const [geminiKey, setGeminiKey] = useState('')
  const [dailyLimit, setDailyLimit] = useState('100')
  const [pollInterval, setPollInterval] = useState('180')
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [savedGmail, setSavedGmail] = useState(false)
  const [savedGemini, setSavedGemini] = useState(false)
  const [savedLimits, setSavedLimits] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const [key, limit, interval, clientId, clientSecret] = await Promise.all([
      window.electronAPI.settings.get('gemini_api_key'),
      window.electronAPI.settings.get('daily_send_limit'),
      window.electronAPI.settings.get('poll_interval_ms'),
      window.electronAPI.settings.get('google_client_id'),
      window.electronAPI.settings.get('google_client_secret')
    ])
    if (key) setGeminiKey(key)
    if (limit) setDailyLimit(limit)
    if (interval) setPollInterval(String(parseInt(interval) / 1000))
    if (clientId) setGoogleClientId(clientId)
    if (clientSecret) setGoogleClientSecret(clientSecret)
  }

  const handleSaveGmail = async () => {
    await Promise.all([
      window.electronAPI.settings.set('google_client_id', googleClientId),
      window.electronAPI.settings.set('google_client_secret', googleClientSecret)
    ])
    setSavedGmail(true)
    setTimeout(() => setSavedGmail(false), 2500)
  }

  const handleSaveGemini = async () => {
    await window.electronAPI.settings.set('gemini_api_key', geminiKey)
    setSavedGemini(true)
    setTimeout(() => setSavedGemini(false), 2500)
  }

  const handleSaveLimits = async () => {
    await Promise.all([
      window.electronAPI.settings.set('daily_send_limit', dailyLimit),
      window.electronAPI.settings.set('poll_interval_ms', String(parseInt(pollInterval) * 1000))
    ])
    setSavedLimits(true)
    setTimeout(() => setSavedLimits(false), 2500)
  }

  const handleGmailConnect = async () => {
    setConnecting(true)
    try {
      const result = await window.electronAPI.auth.gmailConnect()
      setGmailStatus(true, result.email)
    } catch (err) {
      console.error('Gmail connection failed:', err)
    } finally {
      setConnecting(false)
    }
  }

  const handleGmailDisconnect = async () => {
    await window.electronAPI.auth.gmailDisconnect()
    setGmailStatus(false, null)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">Configure your ALX Outreach app</p>
      </div>

      {/* Gmail Connection */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-white/5">
            <Mail className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-medium">Gmail Connection</h3>
            <p className="text-xs text-zinc-400">Connect your Gmail account to send and receive emails</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <Input
            placeholder="Google OAuth Client ID"
            value={googleClientId}
            onChange={(e) => setGoogleClientId(e.target.value)}
          />
          <Input
            placeholder="Google OAuth Client Secret"
            type="password"
            value={googleClientSecret}
            onChange={(e) => setGoogleClientSecret(e.target.value)}
          />
          <Button size="sm" onClick={handleSaveGmail} disabled={!googleClientId && !googleClientSecret}>
            {savedGmail ? <><CheckCircle className="w-3 h-3" /> Saved!</> : 'Save Credentials'}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {gmailConnected ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Connected as {gmailEmail}</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">Not connected</span>
              </>
            )}
          </div>
          {gmailConnected ? (
            <Button variant="destructive" size="sm" onClick={handleGmailDisconnect}>
              <LogOut className="w-3 h-3" /> Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleGmailConnect}
              disabled={connecting || !googleClientId || !googleClientSecret}
            >
              {connecting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Mail className="w-3 h-3" />
              )}
              Connect Gmail
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Gemini API Key */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-white/5">
            <Key className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-medium">Gemini API Key</h3>
            <p className="text-xs text-zinc-400">Used for AI draft generation and reply classification</p>
          </div>
        </div>
        <div className="space-y-3">
          <Input
            placeholder="Enter your Gemini API key"
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
          />
          <Button size="sm" onClick={handleSaveGemini} disabled={!geminiKey}>
            {savedGemini ? <><CheckCircle className="w-3 h-3" /> Saved!</> : 'Save API Key'}
          </Button>
        </div>
      </GlassCard>

      {/* Sending Limits */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-white/5">
            <Gauge className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-medium">Daily Send Limit</h3>
            <p className="text-xs text-zinc-400">Maximum emails to send per day</p>
          </div>
        </div>
        <Input
          type="number"
          min="1"
          max="500"
          value={dailyLimit}
          onChange={(e) => setDailyLimit(e.target.value)}
        />
      </GlassCard>

      {/* Poll Interval */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-white/5">
            <Clock className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h3 className="font-medium">Inbox Poll Interval</h3>
            <p className="text-xs text-zinc-400">How often to check for new replies (seconds)</p>
          </div>
        </div>
        <div className="space-y-3">
          <Input
            type="number"
            min="60"
            max="3600"
            value={pollInterval}
            onChange={(e) => setPollInterval(e.target.value)}
          />
          <Button size="sm" onClick={handleSaveLimits}>
            {savedLimits ? <><CheckCircle className="w-3 h-3" /> Saved!</> : 'Save Limits'}
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
