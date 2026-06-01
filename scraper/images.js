const { absolutizePath } = require('../utils/format');
const log = require('../utils/logger');

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><rect fill="#f0f0f0" width="220" height="220"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="sans-serif" font-size="14">Sem imagem</text></svg>'
  );

const BASE_FILES = 'https://sistema.zettabrasil.com.br/siggma/catalogos/200/files?type=item&name=';

function cleanUrl(raw) {
  if (!raw) return '';
  const url = String(raw)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();

  if (!url || url === 'null' || url === 'undefined') return '';
  return absolutizePath(url);
}

function pushCandidate(candidates, raw) {
  const url = cleanUrl(raw);
  if (url && /^https?:\/\//i.test(url) && !url.includes('undefined') && !url.includes('null')) {
    candidates.push(url);
  }
}

/**
 * Resolve product image URL with multiple fallbacks from JSON and DOM.
 */
function resolveImageUrl({ imgSrc, imgMin, imagem, foto, image, img, src, url, cod, codFab }) {
  const candidates = [];

  [imgSrc, imgMin, imagem, foto, image, img, src, url].forEach((candidate) => {
    if (Array.isArray(candidate)) candidate.forEach((item) => pushCandidate(candidates, item));
    else pushCandidate(candidates, candidate);
  });

  // Fallbacks do padrão de arquivos da Zetta.
  [cod, codFab]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .forEach((code) => {
      candidates.push(`${BASE_FILES}${encodeURIComponent(code)}-min.jpg`);
      candidates.push(`${BASE_FILES}${encodeURIComponent(code)}.jpg`);
      candidates.push(`${BASE_FILES}${encodeURIComponent(code)}-min.png`);
      candidates.push(`${BASE_FILES}${encodeURIComponent(code)}.png`);
    });

  const unique = [...new Set(candidates)];
  const found = unique.find((candidate) => /^https?:\/\//i.test(candidate));
  if (found) return found;

  log.warn('image capture failure — using placeholder', { cod, codFab });
  return PLACEHOLDER;
}

module.exports = {
  PLACEHOLDER,
  resolveImageUrl,
};
