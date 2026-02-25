export interface TemplateVars {
  first_name: string
  last_name?: string
  company?: string
  website?: string
  niche?: string
  [key: string]: string | undefined
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? `{{${key}}}`
  })
}

export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || []
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))]
}

export function getSampleVars(): TemplateVars {
  return {
    first_name: 'John',
    last_name: 'Smith',
    company: 'Acme Corp',
    website: 'acmecorp.com',
    niche: 'Real Estate'
  }
}
