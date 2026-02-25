import { getDb } from '../../services/database.service'
import { v4 as uuid } from 'uuid'

export interface Lead {
  id: string
  niche_id: string | null
  first_name: string
  last_name: string | null
  email: string
  company: string | null
  website: string | null
  phone: string | null
  notes: string | null
  email_valid: number
  email_validation_error: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface LeadWithNiche extends Lead {
  niche_name: string | null
  niche_color: string | null
}

export function getAllLeads(): LeadWithNiche[] {
  return getDb()
    .prepare(
      `SELECT l.*, n.name as niche_name, n.color as niche_color
       FROM leads l LEFT JOIN niches n ON l.niche_id = n.id
       ORDER BY l.created_at DESC`
    )
    .all() as LeadWithNiche[]
}

export function getLeadById(id: string): LeadWithNiche | undefined {
  return getDb()
    .prepare(
      `SELECT l.*, n.name as niche_name, n.color as niche_color
       FROM leads l LEFT JOIN niches n ON l.niche_id = n.id
       WHERE l.id = ?`
    )
    .get(id) as LeadWithNiche | undefined
}

export function getLeadsByNiche(nicheId: string): LeadWithNiche[] {
  return getDb()
    .prepare(
      `SELECT l.*, n.name as niche_name, n.color as niche_color
       FROM leads l LEFT JOIN niches n ON l.niche_id = n.id
       WHERE l.niche_id = ? ORDER BY l.created_at DESC`
    )
    .all(nicheId) as LeadWithNiche[]
}

export function createLead(data: {
  first_name: string
  last_name?: string
  email: string
  company?: string
  website?: string
  phone?: string
  notes?: string
  niche_id?: string
}): Lead {
  const id = uuid()
  getDb()
    .prepare(
      `INSERT INTO leads (id, first_name, last_name, email, company, website, phone, notes, niche_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      data.first_name,
      data.last_name || null,
      data.email,
      data.company || null,
      data.website || null,
      data.phone || null,
      data.notes || null,
      data.niche_id || null
    )
  return getDb().prepare('SELECT * FROM leads WHERE id = ?').get(id) as Lead
}

export function createLeadsBatch(
  leads: {
    first_name: string
    last_name?: string
    email: string
    company?: string
    website?: string
    phone?: string
    notes?: string
    niche_id?: string
  }[]
): number {
  const stmt = getDb().prepare(
    `INSERT OR IGNORE INTO leads (id, first_name, last_name, email, company, website, phone, notes, niche_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertMany = getDb().transaction((items: typeof leads) => {
    let count = 0
    for (const data of items) {
      const result = stmt.run(
        uuid(),
        data.first_name,
        data.last_name || null,
        data.email,
        data.company || null,
        data.website || null,
        data.phone || null,
        data.notes || null,
        data.niche_id || null
      )
      if (result.changes > 0) count++
    }
    return count
  })
  return insertMany(leads)
}

export function updateLead(id: string, data: Partial<Omit<Lead, 'id' | 'created_at'>>): Lead | undefined {
  const fields: string[] = []
  const values: unknown[] = []

  const allowedFields = [
    'first_name', 'last_name', 'email', 'company', 'website',
    'phone', 'notes', 'niche_id', 'email_valid', 'email_validation_error', 'status'
  ]

  for (const key of allowedFields) {
    if (key in data) {
      fields.push(`${key} = ?`)
      values.push((data as Record<string, unknown>)[key] ?? null)
    }
  }

  if (fields.length === 0) return getDb().prepare('SELECT * FROM leads WHERE id = ?').get(id) as Lead
  fields.push("updated_at = datetime('now')")
  values.push(id)

  getDb()
    .prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values)

  return getDb().prepare('SELECT * FROM leads WHERE id = ?').get(id) as Lead
}

export function deleteLead(id: string): void {
  getDb().prepare('DELETE FROM leads WHERE id = ?').run(id)
}

export function deleteLeadsBatch(ids: string[]): void {
  const placeholders = ids.map(() => '?').join(',')
  getDb().prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(...ids)
}

export function getLeadCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number }
  return row.count
}
