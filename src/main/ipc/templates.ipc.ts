import { ipcMain } from 'electron'
import * as templatesRepo from '../database/repositories/templates.repo'
import * as templateService from '../services/template.service'

export function registerTemplatesHandlers(): void {
  ipcMain.handle('templates:getAll', () => templatesRepo.getAllTemplates())
  ipcMain.handle('templates:getById', (_e, id: string) => templatesRepo.getTemplateById(id))
  ipcMain.handle('templates:getByNiche', (_e, nicheId: string) => templatesRepo.getTemplatesByNiche(nicheId))
  ipcMain.handle('templates:create', (_e, data) => templatesRepo.createTemplate(data))
  ipcMain.handle('templates:update', (_e, id: string, data) => templatesRepo.updateTemplate(id, data))
  ipcMain.handle('templates:delete', (_e, id: string) => templatesRepo.deleteTemplate(id))
  ipcMain.handle('templates:render', (_e, template: string, vars) => templateService.renderTemplate(template, vars))
  ipcMain.handle('templates:extractVars', (_e, template: string) => templateService.extractVariables(template))
  ipcMain.handle('templates:getSampleVars', () => templateService.getSampleVars())
}
