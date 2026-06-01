const BASE_URL = 'https://sistema.zettabrasil.com.br';

function parsePrecoNum(valor) {
  if (valor == null || valor === '') return null;
  const s = String(valor)
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatPrecoBR(valor) {
  const n = parsePrecoNum(valor);
  if (n == null) return '';
  return 'R$ ' + n.toFixed(2).replace('.', ',');
}

function absolutizePath(relPath) {
  if (!relPath) return '';
  const clean = String(relPath).replace(/\\/g, '');
  if (clean.startsWith('http')) return clean;
  return BASE_URL + (clean.startsWith('/') ? clean : '/' + clean);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  BASE_URL,
  parsePrecoNum,
  formatPrecoBR,
  absolutizePath,
  escapeHtml,
};
