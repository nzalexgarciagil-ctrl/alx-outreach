import { BrowserWindow } from 'electron'
import * as gmailService from './gmail.service'
import * as emailsRepo from '../database/repositories/emails.repo'
import * as dailySendRepo from '../database/repositories/daily-send.repo'
import * as campaignsRepo from '../database/repositories/campaigns.repo'
import * as settingsService from './settings.service'
import { plainTextToHtml } from '../utils/email-format'
import { logger } from '../utils/logger'

export type QueueState = 'idle' | 'running' | 'paused'

let state: QueueState = 'idle'
let timeoutId: ReturnType<typeof setTimeout> | null = null
let currentDelay = 0
let countdownInterval: ReturnType<typeof setInterval> | null = null

function emitToRenderer(event: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send(event, data)
  }
}

function getRandomDelay(): number {
  return Math.floor(Math.random() * 21 + 10) * 1000 // 10-30 seconds
}

export function getState(): QueueState {
  return state
}

export function getStatus(): {
  state: QueueState
  queuedCount: number
  todaySent: number
  dailyLimit: number
  currentDelay: number
} {
  return {
    state,
    queuedCount: emailsRepo.getQueuedEmailCount(),
    todaySent: dailySendRepo.getTodaySendCount(),
    dailyLimit: settingsService.getDailyLimit(),
    currentDelay
  }
}

export function start(): void {
  if (state === 'running') return
  if (!gmailService.isConnected()) {
    emitToRenderer('queue:error', { message: 'Gmail not connected' })
    return
  }

  state = 'running'
  emitToRenderer('queue:state-change', getStatus())
  processNext()
}

export function pause(): void {
  if (state !== 'running') return
  state = 'paused'
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  currentDelay = 0
  emitToRenderer('queue:state-change', getStatus())
}

export function resume(): void {
  if (state !== 'paused') return
  state = 'running'
  emitToRenderer('queue:state-change', getStatus())
  processNext()
}

export function stop(): void {
  state = 'idle'
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  currentDelay = 0
  emitToRenderer('queue:state-change', getStatus())
}

async function processNext(): Promise<void> {
  if (state !== 'running') return

  // Check daily limit
  const todaySent = dailySendRepo.getTodaySendCount()
  const dailyLimit = settingsService.getDailyLimit()
  if (todaySent >= dailyLimit) {
    logger.info('Daily send limit reached')
    stop()
    emitToRenderer('queue:daily-limit-reached', { todaySent, dailyLimit })
    return
  }

  const email = emailsRepo.getNextQueuedEmail()
  if (!email) {
    logger.info('No more queued emails')
    stop()
    emitToRenderer('queue:completed', getStatus())
    return
  }

  // Send the email
  try {
    emailsRepo.updateEmail(email.id, { status: 'sending' })
    emitToRenderer('queue:sending', { emailId: email.id, to: email.lead_email })

    const htmlBody = plainTextToHtml(email.body)
    const result = await gmailService.sendEmail(email.lead_email, email.subject, htmlBody)

    emailsRepo.updateEmail(email.id, {
      status: 'sent',
      gmail_message_id: result.messageId,
      gmail_thread_id: result.threadId,
      sent_at: new Date().toISOString()
    })

    dailySendRepo.incrementTodaySendCount()

    // Update campaign stats
    const campaign = campaignsRepo.getCampaignById(email.campaign_id)
    if (campaign) {
      campaignsRepo.updateCampaign(email.campaign_id, {
        total_sent: (campaign.total_sent || 0) + 1
      })
    }

    emitToRenderer('queue:sent', {
      emailId: email.id,
      to: email.lead_email,
      ...getStatus()
    })
  } catch (err) {
    const error = err as Error & { code?: number }
    logger.error('Failed to send email:', error)

    if (error.code === 429) {
      // Rate limited - pause and retry
      emailsRepo.updateEmail(email.id, { status: 'queued' })
      logger.info('Rate limited by Gmail, pausing for 60s')
      emitToRenderer('queue:rate-limited', { retryIn: 60000 })

      currentDelay = 60
      countdownInterval = setInterval(() => {
        currentDelay--
        emitToRenderer('queue:countdown', { seconds: currentDelay })
        if (currentDelay <= 0 && countdownInterval) {
          clearInterval(countdownInterval)
          countdownInterval = null
        }
      }, 1000)

      timeoutId = setTimeout(() => {
        if (state === 'running') processNext()
      }, 60000)
      return
    }

    emailsRepo.updateEmail(email.id, {
      status: 'failed',
      error: error.message
    })

    emitToRenderer('queue:send-failed', {
      emailId: email.id,
      error: error.message,
      ...getStatus()
    })
  }

  // Schedule next with random delay
  if (state === 'running') {
    const delay = getRandomDelay()
    currentDelay = Math.ceil(delay / 1000)

    countdownInterval = setInterval(() => {
      currentDelay--
      emitToRenderer('queue:countdown', { seconds: currentDelay })
      if (currentDelay <= 0 && countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    }, 1000)

    emitToRenderer('queue:waiting', { delay, ...getStatus() })
    timeoutId = setTimeout(() => {
      if (state === 'running') processNext()
    }, delay)
  }
}
