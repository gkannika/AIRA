/**
 * Minimal leveled logger. Swap for winston/pino in production if needed.
 */
const levelColor = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  debug: '\x1b[90m',
};
const reset = '\x1b[0m';

function log(level, ...args) {
  const color = levelColor[level] || '';
  const time = new Date().toISOString();
  console.log(`${color}[${time}] [${level.toUpperCase()}]${reset}`, ...args);
}

module.exports = {
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
  debug: (...args) => {
    if (process.env.DEBUG === 'true') log('debug', ...args);
  },
};
