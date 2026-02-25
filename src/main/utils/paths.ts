import { app } from 'electron'
import { join } from 'path'

export const getUserDataPath = (): string => app.getPath('userData')
export const getDbPath = (): string => join(getUserDataPath(), 'alx-outreach.db')
export const getLogPath = (): string => join(getUserDataPath(), 'logs')
