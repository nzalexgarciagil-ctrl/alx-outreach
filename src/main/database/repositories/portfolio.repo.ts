import { getDb } from '../../services/database.service'
import { v4 as uuid } from 'uuid'

export interface PortfolioExample {
  id: string
  title: string
  url: string
  description: string | null
  sort_order: number
  created_at: string
}

export function getAllExamples(): PortfolioExample[] {
  return getDb()
    .prepare('SELECT * FROM portfolio_examples ORDER BY sort_order ASC, created_at ASC')
    .all() as PortfolioExample[]
}

export function createExample(data: {
  title: string
  url: string
  description?: string
  sort_order?: number
}): PortfolioExample {
  const id = uuid()
  getDb()
    .prepare(
      'INSERT INTO portfolio_examples (id, title, url, description, sort_order) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, data.title, data.url, data.description || null, data.sort_order ?? 0)
  return getDb()
    .prepare('SELECT * FROM portfolio_examples WHERE id = ?')
    .get(id) as PortfolioExample
}

export function updateExample(
  id: string,
  data: Partial<{ title: string; url: string; description: string; sort_order: number }>
): void {
  const fields = Object.keys(data)
    .map((k) => `${k} = ?`)
    .join(', ')
  const values = [...Object.values(data), id]
  getDb()
    .prepare(`UPDATE portfolio_examples SET ${fields} WHERE id = ?`)
    .run(...values)
}

export function deleteExample(id: string): void {
  getDb().prepare('DELETE FROM portfolio_examples WHERE id = ?').run(id)
}
