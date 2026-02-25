#!/usr/bin/env node
/**
 * ALX Outreach — Production Setup Script
 * Clears all mock data, creates niches, imports all 4 CSVs, creates templates.
 */

import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { homedir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Database paths
const DB_PATHS = [
  join(homedir(), '.config', 'alx-outreach', 'alx-outreach.db'),
  join(homedir(), '.config', 'Electron', 'alx-outreach.db'),
]

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(filePath) {
  const text = readFileSync(filePath, 'utf8')
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim())
    const row = {}
    headers.forEach((h, i) => { row[h] = cols[i] || '' })
    return row
  }).filter(row => row.email)
}

// ─── Name normaliser ─────────────────────────────────────────────────────────
// If first_name looks like a company (contains a space, all-caps acronym, or is
// in the known-company list) → replace with "Team"

const KNOWN_COMPANY_FIRSTNAMES = new Set(['Ducks', 'CCL', 'WGTN'])

function normaliseName(firstName) {
  if (!firstName) return 'Team'
  if (firstName.includes(' ')) return 'Team'                     // multi-word
  if (/^[A-Z]{2,4}$/.test(firstName)) return 'Team'             // all-caps acronym
  if (KNOWN_COMPANY_FIRSTNAMES.has(firstName)) return 'Team'
  return firstName
}

// ─── Templates ───────────────────────────────────────────────────────────────

const PORTFOLIO_LINKS = `- https://drive.google.com/drive/folders/1YvWVehIGqWOWkUGXQjEJOCtKkN9lCIab
- https://www.instagram.com/p/DU4yxlPk4v1/
- https://www.instagram.com/reel/DJVQpPLtIj7/?igsh=ZHd3Z2txbzViMnY1
- https://www.instagram.com/reel/DSHZ0GnkjdB/?igsh=MW40N3R1YWh5Znlkeg==`

const SIGNOFF = `Cheers,\nAlex / ALX Edits / 0204545 4549 / alx.medianz@gmail.com`

// ─── Niches & Templates config ───────────────────────────────────────────────

const NICHES = [
  {
    key: 'concrete',
    name: 'Concrete - Wellington',
    description: 'Wellington concrete companies: driveways, slabs, polished floors, civil',
    color: '#6b7280',
    csvFile: 'wellington-concrete-leads.csv',
    template: {
      name: 'Concrete Companies — Wellington Outreach',
      subject: 'Social Media Content for {{company}} | ALX Edits',
      body: `Hey {{first_name}},

I'm Alex from ALX Edits, a videographer based in Wellington. I create social media content for trades businesses — and concrete work is genuinely some of the best content out there. The pours, polished floors, retaining walls going up, driveways transforming — most companies just aren't capturing this stuff, and it films beautifully.

For about $700 a week, I come in for one day and you've got a full month of content sorted. 8 videos a month, all filmed and edited. I handle everything from content strategy and filming through to editing and posting if you want it.

I've worked with brands across Australia and New Zealand generating over 10 million views. Here are some examples of my work:

${PORTFOLIO_LINKS}

Happy to chat more if you're keen.

${SIGNOFF}`,
    },
  },
  {
    key: 'construction',
    name: 'Construction - Wellington',
    description: 'Wellington builders: residential, commercial, renovations, civil',
    color: '#f59e0b',
    csvFile: 'wellington-construction-leads.csv',
    template: {
      name: 'Construction Companies — Wellington Outreach',
      subject: 'Social Media Content for {{company}} | ALX Edits',
      body: `Hey {{first_name}},

I'm Alex from ALX Edits, a videographer based in Wellington. I create social media content for builders and construction companies — project documentation, timelapse builds, before-and-afters. The kind of footage that shows people exactly what you do and why you're good at it.

For about $700 a week, I come in for one day and you've got a full month of content sorted. 8 videos a month, all filmed and edited. I handle everything from content strategy and filming through to editing and posting if you want it.

I've worked with brands across Australia and New Zealand generating over 10 million views. Here are some examples of my work:

${PORTFOLIO_LINKS}

Happy to chat more if you're keen.

${SIGNOFF}`,
    },
  },
  {
    key: 'realestate-offices',
    name: 'Real Estate Offices - Wellington',
    description: 'Wellington real estate agencies and office contacts',
    color: '#3b82f6',
    csvFile: 'wellington-realestate-leads.csv',
    template: {
      name: 'Real Estate Offices — Wellington Outreach',
      subject: 'Social Media Content for {{company}} | ALX Edits',
      body: `Hey {{first_name}},

I'm Alex from ALX Edits, a videographer based in Wellington. I work with real estate agencies to produce social media content — property walkthroughs, agent profiles, office culture videos, and listing reels that actually get engagement.

For about $700 a week, I come in for one day and your whole team has a full month of content sorted. 8 videos a month, all filmed and edited. I handle everything from content strategy and filming through to editing and posting if you want it.

I've worked with brands across Australia and New Zealand generating over 10 million views. Here are some examples of my work:

${PORTFOLIO_LINKS}

Happy to chat more if you're keen.

${SIGNOFF}`,
    },
  },
  {
    key: 'realestate-agents',
    name: 'Real Estate Agents - Wellington',
    description: 'Individual Wellington real estate agents',
    color: '#8b5cf6',
    csvFile: 'wellington-agents-leads.csv',
    template: {
      name: 'Real Estate Agents — Wellington Outreach',
      subject: 'Social Media Content for {{first_name}} {{last_name}} | ALX Edits',
      body: `Hey {{first_name}},

I'm Alex from ALX Edits, a videographer based in Wellington. I create social media content for real estate agents — listing videos, personal brand reels, and property walkthroughs that help you stand out and win more appraisals.

For about $700 a week, I come in for one day and you've got a full month of content sorted. 8 videos a month, all filmed and edited. I handle everything from content strategy and filming through to editing and posting if you want it.

I've worked with brands across Australia and New Zealand generating over 10 million views. Here are some examples of my work:

${PORTFOLIO_LINKS}

Happy to chat more if you're keen.

${SIGNOFF}`,
    },
  },
]

