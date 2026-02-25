import { ipcMain, dialog } from 'electron'
import * as leadsRepo from '../database/repositories/leads.repo'
import * as nichesRepo from '../database/repositories/niches.repo'
import * as csvService from '../services/csv.service'

export function registerLeadsHandlers(): void {
  ipcMain.handle('leads:getAll', () => leadsRepo.getAllLeads())
  ipcMain.handle('leads:getById', (_e, id: string) => leadsRepo.getLeadById(id))
  ipcMain.handle('leads:getByNiche', (_e, nicheId: string) => leadsRepo.getLeadsByNiche(nicheId))
  ipcMain.handle('leads:create', (_e, data) => leadsRepo.createLead(data))
  ipcMain.handle('leads:update', (_e, id: string, data) => leadsRepo.updateLead(id, data))
  ipcMain.handle('leads:delete', (_e, id: string) => leadsRepo.deleteLead(id))
  ipcMain.handle('leads:deleteBatch', (_e, ids: string[]) => leadsRepo.deleteLeadsBatch(ids))
  ipcMain.handle('leads:getCount', () => leadsRepo.getLeadCount())

  // CSV import
  ipcMain.handle('leads:importCSV', async (_e, nicheId?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { imported: 0, errors: [], canceled: true }
    }

    const { rows, errors } = csvService.parseCSVFile(result.filePaths[0])
    if (rows.length === 0) {
      return { imported: 0, errors, canceled: false }
    }

    const leadsToInsert = rows.map((row) => ({
      ...row,
      niche_id: nicheId
    }))
    const imported = leadsRepo.createLeadsBatch(leadsToInsert)
    return { imported, errors, canceled: false, total: rows.length }
  })

  // Niches
  ipcMain.handle('niches:getAll', () => nichesRepo.getAllNiches())
  ipcMain.handle('niches:create', (_e, data) => nichesRepo.createNiche(data))
  ipcMain.handle('niches:update', (_e, id: string, data) => nichesRepo.updateNiche(id, data))
  ipcMain.handle('niches:delete', (_e, id: string) => nichesRepo.deleteNiche(id))
}
