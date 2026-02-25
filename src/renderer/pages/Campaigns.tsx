import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Campaign, Niche, Template, Lead } from '@/lib/types'
import { Plus, Megaphone, Send, Mail, Users, TrendingUp, Trash2 } from 'lucide-react'

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  drafts_ready: 'warning',
  active: 'default',
  sending: 'default',
  completed: 'success',
  paused: 'warning'
}

export default function Campaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ name: '', niche_id: '', template_id: '' })
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [c, n, t, l] = await Promise.all([
      window.electronAPI.campaigns.getAll(),
      window.electronAPI.niches.getAll(),
      window.electronAPI.templates.getAll(),
      window.electronAPI.leads.getAll()
    ])
    setCampaigns(c as Campaign[])
    setNiches(n as Niche[])
    setTemplates(t as Template[])
    setLeads(l as Lead[])
  }

  const filteredTemplates = form.niche_id
    ? templates.filter((t) => t.niche_id === form.niche_id || !t.niche_id)
    : templates

  const filteredLeads = form.niche_id
    ? leads.filter((l) => l.niche_id === form.niche_id || !l.niche_id)
    : leads

  const openWizard = () => {
    setForm({ name: '', niche_id: '', template_id: '' })
    setSelectedLeadIds(new Set())
    setStep(0)
    setShowWizard(true)
  }

  const handleCreate = async () => {
    if (!form.name || !form.template_id || selectedLeadIds.size === 0) return
    const campaign = (await window.electronAPI.campaigns.create({
      name: form.name,
      niche_id: form.niche_id || undefined,
      template_id: form.template_id
    })) as Campaign

    await window.electronAPI.campaigns.addLeads(campaign.id, [...selectedLeadIds])
    setShowWizard(false)
    loadData()
    navigate(`/campaigns/${campaign.id}`)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await window.electronAPI.campaigns.delete(id)
    loadData()
  }

  const wizardSteps = ['Details', 'Template', 'Select Leads', 'Review']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-zinc-400 text-sm mt-1">{campaigns.length} campaigns</p>
        </div>
        <Button size="sm" onClick={openWizard}>
          <Plus className="w-3 h-3" /> New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Megaphone className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No campaigns yet. Create your first campaign.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {campaigns.map((c) => (
            <GlassCard
              key={c.id}
              hover
              className="cursor-pointer"
              onClick={() => navigate(`/campaigns/${c.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium">{c.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_BADGE[c.status] || 'secondary'}>{c.status}</Badge>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {c.niche_name && (
                <p className="text-xs text-zinc-400 mb-3">Niche: {c.niche_name}</p>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-center">
                <div>
                  <Users className="w-3.5 h-3.5 mx-auto text-zinc-500 mb-1" />
                  <p className="text-sm font-medium">{c.total_leads}</p>
                  <p className="text-[10px] text-zinc-500">Leads</p>
                </div>
                <div>
                  <Send className="w-3.5 h-3.5 mx-auto text-cyan-400 mb-1" />
                  <p className="text-sm font-medium">{c.total_sent}</p>
                  <p className="text-[10px] text-zinc-500">Sent</p>
                </div>
                <div>
                  <Mail className="w-3.5 h-3.5 mx-auto text-purple-400 mb-1" />
                  <p className="text-sm font-medium">{c.total_replied}</p>
                  <p className="text-[10px] text-zinc-500">Replied</p>
                </div>
                <div>
                  <TrendingUp className="w-3.5 h-3.5 mx-auto text-green-400 mb-1" />
                  <p className="text-sm font-medium">{c.total_interested}</p>
                  <p className="text-[10px] text-zinc-500">Interested</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Campaign Creation Wizard */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl" onClose={() => setShowWizard(false)}>
          <DialogHeader>
            <DialogTitle>New Campaign — {wizardSteps[step]}</DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex gap-2 mb-4">
            {wizardSteps.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-cyan-500' : 'bg-white/10'}`}
              />
            ))}
          </div>

          {/* Step 0: Details */}
          {step === 0 && (
            <div className="space-y-3">
              <Input
                placeholder="Campaign name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Select
                value={form.niche_id}
                onChange={(e) => setForm({ ...form, niche_id: e.target.value })}
              >
                <option value="">All Niches</option>
                {niches.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Step 1: Template */}
          {step === 1 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredTemplates.length === 0 ? (
                <p className="text-zinc-400 text-sm text-center py-4">
                  No templates available. Create one first.
                </p>
              ) : (
                filteredTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setForm({ ...form, template_id: t.id })}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      form.template_id === t.id
                        ? 'border-cyan-500/30 bg-cyan-500/5'
                        : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-zinc-400 mt-1">Subject: {t.subject}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Step 2: Select Leads */}
          {step === 2 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-zinc-400">
                  {selectedLeadIds.size} of {filteredLeads.length} leads selected
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedLeadIds.size === filteredLeads.length) {
                      setSelectedLeadIds(new Set())
                    } else {
                      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)))
                    }
                  }}
                >
                  {selectedLeadIds.size === filteredLeads.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredLeads.map((l) => (
                  <label
                    key={l.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selectedLeadIds.has(l.id)}
                      onChange={(e) => {
                        const next = new Set(selectedLeadIds)
                        if (e.target.checked) next.add(l.id)
                        else next.delete(l.id)
                        setSelectedLeadIds(next)
                      }}
                    />
                    <span className="text-sm">
                      {l.first_name} {l.last_name || ''}{' '}
                      <span className="text-zinc-500">({l.email})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-400">Campaign Name</p>
                  <p className="font-medium">{form.name}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Template</p>
                  <p className="font-medium">
                    {templates.find((t) => t.id === form.template_id)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Niche</p>
                  <p className="font-medium">
                    {niches.find((n) => n.id === form.niche_id)?.name || 'All'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Leads</p>
                  <p className="font-medium">{selectedLeadIds.size} selected</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 0 && !form.name) ||
                  (step === 1 && !form.template_id) ||
                  (step === 2 && selectedLeadIds.size === 0)
                }
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleCreate}>Create Campaign</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
