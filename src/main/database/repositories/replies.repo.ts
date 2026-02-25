import { getDb } from '../../services/database.service'
import { v4 as uuid } from 'uuid'

export interface Reply {
  id: string
  email_id: string
  lead_id: string
  gmail_message_id: string | null
  gmail_thread_id: string | null
  from_email: string | null
  subject: string | null
  body: string | null
  snippet: string | null
  classification: string | null
  classification_confidence: number | null
  classification_reasoning: string | null
  is_read: number
  received_at: string
  created_at: string
}

export interface ReplyWithDetails extends Reply {
  lead_first_name: string
  lead_last_name: string | null
  lead_email: string
  lead_company: string | null
  campaign_name: string | null
}

export function getAllReplies(classification?: string): ReplyWithDetails[] {
  let query = `SELECT r.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
    l.email as lead_email, l.company as lead_company, c.name as campaign_name
    FROM replies r
    JOIN leads l ON r.lead_id = l.id
    JOIN emails e ON r.email_id = e.id
    JOIN campaigns c ON e.campaign_id = c.id`
  const params: unknown[] = []
  if (classification) {
    query += ' WHERE r.classification = ?'
    params.push(classification)
  }
  query += ' ORDER BY r.received_at DESC'
  return getDb().prepare(query).all(...params) as ReplyWithDetails[]
}

export function getReplyById(id: string): ReplyWithDetails | undefined {
  return getDb()
    .prepare(
      `SELECT r.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
       l.email as lead_email, l.company as lead_company, c.name as campaign_name
       FROM replies r
       JOIN leads l ON r.lead_id = l.id
       JOIN emails e ON r.email_id = e.id
       JOIN campaigns c ON e.campaign_id = c.id
       WHERE r.id = ?`
    )
    .get(id) as ReplyWithDetails | undefined
}

export function createReply(data: {
  email_id: string
  lead_id: string
  gmail_message_id?: string
  gmail_thread_id?: string
  from_email?: string
  subject?: string
  body?: string
  snippet?: string
  received_at?: string
}): Reply {
  const id = uuid()
  getDb()
    .prepare(
      `INSERT INTO replies (id, email_id, lead_id, gmail_message_id, gmail_thread_id, from_email, subject, body, snippet, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.email_id,
      data.lead_id,
      data.gmail_message_id || null,
      data.gmail_thread_id || null,
      data.from_email || null,
      data.subject || null,
      data.body || null,
      data.snippet || null,
      data.received_at || new Date().toISOString()
    )
  return getDb().prepare('SELECT * FROM replies WHERE id = ?').get(id) as Reply
}

export function updateReplyClassification(
  id: string,
  classification: string,
  confidence: number,
  reasoning: string
): void {
  getDb()
    .prepare(
      'UPDATE replies SET classification = ?, classification_confidence = ?, classification_reasoning = ? WHERE id = ?'
    )
    .run(classification, confidence, reasoning, id)
}

export function markReplyRead(id: string): void {
  getDb().prepare('UPDATE replies SET is_read = 1 WHERE id = ?').run(id)
}

export function getUnreadReplyCount(): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) as count FROM replies WHERE is_read = 0')
    .get() as { count: number }
  return row.count
}

export function getReplyStats(): Record<string, number> {
  const rows = getDb()
    .prepare('SELECT classification, COUNT(*) as count FROM replies WHERE classification IS NOT NULL GROUP BY classification')
    .all() as { classification: string; count: number }[]
  const stats: Record<string, number> = {}
  for (const row of rows) {
    stats[row.classification] = row.count
  }
  return stats
}

export function replyExistsByGmailId(gmailMessageId: string): boolean {
  const row = getDb()
    .prepare('SELECT 1 FROM replies WHERE gmail_message_id = ? LIMIT 1')
    .get(gmailMessageId)
  return !!row
}
