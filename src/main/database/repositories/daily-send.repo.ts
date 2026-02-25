import { getDb } from '../../services/database.service'

export function getTodaySendCount(): number {
  const today = new Date().toISOString().split('T')[0]
  const row = getDb()
    .prepare('SELECT count FROM daily_send_log WHERE date = ?')
    .get(today) as { count: number } | undefined
  return row?.count ?? 0
}

export function incrementTodaySendCount(): void {
  const today = new Date().toISOString().split('T')[0]
  getDb()
    .prepare(
      `INSERT INTO daily_send_log (date, count) VALUES (?, 1)
       ON CONFLICT(date) DO UPDATE SET count = count + 1`
    )
    .run(today)
}

export function getDailySendHistory(days: number = 30): { date: string; count: number }[] {
  return getDb()
    .prepare(
      `SELECT date, count FROM daily_send_log
       ORDER BY date DESC LIMIT ?`
    )
    .all(days) as { date: string; count: number }[]
}
