import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { QueueStatus } from '@/lib/types'
import { Play, Pause, Square, Send, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

export default function SendQueue() {
  const [status, setStatus] = useState<QueueStatus>({
    state: 'idle',
    queuedCount: 0,
    todaySent: 0,
    dailyLimit: 100,
    currentDelay: 0
  })
  const [countdown, setCountdown] = useState(0)
  const [lastEvent, setLastEvent] = useState<string>('')

  useEffect(() => {
    loadStatus()

    const unsubs = [
      window.electronAPI.on('queue:state-change', (data: unknown) => {
        setStatus(data as QueueStatus)
      }),
      window.electronAPI.on('queue:countdown', (data: unknown) => {
        const { seconds } = data as { seconds: number }
        setCountdown(seconds)
      }),
      window.electronAPI.on('queue:sending', (data: unknown) => {
        const { to } = data as { to: string }
        setLastEvent(`Sending to ${to}...`)
      }),
      window.electronAPI.on('queue:sent', (data: unknown) => {
        const d = data as QueueStatus & { to: string }
        setStatus(d)
        setLastEvent(`Sent to ${d.to}`)
      }),
      window.electronAPI.on('queue:send-failed', (data: unknown) => {
        const d = data as QueueStatus & { error: string }
        setStatus(d)
        setLastEvent(`Failed: ${d.error}`)
      }),
      window.electronAPI.on('queue:completed', () => {
        setLastEvent('All emails sent!')
        loadStatus()
      }),
      window.electronAPI.on('queue:daily-limit-reached', () => {
        setLastEvent('Daily send limit reached')
      }),
      window.electronAPI.on('queue:rate-limited', () => {
        setLastEvent('Rate limited by Gmail, pausing 60s...')
      }),
      window.electronAPI.on('queue:error', (data: unknown) => {
        const { message } = data as { message: string }
        setLastEvent(`Error: ${message}`)
      })
    ]

    return () => unsubs.forEach((u) => u())
  }, [])

  const loadStatus = async () => {
    const s = (await window.electronAPI.queue.getStatus()) as QueueStatus
    setStatus(s)
  }

  const stateColors = {
    idle: 'text-zinc-400',
    running: 'text-green-400',
    paused: 'text-yellow-400'
  }

  const stateIcons = {
    idle: Square,
    running: Play,
    paused: Pause
  }

  const StateIcon = stateIcons[status.state]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Send Queue</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your email sending pipeline</p>
      </div>

      {/* Main Status Card */}
      <GlassCard glow={status.state === 'running'} className="p-8 text-center">
        <div className={`inline-flex items-center gap-2 text-lg font-bold mb-4 ${stateColors[status.state]}`}>
          <StateIcon className="w-5 h-5" />
          {status.state.toUpperCase()}
        </div>

        <div className="grid grid-cols-3 gap-8 mb-6">
          <div>
            <p className="text-3xl font-bold">{status.queuedCount}</p>
            <p className="text-sm text-zinc-400 mt-1">Queued</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{status.todaySent}</p>
            <p className="text-sm text-zinc-400 mt-1">Sent Today</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{status.dailyLimit}</p>
            <p className="text-sm text-zinc-400 mt-1">Daily Limit</p>
          </div>
        </div>

        {/* Daily usage bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>Daily Usage</span>
            <span>
              {status.todaySent}/{status.dailyLimit}
            </span>
          </div>
          <Progress value={status.todaySent} max={status.dailyLimit} />
        </div>

        {/* Countdown timer */}
        {status.state === 'running' && countdown > 0 && (
          <div className="mb-6 flex items-center justify-center gap-2 text-zinc-400">
            <Clock className="w-4 h-4" />
            <span>Next email in {countdown}s</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {status.state === 'idle' && (
            <Button size="lg" onClick={() => window.electronAPI.queue.start()}>
              <Play className="w-4 h-4" /> Start Sending
            </Button>
          )}
          {status.state === 'running' && (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.electronAPI.queue.pause()}
              >
                <Pause className="w-4 h-4" /> Pause
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => window.electronAPI.queue.stop()}
              >
                <Square className="w-4 h-4" /> Stop
              </Button>
            </>
          )}
          {status.state === 'paused' && (
            <>
              <Button size="lg" onClick={() => window.electronAPI.queue.resume()}>
                <Play className="w-4 h-4" /> Resume
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => window.electronAPI.queue.stop()}
              >
                <Square className="w-4 h-4" /> Stop
              </Button>
            </>
          )}
        </div>
      </GlassCard>

      {/* Last Event */}
      {lastEvent && (
        <GlassCard className="flex items-center gap-3">
          <Send className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-sm">{lastEvent}</span>
        </GlassCard>
      )}

      {/* Tips */}
      <GlassCard className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <div className="text-sm text-zinc-400 space-y-1">
          <p>Emails are sent with random 10-30 second delays to appear natural.</p>
          <p>The daily limit resets at midnight. Adjust it in Settings.</p>
          <p>If Gmail rate-limits the account, sending automatically pauses for 60 seconds.</p>
        </div>
      </GlassCard>
    </div>
  )
}
