import { ipcMain } from 'electron'
import * as settingsService from '../services/settings.service'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (_e, key: string) => settingsService.get(key))
  ipcMain.handle('settings:set', (_e, key: string, value: string) => settingsService.set(key, value))
  ipcMain.handle('settings:getAll', () => settingsService.getAll())
  ipcMain.handle('settings:remove', (_e, key: string) => settingsService.remove(key))
  ipcMain.handle('settings:getDailyLimit', () => settingsService.getDailyLimit())
  ipcMain.handle('settings:getPollInterval', () => settingsService.getPollInterval())
}
