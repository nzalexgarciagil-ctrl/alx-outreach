import { ipcMain } from 'electron'
import * as portfolioRepo from '../database/repositories/portfolio.repo'
import * as geminiService from '../services/gemini.service'
import { getDb } from '../services/database.service'

export function registerPortfolioHandlers(): void {
  ipcMain.handle('portfolio:getAll', () => portfolioRepo.getAllExamples())
  ipcMain.handle('portfolio:create', (_e, data) => portfolioRepo.createExample(data))
  ipcMain.handle('portfolio:update', (_e, id: string, data) => portfolioRepo.updateExample(id, data))
  ipcMain.handle('portfolio:delete', (_e, id: string) => portfolioRepo.deleteExample(id))
  ipcMain.handle('portfolio:analyse', (_e, examples, userReply, previousAnalysis) => {
    // Pull niches + lead counts directly so the AI knows what we're targeting
    const niches = getDb()
      .prepare(`SELECT n.name, COUNT(l.id) as leadCount
                FROM niches n LEFT JOIN leads l ON l.niche_id = n.id
                GROUP BY n.id ORDER BY n.name`)
      .all() as Array<{ name: string; leadCount: number }>
    return geminiService.analysePortfolio(examples, niches, userReply, previousAnalysis)
  })
}
