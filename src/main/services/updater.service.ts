import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import { logger } from '../utils/logger'

export function initUpdater(mainWindow: BrowserWindow): void {
  // Don't run in dev — no built artifacts to update
  if (!process.env.ELECTRON_RENDERER_URL === undefined || process.env.NODE_ENV === 'development') {
    logger.info('Auto-updater disabled in development')
    return
  }

  autoUpdater.logger = {
    info: (msg) => logger.info(`[updater] ${msg}`),
    warn: (msg) => logger.warn(`[updater] ${msg}`),
    error: (msg) => logger.error(`[updater] ${msg}`),
    debug: () => {}
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    logger.info(`Update available: ${info.version}`)
    mainWindow.webContents.send('updater:update-available', { version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    logger.info('App is up to date')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('updater:download-progress', {
      percent: Math.round(progress.percent)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`Update downloaded: ${info.version}`)
    mainWindow.webContents.send('updater:update-downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    logger.error('Auto-updater error:', err.message)
  })

  // Check on startup, then every 4 hours
  autoUpdater.checkForUpdates().catch(() => {})
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000)
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
