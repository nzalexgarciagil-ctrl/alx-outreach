import React, { useEffect, useRef, useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ExternalLink, GripVertical, ImagePlay, Info, Sparkles, Send, CheckCheck, X } from 'lucide-react'

interface PortfolioExample {
  id: string
  title: string
  url: string
  description: string | null
  sort_order: number
}

interface Suggestion {
  id: string
  title: string
  original: string
  improved: string
}

interface ChatMessage {
  role: 'ai' | 'user'
  text: string
  suggestions?: Suggestion[]
}

export default function Portfolio() {
  const [examples, setExamples] = useState<PortfolioExample[]>([])
  const [form, setForm] = useState({ title: '', url: '', description: '' })
  const [saving, setSaving] = useState(false)

  // Optimiser chat state
  const [showOptimiser, setShowOptimiser] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reply, setReply] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const previousAnalysisRef = useRef<string>('')

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

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

  const runAnalysis = async (userReply?: string) => {
    setAnalysing(true)
    if (userReply) {
      setMessages(prev => [...prev, { role: 'user', text: userReply }])
      setReply('')
    }
    try {
      const result = await window.electronAPI.portfolio.analyse(
        examples,
        userReply,
        previousAnalysisRef.current || undefined
      )
      const aiMsg: ChatMessage = {
        role: 'ai',
        text: result.message,
        suggestions: result.suggestions?.length > 0 ? result.suggestions : undefined
      }
      setMessages(prev => [...prev, aiMsg])
      // Build context string for next call
      previousAnalysisRef.current = [
        previousAnalysisRef.current,
        userReply ? `USER: ${userReply}` : '',
        `AI: ${result.message}`,
        result.suggestions?.length > 0
          ? `Suggestions: ${result.suggestions.map((s: Suggestion) => `"${s.original}" → "${s.improved}"`).join(', ')}`
          : ''
      ].filter(Boolean).join('\n')
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Something went wrong. Make sure your Gemini API key is configured.' }])
    }
    setAnalysing(false)
  }

  const openOptimiser = () => {
    setShowOptimiser(true)
    if (messages.length === 0) {
      runAnalysis()
    }
  }

  const closeOptimiser = () => {
    setShowOptimiser(false)
    setMessages([])
    setReply('')
    previousAnalysisRef.current = ''
    setAppliedIds(new Set())
  }

  const applySuggestion = async (suggestion: Suggestion) => {
    // Find an example whose title or description matches the original
    const match = examples.find(
      e => e.title === suggestion.original || e.description === suggestion.original
    )
    if (match) {
      const isTitle = match.title === suggestion.original
      await window.electronAPI.portfolio.update(match.id, isTitle
        ? { title: suggestion.improved }
        : { description: suggestion.improved }
      )
      await load()
    }
    setAppliedIds(prev => new Set([...prev, suggestion.id]))
  }

  const applyAll = async (suggestions: Suggestion[]) => {
    for (const s of suggestions) {
      if (!appliedIds.has(s.id)) {
        await applySuggestion(s)
      }
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Examples</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Add your work examples here. When generating AI drafts, Gemini will pick the most relevant
            ones for each lead's industry.
          </p>
        </div>
        {examples.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
            onClick={openOptimiser}
          >
            <Sparkles className="w-3.5 h-3.5" /> Optimise with AI
          </Button>
        )}
      </div>

      {/* AI Optimiser Chat Panel */}
      {showOptimiser && (
        <GlassCard className="space-y-0 p-0 overflow-hidden border border-cyan-500/20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">AI Portfolio Optimiser</span>
            </div>
            <button onClick={closeOptimiser} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-72 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'ai'
                        ? 'bg-white/5 text-zinc-200'
                        : 'bg-cyan-500/20 text-cyan-100'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">Suggested improvements:</p>
                        <button
                          onClick={() => applyAll(msg.suggestions!)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          Apply all
                        </button>
                      </div>
                      {msg.suggestions.map((s) => (
                        <div key={s.id} className="bg-white/5 rounded-lg p-2.5 space-y-1.5">
                          <p className="text-xs text-zinc-500 font-medium">{s.title}</p>
                          <p className="text-xs text-zinc-400 line-through">{s.original}</p>
                          <p className="text-xs text-zinc-200">{s.improved}</p>
                          <button
                            onClick={() => applySuggestion(s)}
                            disabled={appliedIds.has(s.id)}
                            className={`flex items-center gap-1.5 text-xs transition-colors ${
                              appliedIds.has(s.id)
                                ? 'text-green-400 cursor-default'
                                : 'text-cyan-400 hover:text-cyan-300'
                            }`}
                          >
                            <CheckCheck className="w-3 h-3" />
                            {appliedIds.has(s.id) ? 'Applied' : 'Apply'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {analysing && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-xl px-3 py-2 text-sm text-zinc-500 animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Reply input */}
          <div className="flex gap-2 p-3 border-t border-white/5">
            <Input
              placeholder="Reply to the AI..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && reply.trim() && !analysing) {
                  runAnalysis(reply.trim())
                }
              }}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={() => reply.trim() && runAnalysis(reply.trim())}
              disabled={!reply.trim() || analysing}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </GlassCard>
      )}

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
