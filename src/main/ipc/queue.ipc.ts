import { ipcMain } from 'electron'
import * as queueService from '../services/queue.service'

export function registerQueueHandlers(): void {
  ipcMain.handle('queue:getStatus', () => queueService.getStatus())
  ipcMain.handle('queue:start', () => queueService.start())
  ipcMain.handle('queue:pause', () => queueService.pause())
  ipcMain.handle('queue:resume', () => queueService.resume())
  ipcMain.handle('queue:stop', () => queueService.stop())
}
