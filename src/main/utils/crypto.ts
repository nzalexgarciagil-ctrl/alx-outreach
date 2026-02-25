import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { machineIdSync } from './machine-id'

const ALGORITHM = 'aes-256-gcm'

function deriveKey(): Buffer {
  const machineId = machineIdSync()
  return scryptSync(machineId, 'alx-outreach-salt', 32)
}

export function encrypt(text: string): string {
  const key = deriveKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decrypt(data: string): string {
  const key = deriveKey()
  const [ivHex, authTagHex, encrypted] = data.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
