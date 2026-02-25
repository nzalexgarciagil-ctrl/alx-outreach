import { getDb } from '../../services/database.service'
import { v4 as uuid } from 'uuid'

export interface Campaign {
  id: string
  name: string
  niche_id: string | null
  template_id: string | null
  status: string
  total_leads: number
  total_sent: number
  total_replied: number
  total_interested: number
  created_at: string
  updated_at: string
}

export interface CampaignWithDetails extends Campaign {
  niche_name: string | null
  template_name: string | null
}

export function getAllCampaigns(): CampaignWithDetails[] {
  return getDb()
    .prepare(
      `SELECT c.*, n.name as niche_name, t.name as template_name
       FROM campaigns c
       LEFT JOIN niches n ON c.niche_id = n.id
       LEFT JOIN templates t ON c.template_id = t.id
       ORDER BY c.created_at DESC`
    )
    .all() as CampaignWithDetails[]
}

export function getCampaignById(id: string): CampaignWithDetails | undefined {
  return getDb()
    .prepare(
      `SELECT c.*, n.name as niche_name, t.name as template_name
       FROM campaigns c
       LEFT JOIN niches n ON c.niche_id = n.id
       LEFT JOIN templates t ON c.template_id = t.id
       WHERE c.id = ?`
    )
    .get(id) as CampaignWithDetails | undefined
}

export function createCampaign(data: {
  name: string
  niche_id?: string
  template_id?: string
}): Campaign {
  const id = uuid()
  getDb()
    .prepare('INSERT INTO campaigns (id, name, niche_id, template_id) VALUES (?, ?, ?, ?)')
    .run(id, data.name, data.niche_id || null, data.template_id || null)
  return getDb().prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Campaign
}

export function updateCampaign(
  id: string,
  data: Partial<Pick<Campaign, 'name' | 'niche_id' | 'template_id' | 'status' | 'total_leads' | 'total_sent' | 'total_replied' | 'total_interested'>>
): Campaign | undefined {
  const fields: string[] = []
  const values: unknown[] = []
  const allowed = ['name', 'niche_id', 'template_id', 'status', 'total_leads', 'total_sent', 'total_replied', 'total_interested']
  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = ?`)
      values.push((data as Record<string, unknown>)[key] ?? null)
    }
  }
  if (fields.length === 0) return getCampaignById(id)
  fields.push("updated_at = datetime('now')")
  values.push(id)
  getDb().prepare(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getCampaignById(id)
}

export function deleteCampaign(id: string): void {
  getDb().prepare('DELETE FROM campaigns WHERE id = ?').run(id)
}

export function addLeadsToCampaign(campaignId: string, leadIds: string[]): void {
  const stmt = getDb().prepare(
    'INSERT OR IGNORE INTO campaign_leads (campaign_id, lead_id) VALUES (?, ?)'
  )
  const insertMany = getDb().transaction((ids: string[]) => {
    for (const leadId of ids) {
      stmt.run(campaignId, leadId)
    }
  })
  insertMany(leadIds)
  // Update total_leads count
  const count = getDb()
    .prepare('SELECT COUNT(*) as count FROM campaign_leads WHERE campaign_id = ?')
    .get(campaignId) as { count: number }
  getDb()
    .prepare('UPDATE campaigns SET total_leads = ? WHERE id = ?')
    .run(count.count, campaignId)
}

export function getCampaignLeadIds(campaignId: string): string[] {
  const rows = getDb()
    .prepare('SELECT lead_id FROM campaign_leads WHERE campaign_id = ?')
    .all(campaignId) as { lead_id: string }[]
  return rows.map((r) => r.lead_id)
}

export function removeleadsFromCampaign(campaignId: string, leadIds: string[]): void {
  const placeholders = leadIds.map(() => '?').join(',')
  getDb()
    .prepare(`DELETE FROM campaign_leads WHERE campaign_id = ? AND lead_id IN (${placeholders})`)
    .run(campaignId, ...leadIds)
}
