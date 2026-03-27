export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  source?: string;
  msg: string;
  meta?: unknown;
}

const MAX_ENTRIES = 5000;
const buffer: LogEntry[] = [];

const LEVELS: Record<LogLevel, number> = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };
let minLevel: LogLevel = 'DEBUG';

function formatConsoleArgs(e: LogEntry) {
  const time = new Date(e.ts).toISOString();
  const label = `[${time}] [${e.level}]${e.source ? ` [${e.source}]` : ''}`;
  return [label, e.msg, e.meta ?? ''];
}

function shouldLog(level: LogLevel) {
  return LEVELS[level] >= LEVELS[minLevel];
}

function push(entry: LogEntry) {
  if (!shouldLog(entry.level)) return;

  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);

  const args = formatConsoleArgs(entry);
  try {
    if (entry.level === 'ERROR') console.error(...args);
    else if (entry.level === 'WARN') console.warn(...args);
    else if (entry.level === 'INFO') console.info(...args);
    else console.debug(...args);
  } catch {
    // swallow logging errors
  }
}

export const logger = {
  debug: (source: string | undefined, msg: string, meta?: unknown) =>
    push({ ts: Date.now(), level: 'DEBUG', source, msg, meta }),
  info: (source: string | undefined, msg: string, meta?: unknown) =>
    push({ ts: Date.now(), level: 'INFO', source, msg, meta }),
  warn: (source: string | undefined, msg: string, meta?: unknown) =>
    push({ ts: Date.now(), level: 'WARN', source, msg, meta }),
  error: (source: string | undefined, msg: string, meta?: unknown) =>
    push({ ts: Date.now(), level: 'ERROR', source, msg, meta }),
  getLogs: (): LogEntry[] => buffer.slice(),
  clear: () => {
    buffer.splice(0, buffer.length);
  },
  download: (fileName = `reaction-trainer-debug-${Date.now()}.json`) => {
    try {
      const blob = new Blob([JSON.stringify(buffer, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore in non-browser environments
    }
  },
  setLevel: (level: LogLevel) => {
    if (LEVELS[level] !== undefined) minLevel = level;
  },
  getLevel: (): LogLevel => minLevel,
  setDebugEnabled: (enabled: boolean) => {
    minLevel = enabled ? 'DEBUG' : 'INFO';
  },
};

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ELATA_LOGGER__ = {
    getLogs: logger.getLogs,
    download: logger.download,
    clear: logger.clear,
    setLevel: logger.setLevel,
    getLevel: logger.getLevel,
  };
}

export default logger;
