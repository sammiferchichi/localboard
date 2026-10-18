type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }
let currentLevel: Level = 'info'

export function setLogLevel(level: Level): void { currentLevel = level }

function log(level: Level, ...args: unknown[]): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return
  const prefix = `[LB ${level.toUpperCase()}]`
  queueMicrotask(() => {
    switch (level) {
      case 'error': console.error(prefix, ...args); break
      case 'warn': console.warn(prefix, ...args); break
      default: console.log(prefix, ...args); break
    }
  })
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
}
