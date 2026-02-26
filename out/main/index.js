"use strict";
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const child_process = require("child_process");
const fs = require("fs");
const uuid = require("uuid");
const sync = require("csv-parse/sync");
const generativeAi = require("@google/generative-ai");
const googleapis = require("googleapis");
const http = require("http");
const dns = require("dns");
function createMainWindow() {
  const win = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0a0a0f",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0a0a0f",
      symbolColor: "#ffffff",
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (!electron.app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  return win;
}
const getUserDataPath = () => electron.app.getPath("userData");
const getDbPath = () => path.join(getUserDataPath(), "alx-outreach.db");
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS niches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    niche_id TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT NOT NULL,
    company TEXT,
    website TEXT,
    phone TEXT,
    notes TEXT,
    email_valid INTEGER DEFAULT 0,
    email_validation_error TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (niche_id) REFERENCES niches(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
  CREATE INDEX IF NOT EXISTS idx_leads_niche ON leads(niche_id);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    niche_id TEXT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (niche_id) REFERENCES niches(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    niche_id TEXT,
    template_id TEXT,
    status TEXT DEFAULT 'draft',
    total_leads INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_replied INTEGER DEFAULT 0,
    total_interested INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (niche_id) REFERENCES niches(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS campaign_leads (
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    PRIMARY KEY (campaign_id, lead_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    template_id TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    personalization_notes TEXT,
    status TEXT DEFAULT 'draft',
    gmail_message_id TEXT,
    gmail_thread_id TEXT,
    sent_at TEXT,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
  CREATE INDEX IF NOT EXISTS idx_emails_campaign ON emails(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_emails_gmail_thread ON emails(gmail_thread_id);

  CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    email_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    gmail_message_id TEXT,
    gmail_thread_id TEXT,
    from_email TEXT,
    subject TEXT,
    body TEXT,
    snippet TEXT,
    classification TEXT,
    classification_confidence REAL,
    classification_reasoning TEXT,
    is_read INTEGER DEFAULT 0,
    received_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_replies_email ON replies(email_id);
  CREATE INDEX IF NOT EXISTS idx_replies_classification ON replies(classification);

  CREATE TABLE IF NOT EXISTS daily_send_log (
    date TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ai_usage_log (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    model TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portfolio_examples (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;
const log = (level, ...args) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  console[level](`[${timestamp}] [${level.toUpperCase()}]`, ...args);
};
const logger = {
  info: (...args) => log("log", ...args),
  warn: (...args) => log("warn", ...args),
  error: (...args) => log("error", ...args)
};
let db = null;
function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
function initDatabase() {
  const dbPath = getDbPath();
  logger.info("Initializing database at:", dbPath);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  logger.info("Database initialized successfully");
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    logger.info("Database closed");
  }
}
function getSetting(key) {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value ?? null;
}
function setSetting(key, value) {
  getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
function getAllSettings() {
  const rows = getDb().prepare("SELECT key, value FROM settings").all();
  const result = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}
function deleteSetting(key) {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}
function machineIdSync() {
  try {
    if (fs.existsSync("/etc/machine-id")) {
      return fs.readFileSync("/etc/machine-id", "utf8").trim();
    }
    if (process.platform === "win32") {
      const output = child_process.execSync(
        "reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid",
        { encoding: "utf8" }
      );
      const match = output.match(/MachineGuid\s+REG_SZ\s+(.+)/);
      if (match) return match[1].trim();
    }
    if (process.platform === "darwin") {
      const output = child_process.execSync(
        "ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/'",
        { encoding: "utf8" }
      );
      const match = output.match(/"IOPlatformUUID"\s*=\s*"(.+?)"/);
      if (match) return match[1];
    }
  } catch {
  }
  return "alx-outreach-fallback-machine-id";
}
const ALGORITHM = "aes-256-gcm";
function deriveKey() {
  const machineId = machineIdSync();
  return crypto.scryptSync(machineId, "alx-outreach-salt", 32);
}
function encrypt(text) {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}
function decrypt(data) {
  const key = deriveKey();
  const [ivHex, authTagHex, encrypted] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
const ENCRYPTED_KEYS = ["gmail_tokens", "gemini_api_key"];
function get(key) {
  const value = getSetting(key);
  if (value && ENCRYPTED_KEYS.includes(key)) {
    try {
      return decrypt(value);
    } catch {
      return null;
    }
  }
  return value;
}
function set(key, value) {
  const storedValue = ENCRYPTED_KEYS.includes(key) ? encrypt(value) : value;
  setSetting(key, storedValue);
}
function getAll() {
  const all = getAllSettings();
  for (const key of ENCRYPTED_KEYS) {
    if (all[key]) {
      try {
        all[key] = decrypt(all[key]);
      } catch {
        all[key] = "";
      }
    }
  }
  return all;
}
function remove(key) {
  deleteSetting(key);
}
function getDailyLimit() {
  const val = getSetting("daily_send_limit");
  return val ? parseInt(val, 10) : 100;
}
function getPollInterval() {
  const val = getSetting("poll_interval_ms");
  return val ? parseInt(val, 10) : 18e4;
}
function registerSettingsHandlers() {
  electron.ipcMain.handle("settings:get", (_e, key) => get(key));
  electron.ipcMain.handle("settings:set", (_e, key, value) => set(key, value));
  electron.ipcMain.handle("settings:getAll", () => getAll());
  electron.ipcMain.handle("settings:remove", (_e, key) => remove(key));
  electron.ipcMain.handle("settings:getDailyLimit", () => getDailyLimit());
  electron.ipcMain.handle("settings:getPollInterval", () => getPollInterval());
}
function getAllLeads() {
  return getDb().prepare(
    `SELECT l.*, n.name as niche_name, n.color as niche_color
       FROM leads l LEFT JOIN niches n ON l.niche_id = n.id
       ORDER BY l.created_at DESC`
  ).all();
}
function getLeadById(id) {
  return getDb().prepare(
    `SELECT l.*, n.name as niche_name, n.color as niche_color
       FROM leads l LEFT JOIN niches n ON l.niche_id = n.id
       WHERE l.id = ?`
  ).get(id);
}
function getLeadsByNiche(nicheId) {
  return getDb().prepare(
    `SELECT l.*, n.name as niche_name, n.color as niche_color
       FROM leads l LEFT JOIN niches n ON l.niche_id = n.id
       WHERE l.niche_id = ? ORDER BY l.created_at DESC`
  ).all(nicheId);
}
function createLead(data) {
  const id = uuid.v4();
  getDb().prepare(
    `INSERT INTO leads (id, first_name, last_name, email, company, website, phone, notes, niche_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.first_name,
    data.last_name || null,
    data.email,
    data.company || null,
    data.website || null,
    data.phone || null,
    data.notes || null,
    data.niche_id || null
  );
  return getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id);
}
function createLeadsBatch(leads) {
  const stmt = getDb().prepare(
    `INSERT OR IGNORE INTO leads (id, first_name, last_name, email, company, website, phone, notes, niche_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertMany = getDb().transaction((items) => {
    let count = 0;
    for (const data of items) {
      const result = stmt.run(
        uuid.v4(),
        data.first_name,
        data.last_name || null,
        data.email,
        data.company || null,
        data.website || null,
        data.phone || null,
        data.notes || null,
        data.niche_id || null
      );
      if (result.changes > 0) count++;
    }
    return count;
  });
  return insertMany(leads);
}
function updateLead(id, data) {
  const fields = [];
  const values = [];
  const allowedFields = [
    "first_name",
    "last_name",
    "email",
    "company",
    "website",
    "phone",
    "notes",
    "niche_id",
    "email_valid",
    "email_validation_error",
    "status"
  ];
  for (const key of allowedFields) {
    if (key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key] ?? null);
    }
  }
  if (fields.length === 0) return getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  getDb().prepare(`UPDATE leads SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id);
}
function deleteLead(id) {
  getDb().prepare("DELETE FROM leads WHERE id = ?").run(id);
}
function deleteLeadsBatch(ids) {
  const placeholders = ids.map(() => "?").join(",");
  getDb().prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).run(...ids);
}
function getLeadCount() {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM leads").get();
  return row.count;
}
function getAllNiches() {
  return getDb().prepare("SELECT * FROM niches ORDER BY name").all();
}
function getNicheById(id) {
  return getDb().prepare("SELECT * FROM niches WHERE id = ?").get(id);
}
function createNiche(data) {
  const id = uuid.v4();
  getDb().prepare("INSERT INTO niches (id, name, description, color) VALUES (?, ?, ?, ?)").run(id, data.name, data.description || null, data.color || "#3b82f6");
  return getNicheById(id);
}
function updateNiche(id, data) {
  const fields = [];
  const values = [];
  if (data.name !== void 0) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.description !== void 0) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.color !== void 0) {
    fields.push("color = ?");
    values.push(data.color);
  }
  if (fields.length === 0) return getNicheById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  getDb().prepare(`UPDATE niches SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getNicheById(id);
}
function deleteNiche(id) {
  getDb().prepare("DELETE FROM niches WHERE id = ?").run(id);
}
const COLUMN_MAP = {
  "first name": "first_name",
  "firstname": "first_name",
  "first_name": "first_name",
  "name": "first_name",
  "last name": "last_name",
  "lastname": "last_name",
  "last_name": "last_name",
  "surname": "last_name",
  "email": "email",
  "email address": "email",
  "email_address": "email",
  "company": "company",
  "company name": "company",
  "company_name": "company",
  "organization": "company",
  "website": "website",
  "url": "website",
  "site": "website",
  "phone": "phone",
  "phone number": "phone",
  "phone_number": "phone",
  "tel": "phone",
  "notes": "notes",
  "note": "notes",
  "comment": "notes",
  "comments": "notes"
};
function parseCSVFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return parseCSVContent(content);
}
function parseCSVContent(content) {
  const errors = [];
  const rows = [];
  let records;
  try {
    records = sync.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
  } catch (err) {
    return { rows: [], errors: [`Failed to parse CSV: ${err.message}`] };
  }
  if (records.length === 0) {
    return { rows: [], errors: ["CSV file is empty"] };
  }
  const headers = Object.keys(records[0]);
  const mapping = {};
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (COLUMN_MAP[normalized]) {
      mapping[header] = COLUMN_MAP[normalized];
    }
  }
  if (!Object.values(mapping).includes("email")) {
    return { rows: [], errors: ["No email column found in CSV"] };
  }
  if (!Object.values(mapping).includes("first_name")) {
    return { rows: [], errors: ["No name/first_name column found in CSV"] };
  }
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const row = {};
    for (const [header, field] of Object.entries(mapping)) {
      const value = record[header]?.trim();
      if (value) {
        row[field] = value;
      }
    }
    if (!row.email) {
      errors.push(`Row ${i + 2}: Missing email`);
      continue;
    }
    if (!row.first_name) {
      errors.push(`Row ${i + 2}: Missing name`);
      continue;
    }
    if (row.first_name && !row.last_name && row.first_name.includes(" ")) {
      const parts = row.first_name.split(" ");
      row.first_name = parts[0];
      row.last_name = parts.slice(1).join(" ");
    }
    rows.push(row);
  }
  return { rows, errors };
}
function registerLeadsHandlers() {
  electron.ipcMain.handle("leads:getAll", () => getAllLeads());
  electron.ipcMain.handle("leads:getById", (_e, id) => getLeadById(id));
  electron.ipcMain.handle("leads:getByNiche", (_e, nicheId) => getLeadsByNiche(nicheId));
  electron.ipcMain.handle("leads:create", (_e, data) => createLead(data));
  electron.ipcMain.handle("leads:update", (_e, id, data) => updateLead(id, data));
  electron.ipcMain.handle("leads:delete", (_e, id) => deleteLead(id));
  electron.ipcMain.handle("leads:deleteBatch", (_e, ids) => deleteLeadsBatch(ids));
  electron.ipcMain.handle("leads:getCount", () => getLeadCount());
  electron.ipcMain.handle("leads:importCSV", async (_e, nicheId) => {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "CSV Files", extensions: ["csv"] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { imported: 0, errors: [], canceled: true };
    }
    const { rows, errors } = parseCSVFile(result.filePaths[0]);
    if (rows.length === 0) {
      return { imported: 0, errors, canceled: false };
    }
    const leadsToInsert = rows.map((row) => ({
      ...row,
      niche_id: nicheId
    }));
    const imported = createLeadsBatch(leadsToInsert);
    return { imported, errors, canceled: false, total: rows.length };
  });
  electron.ipcMain.handle("niches:getAll", () => getAllNiches());
  electron.ipcMain.handle("niches:create", (_e, data) => createNiche(data));
  electron.ipcMain.handle("niches:update", (_e, id, data) => updateNiche(id, data));
  electron.ipcMain.handle("niches:delete", (_e, id) => deleteNiche(id));
}
function getAllTemplates() {
  return getDb().prepare(
    `SELECT t.*, n.name as niche_name, n.color as niche_color
       FROM templates t LEFT JOIN niches n ON t.niche_id = n.id
       ORDER BY n.name, t.name`
  ).all();
}
function getTemplateById(id) {
  return getDb().prepare(
    `SELECT t.*, n.name as niche_name, n.color as niche_color
       FROM templates t LEFT JOIN niches n ON t.niche_id = n.id
       WHERE t.id = ?`
  ).get(id);
}
function getTemplatesByNiche(nicheId) {
  return getDb().prepare(
    `SELECT t.*, n.name as niche_name, n.color as niche_color
       FROM templates t LEFT JOIN niches n ON t.niche_id = n.id
       WHERE t.niche_id = ? ORDER BY t.name`
  ).all(nicheId);
}
function createTemplate(data) {
  const id = uuid.v4();
  getDb().prepare(
    "INSERT INTO templates (id, name, subject, body, niche_id) VALUES (?, ?, ?, ?, ?)"
  ).run(id, data.name, data.subject, data.body, data.niche_id || null);
  return getDb().prepare("SELECT * FROM templates WHERE id = ?").get(id);
}
function updateTemplate(id, data) {
  const fields = [];
  const values = [];
  if (data.name !== void 0) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.subject !== void 0) {
    fields.push("subject = ?");
    values.push(data.subject);
  }
  if (data.body !== void 0) {
    fields.push("body = ?");
    values.push(data.body);
  }
  if (data.niche_id !== void 0) {
    fields.push("niche_id = ?");
    values.push(data.niche_id || null);
  }
  if (fields.length === 0) return getTemplateById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  getDb().prepare(`UPDATE templates SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getDb().prepare("SELECT * FROM templates WHERE id = ?").get(id);
}
function deleteTemplate(id) {
  getDb().prepare("DELETE FROM templates WHERE id = ?").run(id);
}
function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return vars[key] ?? `{{${key}}}`;
  });
}
function extractVariables(template) {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}
function getSampleVars() {
  return {
    first_name: "John",
    last_name: "Smith",
    company: "Acme Corp",
    website: "acmecorp.com",
    niche: "Real Estate"
  };
}
function registerTemplatesHandlers() {
  electron.ipcMain.handle("templates:getAll", () => getAllTemplates());
  electron.ipcMain.handle("templates:getById", (_e, id) => getTemplateById(id));
  electron.ipcMain.handle("templates:getByNiche", (_e, nicheId) => getTemplatesByNiche(nicheId));
  electron.ipcMain.handle("templates:create", (_e, data) => createTemplate(data));
  electron.ipcMain.handle("templates:update", (_e, id, data) => updateTemplate(id, data));
  electron.ipcMain.handle("templates:delete", (_e, id) => deleteTemplate(id));
  electron.ipcMain.handle("templates:render", (_e, template, vars) => renderTemplate(template, vars));
  electron.ipcMain.handle("templates:extractVars", (_e, template) => extractVariables(template));
  electron.ipcMain.handle("templates:getSampleVars", () => getSampleVars());
}
function getAllCampaigns() {
  return getDb().prepare(
    `SELECT c.*, n.name as niche_name, t.name as template_name
       FROM campaigns c
       LEFT JOIN niches n ON c.niche_id = n.id
       LEFT JOIN templates t ON c.template_id = t.id
       ORDER BY c.created_at DESC`
  ).all();
}
function getCampaignById(id) {
  return getDb().prepare(
    `SELECT c.*, n.name as niche_name, t.name as template_name
       FROM campaigns c
       LEFT JOIN niches n ON c.niche_id = n.id
       LEFT JOIN templates t ON c.template_id = t.id
       WHERE c.id = ?`
  ).get(id);
}
function createCampaign(data) {
  const id = uuid.v4();
  getDb().prepare("INSERT INTO campaigns (id, name, niche_id, template_id) VALUES (?, ?, ?, ?)").run(id, data.name, data.niche_id || null, data.template_id || null);
  return getDb().prepare("SELECT * FROM campaigns WHERE id = ?").get(id);
}
function updateCampaign(id, data) {
  const fields = [];
  const values = [];
  const allowed = ["name", "niche_id", "template_id", "status", "total_leads", "total_sent", "total_replied", "total_interested"];
  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key] ?? null);
    }
  }
  if (fields.length === 0) return getCampaignById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  getDb().prepare(`UPDATE campaigns SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getCampaignById(id);
}
function deleteCampaign(id) {
  getDb().prepare("DELETE FROM campaigns WHERE id = ?").run(id);
}
function addLeadsToCampaign(campaignId, leadIds) {
  const stmt = getDb().prepare(
    "INSERT OR IGNORE INTO campaign_leads (campaign_id, lead_id) VALUES (?, ?)"
  );
  const insertMany = getDb().transaction((ids) => {
    for (const leadId of ids) {
      stmt.run(campaignId, leadId);
    }
  });
  insertMany(leadIds);
  const count = getDb().prepare("SELECT COUNT(*) as count FROM campaign_leads WHERE campaign_id = ?").get(campaignId);
  getDb().prepare("UPDATE campaigns SET total_leads = ? WHERE id = ?").run(count.count, campaignId);
}
function getCampaignLeadIds(campaignId) {
  const rows = getDb().prepare("SELECT lead_id FROM campaign_leads WHERE campaign_id = ?").all(campaignId);
  return rows.map((r) => r.lead_id);
}
function getEmailsByCampaign(campaignId, status) {
  let query = `SELECT e.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
    l.email as lead_email, l.company as lead_company
    FROM emails e JOIN leads l ON e.lead_id = l.id
    WHERE e.campaign_id = ?`;
  const params = [campaignId];
  if (status) {
    query += " AND e.status = ?";
    params.push(status);
  }
  query += " ORDER BY e.created_at DESC";
  return getDb().prepare(query).all(...params);
}
function getEmailById(id) {
  return getDb().prepare(
    `SELECT e.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
       l.email as lead_email, l.company as lead_company
       FROM emails e JOIN leads l ON e.lead_id = l.id
       WHERE e.id = ?`
  ).get(id);
}
function createEmail(data) {
  const id = uuid.v4();
  getDb().prepare(
    `INSERT INTO emails (id, campaign_id, lead_id, template_id, subject, body, personalization_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.campaign_id,
    data.lead_id,
    data.template_id || null,
    data.subject,
    data.body,
    data.personalization_notes || null,
    data.status || "draft"
  );
  return getDb().prepare("SELECT * FROM emails WHERE id = ?").get(id);
}
function updateEmail(id, data) {
  const fields = [];
  const values = [];
  const allowed = ["subject", "body", "status", "gmail_message_id", "gmail_thread_id", "sent_at", "error", "personalization_notes"];
  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = ?`);
      values.push(data[key] ?? null);
    }
  }
  if (fields.length === 0) return getEmailById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  getDb().prepare(`UPDATE emails SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getDb().prepare("SELECT * FROM emails WHERE id = ?").get(id);
}
function updateEmailStatusBatch(ids, status) {
  const placeholders = ids.map(() => "?").join(",");
  getDb().prepare(`UPDATE emails SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`).run(status, ...ids);
}
function getNextQueuedEmail() {
  return getDb().prepare(
    `SELECT e.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
       l.email as lead_email, l.company as lead_company
       FROM emails e JOIN leads l ON e.lead_id = l.id
       WHERE e.status = 'queued'
       ORDER BY e.created_at ASC LIMIT 1`
  ).get();
}
function getQueuedEmailCount() {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM emails WHERE status = 'queued'").get();
  return row.count;
}
function getEmailByThreadId(threadId) {
  return getDb().prepare("SELECT * FROM emails WHERE gmail_thread_id = ?").get(threadId);
}
function deleteEmail(id) {
  getDb().prepare("DELETE FROM emails WHERE id = ?").run(id);
}
function getEmailStats() {
  const rows = getDb().prepare("SELECT status, COUNT(*) as count FROM emails GROUP BY status").all();
  const stats = { total: 0, draft: 0, approved: 0, queued: 0, sent: 0, failed: 0 };
  for (const row of rows) {
    stats.total += row.count;
    if (row.status in stats) {
      stats[row.status] = row.count;
    }
  }
  return stats;
}
function getAllExamples() {
  return getDb().prepare("SELECT * FROM portfolio_examples ORDER BY sort_order ASC, created_at ASC").all();
}
function createExample(data) {
  const id = uuid.v4();
  getDb().prepare(
    "INSERT INTO portfolio_examples (id, title, url, description, sort_order) VALUES (?, ?, ?, ?, ?)"
  ).run(id, data.title, data.url, data.description || null, data.sort_order ?? 0);
  return getDb().prepare("SELECT * FROM portfolio_examples WHERE id = ?").get(id);
}
function updateExample(id, data) {
  const fields = Object.keys(data).map((k) => `${k} = ?`).join(", ");
  const values = [...Object.values(data), id];
  getDb().prepare(`UPDATE portfolio_examples SET ${fields} WHERE id = ?`).run(...values);
}
function deleteExample(id) {
  getDb().prepare("DELETE FROM portfolio_examples WHERE id = ?").run(id);
}
const DRAFT_MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.0-flash"];
const CLASSIFY_MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.0-flash"];
let genAI = null;
const WINDOW_MS = 6e4;
const MAX_REQUESTS_PER_WINDOW = 9;
const requestTimestamps = [];
function getClient$1() {
  const apiKey = get("gemini_api_key") || process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("Gemini API key not configured");
  if (!genAI) {
    genAI = new generativeAi.GoogleGenerativeAI(apiKey);
  }
  return genAI;
}
async function rateLimitedRequest(fn) {
  while (true) {
    const now = Date.now();
    while (requestTimestamps.length > 0 && requestTimestamps[0] <= now - WINDOW_MS) {
      requestTimestamps.shift();
    }
    if (requestTimestamps.length < MAX_REQUESTS_PER_WINDOW) {
      requestTimestamps.push(now);
      return fn();
    }
    const waitMs = requestTimestamps[0] + WINDOW_MS - now + 50;
    logger.info(`Rate limiter: window full (${requestTimestamps.length}/${MAX_REQUESTS_PER_WINDOW}), waiting ${Math.round(waitMs / 1e3)}s`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}
async function withRetry(fn, retries = 3, delayMs = 1e4) {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const is429 = lastErr.message.includes("429") || lastErr.message.includes("Too Many Requests") || lastErr.message.includes("Resource exhausted");
      if (is429 && attempt < retries) {
        const wait = delayMs * attempt;
        logger.info(`Gemini 429 — waiting ${wait / 1e3}s before retry ${attempt}/${retries - 1}...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      } else {
        throw lastErr;
      }
    }
  }
  throw lastErr;
}
async function tryModels(models, fn) {
  let lastErr = null;
  for (const modelName of models) {
    try {
      const result = await fn(modelName);
      return { result, modelUsed: modelName };
    } catch (err) {
      lastErr = err;
      const isUnavailable = lastErr.message.includes("404") || lastErr.message.includes("not found") || lastErr.message.includes("not supported");
      if (isUnavailable) {
        logger.warn(`Model ${modelName} unavailable, trying next...`);
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}
function logUsage(type, model, inputTokens, outputTokens) {
  try {
    getDb().prepare(
      "INSERT INTO ai_usage_log (id, type, model, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)"
    ).run(uuid.v4(), type, model, inputTokens, outputTokens);
  } catch {
  }
}
async function generateDraft(templateSubject, templateBody, lead, portfolioExamples, extraContext, brief) {
  const client = getClient$1();
  const portfolioSection = portfolioExamples && portfolioExamples.length > 0 ? `
AVAILABLE PORTFOLIO EXAMPLES (pick the 3-4 most relevant for this lead's industry):
${portfolioExamples.map((e, i) => `${i + 1}. ${e.title} — ${e.url}${e.description ? ` (${e.description})` : ""}`).join("\n")}

When including examples in the email, replace the template's existing example links with the most relevant ones from the list above. Format them as:
- [url1]  |  [url2]
- [url3]  |  [url4]
` : "";
  const extraContextSection = extraContext ? `
ADDITIONAL CONTEXT FROM USER:
${extraContext}
` : "";
  const briefSection = brief ? `
CAMPAIGN BRIEF (follow these rules for all drafts in this campaign):
- Niche context: ${brief.nicheContext}
- Personalisation angles: ${brief.personalizationAngles}
- Tone: ${brief.toneGuidance}
- Missing data: ${brief.missingDataHandling}
- Portfolio focus: ${brief.portfolioFocus}
` : "";
  const prompt = `You are an email personalization assistant for a videography agency called ALX.

Given this email template and lead information, generate a personalized email.

TEMPLATE SUBJECT: ${templateSubject}
TEMPLATE BODY: ${templateBody}
${portfolioSection}${briefSection}${extraContextSection}
LEAD INFO:
- First Name: ${lead.first_name}
- Last Name: ${lead.last_name || "N/A"}
- Company: ${lead.company || "N/A"}
- Website: ${lead.website || "N/A"}
- Niche: ${lead.niche || "N/A"}

INSTRUCTIONS:
1. Replace all {{variable}} placeholders with the lead's actual information
2. Add 1-2 personalized sentences that reference the lead's company/website/niche naturally
3. Keep the tone professional but warm
4. Do NOT add a signature block — the template already includes it
5. Preserve the full template length — do not shorten or summarise

HUMANISATION RULES — the email must read like a real person wrote it, not AI:
- Write like you're a real person sending a quick email, not a marketing bot
- Use contractions naturally (I'm, I've, you've, it's, don't)
- Vary sentence length — mix short punchy sentences with longer ones
- BANNED words/phrases: "landscape", "pivotal", "underscore", "leverage", "utilize", "delve", "comprehensive", "robust", "innovative", "transformative", "seamlessly", "tailored", "streamline", "cutting-edge", "it's worth noting", "I hope this finds you well", "I hope this helps", "feel free to", "don't hesitate to", "as per", "please find"
- No em dashes (—) — use commas or just end the sentence
- No rule-of-three lists unless the template has them
- No sycophantic openers or closers
- No excessive hedging ("might potentially possibly")
- Specific and direct — say exactly what you mean
- If something is good, just say it's good — don't oversell it
- The email should feel like it was typed by a real person in 10 minutes, not crafted by an AI for an hour

Return your response in this exact JSON format:
{
  "subject": "the personalized subject line",
  "body": "the personalized email body (plain text, use \\n for line breaks)",
  "personalization_notes": "brief note about what was personalized and why"
}`;
  const { result: response, modelUsed } = await tryModels(DRAFT_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName });
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)));
    return res.response;
  });
  const text = response.text();
  logUsage(
    "draft_generation",
    modelUsed,
    response.usageMetadata?.promptTokenCount || 0,
    response.usageMetadata?.candidatesTokenCount || 0
  );
  logger.info(`Draft generated using ${modelUsed}`);
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const truncated = text.substring(0, 300).replace(/\n/g, " ");
      logger.error("Gemini refused or returned non-JSON:", truncated);
      throw new Error(`Gemini refused: ${truncated}`);
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      subject: parsed.subject,
      body: parsed.body,
      personalizationNotes: parsed.personalization_notes || ""
    };
  } catch (err) {
    logger.error("Failed to parse Gemini draft response:", text);
    throw err instanceof Error && err.message.startsWith("Gemini refused") ? err : new Error(`Failed to parse AI response: ${err.message}`);
  }
}
async function classifyReply(originalSubject, originalBody, replyBody) {
  const client = getClient$1();
  const prompt = `You are an email reply classifier for a videography outreach campaign.

ORIGINAL EMAIL SUBJECT: ${originalSubject}
ORIGINAL EMAIL BODY (first 200 chars): ${originalBody.substring(0, 200)}

REPLY:
${replyBody}

Classify this reply into ONE of these categories:
- interested: The person is interested in learning more or wants to discuss
- not_interested: The person explicitly declines or says no
- follow_up: They have questions or want more information before deciding
- out_of_office: Auto-reply or out of office message
- bounce: Delivery failure or invalid email
- unsubscribe: They want to be removed from the mailing list

Return your response in this exact JSON format:
{
  "classification": "one_of_the_categories_above",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why you chose this classification"
}`;
  const { result: response, modelUsed } = await tryModels(CLASSIFY_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName });
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)));
    return res.response;
  });
  const text = response.text();
  logUsage(
    "reply_classification",
    modelUsed,
    response.usageMetadata?.promptTokenCount || 0,
    response.usageMetadata?.candidatesTokenCount || 0
  );
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      classification: parsed.classification,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning || ""
    };
  } catch (err) {
    logger.error("Failed to parse Gemini classification response:", text);
    return {
      classification: "follow_up",
      confidence: 0.5,
      reasoning: "Failed to classify automatically"
    };
  }
}
async function regenerateDraft(templateSubject, templateBody, lead, previousDraft, feedback, portfolioExamples) {
  const client = getClient$1();
  const portfolioSection = portfolioExamples && portfolioExamples.length > 0 ? `
AVAILABLE PORTFOLIO EXAMPLES (pick the 3-4 most relevant for this lead's industry):
${portfolioExamples.map((e, i) => `${i + 1}. ${e.title} — ${e.url}${e.description ? ` (${e.description})` : ""}`).join("\n")}
` : "";
  const prompt = `You are an email personalization assistant for a videography agency called ALX.

A draft email was generated and the user has requested specific changes. Rewrite the email incorporating their feedback.

ORIGINAL TEMPLATE SUBJECT: ${templateSubject}
ORIGINAL TEMPLATE BODY: ${templateBody}
${portfolioSection}
LEAD INFO:
- First Name: ${lead.first_name}
- Last Name: ${lead.last_name || "N/A"}
- Company: ${lead.company || "N/A"}
- Website: ${lead.website || "N/A"}
- Niche: ${lead.niche || "N/A"}

PREVIOUS DRAFT SUBJECT: ${previousDraft.subject}
PREVIOUS DRAFT BODY: ${previousDraft.body}

USER FEEDBACK: ${feedback}

INSTRUCTIONS:
1. Rewrite the email incorporating the user's feedback exactly
2. Keep all personalisation from the previous draft unless the feedback says otherwise
3. Do NOT add a signature block
4. Preserve the full template length unless told to shorten it

HUMANISATION RULES:
- Write like a real person, not a marketing bot
- Use contractions naturally (I'm, I've, you've, it's)
- Vary sentence length
- BANNED: "landscape", "pivotal", "underscore", "leverage", "utilize", "delve", "comprehensive", "robust", "innovative", "transformative", "seamlessly", "tailored", "streamline", "cutting-edge"
- No em dashes (—), no sycophantic openers, no excessive hedging
- Specific and direct

Return your response in this exact JSON format:
{
  "subject": "the updated subject line",
  "body": "the updated email body (plain text, use \\n for line breaks)",
  "personalization_notes": "brief note about what was changed based on feedback"
}`;
  const { result: response, modelUsed } = await tryModels(DRAFT_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName });
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)));
    return res.response;
  });
  const text = response.text();
  logUsage("draft_regeneration", modelUsed, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0);
  logger.info(`Draft regenerated using ${modelUsed}`);
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const truncated = text.substring(0, 300).replace(/\n/g, " ");
      throw new Error(`Gemini refused: ${truncated}`);
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      subject: parsed.subject,
      body: parsed.body,
      personalizationNotes: parsed.personalization_notes || ""
    };
  } catch (err) {
    logger.error("Failed to parse Gemini regenerate response:", text);
    throw err instanceof Error && err.message.startsWith("Gemini refused") ? err : new Error(`Failed to parse AI response: ${err.message}`);
  }
}
async function preflightCheck(templateSubject, templateBody, niche, sampleLeads) {
  const client = getClient$1();
  const leadSample = sampleLeads.slice(0, 4).map((l, i) => `${i + 1}. ${l.first_name} ${l.last_name || ""} | Company: ${l.company || "none"} | Website: ${l.website || "none"}`).join("\n");
  const prompt = `You are reviewing an email template before AI draft generation for a videography agency called ALX.

TEMPLATE SUBJECT: ${templateSubject}
TEMPLATE BODY: ${templateBody}

TARGET NICHE: ${niche}
SAMPLE LEADS:
${leadSample}

Your job: identify genuine uncertainties that would make it hard to write a good personalised email. Only ask questions if they would materially change how you write the email.

Examples of good questions:
- Many leads have no website — should I skip mentioning websites or use their company name instead?
- The template references a specific service but doesn't describe it — what does ALX offer for this niche?
- Should the tone be formal (B2B) or casual for this niche?

Do NOT ask obvious questions or anything that can be inferred from the template/lead data.

If everything is clear, return hasQuestions: false with an empty array.

Return this exact JSON format:
{
  "hasQuestions": true,
  "questions": [
    {
      "id": "q1",
      "question": "The question to show the user",
      "hint": "A short placeholder/example answer to guide them"
    }
  ]
}`;
  const { result: response } = await tryModels(DRAFT_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName });
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)));
    return res.response;
  });
  const text = response.text();
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { hasQuestions: false, questions: [] };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      hasQuestions: !!parsed.hasQuestions && parsed.questions?.length > 0,
      questions: parsed.questions || []
    };
  } catch {
    return { hasQuestions: false, questions: [] };
  }
}
async function generateTemplateVariants(templateSubject, templateBody, niche, portfolioExamples, feedback) {
  const client = getClient$1();
  const portfolioList = portfolioExamples.length > 0 ? portfolioExamples.map((e, i) => `${i + 1}. ${e.title} — ${e.url}${e.description ? ` (${e.description})` : ""}`).join("\n") : "No portfolio examples available.";
  const feedbackSection = feedback ? `
USER FEEDBACK TO INCORPORATE:
${feedback}
` : "";
  const prompt = `You are an email copywriter for ALX, a videography agency doing cold email outreach.

Generate 3 different template variants based on the template below. Each variant takes a different angle or hook, but keeps the same core offer and length.

RULES:
- Keep ALL {{variable}} placeholders EXACTLY as-is ({{first_name}}, {{company}}, {{last_name}}, {{website}}, {{niche}}) — do not fill them in
- Each variant should have a different opening angle (e.g. "Direct offer", "Question hook", "Social proof angle")
- Same length as the original — don't shorten
- No em dashes (—), no AI buzzwords, write like a real person
- Keep any portfolio link lines exactly as formatted in the original

TARGET NICHE: ${niche}

AVAILABLE PORTFOLIO:
${portfolioList}
${feedbackSection}
BASE TEMPLATE SUBJECT: ${templateSubject}
BASE TEMPLATE BODY:
${templateBody}

Return exactly this JSON format:
[
  {
    "label": "Short name for this variant e.g. 'Direct'",
    "subject": "subject line with {{variables}} kept intact",
    "body": "email body with {{variables}} kept intact, \\n for line breaks"
  },
  { "label": "...", "subject": "...", "body": "..." },
  { "label": "...", "subject": "...", "body": "..." }
]`;
  const { result: response, modelUsed } = await tryModels(DRAFT_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName });
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)));
    return res.response;
  });
  const text = response.text();
  logUsage("template_variants", modelUsed, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0);
  logger.info(`Template variants generated using ${modelUsed}`);
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((v) => ({
      label: v.label || "Variant",
      subject: v.subject || templateSubject,
      body: v.body || templateBody
    }));
  } catch (err) {
    logger.error("Failed to parse template variants:", text);
    throw new Error(`Failed to parse variants: ${err.message}`);
  }
}
async function generateCampaignBrief(templateSubject, templateBody, niche, sampleLeads, portfolioExamples) {
  const client = getClient$1();
  const leadSample = sampleLeads.slice(0, 4).map((l, i) => `${i + 1}. ${l.first_name} ${l.last_name || ""} | Company: ${l.company || "none"} | Website: ${l.website || "none"}`).join("\n");
  const portfolioList = portfolioExamples.length > 0 ? portfolioExamples.map((e, i) => `${i + 1}. ${e.title} — ${e.url}${e.description ? ` (${e.description})` : ""}`).join("\n") : "No portfolio examples available.";
  const prompt = `You are a campaign strategist for ALX, a videography agency doing cold email outreach.

Before a batch of AI workers write personalised emails, create a strategic brief they will all follow.

TEMPLATE SUBJECT: ${templateSubject}
TEMPLATE BODY: ${templateBody}

TARGET NICHE: ${niche}
SAMPLE LEADS:
${leadSample}

AVAILABLE PORTFOLIO:
${portfolioList}

Write a concise brief covering:
1. nicheContext: What this industry cares about, common pain points video content addresses (2-3 sentences)
2. personalizationAngles: Best 2-3 ways to personalise using company/website/name (2-3 sentences, specific)
3. toneGuidance: Formal vs casual, B2B vs B2C nuances, language to lean into (1-2 sentences)
4. missingDataHandling: Exact fallback strategy when company or website is missing — don't say "skip it", say what to write instead (2 sentences)
5. portfolioFocus: Which portfolio examples to prioritise for this niche, name specific ones (2 sentences)

Be direct and actionable. Workers need rules, not vague advice.

Return this exact JSON:
{
  "nicheContext": "...",
  "personalizationAngles": "...",
  "toneGuidance": "...",
  "missingDataHandling": "...",
  "portfolioFocus": "..."
}`;
  const { result: response, modelUsed } = await tryModels(DRAFT_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName });
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)));
    return res.response;
  });
  const text = response.text();
  logUsage("campaign_brief", modelUsed, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0);
  logger.info(`Campaign brief generated using ${modelUsed}`);
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in brief response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      nicheContext: parsed.nicheContext || "",
      personalizationAngles: parsed.personalizationAngles || "",
      toneGuidance: parsed.toneGuidance || "",
      missingDataHandling: parsed.missingDataHandling || "",
      portfolioFocus: parsed.portfolioFocus || ""
    };
  } catch (err) {
    logger.error("Failed to parse campaign brief, using fallback:", err.message);
    return {
      nicheContext: `Target niche: ${niche}`,
      personalizationAngles: "Use the lead's company name and first name for personalisation.",
      toneGuidance: "Professional but warm tone.",
      missingDataHandling: "If no website is available, reference the company name only. If no company, address the lead by first name only.",
      portfolioFocus: "Use the most relevant portfolio examples for this industry."
    };
  }
}
async function analysePortfolio(examples, niches, userReply, previousAnalysis) {
  const client = getClient$1();
  const examplesList = examples.map((e, i) => `${i + 1}. [ID: ${e.id}] Title: "${e.title}" | URL: ${e.url}${e.description ? ` | Description: ${e.description}` : " | No description"}`).join("\n");
  const nichesList = niches.length > 0 ? niches.map((n) => `- ${n.name} (${n.leadCount} leads)`).join("\n") : "No niches configured yet.";
  const conversationContext = previousAnalysis ? `
PREVIOUS ANALYSIS CONTEXT:
${previousAnalysis}

USER REPLY: ${userReply || "(no reply)"}
` : "";
  const prompt = `You are a portfolio optimisation assistant for ALX, a videography agency doing cold email outreach.

When generating outreach emails, the AI picks 3-4 portfolio examples from the list that are most relevant to each lead's industry/niche. Your job is to make sure the portfolio is well-matched to the niches being targeted and that each example's title and description is as useful as possible for that matching.

TARGET NICHES (who ALX is sending outreach to):
${nichesList}

CURRENT PORTFOLIO EXAMPLES:
${examplesList}
${conversationContext}
Key things to assess:
- Are there examples covering each target niche? Flag any niches with no matching examples.
- Are titles specific enough? (e.g. "Speed ramp — Car dealership" beats "Speed ramp")
- Do descriptions explain style, pace, and context in a way that helps match to industries?
- Are there gaps — niches being targeted but no relevant example exists?

${previousAnalysis ? "Continue the conversation based on the user reply above. Give specific actionable suggestions based on their response." : "Give your initial analysis. Highlight any niche gaps first, then suggest title/description improvements. Be direct — no fluff. Ask one focused question at the end if you need more info."}

Return your response in this exact JSON format:
{
  "message": "your conversational message (use **bold**, bullet points with -, numbered lists where helpful — make it readable)",
  "suggestions": [
    {
      "id": "unique-suggestion-id",
      "exampleId": "the exact ID from the [ID: ...] field above",
      "field": "title or description",
      "title": "brief label e.g. 'Improve title for example 2'",
      "original": "the current value being replaced",
      "improved": "your suggested replacement"
    }
  ]
}

Only include suggestions when you have specific improvements ready. Otherwise leave suggestions as an empty array. Always use the exact ID values from the [ID: ...] labels above.`;
  const { result: response, modelUsed } = await tryModels(DRAFT_MODELS, async (modelName) => {
    const model = client.getGenerativeModel({ model: modelName });
    const res = await withRetry(() => rateLimitedRequest(() => model.generateContent(prompt)));
    return res.response;
  });
  const text = response.text();
  logUsage(
    "portfolio_analysis",
    modelUsed,
    response.usageMetadata?.promptTokenCount || 0,
    response.usageMetadata?.candidatesTokenCount || 0
  );
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      message: parsed.message || "Analysis complete.",
      suggestions: parsed.suggestions || []
    };
  } catch (err) {
    logger.error("Failed to parse portfolio analysis response:", text);
    return {
      message: text || "Could not parse AI response. Please try again.",
      suggestions: []
    };
  }
}
function isConfigured() {
  const apiKey = get("gemini_api_key") || process.env.GEMINI_API_KEY;
  return !!apiKey;
}
function registerCampaignsHandlers() {
  electron.ipcMain.handle("campaigns:getAll", () => getAllCampaigns());
  electron.ipcMain.handle("campaigns:getById", (_e, id) => getCampaignById(id));
  electron.ipcMain.handle("campaigns:create", (_e, data) => createCampaign(data));
  electron.ipcMain.handle("campaigns:update", (_e, id, data) => updateCampaign(id, data));
  electron.ipcMain.handle("campaigns:delete", (_e, id) => deleteCampaign(id));
  electron.ipcMain.handle(
    "campaigns:addLeads",
    (_e, campaignId, leadIds) => addLeadsToCampaign(campaignId, leadIds)
  );
  electron.ipcMain.handle(
    "campaigns:getLeadIds",
    (_e, campaignId) => getCampaignLeadIds(campaignId)
  );
  electron.ipcMain.handle("campaigns:generateDrafts", async (event, campaignId, extraContext, workerCount = 5) => {
    const campaign = getCampaignById(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    if (!campaign.template_id) throw new Error("No template assigned to campaign");
    const template = getTemplateById(campaign.template_id);
    if (!template) throw new Error("Template not found");
    const leadIds = getCampaignLeadIds(campaignId);
    const allLeads = leadIds.map((id) => getLeadById(id)).filter((l) => !!l);
    const portfolioExamples = getAllExamples();
    event.sender.send("campaigns:draft-progress", {
      campaignId,
      generated: 0,
      total: allLeads.length,
      workers: 0,
      phase: "briefing"
    });
    let brief;
    if (isConfigured()) {
      try {
        brief = await generateCampaignBrief(
          template.subject,
          template.body,
          campaign.niche_name || "General",
          allLeads.slice(0, 4),
          portfolioExamples
        );
        logger.info("Campaign brief generated successfully");
      } catch (err) {
        logger.warn("Brief generation failed, proceeding without:", err.message);
      }
    }
    const existingEmails = getEmailsByCampaign(campaignId);
    const existingLeadIds = new Set(existingEmails.map((e) => e.lead_id));
    const leadsToProcess = allLeads.filter((l) => !existingLeadIds.has(l.id));
    const queue = [...leadsToProcess];
    let generated = existingLeadIds.size;
    const errors = [];
    const actualWorkers = Math.min(workerCount, Math.max(queue.length, 1), 20);
    event.sender.send("campaigns:draft-progress", {
      campaignId,
      generated,
      total: allLeads.length,
      workers: actualWorkers,
      phase: "generating"
    });
    const runWorker = async (workerId) => {
      logger.info(`Worker ${workerId}/${actualWorkers} started`);
      while (true) {
        const lead = queue.shift();
        if (!lead) break;
        try {
          let subject;
          let body;
          let personalizationNotes = "";
          if (isConfigured()) {
            const draft = await generateDraft(
              template.subject,
              template.body,
              {
                first_name: lead.first_name,
                last_name: lead.last_name || void 0,
                company: lead.company || void 0,
                website: lead.website || void 0,
                niche: lead.niche_name || void 0
              },
              portfolioExamples.length > 0 ? portfolioExamples : void 0,
              extraContext,
              brief
            );
            subject = draft.subject;
            body = draft.body;
            personalizationNotes = draft.personalizationNotes;
          } else {
            const vars = {
              first_name: lead.first_name,
              last_name: lead.last_name || "",
              company: lead.company || "",
              website: lead.website || "",
              niche: lead.niche_name || ""
            };
            subject = renderTemplate(template.subject, vars);
            body = renderTemplate(template.body, vars);
          }
          createEmail({
            campaign_id: campaignId,
            lead_id: lead.id,
            template_id: template.id,
            subject,
            body,
            personalization_notes: personalizationNotes
          });
          generated++;
          event.sender.send("campaigns:draft-progress", {
            campaignId,
            generated,
            total: allLeads.length,
            workers: actualWorkers,
            phase: "generating"
          });
        } catch (err) {
          const error = err.message;
          logger.error(`Worker ${workerId}: failed draft for ${lead.email}:`, error);
          errors.push(`${lead.email}: ${error}`);
        }
      }
      logger.info(`Worker ${workerId} finished`);
    };
    await Promise.all(Array.from({ length: actualWorkers }, (_, i) => runWorker(i + 1)));
    updateCampaign(campaignId, { status: "drafts_ready" });
    return { generated, total: allLeads.length, errors };
  });
  electron.ipcMain.handle("campaigns:generateVariants", async (_e, campaignId, feedback) => {
    const campaign = getCampaignById(campaignId);
    if (!campaign?.template_id) throw new Error("No template assigned to campaign");
    const template = getTemplateById(campaign.template_id);
    if (!template) throw new Error("Template not found");
    const portfolioExamples = getAllExamples();
    return generateTemplateVariants(
      template.subject,
      template.body,
      campaign.niche_name || "General",
      portfolioExamples,
      feedback
    );
  });
  electron.ipcMain.handle("campaigns:createDraftsFromVariants", (_e, campaignId, variants) => {
    const campaign = getCampaignById(campaignId);
    if (!campaign?.template_id) throw new Error("Campaign not found");
    const leadIds = getCampaignLeadIds(campaignId);
    const leads = leadIds.map((id) => getLeadById(id)).filter((l) => !!l);
    const existing = getEmailsByCampaign(campaignId, "draft");
    existing.forEach((e) => deleteEmail(e.id));
    let created = 0;
    leads.forEach((lead, index) => {
      const variant = variants[index % variants.length];
      const vars = {
        first_name: lead.first_name,
        last_name: lead.last_name || "",
        company: lead.company || "",
        website: lead.website || "",
        niche: lead.niche_name || ""
      };
      createEmail({
        campaign_id: campaignId,
        lead_id: lead.id,
        template_id: campaign.template_id,
        subject: renderTemplate(variant.subject, vars),
        body: renderTemplate(variant.body, vars),
        personalization_notes: `Quick mode — ${variant.label}`
      });
      created++;
    });
    updateCampaign(campaignId, { status: "drafts_ready" });
    return { created, total: leads.length };
  });
  electron.ipcMain.handle("campaigns:preflight", async (_e, campaignId) => {
    const campaign = getCampaignById(campaignId);
    if (!campaign?.template_id) return { hasQuestions: false, questions: [] };
    const template = getTemplateById(campaign.template_id);
    if (!template) return { hasQuestions: false, questions: [] };
    const leadIds = getCampaignLeadIds(campaignId);
    const sampleLeads = leadIds.slice(0, 4).map((id) => getLeadById(id)).filter((l) => !!l);
    return preflightCheck(
      template.subject,
      template.body,
      campaign.niche_name || "General",
      sampleLeads
    );
  });
}
function registerEmailsHandlers() {
  electron.ipcMain.handle(
    "emails:getByCampaign",
    (_e, campaignId, status) => getEmailsByCampaign(campaignId, status)
  );
  electron.ipcMain.handle("emails:getById", (_e, id) => getEmailById(id));
  electron.ipcMain.handle("emails:update", (_e, id, data) => updateEmail(id, data));
  electron.ipcMain.handle("emails:delete", (_e, id) => deleteEmail(id));
  electron.ipcMain.handle(
    "emails:approve",
    (_e, id) => updateEmail(id, { status: "approved" })
  );
  electron.ipcMain.handle(
    "emails:reject",
    (_e, id) => updateEmail(id, { status: "draft" })
  );
  electron.ipcMain.handle(
    "emails:approveBatch",
    (_e, ids) => updateEmailStatusBatch(ids, "approved")
  );
  electron.ipcMain.handle("emails:queueApproved", (_e, campaignId) => {
    const approved = getEmailsByCampaign(campaignId, "approved");
    const ids = approved.map((e) => e.id);
    updateEmailStatusBatch(ids, "queued");
    return ids.length;
  });
  electron.ipcMain.handle("emails:getStats", () => getEmailStats());
  electron.ipcMain.handle("emails:getQueuedCount", () => getQueuedEmailCount());
  electron.ipcMain.handle("emails:regenerate", async (_e, emailId, feedback) => {
    const email = getEmailById(emailId);
    if (!email) throw new Error("Email not found");
    const lead = getLeadById(email.lead_id);
    if (!lead) throw new Error("Lead not found");
    const template = email.template_id ? getTemplateById(email.template_id) : null;
    const portfolioExamples = getAllExamples();
    const draft = await regenerateDraft(
      template?.subject || email.subject,
      template?.body || email.body,
      {
        first_name: lead.first_name,
        last_name: lead.last_name || void 0,
        company: lead.company || void 0,
        website: lead.website || void 0,
        niche: lead.niche_name || void 0
      },
      { subject: email.subject, body: email.body },
      feedback,
      portfolioExamples.length > 0 ? portfolioExamples : void 0
    );
    updateEmail(emailId, {
      subject: draft.subject,
      body: draft.body,
      personalization_notes: draft.personalizationNotes
    });
    logger.info(`Draft regenerated for ${lead.email} with feedback: "${feedback.substring(0, 60)}"`);
    return getEmailById(emailId);
  });
}
let oauth2Client = null;
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email"
];
function getCredentials() {
  const clientId = get("google_client_id") || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = get("google_client_secret") || process.env.GOOGLE_CLIENT_SECRET || "";
  return { clientId, clientSecret };
}
function createOAuth2Client(redirectUri) {
  const { clientId, clientSecret } = getCredentials();
  return new googleapis.google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
async function startAuthFlow() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${port}`);
        const code = url.searchParams.get("code");
        if (!code) {
          res.writeHead(400);
          res.end("No authorization code received");
          return;
        }
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        set("gmail_tokens", JSON.stringify(tokens));
        const oauth2 = googleapis.google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email || "";
        set("gmail_email", email);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          '<html><body style="background:#0a0a0f;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1>Connected!</h1><p>You can close this window and return to ALX Outreach.</p></div></body></html>'
        );
        server.close();
        resolve({ email });
      } catch (err) {
        res.writeHead(500);
        res.end("Authentication failed");
        server.close();
        reject(err);
      }
    });
    let port;
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        port = address.port;
      }
      const redirectUri = `http://127.0.0.1:${port}`;
      oauth2Client = createOAuth2Client(redirectUri);
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent"
      });
      electron.shell.openExternal(authUrl);
    });
    server.on("error", reject);
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth flow timed out"));
    }, 3e5);
  });
}
function getClient() {
  if (oauth2Client) return oauth2Client;
  const tokensStr = get("gmail_tokens");
  if (!tokensStr) return null;
  try {
    const tokens = JSON.parse(tokensStr);
    oauth2Client = createOAuth2Client("http://127.0.0.1");
    oauth2Client.setCredentials(tokens);
    oauth2Client.on("tokens", (newTokens) => {
      const existing = JSON.parse(get("gmail_tokens") || "{}");
      const merged = { ...existing, ...newTokens };
      set("gmail_tokens", JSON.stringify(merged));
    });
    return oauth2Client;
  } catch (err) {
    logger.error("Failed to restore Gmail tokens:", err);
    return null;
  }
}
function getGmailClient() {
  const client = getClient();
  if (!client) return null;
  return googleapis.google.gmail({ version: "v1", auth: client });
}
async function sendEmail(to, subject, htmlBody) {
  const gmail = getGmailClient();
  if (!gmail) throw new Error("Gmail not connected");
  const senderEmail = get("gmail_email") || "";
  const raw = createRawMessage(senderEmail, to, subject, htmlBody);
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw }
  });
  return {
    messageId: response.data.id || "",
    threadId: response.data.threadId || ""
  };
}
function createRawMessage(from, to, subject, html) {
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    html
  ];
  const message = messageParts.join("\r\n");
  return Buffer.from(message).toString("base64url");
}
async function getNewMessages(sinceTimestamp) {
  const gmail = getGmailClient();
  if (!gmail) return [];
  let query = "in:inbox";
  if (sinceTimestamp) {
    const epochSeconds = Math.floor(new Date(sinceTimestamp).getTime() / 1e3);
    query += ` after:${epochSeconds}`;
  }
  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50
    });
    if (!response.data.messages) return [];
    const messages = [];
    for (const msg of response.data.messages) {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full"
      });
      messages.push(full.data);
    }
    return messages;
  } catch (err) {
    logger.error("Failed to fetch messages:", err);
    return [];
  }
}
function isConnected() {
  return !!getClient();
}
function disconnect() {
  oauth2Client = null;
  remove("gmail_tokens");
  remove("gmail_email");
}
function getConnectedEmail() {
  return get("gmail_email");
}
function getTodaySendCount() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const row = getDb().prepare("SELECT count FROM daily_send_log WHERE date = ?").get(today);
  return row?.count ?? 0;
}
function incrementTodaySendCount() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  getDb().prepare(
    `INSERT INTO daily_send_log (date, count) VALUES (?, 1)
       ON CONFLICT(date) DO UPDATE SET count = count + 1`
  ).run(today);
}
function getDailySendHistory(days = 30) {
  return getDb().prepare(
    `SELECT date, count FROM daily_send_log
       ORDER BY date DESC LIMIT ?`
  ).all(days);
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
function autoLink(html) {
  return html.replace(URL_REGEX, (url) => {
    return `<a href="${url}" style="color:#06b6d4;text-decoration:none;">${url}</a>`;
  });
}
function plainTextToHtml(text) {
  const blocks = text.split(/\n\n+/);
  let linkCount = 0;
  const htmlBlocks = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    const lines = trimmed.split("\n");
    const bulletLines = lines.filter((l) => l.trim());
    const isBulletLinkBlock = bulletLines.length > 0 && bulletLines.every((l) => l.trim().startsWith("-") && l.includes("http"));
    if (isBulletLinkBlock) {
      const urls = [];
      for (const line of bulletLines) {
        const parts = line.replace(/^-\s*/, "").split(/\s*\|\s*/);
        for (const part of parts) {
          const u = part.trim();
          if (u.startsWith("http")) urls.push(u);
        }
      }
      const items = urls.map((url) => {
        linkCount++;
        return `<li style="margin:4px 0;"><a href="${url}" style="color:#06b6d4;text-decoration:none;font-weight:500;">Example ${linkCount}</a></li>`;
      }).join("\n");
      return `<ol style="margin:8px 0 8px 0;padding-left:22px;">
${items}
</ol>`;
    }
    const htmlLines = lines.map((line) => autoLink(escapeHtml(line))).join("<br>\n");
    return `<p style="margin:0 0 14px 0;line-height:1.65;">${htmlLines}</p>`;
  });
  const body = htmlBlocks.filter(Boolean).join("\n");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:580px;margin:0 auto;padding:24px 16px;">
