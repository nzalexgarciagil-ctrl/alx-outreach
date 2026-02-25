import { ipcMain } from 'electron'
import * as portfolioRepo from '../database/repositories/portfolio.repo'

export function registerPortfolioHandlers(): void {
  ipcMain.handle('portfolio:getAll', () => portfolioRepo.getAllExamples())
  ipcMain.handle('portfolio:create', (_e, data) => portfolioRepo.createExample(data))
  ipcMain.handle('portfolio:update', (_e, id: string, data) => portfolioRepo.updateExample(id, data))
  ipcMain.handle('portfolio:delete', (_e, id: string) => portfolioRepo.deleteExample(id))
}
