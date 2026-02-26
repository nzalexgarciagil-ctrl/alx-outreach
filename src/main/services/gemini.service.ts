import { GoogleGenerativeAI } from '@google/generative-ai'
import * as settingsService from './settings.service'
import { getDb } from './database.service'
import { v4 as uuid } from 'uuid'
import { logger } from '../utils/logger'

// Models in priority order — falls back if the primary isn't available on the key
const DRAFT_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash']
const CLASSIFY_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash']

let genAI: GoogleGenerativeAI | null = null
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 6700 // ~9 RPM to stay under 10 RPM

function getClient(): GoogleGenerativeAI {
  const apiKey = settingsService.get('gemini_api_key') || process.env.GEMINI_API_KEY || ''
  if (!apiKey) throw new Error('Gemini API key not configured')
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

export function resetClient(): void {
  genAI = null
}

async function rateLimitedRequest<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
  return fn()
}

// Retry with exponential backoff — handles 429 rate limits automatically
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 10000): Promise<T> {
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err as Error
      const is429 = lastErr.message.includes('429') || lastErr.message.includes('Too Many Requests') || lastErr.message.includes('Resource exhausted')
      if (is429 && attempt < retries) {
        const wait = delayMs * attempt
        logger.info(`Gemini 429 — waiting ${wait / 1000}s before retry ${attempt}/${retries - 1}...`)
        await new Promise((resolve) => setTimeout(resolve, wait))
      } else {
        throw lastErr
      }
    }
  }
  throw lastErr!
}

// Try each model in order until one works
async function tryModels<T>(models: string[], fn: (modelName: string) => Promise<T>): Promise<{ result: T; modelUsed: string }> {
  let lastErr: Error | null = null
  for (const modelName of models) {
    try {
      const result = await fn(modelName)
      return { result, modelUsed: modelName }
    } catch (err) {
      lastErr = err as Error
      const isUnavailable = lastErr.message.includes('404') || lastErr.message.includes('not found') || lastErr.message.includes('not supported')
      if (isUnavailable) {
        logger.warn(`Model ${modelName} unavailable, trying next...`)
        continue
      }
      throw lastErr // Non-availability errors (429, auth, etc.) — don't try next model
    }
  }
  throw lastErr!
}

function logUsage(type: string, model: string, inputTokens: number, outputTokens: number): void {
  try {
    getDb()
      .prepare(
        'INSERT INTO ai_usage_log (id, type, model, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)'
      )
      .run(uuid(), type, model, inputTokens, outputTokens)
  } catch {
    // Non-critical
  }
}

export async function generateDraft(
  templateSubject: string,
  templateBody: string,
  lead: {
    first_name: string
    last_name?: string
    company?: string
    website?: string
    niche?: string
  },
  portfolioExamples?: Array<{ title: string; url: string; description: string | null }>
): Promise<{ subject: string; body: string; personalizationNotes: string }> {
  const client = getClient()

  const portfolioSection =
    portfolioExamples && portfolioExamples.length > 0
      ? `\nAVAILABLE PORTFOLIO EXAMPLES (pick the 3-4 most relevant for this lead's industry):
${portfolioExamples.map((e, i) => `${i + 1}. ${e.title} — ${e.url}${e.description ? ` (${e.description})` : ''}`).join('\n')}

When including examples in the email, replace the template's existing example links with the most relevant ones from the list above. Format them as:
- [url1]  |  [url2]
- [url3]  |  [url4]
`
      : ''

  const prompt = `You are an email personalization assistant for a videography agency called ALX.

Given this email template and lead information, generate a personalized email.

TEMPLATE SUBJECT: ${templateSubject}
TEMPLATE BODY: ${templateBody}
${portfolioSection}
LEAD INFO:
- First Name: ${lead.first_name}
- Last Name: ${lead.last_name || 'N/A'}
- Company: ${lead.company || 'N/A'}
- Website: ${lead.website || 'N/A'}
- Niche: ${lead.niche || 'N/A'}

INSTRUCTIONS:
1. Replace all {{variable}} placeholders with the lead's actual information
2. Add 1-2 personalized sentences that reference the lead's company/website/niche naturally
3. Keep the tone professional but warm
4. Do NOT add a signature block — the template already includes it
5. Preserve the full template length — do not shorten or summarise

HUMANISATION RULES — the email must read like a real person wrote it, not AI:
- Write like you're a real person sending a quick email, not a marketing bot
- Use contractions naturally (I'm, I've, you've, it's, don't)
- Vary sentence length — mix short punchy sentences with longer ones
- BANNED words/phrases: "landscape", "pivotal", "underscore", "leverage", "utilize", "delve", "comprehensive", "robust", "innovative", "transformative", "seamlessly", "tailored", "streamline", "cutting-edge", "it's worth noting", "I hope this finds you well", "I hope this helps", "feel free to", "don't hesitate to", "as per", "please find"
- No em dashes (—) — use commas or just end the sentence
- No rule-of-three lists unless the template has them
- No sycophantic openers or closers
- No excessive hedging ("might potentially possibly")
- Specific and direct — say exactly what you mean
- If something is good, just say it's good — don't oversell it
- The email should feel like it was typed by a real person in 10 minutes, not crafted by an AI for an hour

Return your response in this exact JSON format:
{
  "subject": "the personalized subject line",
  "body": "the personalized email body (plain text, use \\n for line breaks)",
  "personalization_notes": "brief note about what was personalized and why"
}`

  const { result: response, modelUsed } = await tryModels(DRAFT_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName })
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)))
    return res.response
  })

  const text = response.text()

  logUsage(
    'draft_generation',
    modelUsed,
    response.usageMetadata?.promptTokenCount || 0,
    response.usageMetadata?.candidatesTokenCount || 0
  )

  logger.info(`Draft generated using ${modelUsed}`)

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Gemini returned plain text — likely a safety refusal. Surface it directly.
      const truncated = text.substring(0, 300).replace(/\n/g, ' ')
      logger.error('Gemini refused or returned non-JSON:', truncated)
      throw new Error(`Gemini refused: ${truncated}`)
    }
    const parsed = JSON.parse(jsonMatch[0])
    return {
      subject: parsed.subject,
      body: parsed.body,
      personalizationNotes: parsed.personalization_notes || ''
    }
  } catch (err) {
    logger.error('Failed to parse Gemini draft response:', text)
    throw err instanceof Error && err.message.startsWith('Gemini refused')
      ? err
      : new Error(`Failed to parse AI response: ${(err as Error).message}`)
  }
}

