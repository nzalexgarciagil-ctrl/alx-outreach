/**
 * Converts plain text email body to clean HTML for sending via Gmail.
 * - Paragraphs (double newline) → <p> tags
 * - Single newlines → <br>
 * - Lines starting with "- " containing URLs → numbered clickable links
 * - Bare URLs elsewhere → clickable <a> tags
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g

function autoLink(html: string): string {
  return html.replace(URL_REGEX, (url) => {
    return `<a href="${url}" style="color:#06b6d4;text-decoration:none;">${url}</a>`
  })
}

function extractUrls(line: string): string[] {
  const urls: string[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(URL_REGEX.source, 'g')
  while ((match = re.exec(line)) !== null) {
    urls.push(match[1])
  }
  return urls
}

export function plainTextToHtml(text: string): string {
  const blocks = text.split(/\n\n+/)
  let linkCount = 0

  const htmlBlocks = blocks.map((block) => {
    const trimmed = block.trim()
    if (!trimmed) return ''

    const lines = trimmed.split('\n')

    // Detect a portfolio/link block: all non-empty lines start with "- " and contain URLs
    const bulletLines = lines.filter((l) => l.trim())
    const isBulletLinkBlock =
      bulletLines.length > 0 &&
      bulletLines.every((l) => l.trim().startsWith('-') && l.includes('http'))

    if (isBulletLinkBlock) {
      // Extract all URLs (lines may have two URLs split by |)
      const urls: string[] = []
      for (const line of bulletLines) {
        const parts = line.replace(/^-\s*/, '').split(/\s*\|\s*/)
        for (const part of parts) {
          const u = part.trim()
          if (u.startsWith('http')) urls.push(u)
        }
      }

      const items = urls
        .map((url) => {
          linkCount++
          return `<li style="margin:4px 0;"><a href="${url}" style="color:#06b6d4;text-decoration:none;font-weight:500;">Example ${linkCount}</a></li>`
        })
        .join('\n')

      return `<ol style="margin:8px 0 8px 0;padding-left:22px;">\n${items}\n</ol>`
    }

    // Regular block — convert newlines to <br> and auto-link URLs
    const htmlLines = lines
      .map((line) => autoLink(escapeHtml(line)))
      .join('<br>\n')

    return `<p style="margin:0 0 14px 0;line-height:1.65;">${htmlLines}</p>`
  })

  const body = htmlBlocks.filter(Boolean).join('\n')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:580px;margin:0 auto;padding:24px 16px;">
${body}
</body>
</html>`
}
