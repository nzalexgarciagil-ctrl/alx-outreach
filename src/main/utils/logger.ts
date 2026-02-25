const log = (level: string, ...args: unknown[]) => {
  const timestamp = new Date().toISOString()
  console[level as 'log' | 'warn' | 'error'](`[${timestamp}] [${level.toUpperCase()}]`, ...args)
}

export const logger = {
  info: (...args: unknown[]) => log('log', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args)
}
