import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'

export function machineIdSync(): string {
  try {
    if (existsSync('/etc/machine-id')) {
      return readFileSync('/etc/machine-id', 'utf8').trim()
    }
    if (process.platform === 'win32') {
      const output = execSync(
        'reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
        { encoding: 'utf8' }
      )
      const match = output.match(/MachineGuid\s+REG_SZ\s+(.+)/)
      if (match) return match[1].trim()
    }
    if (process.platform === 'darwin') {
      const output = execSync(
        "ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/'",
        { encoding: 'utf8' }
      )
      const match = output.match(/"IOPlatformUUID"\s*=\s*"(.+?)"/)
      if (match) return match[1]
    }
  } catch {
    // fallback
  }
  return 'alx-outreach-fallback-machine-id'
}
