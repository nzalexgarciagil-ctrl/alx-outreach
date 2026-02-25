import React, { useEffect, useState, useRef, useCallback } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { Template, Niche } from '@/lib/types'
import { Plus, FileText, Trash2, Edit, User, Building, Globe, Tag, UserCircle } from 'lucide-react'

const VARIABLES = [
  { key: 'first_name', label: 'Name', icon: User },
  { key: 'last_name', label: 'Last', icon: UserCircle },
  { key: 'company', label: 'Company', icon: Building },
  { key: 'website', label: 'Website', icon: Globe },
  { key: 'niche', label: 'Niche', icon: Tag }
]

const SAMPLE_VARS: Record<string, string> = {
  first_name: 'John',
  last_name: 'Smith',
  company: 'Acme Corp',
  website: 'acmecorp.com',
  niche: 'Real Estate'
}

function renderPreview(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return SAMPLE_VARS[key] ?? `{{${key}}}`
  })
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [niches, setNiches] = useState<Niche[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [form, setForm] = useState({ name: '', subject: '', body: '', niche_id: '' })
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [t, n] = await Promise.all([
      window.electronAPI.templates.getAll(),
      window.electronAPI.niches.getAll()
    ])
    setTemplates(t as Template[])
    setNiches(n as Niche[])
  }

  const insertVariable = useCallback(
    (varKey: string) => {
      const tag = `{{${varKey}}}`
      const ref = activeField === 'subject' ? subjectRef.current : bodyRef.current
      if (!ref) return

      const start = ref.selectionStart ?? ref.value.length
      const end = ref.selectionEnd ?? ref.value.length
      const newValue = ref.value.substring(0, start) + tag + ref.value.substring(end)

      if (activeField === 'subject') {
        setForm((f) => ({ ...f, subject: newValue }))
      } else {
        setForm((f) => ({ ...f, body: newValue }))
      }

      // Restore cursor position
      setTimeout(() => {
        ref.focus()
        ref.setSelectionRange(start + tag.length, start + tag.length)
      }, 0)
    },
    [activeField]
  )

  const openEditor = (template?: Template) => {
    if (template) {
      setEditingTemplate(template)
      setForm({
        name: template.name,
        subject: template.subject,
        body: template.body,
        niche_id: template.niche_id || ''
      })
    } else {
      setEditingTemplate(null)
      setForm({ name: '', subject: '', body: '', niche_id: '' })
    }
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) return
    if (editingTemplate) {
      await window.electronAPI.templates.update(editingTemplate.id, {
        ...form,
        niche_id: form.niche_id || undefined
      })
    } else {
      await window.electronAPI.templates.create({
        ...form,
        niche_id: form.niche_id || undefined
      })
    }
    setShowEditor(false)
    loadData()
  }

  const handleDelete = async (id: string) => {
    await window.electronAPI.templates.delete(id)
    loadData()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-zinc-400 text-sm mt-1">{templates.length} templates</p>
        </div>
        <Button size="sm" onClick={() => openEditor()}>
          <Plus className="w-3 h-3" /> New Template
        </Button>
      </div>

      {templates.length === 0 && (
        <GlassCard className="text-center py-12">
          <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">No templates yet. Create your first email template.</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 gap-3">
        {templates.map((t) => (
          <GlassCard key={t.id} hover className="cursor-pointer" onClick={() => openEditor(t)}>
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium">{t.name}</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(t.id)
                }}
                className="text-zinc-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-1">Subject: {t.subject}</p>
            <p className="text-xs text-zinc-500 line-clamp-2">{t.body}</p>
            {t.niche_name && (
              <Badge
                className="mt-2"
                style={{
                  background: `${t.niche_color}15`,
                  color: t.niche_color || '#06b6d4',
                  borderColor: `${t.niche_color}30`
                }}
              >
                {t.niche_name}
              </Badge>
            )}
          </GlassCard>
        ))}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-[90vw] lg:max-w-4xl" onClose={() => setShowEditor(false)}>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4">
            {/* Variable Toolbar */}
            <div className="flex flex-col gap-2 pt-1">
              <p className="text-[10px] font-medium text-zinc-500 uppercase">Variables</p>
              {VARIABLES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => insertVariable(key)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/20"
                  title={`Insert {{${key}}}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Editor */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Input
                  placeholder="Template name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Select
                  value={form.niche_id}
                  onChange={(e) => setForm({ ...form, niche_id: e.target.value })}
                >
                  <option value="">No Niche</option>
                  {niches.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </Select>
              </div>
              <Input
                ref={subjectRef}
                placeholder="Email subject (supports {{variables}})"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                onFocus={() => setActiveField('subject')}
              />
              <Textarea
                ref={bodyRef}
                placeholder="Email body (supports {{variables}})"
                className="min-h-[200px] font-mono text-sm"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                onFocus={() => setActiveField('body')}
              />
            </div>

            {/* Live Preview */}
            <div className="w-72 shrink-0">
              <p className="text-[10px] font-medium text-zinc-500 uppercase mb-2">Preview</p>
              <GlassCard className="text-sm space-y-2">
                <p className="text-xs text-zinc-400">Subject:</p>
                <p className="font-medium text-sm">
                  {renderPreview(form.subject) || 'Your subject line'}
                </p>
                <hr className="border-white/5" />
                <p className="text-xs text-zinc-400">Body:</p>
                <div className="whitespace-pre-wrap text-zinc-300 text-xs leading-relaxed">
                  {renderPreview(form.body) || 'Your email body will appear here...'}
                </div>
              </GlassCard>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
