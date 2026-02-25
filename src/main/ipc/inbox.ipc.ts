import { ipcMain } from 'electron'
import * as repliesRepo from '../database/repositories/replies.repo'
import * as pollerService from '../services/poller.service'

export function registerInboxHandlers(): void {
  ipcMain.handle('replies:getAll', (_e, classification?: string) =>
    repliesRepo.getAllReplies(classification)
  )
  ipcMain.handle('replies:getById', (_e, id: string) => repliesRepo.getReplyById(id))
  ipcMain.handle('replies:markRead', (_e, id: string) => repliesRepo.markReplyRead(id))
  ipcMain.handle('replies:getUnreadCount', () => repliesRepo.getUnreadReplyCount())
  ipcMain.handle('inbox:isPolling', () => pollerService.isActive())
  ipcMain.handle('inbox:startPolling', () => pollerService.startPolling())
  ipcMain.handle('inbox:stopPolling', () => pollerService.stopPolling())
}
