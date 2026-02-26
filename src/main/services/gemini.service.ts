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
  examples: Array<{ id: string; title: string; url: string; description: string | null }>,
  niches: Array<{ name: string; leadCount: number }>,
  userReply?: string,
  previousAnalysis?: string
): Promise<{ message: string; suggestions: Array<{ id: string; exampleId: string; field: string; title: string; original: string; improved: string }> }> {
  const client = getClient()

  const examplesList = examples
    .map((e, i) => `${i + 1}. [ID: ${e.id}] Title: "${e.title}" | URL: ${e.url}${e.description ? ` | Description: ${e.description}` : ' | No description'}`)
    .join('\n')

  const nichesList = niches.length > 0
    ? niches.map(n => `- ${n.name} (${n.leadCount} leads)`).join('\n')
    : 'No niches configured yet.'

  const conversationContext = previousAnalysis
    ? `\nPREVIOUS ANALYSIS CONTEXT:\n${previousAnalysis}\n\nUSER REPLY: ${userReply || '(no reply)'}\n`
    : ''

  const prompt = `You are a portfolio optimisation assistant for ALX, a videography agency doing cold email outreach.

When generating outreach emails, the AI picks 3-4 portfolio examples from the list that are most relevant to each lead's industry/niche. Your job is to make sure the portfolio is well-matched to the niches being targeted and that each example's title and description is as useful as possible for that matching.

TARGET NICHES (who ALX is sending outreach to):
${nichesList}

CURRENT PORTFOLIO EXAMPLES:
${examplesList}
${conversationContext}
Key things to assess:
- Are there examples covering each target niche? Flag any niches with no matching examples.
- Are titles specific enough? (e.g. "Speed ramp — Car dealership" beats "Speed ramp")
- Do descriptions explain style, pace, and context in a way that helps match to industries?
- Are there gaps — niches being targeted but no relevant example exists?

${previousAnalysis ? 'Continue the conversation based on the user reply above. Give specific actionable suggestions based on their response.' : 'Give your initial analysis. Highlight any niche gaps first, then suggest title/description improvements. Be direct — no fluff. Ask one focused question at the end if you need more info.'}

Return your response in this exact JSON format:
{
  "message": "your conversational message (use **bold**, bullet points with -, numbered lists where helpful — make it readable)",
  "suggestions": [
    {
      "id": "unique-suggestion-id",
      "exampleId": "the exact ID from the [ID: ...] field above",
      "field": "title or description",
      "title": "brief label e.g. 'Improve title for example 2'",
      "original": "the current value being replaced",
      "improved": "your suggested replacement"
    }
  ]
}

Only include suggestions when you have specific improvements ready. Otherwise leave suggestions as an empty array. Always use the exact ID values from the [ID: ...] labels above.`

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
