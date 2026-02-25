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

  // Generate AI drafts for a campaign
  ipcMain.handle('campaigns:generateDrafts', async (event, campaignId: string) => {
    const campaign = campaignsRepo.getCampaignById(campaignId)
    if (!campaign) throw new Error('Campaign not found')
    if (!campaign.template_id) throw new Error('No template assigned to campaign')

    const template = templatesRepo.getTemplateById(campaign.template_id)
    if (!template) throw new Error('Template not found')

    const leadIds = campaignsRepo.getCampaignLeadIds(campaignId)
    const leads = leadIds
      .map((id) => leadsRepo.getLeadById(id))
      .filter((l): l is NonNullable<typeof l> => !!l)

    const portfolioExamples = portfolioRepo.getAllExamples()

    let generated = 0
    const errors: string[] = []

    for (const lead of leads) {
      try {
        // Check if draft already exists for this lead in this campaign
        const existing = emailsRepo
          .getEmailsByCampaign(campaignId)
          .find((e) => e.lead_id === lead.id)
        if (existing) {
          generated++
          continue
        }

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
            portfolioExamples.length > 0 ? portfolioExamples : undefined
          )
          subject = draft.subject
          body = draft.body
          personalizationNotes = draft.personalizationNotes
        } else {
          // Fallback: simple template rendering without AI
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
          campaignId,
          generated,
          total: leads.length
        })
      } catch (err) {
        const error = (err as Error).message
        logger.error(`Failed to generate draft for ${lead.email}:`, error)
        errors.push(`${lead.email}: ${error}`)
      }
    }

    // Update campaign status
    campaignsRepo.updateCampaign(campaignId, { status: 'drafts_ready' })

    return { generated, total: leads.length, errors }
  })
}
