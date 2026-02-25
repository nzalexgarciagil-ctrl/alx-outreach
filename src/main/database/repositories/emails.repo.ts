import { getDb } from '../../services/database.service'
import { v4 as uuid } from 'uuid'

export interface Email {
  id: string
  campaign_id: string
  lead_id: string
  template_id: string | null
  subject: string
  body: string
  personalization_notes: string | null
  status: string
  gmail_message_id: string | null
  gmail_thread_id: string | null
  sent_at: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface EmailWithLead extends Email {
  lead_first_name: string
  lead_last_name: string | null
  lead_email: string
  lead_company: string | null
}

export function getEmailsByCampaign(campaignId: string, status?: string): EmailWithLead[] {
  let query = `SELECT e.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
    l.email as lead_email, l.company as lead_company
    FROM emails e JOIN leads l ON e.lead_id = l.id
    WHERE e.campaign_id = ?`
  const params: unknown[] = [campaignId]
  if (status) {
    query += ' AND e.status = ?'
    params.push(status)
  }
  query += ' ORDER BY e.created_at DESC'
  return getDb().prepare(query).all(...params) as EmailWithLead[]
}

export function getEmailById(id: string): EmailWithLead | undefined {
  return getDb()
    .prepare(
      `SELECT e.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
       l.email as lead_email, l.company as lead_company
       FROM emails e JOIN leads l ON e.lead_id = l.id
       WHERE e.id = ?`
    )
    .get(id) as EmailWithLead | undefined
}

export function createEmail(data: {
  campaign_id: string
  lead_id: string
  template_id?: string
  subject: string
  body: string
  personalization_notes?: string
  status?: string
}): Email {
  const id = uuid()
  getDb()
    .prepare(
      `INSERT INTO emails (id, campaign_id, lead_id, template_id, subject, body, personalization_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.campaign_id,
      data.lead_id,
      data.template_id || null,
      data.subject,
      data.body,
      data.personalization_notes || null,
      data.status || 'draft'
    )
  return getDb().prepare('SELECT * FROM emails WHERE id = ?').get(id) as Email
}

export function createEmailsBatch(
  emails: {
    campaign_id: string
    lead_id: string
    template_id?: string
    subject: string
    body: string
    personalization_notes?: string
  }[]
): number {
  const stmt = getDb().prepare(
    `INSERT INTO emails (id, campaign_id, lead_id, template_id, subject, body, personalization_notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`
  )
  const insertMany = getDb().transaction((items: typeof emails) => {
    for (const e of items) {
      stmt.run(uuid(), e.campaign_id, e.lead_id, e.template_id || null, e.subject, e.body, e.personalization_notes || null)
    }
    return items.length
  })
  return insertMany(emails)
}

export function updateEmail(
  id: string,
  data: Partial<Pick<Email, 'subject' | 'body' | 'status' | 'gmail_message_id' | 'gmail_thread_id' | 'sent_at' | 'error' | 'personalization_notes'>>
): Email | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  const allowed = ['subject', 'body', 'status', 'gmail_message_id', 'gmail_thread_id', 'sent_at', 'error', 'personalization_notes']
  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = ?`)
      values.push((data as Record<string, unknown>)[key] ?? null)
    }
  }
  if (fields.length === 0) return getEmailById(id)
  fields.push("updated_at = datetime('now')")
  values.push(id)
  getDb().prepare(`UPDATE emails SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getDb().prepare('SELECT * FROM emails WHERE id = ?').get(id) as Email
}

export function updateEmailStatusBatch(ids: string[], status: string): void {
  const placeholders = ids.map(() => '?').join(',')
  getDb()
    .prepare(`UPDATE emails SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`)
    .run(status, ...ids)
}

export function getNextQueuedEmail(): EmailWithLead | undefined {
  return getDb()
    .prepare(
      `SELECT e.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
       l.email as lead_email, l.company as lead_company
       FROM emails e JOIN leads l ON e.lead_id = l.id
       WHERE e.status = 'queued'
       ORDER BY e.created_at ASC LIMIT 1`
    )
    .get() as EmailWithLead | undefined
}

export function getQueuedEmailCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as count FROM emails WHERE status = 'queued'")
    .get() as { count: number }
  return row.count
}

export function getEmailByThreadId(threadId: string): Email | undefined {
  return getDb()
    .prepare('SELECT * FROM emails WHERE gmail_thread_id = ?')
    .get(threadId) as Email | undefined
}

export function deleteEmail(id: string): void {
  getDb().prepare('DELETE FROM emails WHERE id = ?').run(id)
}

export function getEmailStats(): {
  total: number
  draft: number
  approved: number
  queued: number
  sent: number
  failed: number
} {
  const rows = getDb()
    .prepare("SELECT status, COUNT(*) as count FROM emails GROUP BY status")
    .all() as { status: string; count: number }[]
  const stats = { total: 0, draft: 0, approved: 0, queued: 0, sent: 0, failed: 0 }
  for (const row of rows) {
    stats.total += row.count
    if (row.status in stats) {
      stats[row.status as keyof typeof stats] = row.count
    }
  }
  return stats
}
