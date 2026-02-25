import { ipcMain } from 'electron'
import * as gmailService from '../services/gmail.service'

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:gmailConnect', () => gmailService.startAuthFlow())
  ipcMain.handle('auth:gmailDisconnect', () => gmailService.disconnect())
  ipcMain.handle('auth:gmailStatus', () => ({
    connected: gmailService.isConnected(),
    email: gmailService.getConnectedEmail()
  }))
}
