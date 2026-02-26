import { ipcMain } from 'electron'
import * as emailsRepo from '../database/repositories/emails.repo'
import * as leadsRepo from '../database/repositories/leads.repo'
import * as templatesRepo from '../database/repositories/templates.repo'
import * as portfolioRepo from '../database/repositories/portfolio.repo'
import * as geminiService from '../services/gemini.service'
import { logger } from '../utils/logger'

export function registerEmailsHandlers(): void {
  ipcMain.handle('emails:getByCampaign', (_e, campaignId: string, status?: string) =>
    emailsRepo.getEmailsByCampaign(campaignId, status)
  )
  ipcMain.handle('emails:getById', (_e, id: string) => emailsRepo.getEmailById(id))
  ipcMain.handle('emails:update', (_e, id: string, data) => emailsRepo.updateEmail(id, data))
  ipcMain.handle('emails:delete', (_e, id: string) => emailsRepo.deleteEmail(id))
  ipcMain.handle('emails:approve', (_e, id: string) =>
    emailsRepo.updateEmail(id, { status: 'approved' })
  )
  ipcMain.handle('emails:reject', (_e, id: string) =>
    emailsRepo.updateEmail(id, { status: 'draft' })
  )
  ipcMain.handle('emails:approveBatch', (_e, ids: string[]) =>
    emailsRepo.updateEmailStatusBatch(ids, 'approved')
  )
  ipcMain.handle('emails:queueApproved', (_e, campaignId: string) => {
    const approved = emailsRepo.getEmailsByCampaign(campaignId, 'approved')
    const ids = approved.map((e) => e.id)
    emailsRepo.updateEmailStatusBatch(ids, 'queued')
    return ids.length
  })
  ipcMain.handle('emails:getStats', () => emailsRepo.getEmailStats())
  ipcMain.handle('emails:getQueuedCount', () => emailsRepo.getQueuedEmailCount())

  ipcMain.handle('emails:regenerate', async (_e, emailId: string, feedback: string) => {
    const email = emailsRepo.getEmailById(emailId)
    if (!email) throw new Error('Email not found')

    const lead = leadsRepo.getLeadById(email.lead_id)
    if (!lead) throw new Error('Lead not found')

    const template = email.template_id ? templatesRepo.getTemplateById(email.template_id) : null
    const portfolioExamples = portfolioRepo.getAllExamples()

    const draft = await geminiService.regenerateDraft(
      template?.subject || email.subject,
      template?.body || email.body,
      {
        first_name: lead.first_name,
        last_name: lead.last_name || undefined,
        company: lead.company || undefined,
        website: lead.website || undefined,
        niche: (lead as { niche_name?: string }).niche_name || undefined
      },
      { subject: email.subject, body: email.body },
      feedback,
      portfolioExamples.length > 0 ? portfolioExamples : undefined
    )

    emailsRepo.updateEmail(emailId, {
      subject: draft.subject,
      body: draft.body,
      personalization_notes: draft.personalizationNotes
    })

    logger.info(`Draft regenerated for ${lead.email} with feedback: "${feedback.substring(0, 60)}"`)
    return emailsRepo.getEmailById(emailId)
  })
}
