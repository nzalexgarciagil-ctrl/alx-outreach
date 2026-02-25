import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'

export interface CSVRow {
  first_name: string
  last_name?: string
  email: string
  company?: string
  website?: string
  phone?: string
  notes?: string
}

const COLUMN_MAP: Record<string, keyof CSVRow> = {
  'first name': 'first_name',
  'firstname': 'first_name',
  'first_name': 'first_name',
  'name': 'first_name',
  'last name': 'last_name',
  'lastname': 'last_name',
  'last_name': 'last_name',
  'surname': 'last_name',
  'email': 'email',
  'email address': 'email',
  'email_address': 'email',
  'company': 'company',
  'company name': 'company',
  'company_name': 'company',
  'organization': 'company',
  'website': 'website',
  'url': 'website',
  'site': 'website',
  'phone': 'phone',
  'phone number': 'phone',
  'phone_number': 'phone',
  'tel': 'phone',
  'notes': 'notes',
  'note': 'notes',
  'comment': 'notes',
  'comments': 'notes'
}

export function parseCSVFile(filePath: string): { rows: CSVRow[]; errors: string[] } {
  const content = readFileSync(filePath, 'utf-8')
  return parseCSVContent(content)
}

export function parseCSVContent(content: string): { rows: CSVRow[]; errors: string[] } {
  const errors: string[] = []
  const rows: CSVRow[] = []

  let records: Record<string, string>[]
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    })
  } catch (err) {
    return { rows: [], errors: [`Failed to parse CSV: ${(err as Error).message}`] }
  }

  if (records.length === 0) {
    return { rows: [], errors: ['CSV file is empty'] }
  }

  // Map columns
  const headers = Object.keys(records[0])
  const mapping: Record<string, keyof CSVRow> = {}
  for (const header of headers) {
    const normalized = header.toLowerCase().trim()
    if (COLUMN_MAP[normalized]) {
      mapping[header] = COLUMN_MAP[normalized]
    }
  }

  if (!Object.values(mapping).includes('email')) {
    return { rows: [], errors: ['No email column found in CSV'] }
  }
  if (!Object.values(mapping).includes('first_name')) {
    return { rows: [], errors: ['No name/first_name column found in CSV'] }
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const row: Partial<CSVRow> = {}

    for (const [header, field] of Object.entries(mapping)) {
      const value = record[header]?.trim()
      if (value) {
        row[field] = value
      }
    }

    if (!row.email) {
      errors.push(`Row ${i + 2}: Missing email`)
      continue
    }
    if (!row.first_name) {
      errors.push(`Row ${i + 2}: Missing name`)
      continue
    }

    // Handle "Full Name" in first_name if no last_name
    if (row.first_name && !row.last_name && row.first_name.includes(' ')) {
      const parts = row.first_name.split(' ')
      row.first_name = parts[0]
      row.last_name = parts.slice(1).join(' ')
    }

    rows.push(row as CSVRow)
  }

  return { rows, errors }
}
