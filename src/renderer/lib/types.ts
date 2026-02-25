export interface Niche {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

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
  niche_name?: string | null
  niche_color?: string | null
}

export interface Template {
  id: string
  niche_id: string | null
  name: string
  subject: string
  body: string
  created_at: string
  updated_at: string
  niche_name?: string | null
  niche_color?: string | null
}

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
  niche_name?: string | null
  template_name?: string | null
}

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
  lead_first_name?: string
  lead_last_name?: string | null
  lead_email?: string
  lead_company?: string | null
}

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
  lead_first_name?: string
  lead_last_name?: string | null
  lead_email?: string
  lead_company?: string | null
  campaign_name?: string | null
}

export interface QueueStatus {
  state: 'idle' | 'running' | 'paused'
  queuedCount: number
  todaySent: number
  dailyLimit: number
  currentDelay: number
}

export interface DashboardStats {
  totalLeads: number
  totalCampaigns: number
  totalSent: number
  totalReplies: number
  unreadReplies: number
  replyStats: Record<string, number>
  emailStats: {
    total: number
    draft: number
    approved: number
    queued: number
    sent: number
    failed: number
  }
}
