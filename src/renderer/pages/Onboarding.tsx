import React, { useState, useEffect } from 'react'
import {
  CheckCircle, ExternalLink, Key, Mail, ArrowRight, ArrowLeft,
  Loader2, ChevronRight, Sparkles, Copy, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DarkVeil from '@/components/ui/DarkVeil'

interface OnboardingProps {
  onComplete: () => void
}

const STEPS = [
  { id: 'welcome',  label: 'Welcome' },
  { id: 'gemini',   label: 'AI Key' },
  { id: 'google',   label: 'Gmail Setup' },
  { id: 'connect',  label: 'Connect' },
  { id: 'done',     label: 'Done' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="ml-2 text-zinc-500 hover:text-cyan-400 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
      ${done  ? 'bg-green-500 text-white' :
        active ? 'bg-cyan-500 text-white ring-4 ring-cyan-500/20' :
                 'bg-white/5 text-zinc-500'}`}>
      {done ? <CheckCircle className="w-4 h-4" /> : n}
    </div>
  )
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiSaved, setGeminiSaved] = useState(false)
  const [savingGemini, setSavingGemini] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [credsSaved, setCredsSaved] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailEmail, setGmailEmail] = useState('')

  useEffect(() => {
    // Pre-fill any existing values
    const load = async () => {
      const [key, id, secret] = await Promise.all([
        window.electronAPI.settings.get('gemini_api_key'),
        window.electronAPI.settings.get('google_client_id'),
        window.electronAPI.settings.get('google_client_secret'),
      ])
      if (key) { setGeminiKey(key); setGeminiSaved(true) }
      if (id) setClientId(id)
      if (secret) setClientSecret(secret)
      if (id && secret) setCredsSaved(true)

      const status = await window.electronAPI.auth.gmailStatus()
      if (status.connected) { setGmailConnected(true); setGmailEmail(status.email) }
    }
    load()
  }, [])

  const saveGemini = async () => {
    if (!geminiKey.trim()) return
    setSavingGemini(true)
    await window.electronAPI.settings.set('gemini_api_key', geminiKey.trim())
    setGeminiSaved(true)
    setSavingGemini(false)
    setTimeout(() => setStep(2), 600)
  }

  const saveCreds = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return
    await Promise.all([
      window.electronAPI.settings.set('google_client_id', clientId.trim()),
      window.electronAPI.settings.set('google_client_secret', clientSecret.trim()),
    ])
    setCredsSaved(true)
    setTimeout(() => setStep(3), 400)
  }

  const connectGmail = async () => {
    setConnecting(true)
    try {
      const result = await window.electronAPI.auth.gmailConnect()
      setGmailConnected(true)
      setGmailEmail(result.email)
      setTimeout(() => setStep(4), 800)
    } catch (err) {
      console.error('Gmail connect failed:', err)
    } finally {
      setConnecting(false)
    }
  }

  const finish = async () => {
    await window.electronAPI.settings.set('onboarding_complete', '1')
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <DarkVeil speed={0.1} resolutionScale={0.4} />
      </div>

      <div className="relative z-10 w-full max-w-xl px-6">

        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-4">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">ALX Outreach</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            {step === 0 && "Welcome 👋"}
            {step === 1 && "Step 1 — Gemini AI Key"}
            {step === 2 && "Step 2 — Google Cloud Setup"}
            {step === 3 && "Step 3 — Connect Gmail"}
            {step === 4 && "You're all set 🎉"}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">
            {step === 0 && "Let's get your outreach machine set up. Takes about 5 minutes."}
            {step === 1 && "This powers the AI that writes and personalises your emails."}
            {step === 2 && "You need a Google Cloud project to send emails via Gmail."}
            {step === 3 && "Authorise ALX Outreach to send from your Gmail account."}
            {step === 4 && "Start importing leads and launching campaigns."}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1">
                <StepBadge n={i + 1} active={step === i} done={step > i} />
                <span className={`text-[10px] ${step === i ? 'text-cyan-400' : step > i ? 'text-green-400' : 'text-zinc-600'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 mb-4 transition-all ${step > i ? 'bg-green-500' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Back button */}
        {step > 0 && step < 4 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}

        {/* Step content */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">

          {/* ── WELCOME ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { icon: '🤖', title: 'AI-powered drafts', desc: 'Gemini writes a personalised email for every lead based on their company and industry.' },
                  { icon: '📧', title: 'Gmail integration', desc: 'Sends directly from your Gmail. Replies get auto-classified as interested / not interested.' },
                  { icon: '📊', title: 'Full campaign tracking', desc: 'See every send, open, and reply. Know exactly who to follow up with.' },
                ].map(item => (
                  <div key={item.title} className="flex gap-3 items-start p-3 rounded-xl bg-white/5">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => setStep(1)}>
                Let's go <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ── GEMINI KEY ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 p-4 space-y-3 text-sm">
                <p className="font-medium text-white">How to get your Gemini API key:</p>
                <ol className="space-y-2 text-zinc-300">
                  {[
                    <>Go to <a href="https://aistudio.google.com/apikey" target="_blank" className="text-cyan-400 hover:underline inline-flex items-center gap-1">aistudio.google.com/apikey <ExternalLink className="w-3 h-3" /></a></>,
                    <>Click <span className="text-white font-medium">"Create API Key"</span></>,
                    <>Select or create a project, then click <span className="text-white font-medium">"Create API Key in existing project"</span></>,
                    <>Copy the key and paste it below</>,
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="AIza..."
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveGemini()}
                />
                <Button className="w-full" onClick={saveGemini} disabled={!geminiKey.trim() || savingGemini}>
                  {savingGemini ? <Loader2 className="w-4 h-4 animate-spin" /> :
                   geminiSaved ? <><CheckCircle className="w-4 h-4 text-green-400" /> Key saved!</> :
                   <>Save & Continue <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </div>
              <button onClick={() => setStep(2)} className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                Skip for now →
              </button>
            </div>
          )}

          {/* ── GOOGLE CLOUD ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 p-4 space-y-3 text-sm">
                <p className="font-medium text-white">Set up Google Cloud OAuth:</p>
                <ol className="space-y-2.5 text-zinc-300">
                  {[
                    <>Go to <a href="https://console.cloud.google.com" target="_blank" className="text-cyan-400 hover:underline inline-flex items-center gap-1">console.cloud.google.com <ExternalLink className="w-3 h-3" /></a> → <span className="text-white font-medium">New Project</span></>,
                    <>In the sidebar go to <span className="text-white font-medium">APIs &amp; Services → Library</span>, search <span className="text-white font-medium">"Gmail API"</span> and click <span className="text-white font-medium">Enable</span></>,
                    <>Go to <span className="text-white font-medium">APIs &amp; Services → OAuth consent screen</span> → choose <span className="text-white font-medium">External</span> → fill in App Name (anything) → add your Gmail as a <span className="text-white font-medium">Test User</span></>,
                    <>Go to <span className="text-white font-medium">Credentials → Create Credentials → OAuth Client ID</span></>,
                    <>Application type: <span className="text-cyan-400 font-bold">Desktop app</span> — <span className="text-red-400">NOT "Web application"</span>, this must be Desktop app or login will fail</>,
                    <>Click <span className="text-white font-medium">Create</span>, then copy the <span className="text-white font-medium">Client ID</span> and <span className="text-white font-medium">Client Secret</span> below</>,
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="space-y-2">
                <Input placeholder="Client ID — ends in .apps.googleusercontent.com" value={clientId} onChange={e => setClientId(e.target.value)} />
                <Input placeholder="Client Secret — starts with GOCSPX-" type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} />
                <Button className="w-full" onClick={saveCreds} disabled={!clientId.trim() || !clientSecret.trim()}>
                  {credsSaved
                    ? <><CheckCircle className="w-4 h-4 text-green-400" /> Saved — connecting next</>
                    : <>Save & Continue <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </div>
            </div>
          )}

          {/* ── CONNECT GMAIL ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 p-4 space-y-3 text-sm text-zinc-300">
                <p className="font-medium text-white">Almost there!</p>
                <p>Click the button below. A browser window will open asking you to sign in to Google and grant ALX Outreach permission to send emails on your behalf.</p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-300 text-xs space-y-1.5">
                  <p>⚠️ Google may show a warning that the app is "unverified" — that's normal. Click <strong>Advanced → Go to [app name]</strong> to continue.</p>
                  <p>🔴 Getting a <strong>redirect_uri_mismatch</strong> error? It means you picked <strong>"Web application"</strong> instead of <strong>"Desktop app"</strong> when creating credentials. Go back to Google Cloud → Credentials → delete the current one → create a new OAuth Client ID and make sure to select <strong>Desktop app</strong>.</p>
                </div>
              </div>
              {gmailConnected ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Gmail connected!</p>
                    <p className="text-xs text-zinc-400">{gmailEmail}</p>
                  </div>
                </div>
              ) : (
                <Button className="w-full" onClick={connectGmail} disabled={connecting}>
                  {connecting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening browser...</>
                    : <><Mail className="w-4 h-4" /> Connect Gmail</>}
                </Button>
              )}
              {gmailConnected && (
                <Button className="w-full" onClick={() => setStep(4)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          {/* ── DONE ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                {[
                  { ok: geminiSaved, label: 'Gemini AI Key', sub: 'Drafts + reply classification ready' },
                  { ok: gmailConnected, label: 'Gmail connected', sub: gmailEmail || 'Sending + inbox polling ready' },
                ].map(item => (
                  <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl border
                    ${item.ok ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                    {item.ok
                      ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      : <span className="text-yellow-400 text-lg leading-none">⚠</span>}
                    <div>
                      <p className={`text-sm font-medium ${item.ok ? 'text-green-400' : 'text-yellow-400'}`}>{item.label}</p>
                      <p className="text-xs text-zinc-400">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-white/5 p-4 text-sm text-zinc-300 space-y-1">
                <p className="font-medium text-white">What to do next:</p>
                <ul className="space-y-1 mt-2">
                  {[
                    'Go to Examples → add your portfolio links',
                    'Go to Leads → import a CSV or paste leads',
                    'Go to Campaigns → create your first campaign',
                    'Generate AI drafts → approve them → hit send',
                  ].map((t, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <Button className="w-full text-base py-3" onClick={finish}>
                Open ALX Outreach <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
