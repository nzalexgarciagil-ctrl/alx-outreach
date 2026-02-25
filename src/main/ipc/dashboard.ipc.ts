import { ipcMain } from 'electron'
import { getDb } from '../services/database.service'
import * as leadsRepo from '../database/repositories/leads.repo'
import * as emailsRepo from '../database/repositories/emails.repo'
import * as repliesRepo from '../database/repositories/replies.repo'
import * as dailySendRepo from '../database/repositories/daily-send.repo'

export function registerDashboardHandlers(): void {
  ipcMain.handle('dashboard:getStats', () => {
    const leadCount = leadsRepo.getLeadCount()
    const emailStats = emailsRepo.getEmailStats()
    const unreadReplies = repliesRepo.getUnreadReplyCount()
    const replyStats = repliesRepo.getReplyStats()

    const campaignCount = (
      getDb().prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }
    ).count

    return {
      totalLeads: leadCount,
      totalCampaigns: campaignCount,
      totalSent: emailStats.sent,
      totalReplies: Object.values(replyStats).reduce((a, b) => a + b, 0),
      unreadReplies,
      replyStats,
      emailStats
    }
  })

  ipcMain.handle('dashboard:getCampaignStats', () => {
    return getDb()
      .prepare(
        `SELECT c.name, c.total_sent, c.total_replied, c.total_interested
         FROM campaigns c ORDER BY c.created_at DESC LIMIT 10`
      )
      .all()
  })

  ipcMain.handle('dashboard:getSendHistory', (_e, days?: number) =>
    dailySendRepo.getDailySendHistory(days || 30)
  )

  ipcMain.handle('dashboard:getRecentActivity', () => {
    const recentEmails = getDb()
      .prepare(
        `SELECT e.id, e.subject, e.status, e.sent_at, l.first_name, l.email as lead_email
         FROM emails e JOIN leads l ON e.lead_id = l.id
         WHERE e.status = 'sent'
         ORDER BY e.sent_at DESC LIMIT 10`
      )
      .all()

    const recentReplies = getDb()
      .prepare(
        `SELECT r.id, r.classification, r.received_at, r.snippet,
                l.first_name, l.email as lead_email
         FROM replies r JOIN leads l ON r.lead_id = l.id
         ORDER BY r.received_at DESC LIMIT 10`
      )
      .all()

    return { recentEmails, recentReplies }
  })
}
