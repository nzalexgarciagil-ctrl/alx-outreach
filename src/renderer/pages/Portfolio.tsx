import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ExternalLink, GripVertical, ImagePlay, Info } from 'lucide-react'

interface PortfolioExample {
  id: string
  title: string
  url: string
  description: string | null
  sort_order: number
}

export default function Portfolio() {
  const [examples, setExamples] = useState<PortfolioExample[]>([])
  const [form, setForm] = useState({ title: '', url: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const data = await window.electronAPI.portfolio.getAll()
    setExamples(data as PortfolioExample[])
  }

  const handleAdd = async () => {
    if (!form.title.trim() || !form.url.trim()) return
    setSaving(true)
    await window.electronAPI.portfolio.create({
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim() || undefined,
      sort_order: examples.length
    })
    setForm({ title: '', url: '', description: '' })
    await load()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await window.electronAPI.portfolio.delete(id)
    load()
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Portfolio Examples</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Add your work examples here. When generating AI drafts, Gemini will pick the most relevant
          ones for each lead's industry.
        </p>
      </div>

      {/* Info banner */}
      <GlassCard className="flex gap-3 items-start p-4 border border-cyan-500/20 bg-cyan-500/5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-300 leading-relaxed">
          Give each example a clear title like <span className="text-cyan-400">"Speed ramp — Cars"</span> or{' '}
          <span className="text-cyan-400">"Talking head — Real Estate agent"</span> and a short description.
          The AI uses the title + description to decide which examples are most relevant for each lead.
        </p>
      </GlassCard>

      {/* Add form */}
      <GlassCard className="space-y-3">
        <h3 className="font-medium text-sm">Add New Example</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Title — e.g. Speed ramp, Cars"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            placeholder="URL — Instagram, Drive, etc."
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </div>
        <Input
          placeholder="Description for AI — e.g. fast-paced edit showing product detail shots (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={saving || !form.title.trim() || !form.url.trim()}
        >
          <Plus className="w-3 h-3" /> Add Example
        </Button>
      </GlassCard>

      {/* Examples list */}
      {examples.length === 0 ? (
        <GlassCard className="text-center py-12">
          <ImagePlay className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No examples yet. Add your first portfolio link above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 px-1">{examples.length} example{examples.length !== 1 ? 's' : ''} — AI will pick the best ones per lead</p>
          {examples.map((ex) => (
            <GlassCard key={ex.id} className="flex items-center gap-3 py-3">
              <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{ex.title}</p>
                <a
                  href={ex.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:underline truncate block"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ex.url}
                </a>
                {ex.description && (
                  <p className="text-xs text-zinc-500 mt-0.5">{ex.description}</p>
                )}
              </div>
              <a
                href={ex.url}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-500 hover:text-cyan-400 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => handleDelete(ex.id)}
                className="text-zinc-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
