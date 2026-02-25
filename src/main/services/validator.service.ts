import { promises as dns } from 'dns'
import { logger } from '../utils/logger'

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export interface ValidationResult {
  email: string
  valid: boolean
  error?: string
}

export function validateFormat(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export async function validateMX(email: string): Promise<ValidationResult> {
  if (!validateFormat(email)) {
    return { email, valid: false, error: 'Invalid email format' }
  }

  const domain = email.split('@')[1]
  try {
    const records = await dns.resolveMx(domain)
    if (records && records.length > 0) {
      return { email, valid: true }
    }
    return { email, valid: false, error: 'No MX records found' }
  } catch (err) {
    return { email, valid: false, error: `DNS lookup failed: ${(err as Error).message}` }
  }
}

export async function validateBatch(
  emails: string[],
  onProgress?: (done: number, total: number) => void
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []
  const batchSize = 10

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(validateMX))
    results.push(...batchResults)
    onProgress?.(Math.min(i + batchSize, emails.length), emails.length)
  }

  return results
}