${body}
</body>
</html>`;
}
let state = "idle";
let timeoutId = null;
let currentDelay = 0;
let countdownInterval = null;
function emitToRenderer$1(event, data) {
  const windows = electron.BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(event, data);
  }
}
function getRandomDelay() {
  return Math.floor(Math.random() * 21 + 10) * 1e3;
}
function getStatus() {
  return {
    state,
    queuedCount: getQueuedEmailCount(),
    todaySent: getTodaySendCount(),
    dailyLimit: getDailyLimit(),
    currentDelay
  };
}
function start() {
  if (state === "running") return;
  if (!isConnected()) {
    emitToRenderer$1("queue:error", { message: "Gmail not connected" });
    return;
  }
  state = "running";
  emitToRenderer$1("queue:state-change", getStatus());
  processNext();
}
function pause() {
  if (state !== "running") return;
  state = "paused";
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  currentDelay = 0;
  emitToRenderer$1("queue:state-change", getStatus());
}
function resume() {
  if (state !== "paused") return;
  state = "running";
  emitToRenderer$1("queue:state-change", getStatus());
  processNext();
}
function stop() {
  state = "idle";
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  currentDelay = 0;
  emitToRenderer$1("queue:state-change", getStatus());
}
async function processNext() {
  if (state !== "running") return;
  const todaySent = getTodaySendCount();
  const dailyLimit = getDailyLimit();
  if (todaySent >= dailyLimit) {
    logger.info("Daily send limit reached");
    stop();
    emitToRenderer$1("queue:daily-limit-reached", { todaySent, dailyLimit });
    return;
  }
  const email = getNextQueuedEmail();
  if (!email) {
    logger.info("No more queued emails");
    stop();
    emitToRenderer$1("queue:completed", getStatus());
    return;
  }
  try {
    updateEmail(email.id, { status: "sending" });
    emitToRenderer$1("queue:sending", { emailId: email.id, to: email.lead_email });
    const htmlBody = plainTextToHtml(email.body);
    const result = await sendEmail(email.lead_email, email.subject, htmlBody);
    updateEmail(email.id, {
      status: "sent",
      gmail_message_id: result.messageId,
      gmail_thread_id: result.threadId,
      sent_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    incrementTodaySendCount();
    const campaign = getCampaignById(email.campaign_id);
    if (campaign) {
      updateCampaign(email.campaign_id, {
        total_sent: (campaign.total_sent || 0) + 1
      });
    }
    emitToRenderer$1("queue:sent", {
      emailId: email.id,
      to: email.lead_email,
      ...getStatus()
    });
  } catch (err) {
    const error = err;
    logger.error("Failed to send email:", error);
    if (error.code === 429) {
      updateEmail(email.id, { status: "queued" });
      logger.info("Rate limited by Gmail, pausing for 60s");
      emitToRenderer$1("queue:rate-limited", { retryIn: 6e4 });
      currentDelay = 60;
      countdownInterval = setInterval(() => {
        currentDelay--;
        emitToRenderer$1("queue:countdown", { seconds: currentDelay });
        if (currentDelay <= 0 && countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
      }, 1e3);
      timeoutId = setTimeout(() => {
        if (state === "running") processNext();
      }, 6e4);
      return;
    }
    updateEmail(email.id, {
      status: "failed",
      error: error.message
    });
    emitToRenderer$1("queue:send-failed", {
      emailId: email.id,
      error: error.message,
      ...getStatus()
    });
  }
  if (state === "running") {
    const delay = getRandomDelay();
    currentDelay = Math.ceil(delay / 1e3);
    countdownInterval = setInterval(() => {
      currentDelay--;
      emitToRenderer$1("queue:countdown", { seconds: currentDelay });
      if (currentDelay <= 0 && countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    }, 1e3);
    emitToRenderer$1("queue:waiting", { delay, ...getStatus() });
    timeoutId = setTimeout(() => {
      if (state === "running") processNext();
    }, delay);
  }
}
function registerQueueHandlers() {
  electron.ipcMain.handle("queue:getStatus", () => getStatus());
  electron.ipcMain.handle("queue:start", () => start());
  electron.ipcMain.handle("queue:pause", () => pause());
  electron.ipcMain.handle("queue:resume", () => resume());
  electron.ipcMain.handle("queue:stop", () => stop());
}
function registerAuthHandlers() {
  electron.ipcMain.handle("auth:gmailConnect", () => startAuthFlow());
  electron.ipcMain.handle("auth:gmailDisconnect", () => disconnect());
  electron.ipcMain.handle("auth:gmailStatus", () => ({
    connected: isConnected(),
    email: getConnectedEmail()
  }));
}
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
function validateFormat(email) {
  return EMAIL_REGEX.test(email);
}
async function validateMX(email) {
  if (!validateFormat(email)) {
    return { email, valid: false, error: "Invalid email format" };
  }
  const domain = email.split("@")[1];
  try {
    const records = await dns.promises.resolveMx(domain);
    if (records && records.length > 0) {
      return { email, valid: true };
    }
    return { email, valid: false, error: "No MX records found" };
  } catch (err) {
    return { email, valid: false, error: `DNS lookup failed: ${err.message}` };
  }
}
async function validateBatch(emails, onProgress) {
  const results = [];
  const batchSize = 10;
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(validateMX));
    results.push(...batchResults);
    onProgress?.(Math.min(i + batchSize, emails.length), emails.length);
  }
  return results;
}
function registerValidationHandlers() {
  electron.ipcMain.handle(
    "validation:validateEmail",
    (_e, email) => validateMX(email)
  );
  electron.ipcMain.handle("validation:validateLeads", async (event, leadIds) => {
    const leads = leadIds.map((id) => getLeadById(id)).filter((l) => !!l);
    const emails = leads.map((l) => l.email);
    const results = await validateBatch(emails, (done, total) => {
      event.sender.send("validation:progress", { done, total });
    });
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      updateLead(leads[i].id, {
        email_valid: result.valid ? 1 : 0,
        email_validation_error: result.error || null
      });
    }
    return results;
  });
}
function getAllReplies(classification) {
  let query = `SELECT r.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
    l.email as lead_email, l.company as lead_company, c.name as campaign_name
    FROM replies r
    JOIN leads l ON r.lead_id = l.id
    JOIN emails e ON r.email_id = e.id
    JOIN campaigns c ON e.campaign_id = c.id`;
  const params = [];
  if (classification) {
    query += " WHERE r.classification = ?";
    params.push(classification);
  }
  query += " ORDER BY r.received_at DESC";
  return getDb().prepare(query).all(...params);
}
function getReplyById(id) {
  return getDb().prepare(
    `SELECT r.*, l.first_name as lead_first_name, l.last_name as lead_last_name,
       l.email as lead_email, l.company as lead_company, c.name as campaign_name
       FROM replies r
       JOIN leads l ON r.lead_id = l.id
       JOIN emails e ON r.email_id = e.id
       JOIN campaigns c ON e.campaign_id = c.id
       WHERE r.id = ?`
  ).get(id);
}
function createReply(data) {
  const id = uuid.v4();
  getDb().prepare(
    `INSERT INTO replies (id, email_id, lead_id, gmail_message_id, gmail_thread_id, from_email, subject, body, snippet, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.email_id,
    data.lead_id,
    data.gmail_message_id || null,
    data.gmail_thread_id || null,
    data.from_email || null,
    data.subject || null,
    data.body || null,
    data.snippet || null,
    data.received_at || (/* @__PURE__ */ new Date()).toISOString()
  );
  return getDb().prepare("SELECT * FROM replies WHERE id = ?").get(id);
}
function updateReplyClassification(id, classification, confidence, reasoning) {
  getDb().prepare(
    "UPDATE replies SET classification = ?, classification_confidence = ?, classification_reasoning = ? WHERE id = ?"
  ).run(classification, confidence, reasoning, id);
}
function markReplyRead(id) {
  getDb().prepare("UPDATE replies SET is_read = 1 WHERE id = ?").run(id);
}
function getUnreadReplyCount() {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM replies WHERE is_read = 0").get();
  return row.count;
}
function getReplyStats() {
  const rows = getDb().prepare("SELECT classification, COUNT(*) as count FROM replies WHERE classification IS NOT NULL GROUP BY classification").all();
  const stats = {};
  for (const row of rows) {
    stats[row.classification] = row.count;
  }
  return stats;
}
function replyExistsByGmailId(gmailMessageId) {
  const row = getDb().prepare("SELECT 1 FROM replies WHERE gmail_message_id = ? LIMIT 1").get(gmailMessageId);
  return !!row;
}
function registerDashboardHandlers() {
  electron.ipcMain.handle("dashboard:getStats", () => {
    const leadCount = getLeadCount();
    const emailStats = getEmailStats();
    const unreadReplies = getUnreadReplyCount();
    const replyStats = getReplyStats();
    const campaignCount = getDb().prepare("SELECT COUNT(*) as count FROM campaigns").get().count;
    return {
      totalLeads: leadCount,
      totalCampaigns: campaignCount,
      totalSent: emailStats.sent,
      totalReplies: Object.values(replyStats).reduce((a, b) => a + b, 0),
      unreadReplies,
      replyStats,
      emailStats
    };
  });
  electron.ipcMain.handle("dashboard:getCampaignStats", () => {
    return getDb().prepare(
      `SELECT c.name, c.total_sent, c.total_replied, c.total_interested
         FROM campaigns c ORDER BY c.created_at DESC LIMIT 10`
    ).all();
  });
  electron.ipcMain.handle(
    "dashboard:getSendHistory",
    (_e, days) => getDailySendHistory(days || 30)
  );
  electron.ipcMain.handle("dashboard:getRecentActivity", () => {
    const recentEmails = getDb().prepare(
      `SELECT e.id, e.subject, e.status, e.sent_at, l.first_name, l.email as lead_email
         FROM emails e JOIN leads l ON e.lead_id = l.id
         WHERE e.status = 'sent'
         ORDER BY e.sent_at DESC LIMIT 10`
    ).all();
    const recentReplies = getDb().prepare(
      `SELECT r.id, r.classification, r.received_at, r.snippet,
                l.first_name, l.email as lead_email
         FROM replies r JOIN leads l ON r.lead_id = l.id
         ORDER BY r.received_at DESC LIMIT 10`
    ).all();
    return { recentEmails, recentReplies };
  });
}
let pollInterval = null;
let isPolling = false;
function emitToRenderer(event, data) {
  const windows = electron.BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(event, data);
  }
}
function startPolling() {
  if (pollInterval) return;
  if (!isConnected()) return;
  const interval = getPollInterval();
  logger.info(`Starting inbox polling every ${interval / 1e3}s`);
  pollOnce();
  pollInterval = setInterval(pollOnce, interval);
}
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
function isActive() {
  return !!pollInterval;
}
async function pollOnce() {
  if (isPolling) return;
  isPolling = true;
  try {
    const lastPoll = get("last_poll_time") || void 0;
    const messages = await getNewMessages(lastPoll);
    let newReplies = 0;
    for (const message of messages) {
      const threadId = message.threadId;
      if (!threadId) continue;
      const gmailMessageId = message.id;
      if (!gmailMessageId) continue;
      if (replyExistsByGmailId(gmailMessageId)) continue;
      const sentEmail = getEmailByThreadId(threadId);
      if (!sentEmail) continue;
      if (sentEmail.gmail_message_id === gmailMessageId) continue;
      const headers = message.payload?.headers || [];
      const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from");
      const subjectHeader = headers.find((h) => h.name?.toLowerCase() === "subject");
      const from = fromHeader?.value || "";
      const subject = subjectHeader?.value || "";
      let body = "";
      if (message.payload?.body?.data) {
        body = Buffer.from(message.payload.body.data, "base64url").toString("utf-8");
      } else if (message.payload?.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            body = Buffer.from(part.body.data, "base64url").toString("utf-8");
            break;
          }
        }
      }
      const reply = createReply({
        email_id: sentEmail.id,
        lead_id: sentEmail.lead_id,
        gmail_message_id: gmailMessageId,
        gmail_thread_id: threadId,
        from_email: from,
        subject,
        body,
        snippet: message.snippet || "",
        received_at: message.internalDate ? new Date(parseInt(message.internalDate)).toISOString() : void 0
      });
      if (isConfigured()) {
        try {
          const classification = await classifyReply(
            sentEmail.subject,
            sentEmail.body,
            body
          );
          updateReplyClassification(
            reply.id,
            classification.classification,
            classification.confidence,
            classification.reasoning
          );
          if (classification.classification === "interested") {
            updateLead(sentEmail.lead_id, { status: "interested" });
          } else if (classification.classification === "not_interested") {
            updateLead(sentEmail.lead_id, { status: "not_interested" });
          } else if (classification.classification === "unsubscribe") {
            updateLead(sentEmail.lead_id, { status: "unsubscribed" });
          }
          const campaign = getCampaignById(sentEmail.campaign_id);
          if (campaign) {
            updateCampaign(sentEmail.campaign_id, {
              total_replied: (campaign.total_replied || 0) + 1,
              total_interested: classification.classification === "interested" ? (campaign.total_interested || 0) + 1 : campaign.total_interested
            });
          }
        } catch (err) {
          logger.error("Failed to classify reply:", err);
        }
      }
      newReplies++;
    }
    set("last_poll_time", (/* @__PURE__ */ new Date()).toISOString());
    if (newReplies > 0) {
      emitToRenderer("inbox:new-replies", {
        count: newReplies,
        unreadTotal: getUnreadReplyCount()
      });
    }
  } catch (err) {
    logger.error("Polling error:", err);
  } finally {
    isPolling = false;
  }
}
function registerInboxHandlers() {
  electron.ipcMain.handle(
    "replies:getAll",
    (_e, classification) => getAllReplies(classification)
  );
  electron.ipcMain.handle("replies:getById", (_e, id) => getReplyById(id));
  electron.ipcMain.handle("replies:markRead", (_e, id) => markReplyRead(id));
  electron.ipcMain.handle("replies:getUnreadCount", () => getUnreadReplyCount());
  electron.ipcMain.handle("inbox:isPolling", () => isActive());
  electron.ipcMain.handle("inbox:startPolling", () => startPolling());
  electron.ipcMain.handle("inbox:stopPolling", () => stopPolling());
}
function registerPortfolioHandlers() {
  electron.ipcMain.handle("portfolio:getAll", () => getAllExamples());
  electron.ipcMain.handle("portfolio:create", (_e, data) => createExample(data));
  electron.ipcMain.handle("portfolio:update", (_e, id, data) => updateExample(id, data));
  electron.ipcMain.handle("portfolio:delete", (_e, id) => deleteExample(id));
  electron.ipcMain.handle("portfolio:analyse", (_e, examples, userReply, previousAnalysis) => {
    const niches = getDb().prepare(`SELECT n.name, COUNT(l.id) as leadCount
                FROM niches n LEFT JOIN leads l ON l.niche_id = n.id
                GROUP BY n.id ORDER BY n.name`).all();
    return analysePortfolio(examples, niches, userReply, previousAnalysis);
  });
}
function registerAllHandlers() {
  registerSettingsHandlers();
  registerLeadsHandlers();
  registerTemplatesHandlers();
  registerCampaignsHandlers();
  registerEmailsHandlers();
  registerQueueHandlers();
  registerAuthHandlers();
  registerValidationHandlers();
  registerDashboardHandlers();
  registerInboxHandlers();
  registerPortfolioHandlers();
}
let mainWindow = null;
electron.app.whenReady().then(() => {
  logger.info("ALX Outreach starting...");
  initDatabase();
  registerAllHandlers();
  mainWindow = createMainWindow();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  startPolling();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  stopPolling();
  closeDatabase();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
