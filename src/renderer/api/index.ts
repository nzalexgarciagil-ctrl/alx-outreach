declare global {
  interface Window {
    electronAPI: {
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<void>
        getAll: () => Promise<Record<string, string>>
        remove: (key: string) => Promise<void>
        getDailyLimit: () => Promise<number>
        getPollInterval: () => Promise<number>
      }
      leads: {
        getAll: () => Promise<unknown[]>
        getById: (id: string) => Promise<unknown>
        getByNiche: (nicheId: string) => Promise<unknown[]>
        create: (data: unknown) => Promise<unknown>
        update: (id: string, data: unknown) => Promise<unknown>
        delete: (id: string) => Promise<void>
        deleteBatch: (ids: string[]) => Promise<void>
        getCount: () => Promise<number>
        importCSV: (nicheId?: string) => Promise<{
          imported: number
          errors: string[]
          canceled?: boolean
          total?: number
        }>
      }
      niches: {
        getAll: () => Promise<unknown[]>
        create: (data: unknown) => Promise<unknown>
        update: (id: string, data: unknown) => Promise<unknown>
        delete: (id: string) => Promise<void>
      }
      templates: {
        getAll: () => Promise<unknown[]>
        getById: (id: string) => Promise<unknown>
        getByNiche: (nicheId: string) => Promise<unknown[]>
        create: (data: unknown) => Promise<unknown>
        update: (id: string, data: unknown) => Promise<unknown>
        delete: (id: string) => Promise<void>
        render: (template: string, vars: unknown) => Promise<string>
        extractVars: (template: string) => Promise<string[]>
        getSampleVars: () => Promise<Record<string, string>>
      }
      campaigns: {
        getAll: () => Promise<unknown[]>
        getById: (id: string) => Promise<unknown>
        create: (data: unknown) => Promise<unknown>
        update: (id: string, data: unknown) => Promise<unknown>
        delete: (id: string) => Promise<void>
        addLeads: (campaignId: string, leadIds: string[]) => Promise<void>
        getLeadIds: (campaignId: string) => Promise<string[]>
        generateDrafts: (campaignId: string) => Promise<{
          generated: number
          total: number
          errors: string[]
        }>
      }
      emails: {
        getByCampaign: (campaignId: string, status?: string) => Promise<unknown[]>
        getById: (id: string) => Promise<unknown>
        update: (id: string, data: unknown) => Promise<unknown>
        delete: (id: string) => Promise<void>
        approve: (id: string) => Promise<unknown>
        reject: (id: string) => Promise<unknown>
        approveBatch: (ids: string[]) => Promise<void>
        queueApproved: (campaignId: string) => Promise<number>
        getStats: () => Promise<unknown>
        getQueuedCount: () => Promise<number>
      }
      queue: {
        getStatus: () => Promise<unknown>
        start: () => Promise<void>
        pause: () => Promise<void>
        resume: () => Promise<void>
        stop: () => Promise<void>
      }
      auth: {
        gmailConnect: () => Promise<{ email: string }>
        gmailDisconnect: () => Promise<void>
        gmailStatus: () => Promise<{ connected: boolean; email: string | null }>
      }
      validation: {
        validateEmail: (email: string) => Promise<{ email: string; valid: boolean; error?: string }>
        validateLeads: (leadIds: string[]) => Promise<unknown[]>
      }
      dashboard: {
        getStats: () => Promise<unknown>
        getCampaignStats: () => Promise<unknown[]>
        getSendHistory: (days?: number) => Promise<unknown[]>
        getRecentActivity: () => Promise<unknown>
      }
      replies: {
        getAll: (classification?: string) => Promise<unknown[]>
        getById: (id: string) => Promise<unknown>
        markRead: (id: string) => Promise<void>
        getUnreadCount: () => Promise<number>
      }
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void
    }
  }
}

export const api = window.electronAPI
