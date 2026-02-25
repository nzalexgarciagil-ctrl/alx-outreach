import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAppStore } from '@/stores/app.store'
import type { Reply } from '@/lib/types'
import { Mail, ChevronDown, ChevronUp } from 'lucide-react'

const CLASSIFICATION_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'destructive' | 'warning' | 'purple' | 'secondary' | 'default' }
> = {
  interested: { label: 'Interested', variant: 'success' },
  not_interested: { label: 'Not Interested', variant: 'destructive' },
  follow_up: { label: 'Follow Up', variant: 'warning' },
  out_of_office: { label: 'Out of Office', variant: 'purple' },
  bounce: { label: 'Bounce', variant: 'destructive' },
  unsubscribe: { label: 'Unsubscribe', variant: 'secondary' }
}

export default function Inbox() {
  const [replies, setReplies] = useState<Reply[]>([])
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { setUnreadReplies } = useAppStore()

  useEffect(() => {
    loadReplies()
  }, [filter])

  const loadReplies = async () => {
    const classification = filter === 'all' ? undefined : filter
    const r = (await window.electronAPI.replies.getAll(classification)) as Reply[]
    setReplies(r)

    const unread = await window.electronAPI.replies.getUnreadCount()
    setUnreadReplies(unread)
  }

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)

    const reply = replies.find((r) => r.id === id)
    if (reply && !reply.is_read) {
      await window.electronAPI.replies.markRead(id)
      setReplies((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_read: 1 } : r))
      )
      const unread = await window.electronAPI.replies.getUnreadCount()
      setUnreadReplies(unread)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {replies.length} replies
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="interested">Interested</TabsTrigger>
          <TabsTrigger value="follow_up">Follow Up</TabsTrigger>
          <TabsTrigger value="not_interested">Not Interested</TabsTrigger>
          <TabsTrigger value="out_of_office">OOO</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          <div className="space-y-3">
            {replies.length === 0 && (
              <GlassCard className="text-center py-12">
                <Mail className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No replies yet. They'll appear here after inbox polling.</p>
              </GlassCard>
            )}

            {replies.map((reply) => {
              const config = CLASSIFICATION_CONFIG[reply.classification || ''] || {
                label: reply.classification || 'Unclassified',
                variant: 'secondary' as const
              }
              const isExpanded = expandedId === reply.id

              return (
                <GlassCard
                  key={reply.id}
                  hover
                  className={`cursor-pointer ${!reply.is_read ? 'border-l-2 border-l-cyan-500' : ''}`}
                  onClick={() => handleExpand(reply.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${!reply.is_read ? 'text-white' : 'text-zinc-300'}`}>
                          {reply.lead_first_name} {reply.lead_last_name || ''}
                        </span>
                        <span className="text-xs text-zinc-500">{reply.lead_email}</span>
                        {reply.campaign_name && (
                          <span className="text-xs text-zinc-600">· {reply.campaign_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">
                        {reply.snippet || reply.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {reply.classification_confidence != null && (
                        <span className="text-[10px] text-zinc-500">
                          {(reply.classification_confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">
                        {new Date(reply.received_at).toLocaleDateString()}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="whitespace-pre-wrap text-sm text-zinc-300 bg-white/[0.02] p-3 rounded-lg">
                        {reply.body || 'No body content'}
                      </div>
                      {reply.classification_reasoning && (
                        <p className="text-xs text-zinc-500 mt-2">
                          AI reasoning: {reply.classification_reasoning}
                        </p>
                      )}
                    </div>
                  )}
                </GlassCard>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
