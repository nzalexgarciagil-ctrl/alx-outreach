import { getDb } from '../../services/database.service'
import { v4 as uuid } from 'uuid'

export interface Niche {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

export function getAllNiches(): Niche[] {
  return getDb().prepare('SELECT * FROM niches ORDER BY name').all() as Niche[]
}

export function getNicheById(id: string): Niche | undefined {
  return getDb().prepare('SELECT * FROM niches WHERE id = ?').get(id) as Niche | undefined
}

export function createNiche(data: { name: string; description?: string; color?: string }): Niche {
  const id = uuid()
  getDb()
    .prepare('INSERT INTO niches (id, name, description, color) VALUES (?, ?, ?, ?)')
    .run(id, data.name, data.description || null, data.color || '#3b82f6')
  return getNicheById(id)!
}

export function updateNiche(
  id: string,
  data: { name?: string; description?: string; color?: string }
): Niche | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  if (data.name !== undefined) {
    fields.push('name = ?')
    values.push(data.name)
  }
  if (data.description !== undefined) {
    fields.push('description = ?')
    values.push(data.description)
  }
  if (data.color !== undefined) {
    fields.push('color = ?')
    values.push(data.color)
  }
  if (fields.length === 0) return getNicheById(id)
  fields.push("updated_at = datetime('now')")
  values.push(id)
  getDb()
    .prepare(`UPDATE niches SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values)
  return getNicheById(id)
}

export function deleteNiche(id: string): void {
  getDb().prepare('DELETE FROM niches WHERE id = ?').run(id)
}
