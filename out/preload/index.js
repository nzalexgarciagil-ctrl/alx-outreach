"use strict";
const electron = require("electron");
const api = {
  // Settings
  settings: {
    get: (key) => electron.ipcRenderer.invoke("settings:get", key),
    set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
    getAll: () => electron.ipcRenderer.invoke("settings:getAll"),
    remove: (key) => electron.ipcRenderer.invoke("settings:remove", key),
    getDailyLimit: () => electron.ipcRenderer.invoke("settings:getDailyLimit"),
    getPollInterval: () => electron.ipcRenderer.invoke("settings:getPollInterval")
  },
  // Leads
  leads: {
    getAll: () => electron.ipcRenderer.invoke("leads:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("leads:getById", id),
    getByNiche: (nicheId) => electron.ipcRenderer.invoke("leads:getByNiche", nicheId),
    create: (data) => electron.ipcRenderer.invoke("leads:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("leads:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("leads:delete", id),
    deleteBatch: (ids) => electron.ipcRenderer.invoke("leads:deleteBatch", ids),
    getCount: () => electron.ipcRenderer.invoke("leads:getCount"),
    importCSV: (nicheId) => electron.ipcRenderer.invoke("leads:importCSV", nicheId)
  },
  // Niches
  niches: {
    getAll: () => electron.ipcRenderer.invoke("niches:getAll"),
    create: (data) => electron.ipcRenderer.invoke("niches:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("niches:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("niches:delete", id)
  },
  // Templates
  templates: {
    getAll: () => electron.ipcRenderer.invoke("templates:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("templates:getById", id),
    getByNiche: (nicheId) => electron.ipcRenderer.invoke("templates:getByNiche", nicheId),
    create: (data) => electron.ipcRenderer.invoke("templates:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("templates:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("templates:delete", id),
    render: (template, vars) => electron.ipcRenderer.invoke("templates:render", template, vars),
    extractVars: (template) => electron.ipcRenderer.invoke("templates:extractVars", template),
    getSampleVars: () => electron.ipcRenderer.invoke("templates:getSampleVars")
  },
  // Campaigns
  campaigns: {
    getAll: () => electron.ipcRenderer.invoke("campaigns:getAll"),
    getById: (id) => electron.ipcRenderer.invoke("campaigns:getById", id),
    create: (data) => electron.ipcRenderer.invoke("campaigns:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("campaigns:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("campaigns:delete", id),
    addLeads: (campaignId, leadIds) => electron.ipcRenderer.invoke("campaigns:addLeads", campaignId, leadIds),
    getLeadIds: (campaignId) => electron.ipcRenderer.invoke("campaigns:getLeadIds", campaignId),
    generateDrafts: (campaignId, extraContext) => electron.ipcRenderer.invoke("campaigns:generateDrafts", campaignId, extraContext),
    preflight: (campaignId) => electron.ipcRenderer.invoke("campaigns:preflight", campaignId)
  },
  // Emails
  emails: {
    getByCampaign: (campaignId, status) => electron.ipcRenderer.invoke("emails:getByCampaign", campaignId, status),
    getById: (id) => electron.ipcRenderer.invoke("emails:getById", id),
    update: (id, data) => electron.ipcRenderer.invoke("emails:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("emails:delete", id),
    approve: (id) => electron.ipcRenderer.invoke("emails:approve", id),
    reject: (id) => electron.ipcRenderer.invoke("emails:reject", id),
    regenerate: (id, feedback) => electron.ipcRenderer.invoke("emails:regenerate", id, feedback),
    approveBatch: (ids) => electron.ipcRenderer.invoke("emails:approveBatch", ids),
    queueApproved: (campaignId) => electron.ipcRenderer.invoke("emails:queueApproved", campaignId),
    getStats: () => electron.ipcRenderer.invoke("emails:getStats"),
    getQueuedCount: () => electron.ipcRenderer.invoke("emails:getQueuedCount")
  },
  // Queue
  queue: {
    getStatus: () => electron.ipcRenderer.invoke("queue:getStatus"),
    start: () => electron.ipcRenderer.invoke("queue:start"),
    pause: () => electron.ipcRenderer.invoke("queue:pause"),
    resume: () => electron.ipcRenderer.invoke("queue:resume"),
    stop: () => electron.ipcRenderer.invoke("queue:stop")
  },
  // Auth
  auth: {
    gmailConnect: () => electron.ipcRenderer.invoke("auth:gmailConnect"),
    gmailDisconnect: () => electron.ipcRenderer.invoke("auth:gmailDisconnect"),
    gmailStatus: () => electron.ipcRenderer.invoke("auth:gmailStatus")
  },
  // Validation
  validation: {
    validateEmail: (email) => electron.ipcRenderer.invoke("validation:validateEmail", email),
    validateLeads: (leadIds) => electron.ipcRenderer.invoke("validation:validateLeads", leadIds)
  },
  // Dashboard
  dashboard: {
    getStats: () => electron.ipcRenderer.invoke("dashboard:getStats"),
    getCampaignStats: () => electron.ipcRenderer.invoke("dashboard:getCampaignStats"),
    getSendHistory: (days) => electron.ipcRenderer.invoke("dashboard:getSendHistory", days),
    getRecentActivity: () => electron.ipcRenderer.invoke("dashboard:getRecentActivity")
  },
  // Replies / Inbox
  replies: {
    getAll: (classification) => electron.ipcRenderer.invoke("replies:getAll", classification),
    getById: (id) => electron.ipcRenderer.invoke("replies:getById", id),
    markRead: (id) => electron.ipcRenderer.invoke("replies:markRead", id),
    getUnreadCount: () => electron.ipcRenderer.invoke("replies:getUnreadCount")
  },
  // Portfolio Examples
  portfolio: {
    getAll: () => electron.ipcRenderer.invoke("portfolio:getAll"),
    create: (data) => electron.ipcRenderer.invoke("portfolio:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("portfolio:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("portfolio:delete", id),
    analyse: (examples, userReply, previousAnalysis) => electron.ipcRenderer.invoke("portfolio:analyse", examples, userReply, previousAnalysis)
  },
  // Event listeners
  on: (channel, callback) => {
    const validChannels = [
      "queue:state-change",
      "queue:sending",
      "queue:sent",
      "queue:send-failed",
      "queue:waiting",
      "queue:countdown",
      "queue:completed",
      "queue:daily-limit-reached",
      "queue:rate-limited",
      "queue:error",
      "inbox:new-replies",
      "campaigns:draft-progress",
      "validation:progress"
    ];
    if (validChannels.includes(channel)) {
      const listener = (_event, ...args) => callback(...args);
      electron.ipcRenderer.on(channel, listener);
      return () => electron.ipcRenderer.removeListener(channel, listener);
    }
    return () => {
    };
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);
