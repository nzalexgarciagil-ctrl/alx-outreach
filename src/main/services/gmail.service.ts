import { google, gmail_v1 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { shell } from 'electron'
import { logger } from '../utils/logger'
import * as settingsService from './settings.service'

let oauth2Client: OAuth2Client | null = null

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email'
]

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = settingsService.get('google_client_id') || process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret =
    settingsService.get('google_client_secret') || process.env.GOOGLE_CLIENT_SECRET || ''
  return { clientId, clientSecret }
}

function createOAuth2Client(redirectUri: string): OAuth2Client {
  const { clientId, clientSecret } = getCredentials()
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export async function startAuthFlow(): Promise<{ email: string }> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url!, `http://localhost:${port}`)
        const code = url.searchParams.get('code')

        if (!code) {
          res.writeHead(400)
          res.end('No authorization code received')
          return
        }

        const { tokens } = await oauth2Client!.getToken(code)
        oauth2Client!.setCredentials(tokens)

        // Save tokens
        settingsService.set('gmail_tokens', JSON.stringify(tokens))

        // Get user email
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client! })
        const userInfo = await oauth2.userinfo.get()
        const email = userInfo.data.email || ''
        settingsService.set('gmail_email', email)

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          '<html><body style="background:#0a0a0f;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1>Connected!</h1><p>You can close this window and return to ALX Outreach.</p></div></body></html>'
        )

        server.close()
        resolve({ email })
      } catch (err) {
        res.writeHead(500)
        res.end('Authentication failed')
        server.close()
        reject(err)
      }
    })

    let port: number
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (typeof address === 'object' && address) {
        port = address.port
      }

      const redirectUri = `http://127.0.0.1:${port}`
      oauth2Client = createOAuth2Client(redirectUri)

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
      })

      shell.openExternal(authUrl)
    })

    server.on('error', reject)

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close()
      reject(new Error('OAuth flow timed out'))
    }, 300000)
  })
}

export function getClient(): OAuth2Client | null {
  if (oauth2Client) return oauth2Client

  const tokensStr = settingsService.get('gmail_tokens')
  if (!tokensStr) return null

  try {
    const tokens = JSON.parse(tokensStr)
    // We need a redirect URI but it doesn't matter for token refresh
    oauth2Client = createOAuth2Client('http://127.0.0.1')
    oauth2Client.setCredentials(tokens)

    oauth2Client.on('tokens', (newTokens) => {
      const existing = JSON.parse(settingsService.get('gmail_tokens') || '{}')
      const merged = { ...existing, ...newTokens }
      settingsService.set('gmail_tokens', JSON.stringify(merged))
    })

    return oauth2Client
  } catch (err) {
    logger.error('Failed to restore Gmail tokens:', err)
    return null
  }
}

export function getGmailClient(): gmail_v1.Gmail | null {
  const client = getClient()
  if (!client) return null
  return google.gmail({ version: 'v1', auth: client })
}

export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<{ messageId: string; threadId: string }> {
  const gmail = getGmailClient()
  if (!gmail) throw new Error('Gmail not connected')

  const senderEmail = settingsService.get('gmail_email') || ''
  const raw = createRawMessage(senderEmail, to, subject, htmlBody)

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  })

  return {
    messageId: response.data.id || '',
    threadId: response.data.threadId || ''
  }
}

function createRawMessage(from: string, to: string, subject: string, html: string): string {
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html
  ]
  const message = messageParts.join('\r\n')
  return Buffer.from(message).toString('base64url')
}

export async function getNewMessages(sinceTimestamp?: string): Promise<gmail_v1.Schema$Message[]> {
  const gmail = getGmailClient()
  if (!gmail) return []

  let query = 'in:inbox'
  if (sinceTimestamp) {
    const epochSeconds = Math.floor(new Date(sinceTimestamp).getTime() / 1000)
    query += ` after:${epochSeconds}`
  }

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50
    })

    if (!response.data.messages) return []

    const messages: gmail_v1.Schema$Message[] = []
    for (const msg of response.data.messages) {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full'
      })
      messages.push(full.data)
    }

    return messages
  } catch (err) {
    logger.error('Failed to fetch messages:', err)
    return []
  }
}

export function isConnected(): boolean {
  return !!getClient()
}

export function disconnect(): void {
  oauth2Client = null
  settingsService.remove('gmail_tokens')
  settingsService.remove('gmail_email')
}

export function getConnectedEmail(): string | null {
  return settingsService.get('gmail_email')
}