// ─── Main ────────────────────────────────────────────────────────────────────

function setupDatabase(dbPath) {
  console.log(`\n📦 Setting up: ${dbPath}`)
  let db
  try {
    db = new Database(dbPath)
  } catch (e) {
    console.log(`   ⚠️  Cannot open (does not exist yet): ${dbPath}`)
    return
  }

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // ── 1. Clear all data ───────────────────────────────────────────────────
  console.log('   🗑️  Clearing mock data...')
  db.exec(`
    DELETE FROM ai_usage_log;
    DELETE FROM daily_send_log;
    DELETE FROM replies;
    DELETE FROM emails;
    DELETE FROM campaign_leads;
    DELETE FROM campaigns;
    DELETE FROM leads;
    DELETE FROM templates;
    DELETE FROM niches;
  `)
  console.log('   ✅ All tables cleared')

  // ── 2. Create niches & templates, import leads ──────────────────────────
  const insertNiche = db.prepare(`
    INSERT INTO niches (id, name, description, color)
    VALUES (?, ?, ?, ?)
  `)
  const insertTemplate = db.prepare(`
    INSERT INTO templates (id, niche_id, name, subject, body)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertLead = db.prepare(`
    INSERT OR IGNORE INTO leads (id, niche_id, first_name, last_name, email, company, website, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
  `)

  let totalLeads = 0

  for (const niche of NICHES) {
    const nicheId = randomUUID()
    insertNiche.run(nicheId, niche.name, niche.description, niche.color)
    console.log(`\n   📁 Niche: ${niche.name}`)

    const templateId = randomUUID()
    insertTemplate.run(templateId, nicheId, niche.template.name, niche.template.subject, niche.template.body)
    console.log(`   📝 Template: ${niche.template.name}`)

    const csvPath = join(ROOT, niche.csvFile)
    let rows
    try {
      rows = parseCSV(csvPath)
    } catch (e) {
      console.log(`   ⚠️  Could not read ${niche.csvFile}: ${e.message}`)
      continue
    }

    let count = 0
    const insertMany = db.transaction(() => {
      for (const row of rows) {
        const rawFirst = row.first_name || ''
        const firstName = normaliseName(rawFirst)
        const lastName = row.last_name || ''
        const email = (row.email || '').toLowerCase().trim()
        const company = row.company || ''
        const website = row.website || ''
        const notes = row.notes || ''

        if (!email) continue

        insertLead.run(randomUUID(), nicheId, firstName, lastName, email, company, website, notes)
        count++
      }
    })
    insertMany()

    totalLeads += count
    console.log(`   👥 Imported ${count} leads from ${niche.csvFile}`)
  }

  db.close()
  console.log(`\n   ✅ Done — ${totalLeads} total leads imported`)
}

// Run on all DB paths
for (const dbPath of DB_PATHS) {
  setupDatabase(dbPath)
}

console.log('\n🚀 Production setup complete. Launch the app with: npm run dev\n')
