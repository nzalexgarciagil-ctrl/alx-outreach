import { ipcMain } from 'electron'
import * as validatorService from '../services/validator.service'
import * as leadsRepo from '../database/repositories/leads.repo'

export function registerValidationHandlers(): void {
  ipcMain.handle('validation:validateEmail', (_e, email: string) =>
    validatorService.validateMX(email)
  )

  ipcMain.handle('validation:validateLeads', async (event, leadIds: string[]) => {
    const leads = leadIds
      .map((id) => leadsRepo.getLeadById(id))
      .filter((l): l is NonNullable<typeof l> => !!l)

    const emails = leads.map((l) => l.email)
    const results = await validatorService.validateBatch(emails, (done, total) => {
      event.sender.send('validation:progress', { done, total })
    })

    // Update lead records
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      leadsRepo.updateLead(leads[i].id, {
        email_valid: result.valid ? 1 : 0,
        email_validation_error: result.error || null
      })
    }

    return results
  })
}