export async function classifyReply(
  originalSubject: string,
  originalBody: string,
  replyBody: string
): Promise<{ classification: string; confidence: number; reasoning: string }> {
  const client = getClient()

  const prompt = `You are an email reply classifier for a videography outreach campaign.

ORIGINAL EMAIL SUBJECT: ${originalSubject}
ORIGINAL EMAIL BODY (first 200 chars): ${originalBody.substring(0, 200)}

REPLY:
${replyBody}

Classify this reply into ONE of these categories:
- interested: The person is interested in learning more or wants to discuss
- not_interested: The person explicitly declines or says no
- follow_up: They have questions or want more information before deciding
- out_of_office: Auto-reply or out of office message
- bounce: Delivery failure or invalid email
- unsubscribe: They want to be removed from the mailing list

Return your response in this exact JSON format:
{
  "classification": "one_of_the_categories_above",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why you chose this classification"
}`

  const { result: response, modelUsed } = await tryModels(CLASSIFY_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName })
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)))
    return res.response
  })

  const text = response.text()

  logUsage(
    'reply_classification',
    modelUsed,
    response.usageMetadata?.promptTokenCount || 0,
    response.usageMetadata?.candidatesTokenCount || 0
  )

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      classification: parsed.classification,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning || ''
    }
  } catch (err) {
    logger.error('Failed to parse Gemini classification response:', text)
    return {
      classification: 'follow_up',
      confidence: 0.5,
      reasoning: 'Failed to classify automatically'
    }
  }
}

export async function analysePortfolio(
  examples: Array<{ title: string; url: string; description: string | null }>,
  userReply?: string,
  previousAnalysis?: string
): Promise<{ message: string; suggestions: Array<{ id: string; title: string; original: string; improved: string }> }> {
  const client = getClient()

  const examplesList = examples
    .map((e, i) => `${i + 1}. Title: "${e.title}" | URL: ${e.url}${e.description ? ` | Description: ${e.description}` : ' | No description'}`)
    .join('\n')

  const conversationContext = previousAnalysis
    ? `\nPREVIOUS ANALYSIS CONTEXT:\n${previousAnalysis}\n\nUSER REPLY: ${userReply || '(no reply)'}\n`
    : ''

  const prompt = `You are a portfolio optimisation assistant for ALX, a videography agency doing cold email outreach.

Your job is to review the agency's portfolio examples and help make them more effective for AI-driven email personalisation. When the AI generates outreach emails, it picks 3-4 examples from this list that are most relevant to each lead's industry.

CURRENT PORTFOLIO EXAMPLES:
${examplesList}
${conversationContext}
Your goal: Help make each example's title and description as useful as possible so the AI can pick the right ones. Good titles are specific like "Speed ramp — Car dealership" or "Talking head — Real estate agent". Good descriptions explain the style, pace, and context in 1 sentence.

${previousAnalysis ? 'Continue the conversation based on the user reply above. Give specific actionable suggestions based on their response.' : 'Review all examples and give your initial analysis. Ask one focused question to better understand their work so you can suggest improvements. Be direct and specific — no fluff.'}

Return your response in this exact JSON format:
{
  "message": "your conversational message to the user (ask questions, give feedback, be direct and helpful)",
  "suggestions": [
    {
      "id": "unique-id",
      "title": "brief label for this suggestion",
      "original": "the current title or description",
      "improved": "your suggested improvement"
    }
  ]
}

Only include suggestions array items if you have specific improvements ready to suggest. Otherwise leave it as an empty array.`

  const { result: response, modelUsed } = await tryModels(DRAFT_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName })
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)))
    return res.response
  })

  const text = response.text()

  logUsage(
    'portfolio_analysis',
    modelUsed,
    response.usageMetadata?.promptTokenCount || 0,
    response.usageMetadata?.candidatesTokenCount || 0
  )

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      message: parsed.message || 'Analysis complete.',
      suggestions: parsed.suggestions || []
    }
  } catch (err) {
    logger.error('Failed to parse portfolio analysis response:', text)
    return {
      message: text || 'Could not parse AI response. Please try again.',
      suggestions: []
    }
  }
}

export function isConfigured(): boolean {
  const apiKey = settingsService.get('gemini_api_key') || process.env.GEMINI_API_KEY
  return !!apiKey
}
