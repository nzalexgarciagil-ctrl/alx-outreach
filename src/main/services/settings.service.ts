import * as settingsRepo from '../database/repositories/settings.repo'
import { encrypt, decrypt } from '../utils/crypto'

const ENCRYPTED_KEYS = ['gmail_tokens', 'gemini_api_key']

export function get(key: string): string | null {
  const value = settingsRepo.getSetting(key)
  if (value && ENCRYPTED_KEYS.includes(key)) {
    try {
      return decrypt(value)
    } catch {
      return null
    }
  }
  return value
}

export function set(key: string, value: string): void {
  const storedValue = ENCRYPTED_KEYS.includes(key) ? encrypt(value) : value
  settingsRepo.setSetting(key, storedValue)
}

export function getAll(): Record<string, string> {
  const all = settingsRepo.getAllSettings()
  for (const key of ENCRYPTED_KEYS) {
    if (all[key]) {
      try {
        all[key] = decrypt(all[key])
      } catch {
        all[key] = ''
      }
    }
  }
  return all
}

export function remove(key: string): void {
  settingsRepo.deleteSetting(key)
}

export function getDailyLimit(): number {
  const val = settingsRepo.getSetting('daily_send_limit')
  return val ? parseInt(val, 10) : 100
}

export function getPollInterval(): number {
  const val = settingsRepo.getSetting('poll_interval_ms')
  return val ? parseInt(val, 10) : 180000 // 3 minutes
}
