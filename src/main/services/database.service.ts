import Database from 'better-sqlite3'
import { getDbPath } from '../utils/paths'
import { SCHEMA } from '../database/schema'
import { logger } from '../utils/logger'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function initDatabase(): void {
  const dbPath = getDbPath()
  logger.info('Initializing database at:', dbPath)

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)

  logger.info('Database initialized successfully')
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    logger.info('Database closed')
  }
}
