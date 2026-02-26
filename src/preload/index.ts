import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    remove: (key: string) => ipcRenderer.invoke('settings:remove', key),
    getDailyLimit: () => ipcRenderer.invoke('settings:getDailyLimit'),
    getPollInterval: () => ipcRenderer.invoke('settings:getPollInterval')
  },

  // Leads
  leads: {
    getAll: () => ipcRenderer.invoke('leads:getAll'),
    getById: (id: string) => ipcRenderer.invoke('leads:getById', id),
    getByNiche: (nicheId: string) => ipcRenderer.invoke('leads:getByNiche', nicheId),
    create: (data: unknown) => ipcRenderer.invoke('leads:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('leads:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('leads:delete', id),
    deleteBatch: (ids: string[]) => ipcRenderer.invoke('leads:deleteBatch', ids),
    getCount: () => ipcRenderer.invoke('leads:getCount'),
    importCSV: (nicheId?: string) => ipcRenderer.invoke('leads:importCSV', nicheId)
  },

  // Niches
  niches: {
    getAll: () => ipcRenderer.invoke('niches:getAll'),
    create: (data: unknown) => ipcRenderer.invoke('niches:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('niches:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('niches:delete', id)
  },

  // Templates
  templates: {
    getAll: () => ipcRenderer.invoke('templates:getAll'),
    getById: (id: string) => ipcRenderer.invoke('templates:getById', id),
    getByNiche: (nicheId: string) => ipcRenderer.invoke('templates:getByNiche', nicheId),
    create: (data: unknown) => ipcRenderer.invoke('templates:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('templates:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('templates:delete', id),
    render: (template: string, vars: unknown) => ipcRenderer.invoke('templates:render', template, vars),
    extractVars: (template: string) => ipcRenderer.invoke('templates:extractVars', template),
    getSampleVars: () => ipcRenderer.invoke('templates:getSampleVars')
  },

  // Campaigns
  campaigns: {
    getAll: () => ipcRenderer.invoke('campaigns:getAll'),
    getById: (id: string) => ipcRenderer.invoke('campaigns:getById', id),
    create: (data: unknown) => ipcRenderer.invoke('campaigns:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('campaigns:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('campaigns:delete', id),
    addLeads: (campaignId: string, leadIds: string[]) =>
      ipcRenderer.invoke('campaigns:addLeads', campaignId, leadIds),
    getLeadIds: (campaignId: string) => ipcRenderer.invoke('campaigns:getLeadIds', campaignId),
    generateDrafts: (campaignId: string, extraContext?: string, workerCount?: number) => ipcRenderer.invoke('campaigns:generateDrafts', campaignId, extraContext, workerCount),
    generateVariants: (campaignId: string, feedback?: string) => ipcRenderer.invoke('campaigns:generateVariants', campaignId, feedback),
    createDraftsFromVariants: (campaignId: string, variants: unknown[]) => ipcRenderer.invoke('campaigns:createDraftsFromVariants', campaignId, variants),
    preflight: (campaignId: string) => ipcRenderer.invoke('campaigns:preflight', campaignId)
  },

  // Emails
  emails: {
    getByCampaign: (campaignId: string, status?: string) =>
      ipcRenderer.invoke('emails:getByCampaign', campaignId, status),
    getById: (id: string) => ipcRenderer.invoke('emails:getById', id),
    update: (id: string, data: unknown) => ipcRenderer.invoke('emails:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('emails:delete', id),
    approve: (id: string) => ipcRenderer.invoke('emails:approve', id),
    reject: (id: string) => ipcRenderer.invoke('emails:reject', id),
    regenerate: (id: string, feedback: string) => ipcRenderer.invoke('emails:regenerate', id, feedback),
    approveBatch: (ids: string[]) => ipcRenderer.invoke('emails:approveBatch', ids),
    queueApproved: (campaignId: string) => ipcRenderer.invoke('emails:queueApproved', campaignId),
    getStats: () => ipcRenderer.invoke('emails:getStats'),
    getQueuedCount: () => ipcRenderer.invoke('emails:getQueuedCount')
  },

  // Queue
  queue: {
    getStatus: () => ipcRenderer.invoke('queue:getStatus'),
    start: () => ipcRenderer.invoke('queue:start'),
    pause: () => ipcRenderer.invoke('queue:pause'),
    resume: () => ipcRenderer.invoke('queue:resume'),
    stop: () => ipcRenderer.invoke('queue:stop')
  },

  // Auth
  auth: {
    gmailConnect: () => ipcRenderer.invoke('auth:gmailConnect'),
    gmailDisconnect: () => ipcRenderer.invoke('auth:gmailDisconnect'),
    gmailStatus: () => ipcRenderer.invoke('auth:gmailStatus')
  },

  // Validation
  validation: {
    validateEmail: (email: string) => ipcRenderer.invoke('validation:validateEmail', email),
    validateLeads: (leadIds: string[]) => ipcRenderer.invoke('validation:validateLeads', leadIds)
  },

  // Dashboard
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
    getCampaignStats: () => ipcRenderer.invoke('dashboard:getCampaignStats'),
    getSendHistory: (days?: number) => ipcRenderer.invoke('dashboard:getSendHistory', days),
    getRecentActivity: () => ipcRenderer.invoke('dashboard:getRecentActivity')
  },

  // Replies / Inbox
  replies: {
    getAll: (classification?: string) => ipcRenderer.invoke('replies:getAll', classification),
    getById: (id: string) => ipcRenderer.invoke('replies:getById', id),
    markRead: (id: string) => ipcRenderer.invoke('replies:markRead', id),
    getUnreadCount: () => ipcRenderer.invoke('replies:getUnreadCount')
  },

  // Portfolio Examples
  portfolio: {
    getAll: () => ipcRenderer.invoke('portfolio:getAll'),
    create: (data: unknown) => ipcRenderer.invoke('portfolio:create', data),
    update: (id: string, data: unknown) => ipcRenderer.invoke('portfolio:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('portfolio:delete', id),
    analyse: (examples: unknown, userReply?: string, previousAnalysis?: string) =>
      ipcRenderer.invoke('portfolio:analyse', examples, userReply, previousAnalysis)
  },

  // Updater
  updater: {
    install: () => ipcRenderer.send('updater:install')
  },

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'queue:state-change', 'queue:sending', 'queue:sent', 'queue:send-failed',
      'queue:waiting', 'queue:countdown', 'queue:completed', 'queue:daily-limit-reached',
      'queue:rate-limited', 'queue:error',
      'inbox:new-replies',
      'campaigns:draft-progress',
      'validation:progress',
      'updater:update-available', 'updater:download-progress', 'updater:update-downloaded'
    ]
    if (validChannels.includes(channel)) {
      const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    }
    return () => {}
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
