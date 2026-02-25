#!/usr/bin/env python3
"""
ALX Outreach — Production Setup Script
Clears all mock data, creates niches, imports all 4 CSVs, creates templates.
Uses Python's built-in sqlite3 — no native module issues.
"""

import sqlite3
import csv
import os
import re
import uuid
from pathlib import Path

ROOT = Path(__file__).parent.parent
HOME = Path.home()

DB_PATHS = [
    HOME / '.config' / 'alx-outreach' / 'alx-outreach.db',
    HOME / '.config' / 'Electron' / 'alx-outreach.db',
]

# ─── Schema (matches src/main/database/schema.ts) ────────────────────────────

SCHEMA = """
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
"""

# ─── Name normaliser ─────────────────────────────────────────────────────────

KNOWN_COMPANY_FIRSTNAMES = {'Ducks', 'CCL', 'WGTN'}

def normalise_name(first_name: str) -> str:
    if not first_name:
        return 'Team'
    if ' ' in first_name:          # multi-word = company name
        return 'Team'
    if re.match(r'^[A-Z]{2,4}$', first_name):  # all-caps acronym
        return 'Team'
    if first_name in KNOWN_COMPANY_FIRSTNAMES:
        return 'Team'
    return first_name

# ─── Portfolio links / sign-off ───────────────────────────────────────────────

PORTFOLIO_LINKS = """- https://drive.google.com/drive/folders/1YvWVehIGqWOWkUGXQjEJOCtKkN9lCIab  |  https://www.instagram.com/p/DU4yxlPk4v1/
- https://www.instagram.com/reel/DJVQpPLtIj7/?igsh=ZHd3Z2txbzViMnY1  |  https://www.instagram.com/reel/DSHZ0GnkjdB/?igsh=MW40N3R1YWh5Znlkeg==""".strip()

SIGNOFF = "Cheers,\nAlex / ALX Edits / 0204545 4549 / alx.medianz@gmail.com"

# ─── Niches, templates, CSV files ────────────────────────────────────────────

NICHES = [
    {
        'name': 'Concrete - Wellington',
        'description': 'Wellington concrete companies: driveways, slabs, polished floors, civil',
        'color': '#6b7280',
        'csv': 'wellington-concrete-leads.csv',
        'template_name': 'Concrete Companies — Wellington Outreach',
        'subject': 'Social Media Content for {{company}} | ALX Edits',
        'body': f"""Hey {{{{first_name}}}},

I'm Alex from ALX Edits, a videographer based in Wellington. I create social media content for trades businesses — and concrete work is genuinely some of the best content out there. The pours, polished floors, retaining walls going up, driveways transforming — most companies just aren't capturing this stuff, and it films beautifully.

For about $700 a week, I come in for one day and you've got a full month of content sorted. 8 videos a month, all filmed and edited. I handle everything from content strategy and filming through to editing and posting if you want it.

I've worked with brands across Australia and New Zealand generating over 10 million views. Here are some examples of my work:

{PORTFOLIO_LINKS}

Happy to chat more if you're keen.

{SIGNOFF}""",
    },
    {
        'name': 'Construction - Wellington',
        'description': 'Wellington builders: residential, commercial, renovations, civil',
        'color': '#f59e0b',
        'csv': 'wellington-construction-leads.csv',
        'template_name': 'Construction Companies — Wellington Outreach',
        'subject': 'Social Media Content for {{company}} | ALX Edits',
        'body': f"""Hey {{{{first_name}}}},

I'm Alex from ALX Edits, a videographer based in Wellington. I create social media content for builders and construction companies — project documentation, timelapse builds, before-and-afters. The kind of footage that shows people exactly what you do and why you're good at it.

For about $700 a week, I come in for one day and you've got a full month of content sorted. 8 videos a month, all filmed and edited. I handle everything from content strategy and filming through to editing and posting if you want it.

I've worked with brands across Australia and New Zealand generating over 10 million views. Here are some examples of my work:

{PORTFOLIO_LINKS}

Happy to chat more if you're keen.

{SIGNOFF}""",
    },
    {
        'name': 'Real Estate Offices - Wellington',
        'description': 'Wellington real estate agencies and office contacts',
        'color': '#3b82f6',
        'csv': 'wellington-realestate-leads.csv',
        'template_name': 'Real Estate Offices — Wellington Outreach',
        'subject': 'Social Media Content for {{company}} | ALX Edits',
        'body': f"""Hey {{{{first_name}}}},

I'm Alex from ALX Edits, a videographer based in Wellington. I work with real estate agencies to produce social media content — property walkthroughs, agent profiles, office culture videos, and listing reels that actually get engagement.

For about $700 a week, I come in for one day and your whole team has a full month of content sorted. 8 videos a month, all filmed and edited. I handle everything from content strategy and filming through to editing and posting if you want it.

I've worked with brands across Australia and New Zealand generating over 10 million views. Here are some examples of my work:

{PORTFOLIO_LINKS}

Happy to chat more if you're keen.

{SIGNOFF}""",
    },
    {
        'name': 'Real Estate Agents - Wellington',
        'description': 'Individual Wellington real estate agents',
        'color': '#8b5cf6',
        'csv': 'wellington-agents-leads.csv',
        'template_name': 'Real Estate Agents — Wellington Outreach',
        'subject': 'Social Media Content for {{first_name}} {{last_name}} | ALX Edits',
        'body': f"""Hey {{{{first_name}}}},

I'm Alex from ALX Edits, a videographer based in Wellington. I create social media content for real estate agents — listing videos, personal brand reels, and property walkthroughs that help you stand out and win more appraisals.

For about $700 a week, I come in for one day and you've got a full month of content sorted. 8 videos a month, all filmed and edited. I handle everything from content strategy and filming through to editing and posting if you want it.

I've worked with brands across Australia and New Zealand generating over 10 million views. Here are some examples of my work:

{PORTFOLIO_LINKS}

Happy to chat more if you're keen.

{SIGNOFF}""",
    },
]

