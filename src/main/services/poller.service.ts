import { BrowserWindow } from 'electron'
import * as gmailService from './gmail.service'
import * as geminiService from './gemini.service'
import * as emailsRepo from '../database/repositories/emails.repo'
import * as repliesRepo from '../database/repositories/replies.repo'
import * as campaignsRepo from '../database/repositories/campaigns.repo'
import * as leadsRepo from '../database/repositories/leads.repo'
import * as settingsService from './settings.service'
import { logger } from '../utils/logger'

let pollInterval: ReturnType<typeof setInterval> | null = null
let isPolling = false

function emitToRenderer(event: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send(event, data)
  }
}

export function startPolling(): void {
  if (pollInterval) return
  if (!gmailService.isConnected()) return

  const interval = settingsService.getPollInterval()
  logger.info(`Starting inbox polling every ${interval / 1000}s`)

  // Poll immediately, then at interval
  pollOnce()
  pollInterval = setInterval(pollOnce, interval)
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

export function isActive(): boolean {
  return !!pollInterval
}

async function pollOnce(): Promise<void> {
  if (isPolling) return
  isPolling = true

  try {
    const lastPoll = settingsService.get('last_poll_time') || undefined
    const messages = await gmailService.getNewMessages(lastPoll)

    let newReplies = 0

    for (const message of messages) {
      const threadId = message.threadId
      if (!threadId) continue

      const gmailMessageId = message.id
      if (!gmailMessageId) continue

      // Skip if already processed
      if (repliesRepo.replyExistsByGmailId(gmailMessageId)) continue

      // Check if this thread matches a sent email
      const sentEmail = emailsRepo.getEmailByThreadId(threadId)
      if (!sentEmail) continue

      // Skip if this is the original sent message
      if (sentEmail.gmail_message_id === gmailMessageId) continue

      // Extract message details
      const headers = message.payload?.headers || []
      const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')
      const subjectHeader = headers.find((h) => h.name?.toLowerCase() === 'subject')
      const from = fromHeader?.value || ''
      const subject = subjectHeader?.value || ''

      // Extract body
      let body = ''
      if (message.payload?.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64url').toString('utf-8')
      } else if (message.payload?.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64url').toString('utf-8')
            break
          }
        }
      }

      // Create reply record
      const reply = repliesRepo.createReply({
        email_id: sentEmail.id,
        lead_id: sentEmail.lead_id,
        gmail_message_id: gmailMessageId,
        gmail_thread_id: threadId,
        from_email: from,
        subject,
        body,
        snippet: message.snippet || '',
        received_at: message.internalDate
          ? new Date(parseInt(message.internalDate)).toISOString()
          : undefined
      })

      // Classify with Gemini
      if (geminiService.isConfigured()) {
        try {
          const classification = await geminiService.classifyReply(
            sentEmail.subject,
            sentEmail.body,
            body
          )
          repliesRepo.updateReplyClassification(
            reply.id,
            classification.classification,
            classification.confidence,
            classification.reasoning
          )

          // Update lead status based on classification
          if (classification.classification === 'interested') {
            leadsRepo.updateLead(sentEmail.lead_id, { status: 'interested' })
          } else if (classification.classification === 'not_interested') {
            leadsRepo.updateLead(sentEmail.lead_id, { status: 'not_interested' })
          } else if (classification.classification === 'unsubscribe') {
            leadsRepo.updateLead(sentEmail.lead_id, { status: 'unsubscribed' })
          }

          // Update campaign reply count
          const campaign = campaignsRepo.getCampaignById(sentEmail.campaign_id)
          if (campaign) {
            campaignsRepo.updateCampaign(sentEmail.campaign_id, {
              total_replied: (campaign.total_replied || 0) + 1,
              total_interested:
                classification.classification === 'interested'
                  ? (campaign.total_interested || 0) + 1
                  : campaign.total_interested
            })
          }
        } catch (err) {
          logger.error('Failed to classify reply:', err)
        }
      }

      newReplies++
    }

    settingsService.set('last_poll_time', new Date().toISOString())

    if (newReplies > 0) {
      emitToRenderer('inbox:new-replies', {
        count: newReplies,
        unreadTotal: repliesRepo.getUnreadReplyCount()
      })
    }
  } catch (err) {
    logger.error('Polling error:', err)
  } finally {
    isPolling = false
  }
}
