import { getDb } from '../../services/database.service'
import { v4 as uuid } from 'uuid'

export interface Template {
  id: string
  niche_id: string | null
  name: string
  subject: string
  body: string
  created_at: string
  updated_at: string
}

export interface TemplateWithNiche extends Template {
  niche_name: string | null
  niche_color: string | null
}

export function getAllTemplates(): TemplateWithNiche[] {
  return getDb()
    .prepare(
      `SELECT t.*, n.name as niche_name, n.color as niche_color
       FROM templates t LEFT JOIN niches n ON t.niche_id = n.id
       ORDER BY n.name, t.name`
    )
    .all() as TemplateWithNiche[]
}

export function getTemplateById(id: string): TemplateWithNiche | undefined {
  return getDb()
    .prepare(
      `SELECT t.*, n.name as niche_name, n.color as niche_color
       FROM templates t LEFT JOIN niches n ON t.niche_id = n.id
       WHERE t.id = ?`
    )
    .get(id) as TemplateWithNiche | undefined
}

export function getTemplatesByNiche(nicheId: string): TemplateWithNiche[] {
  return getDb()
    .prepare(
      `SELECT t.*, n.name as niche_name, n.color as niche_color
       FROM templates t LEFT JOIN niches n ON t.niche_id = n.id
       WHERE t.niche_id = ? ORDER BY t.name`
    )
    .all(nicheId) as TemplateWithNiche[]
}

export function createTemplate(data: {
  name: string
  subject: string
  body: string
  niche_id?: string
}): Template {
  const id = uuid()
  getDb()
    .prepare(
      'INSERT INTO templates (id, name, subject, body, niche_id) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, data.name, data.subject, data.body, data.niche_id || null)
  return getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template
}

export function updateTemplate(
  id: string,
  data: { name?: string; subject?: string; body?: string; niche_id?: string }
): Template | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.subject !== undefined) { fields.push('subject = ?'); values.push(data.subject) }
  if (data.body !== undefined) { fields.push('body = ?'); values.push(data.body) }
  if (data.niche_id !== undefined) { fields.push('niche_id = ?'); values.push(data.niche_id || null) }
  if (fields.length === 0) return getTemplateById(id)
  fields.push("updated_at = datetime('now')")
  values.push(id)
  getDb().prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template
}

export function deleteTemplate(id: string): void {
  getDb().prepare('DELETE FROM templates WHERE id = ?').run(id)
}