# ─── Setup one database ───────────────────────────────────────────────────────

def setup_database(db_path: Path):
    print(f"\n📦 Setting up: {db_path}")

    if not db_path.exists():
        print(f"   ⚠️  DB does not exist — creating fresh at {db_path}")
        db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    conn.commit()

    # ── 1. Clear all data ────────────────────────────────────────────────────
    print("   🗑️  Clearing mock data...")
    conn.executescript("""
        DELETE FROM ai_usage_log;
        DELETE FROM daily_send_log;
        DELETE FROM replies;
        DELETE FROM emails;
        DELETE FROM campaign_leads;
        DELETE FROM campaigns;
        DELETE FROM leads;
        DELETE FROM templates;
        DELETE FROM niches;
    """)
    conn.commit()
    print("   ✅ All tables cleared")

    total_leads = 0

    for niche in NICHES:
        niche_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO niches (id, name, description, color) VALUES (?, ?, ?, ?)",
            (niche_id, niche['name'], niche['description'], niche['color'])
        )
        print(f"\n   📁 Niche: {niche['name']}")

        template_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO templates (id, niche_id, name, subject, body) VALUES (?, ?, ?, ?, ?)",
            (template_id, niche_id, niche['template_name'], niche['subject'], niche['body'])
        )
        print(f"   📝 Template: {niche['template_name']}")

        csv_path = ROOT / niche['csv']
        if not csv_path.exists():
            print(f"   ⚠️  CSV not found: {csv_path}")
            continue

        count = 0
        with open(csv_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                email = (row.get('email') or '').strip().lower()
                if not email:
                    continue
                first_name = normalise_name((row.get('first_name') or '').strip())
                last_name = (row.get('last_name') or '').strip()
                company = (row.get('company') or '').strip()
                website = (row.get('website') or '').strip()
                notes = (row.get('notes') or '').strip()

                conn.execute(
                    """INSERT OR IGNORE INTO leads
                       (id, niche_id, first_name, last_name, email, company, website, notes, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')""",
                    (str(uuid.uuid4()), niche_id, first_name, last_name,
                     email, company, website, notes)
                )
                count += 1

        conn.commit()
        total_leads += count
        print(f"   👥 Imported {count} leads from {niche['csv']}")

    conn.close()
    print(f"\n   ✅ Done — {total_leads} total leads imported")

# ─── Main ─────────────────────────────────────────────────────────────────────

for db_path in DB_PATHS:
    setup_database(db_path)

print("\n🚀 Production setup complete. Launch the app with: npm run dev\n")
