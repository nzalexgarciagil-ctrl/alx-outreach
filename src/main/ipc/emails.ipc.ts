import { ipcMain } from 'electron'
import * as emailsRepo from '../database/repositories/emails.repo'

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
}
