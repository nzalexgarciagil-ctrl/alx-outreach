import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Users, Send, Mail, Megaphone, TrendingUp, Clock } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import type { DashboardStats } from '@/lib/types'

const CLASSIFICATION_COLORS: Record<string, string> = {
  interested: '#22c55e',
  not_interested: '#ef4444',
  follow_up: '#eab308',
  out_of_office: '#8b5cf6',
  bounce: '#f97316',
  unsubscribe: '#6b7280'
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [campaignStats, setCampaignStats] = useState<
    { name: string; total_sent: number; total_replied: number }[]
  >([])
  const [recentActivity, setRecentActivity] = useState<{
    recentEmails: { id: string; subject: string; first_name: string; lead_email: string; sent_at: string }[]
    recentReplies: { id: string; classification: string; first_name: string; lead_email: string; snippet: string; received_at: string }[]
  }>({ recentEmails: [], recentReplies: [] })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [s, cs, activity] = await Promise.all([
        window.electronAPI.dashboard.getStats(),
        window.electronAPI.dashboard.getCampaignStats(),
        window.electronAPI.dashboard.getRecentActivity()
      ])
      setStats(s as DashboardStats)
      setCampaignStats(cs as typeof campaignStats)
      setRecentActivity(activity as typeof recentActivity)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    }
  }

  const statCards = stats
    ? [
        { label: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'text-cyan-400' },
        { label: 'Campaigns', value: stats.totalCampaigns, icon: Megaphone, color: 'text-blue-400' },
        { label: 'Emails Sent', value: stats.totalSent, icon: Send, color: 'text-green-400' },
        { label: 'Total Replies', value: stats.totalReplies, icon: Mail, color: 'text-purple-400' }
      ]
    : []

  const pieData = stats
    ? Object.entries(stats.replyStats).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
        color: CLASSIFICATION_COLORS[name] || '#6b7280'
      }))
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">Overview of your outreach activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <GlassCard key={label} className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-white/5 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-zinc-400">{label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <GlassCard className="p-5">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Campaign Performance
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={campaignStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#18181b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#fff'
                }}
              />
              <Bar dataKey="total_sent" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Sent" />
              <Bar dataKey="total_replied" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Replied" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-400" />
            Response Classification
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-zinc-500 text-sm">
              No reply data yet
            </div>
          )}
          {pieData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent Activity */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {recentActivity.recentEmails.length === 0 && recentActivity.recentReplies.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">
              No activity yet. Start by importing leads and creating a campaign.
            </p>
          )}
          {recentActivity.recentEmails.slice(0, 5).map((email) => (
            <div key={email.id} className="flex items-center gap-3 text-sm">
              <Send className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-zinc-400">Sent to</span>
              <span className="font-medium">{email.first_name}</span>
              <span className="text-zinc-500 truncate">{email.subject}</span>
              <span className="ml-auto text-xs text-zinc-500">
                {email.sent_at ? new Date(email.sent_at).toLocaleDateString() : ''}
              </span>
            </div>
          ))}
          {recentActivity.recentReplies.slice(0, 5).map((reply) => (
            <div key={reply.id} className="flex items-center gap-3 text-sm">
              <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-zinc-400">Reply from</span>
              <span className="font-medium">{reply.first_name}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: `${CLASSIFICATION_COLORS[reply.classification] || '#6b7280'}20`,
                  color: CLASSIFICATION_COLORS[reply.classification] || '#6b7280'
                }}
              >
                {reply.classification?.replace(/_/g, ' ')}
              </span>
              <span className="ml-auto text-xs text-zinc-500">
                {new Date(reply.received_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
