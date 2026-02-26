import { ipcMain } from 'electron'
import * as campaignsRepo from '../database/repositories/campaigns.repo'
import * as emailsRepo from '../database/repositories/emails.repo'
import * as leadsRepo from '../database/repositories/leads.repo'
import * as templatesRepo from '../database/repositories/templates.repo'
import * as portfolioRepo from '../database/repositories/portfolio.repo'
import * as geminiService from '../services/gemini.service'
import * as templateService from '../services/template.service'
import { logger } from '../utils/logger'

export function registerCampaignsHandlers(): void {
  ipcMain.handle('campaigns:getAll', () => campaignsRepo.getAllCampaigns())
  ipcMain.handle('campaigns:getById', (_e, id: string) => campaignsRepo.getCampaignById(id))
  ipcMain.handle('campaigns:create', (_e, data) => campaignsRepo.createCampaign(data))
  ipcMain.handle('campaigns:update', (_e, id: string, data) => campaignsRepo.updateCampaign(id, data))
  ipcMain.handle('campaigns:delete', (_e, id: string) => campaignsRepo.deleteCampaign(id))
  ipcMain.handle('campaigns:addLeads', (_e, campaignId: string, leadIds: string[]) =>
    campaignsRepo.addLeadsToCampaign(campaignId, leadIds)
  )
  ipcMain.handle('campaigns:getLeadIds', (_e, campaignId: string) =>
    campaignsRepo.getCampaignLeadIds(campaignId)
  )

  // Generate AI drafts for a campaign — parallel worker pool
  ipcMain.handle('campaigns:generateDrafts', async (event, campaignId: string, extraContext?: string, workerCount = 5) => {
    const campaign = campaignsRepo.getCampaignById(campaignId)
    if (!campaign) throw new Error('Campaign not found')
    if (!campaign.template_id) throw new Error('No template assigned to campaign')

    const template = templatesRepo.getTemplateById(campaign.template_id)
    if (!template) throw new Error('Template not found')

    const leadIds = campaignsRepo.getCampaignLeadIds(campaignId)
    const allLeads = leadIds
      .map((id) => leadsRepo.getLeadById(id))
      .filter((l): l is NonNullable<typeof l> => !!l)

    const portfolioExamples = portfolioRepo.getAllExamples()

    // --- Phase 1: Brief ---
    event.sender.send('campaigns:draft-progress', {
      campaignId, generated: 0, total: allLeads.length, workers: 0, phase: 'briefing'
    })

    let brief: geminiService.CampaignBrief | undefined
    if (geminiService.isConfigured()) {
      try {
        brief = await geminiService.generateCampaignBrief(
          template.subject,
          template.body,
          campaign.niche_name || 'General',
          allLeads.slice(0, 4),
          portfolioExamples
        )
        logger.info('Campaign brief generated successfully')
      } catch (err) {
        logger.warn('Brief generation failed, proceeding without:', (err as Error).message)
      }
    }

    // --- Phase 2: Worker pool ---
    const existingEmails = emailsRepo.getEmailsByCampaign(campaignId)
    const existingLeadIds = new Set(existingEmails.map((e) => e.lead_id))
    const leadsToProcess = allLeads.filter((l) => !existingLeadIds.has(l.id))

    const queue = [...leadsToProcess]
    let generated = existingLeadIds.size
    const errors: string[] = []
    const actualWorkers = Math.min(workerCount, Math.max(queue.length, 1), 20)

    event.sender.send('campaigns:draft-progress', {
      campaignId, generated, total: allLeads.length, workers: actualWorkers, phase: 'generating'
    })

    const runWorker = async (workerId: number): Promise<void> => {
      logger.info(`Worker ${workerId}/${actualWorkers} started`)
      while (true) {
        const lead = queue.shift()
        if (!lead) break

        try {
          let subject: string
          let body: string
          let personalizationNotes = ''

          if (geminiService.isConfigured()) {
            const draft = await geminiService.generateDraft(
              template.subject,
              template.body,
              {
                first_name: lead.first_name,
                last_name: lead.last_name || undefined,
                company: lead.company || undefined,
                website: lead.website || undefined,
                niche: lead.niche_name || undefined
              },
              portfolioExamples.length > 0 ? portfolioExamples : undefined,
              extraContext,
              brief
            )
            subject = draft.subject
            body = draft.body
            personalizationNotes = draft.personalizationNotes
          } else {
            const vars: templateService.TemplateVars = {
              first_name: lead.first_name,
              last_name: lead.last_name || '',
              company: lead.company || '',
              website: lead.website || '',
              niche: lead.niche_name || ''
            }
            subject = templateService.renderTemplate(template.subject, vars)
            body = templateService.renderTemplate(template.body, vars)
          }

          emailsRepo.createEmail({
            campaign_id: campaignId,
            lead_id: lead.id,
            template_id: template.id,
            subject,
            body,
            personalization_notes: personalizationNotes
          })

          generated++
          event.sender.send('campaigns:draft-progress', {
            campaignId, generated, total: allLeads.length, workers: actualWorkers, phase: 'generating'
          })
        } catch (err) {
          const error = (err as Error).message
          logger.error(`Worker ${workerId}: failed draft for ${lead.email}:`, error)
          errors.push(`${lead.email}: ${error}`)
        }
      }
      logger.info(`Worker ${workerId} finished`)
    }

    await Promise.all(Array.from({ length: actualWorkers }, (_, i) => runWorker(i + 1)))

    campaignsRepo.updateCampaign(campaignId, { status: 'drafts_ready' })
    return { generated, total: allLeads.length, errors }
  })

  // Quick mode: generate template variants (3 different angle variants)
  ipcMain.handle('campaigns:generateVariants', async (_e, campaignId: string, feedback?: string) => {
    const campaign = campaignsRepo.getCampaignById(campaignId)
    if (!campaign?.template_id) throw new Error('No template assigned to campaign')

    const template = templatesRepo.getTemplateById(campaign.template_id)
    if (!template) throw new Error('Template not found')

    const portfolioExamples = portfolioRepo.getAllExamples()

    return geminiService.generateTemplateVariants(
      template.subject,
      template.body,
      campaign.niche_name || 'General',
      portfolioExamples,
      feedback
    )
  })

  // Quick mode: create drafts by doing find-replace on selected variants (no per-email AI)
  ipcMain.handle('campaigns:createDraftsFromVariants', (_e, campaignId: string, variants: geminiService.TemplateVariant[]) => {
    const campaign = campaignsRepo.getCampaignById(campaignId)
    if (!campaign?.template_id) throw new Error('Campaign not found')

    const leadIds = campaignsRepo.getCampaignLeadIds(campaignId)
    const leads = leadIds
      .map((id) => leadsRepo.getLeadById(id))
      .filter((l): l is NonNullable<typeof l> => !!l)

    // Delete existing drafts for this campaign first (so re-generation is clean)
    const existing = emailsRepo.getEmailsByCampaign(campaignId, 'draft')
    existing.forEach((e) => emailsRepo.deleteEmail(e.id))

    let created = 0
    leads.forEach((lead, index) => {
      // Round-robin across selected variants
      const variant = variants[index % variants.length]
      const vars: templateService.TemplateVars = {
        first_name: lead.first_name,
        last_name: lead.last_name || '',
        company: lead.company || '',
        website: lead.website || '',
        niche: lead.niche_name || ''
      }
      emailsRepo.createEmail({
        campaign_id: campaignId,
        lead_id: lead.id,
        template_id: campaign.template_id!,
        subject: templateService.renderTemplate(variant.subject, vars),
        body: templateService.renderTemplate(variant.body, vars),
        personalization_notes: `Quick mode — ${variant.label}`
      })
      created++
    })

    campaignsRepo.updateCampaign(campaignId, { status: 'drafts_ready' })
    return { created, total: leads.length }
  })

  ipcMain.handle('campaigns:preflight', async (_e, campaignId: string) => {
    const campaign = campaignsRepo.getCampaignById(campaignId)
    if (!campaign?.template_id) return { hasQuestions: false, questions: [] }

    const template = templatesRepo.getTemplateById(campaign.template_id)
    if (!template) return { hasQuestions: false, questions: [] }

    const leadIds = campaignsRepo.getCampaignLeadIds(campaignId)
    const sampleLeads = leadIds
      .slice(0, 4)
      .map((id) => leadsRepo.getLeadById(id))
      .filter((l): l is NonNullable<typeof l> => !!l)

    return geminiService.preflightCheck(
      template.subject,
      template.body,
      campaign.niche_name || 'General',
      sampleLeads
    )
  })
}
