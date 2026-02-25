import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import type { Campaign, Email } from '@/lib/types'
import {
  Wand2,
  CheckCircle,
  XCircle,
  Send,
  Edit,
  ArrowLeft,
  CheckCheck,
  Loader2
} from 'lucide-react'

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [tab, setTab] = useState('overview')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState({ generated: 0, total: 0 })
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ subject: '', body: '' })

  useEffect(() => {
    if (id) loadData()
  }, [id])

  useEffect(() => {
    const unsub = window.electronAPI.on('campaigns:draft-progress', (data: unknown) => {
      const { generated, total } = data as { generated: number; total: number }
      setGenProgress({ generated, total })
    })
    return unsub
  }, [])

  const loadData = async () => {
    const c = (await window.electronAPI.campaigns.getById(id!)) as Campaign
    setCampaign(c)
    const e = (await window.electronAPI.emails.getByCampaign(id!)) as Email[]
    setEmails(e)
  }

  const handleGenerateDrafts = async () => {
    setGenerating(true)
    setGenProgress({ generated: 0, total: 0 })
    try {
      await window.electronAPI.campaigns.generateDrafts(id!)
      loadData()
      setTab('drafts')
    } catch (err) {
      console.error('Draft generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleApprove = async (emailId: string) => {
    await window.electronAPI.emails.approve(emailId)
    loadData()
  }

  const handleReject = async (emailId: string) => {
    await window.electronAPI.emails.reject(emailId)
    loadData()
  }

  const handleApproveAll = async () => {
    const draftIds = emails.filter((e) => e.status === 'draft').map((e) => e.id)
    if (draftIds.length > 0) {
      await window.electronAPI.emails.approveBatch(draftIds)
      loadData()
    }
  }

  const handleQueueApproved = async () => {
    await window.electronAPI.emails.queueApproved(id!)
    loadData()
  }

  const startEdit = (email: Email) => {
    setEditingEmail(email.id)
    setEditForm({ subject: email.subject, body: email.body })
  }

  const saveEdit = async () => {
    if (!editingEmail) return
    await window.electronAPI.emails.update(editingEmail, editForm)
    setEditingEmail(null)
    loadData()
  }

  if (!campaign) return <div className="text-zinc-400">Loading...</div>

  const drafts = emails.filter((e) => e.status === 'draft')
  const approved = emails.filter((e) => e.status === 'approved')
  const queued = emails.filter((e) => e.status === 'queued')
  const sent = emails.filter((e) => e.status === 'sent')
  const failed = emails.filter((e) => e.status === 'failed')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {campaign.niche_name && `${campaign.niche_name} · `}
            {campaign.template_name && `Template: ${campaign.template_name}`}
          </p>
        </div>
        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
          {campaign.status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Leads', value: campaign.total_leads },
          { label: 'Drafts', value: drafts.length },
          { label: 'Approved', value: approved.length + queued.length },
          { label: 'Sent', value: sent.length },
          { label: 'Replied', value: campaign.total_replied }
        ].map(({ label, value }) => (
          <GlassCard key={label} className="text-center py-3">
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-zinc-400">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleGenerateDrafts}
          disabled={generating || campaign.total_leads === 0}
        >
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
          {generating
            ? `Generating (${genProgress.generated}/${genProgress.total})`
            : 'Generate AI Drafts'}
        </Button>
        {drafts.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleApproveAll}>
            <CheckCheck className="w-3 h-3" /> Approve All Drafts
          </Button>
        )}
        {approved.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleQueueApproved}>
            <Send className="w-3 h-3" /> Queue {approved.length} for Sending
          </Button>
        )}
      </div>

      {generating && genProgress.total > 0 && (
        <Progress value={genProgress.generated} max={genProgress.total} />
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length + queued.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          {failed.length > 0 && <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <GlassCard>
            <p className="text-sm text-zinc-400">
              Campaign created on {new Date(campaign.created_at).toLocaleDateString()}.
              {campaign.total_leads > 0 && ` ${campaign.total_leads} leads targeted.`}
              {sent.length > 0 &&
                ` ${sent.length} emails sent. Response rate: ${
                  campaign.total_replied > 0
                    ? ((campaign.total_replied / sent.length) * 100).toFixed(1)
                    : '0'
                }%`}
            </p>
          </GlassCard>
        </TabsContent>

        <TabsContent value="drafts">
          <div className="space-y-3">
            {drafts.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-8">
                No drafts. Click "Generate AI Drafts" to create them.
              </p>
            )}
            {drafts.map((email) => (
              <GlassCard key={email.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">
                      To: {email.lead_first_name} {email.lead_last_name || ''}{' '}
                      <span className="text-zinc-500">({email.lead_email})</span>
                    </p>
                    {editingEmail === email.id ? (
                      <Input
                        className="mt-1"
                        value={editForm.subject}
                        onChange={(e) =>
                          setEditForm({ ...editForm, subject: e.target.value })
                        }
                      />
                    ) : (
                      <p className="text-xs text-zinc-400 mt-0.5">Subject: {email.subject}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {editingEmail === email.id ? (
                      <Button size="sm" onClick={saveEdit}>
                        Save
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(email)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(email.id)}
                          className="text-green-400 hover:text-green-300"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReject(email.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {editingEmail === email.id ? (
                  <Textarea
                    className="mt-2"
                    value={editForm.body}
                    onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap mt-2 pl-2 border-l-2 border-white/5">
                    {email.body}
                  </p>
                )}
                {email.personalization_notes && (
                  <p className="text-xs text-cyan-400/60 mt-2">
                    AI: {email.personalization_notes}
                  </p>
                )}
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approved">
          <div className="space-y-3">
            {[...approved, ...queued].map((email) => (
              <GlassCard key={email.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {email.lead_first_name} — {email.subject}
                    </p>
                    <p className="text-xs text-zinc-500">{email.lead_email}</p>
                  </div>
                  <Badge variant={email.status === 'queued' ? 'default' : 'success'}>
                    {email.status}
                  </Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sent">
          <div className="space-y-3">
            {sent.map((email) => (
              <GlassCard key={email.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {email.lead_first_name} — {email.subject}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Sent {email.sent_at ? new Date(email.sent_at).toLocaleString() : ''}
                    </p>
                  </div>
                  <Badge variant="success">sent</Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="failed">
          <div className="space-y-3">
            {failed.map((email) => (
              <GlassCard key={email.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{email.lead_first_name} — {email.subject}</p>
                    <p className="text-xs text-red-400">{email.error}</p>
                  </div>
                  <Badge variant="destructive">failed</Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
