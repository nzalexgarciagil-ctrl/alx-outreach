import { app, BrowserWindow, ipcMain } from 'electron'
import { createMainWindow } from './window'
import { registerAllHandlers } from './ipc'
import { initDatabase, closeDatabase } from './services/database.service'
import * as pollerService from './services/poller.service'
import { initUpdater, installUpdate } from './services/updater.service'
import { logger } from './utils/logger'

let mainWindow: BrowserWindow | null = null

app.whenReady().then(() => {
  logger.info('ALX Outreach starting...')

  initDatabase()
  registerAllHandlers()

  mainWindow = createMainWindow()

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Start inbox polling if Gmail is connected
  pollerService.startPolling()

  // Auto-updater
  initUpdater(mainWindow)
  ipcMain.on('updater:install', () => installUpdate())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  pollerService.stopPolling()
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
