const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'scraper.log');

function timestamp() {
  return new Date().toISOString();
}

function write(level, message, meta = {}) {
  const line = `[${timestamp()}] [${level}] ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch {
    // never stop collection because of log I/O
  }
}

module.exports = {
  info: (msg, meta) => write('INFO', msg, meta),
  warn: (msg, meta) => write('WARN', msg, meta),
  error: (msg, meta) => write('ERROR', msg, meta),
};
