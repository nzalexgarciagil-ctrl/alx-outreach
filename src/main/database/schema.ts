export const SCHEMA = `
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
`
