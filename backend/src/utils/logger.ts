type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: string;
}

const formatLog = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  err?: unknown
): void => {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
    ...(err instanceof Error ? { error: err.stack || err.message } : {}),
  };

  const output = JSON.stringify(payload);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
};

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    formatLog('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    formatLog('warn', message, context),
  error: (message: string, err?: unknown, context?: Record<string, unknown>) =>
    formatLog('error', message, context, err),
};
