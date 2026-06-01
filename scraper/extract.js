const log = require('../utils/logger');
const { formatPrecoBR, parsePrecoNum, absolutizePath } = require('../utils/format');
const { resolveImageUrl } = require('./images');

/**
 * Extract products from embedded Vue catalogo JSON (most reliable).
 */
function parseCatalogoFromHtml(html, defaultMarca) {
  const match = html.match(/catalogo:\s*JSON\.parse\(decodeURIComponent\('([^']+)'\)\)/);
  if (!match) return null;

  try {
    const catalogo = JSON.parse(decodeURIComponent(match[1]));
    if (!catalogo?.itens?.length) return null;

    return catalogo.itens.map((item) => {
      const d = item.detalhes || {};
      const cod = String(d.proCodOri || '').trim();
      const codFab = String(d.codFabricacao || '').trim();
      const marca = String(d.marca || defaultMarca || '').trim();
      const preco = d.valor !== undefined && d.valor !== null ? formatPrecoBR(d.valor) : '';
      const precoNum = parsePrecoNum(d.valor);

      const imgSrc = resolveImageUrl({
        imgMin: item.imgMin,
        imgSrc: item.img,
        imagem: item.imagem || item.image || d.imagem || d.image,
        foto: item.foto || d.foto,
        img: item.img,
        cod,
        codFab,
      });

      if (!preco && d.valor === undefined) {
        log.warn('price capture failure', { cod, codFab });
      }

      return {
        cod,
        codFab,
        nome: String(item.descricao || '').trim(),
        desc: String(item.descricao || '').trim(),
        marca,
        preco,
        precoNum,
        imgSrc,
      };
    });
  } catch (err) {
    log.error('JSON catalogo parse failed', { error: err.message });
    return null;
  }
}

/**
 * DOM fallback when JSON is unavailable.
 */
async function extractFromDom(page, defaultMarca) {
  return page.evaluate((defaultMarca) => {
    function extractImageFromCard(card, cod) {
      const tryUrl = (raw) => {
        if (!raw) return '';
        const u = String(raw).replace(/&quot;/g, '"').trim();
        return u.startsWith('http') ? u : '';
      };

      for (const div of card.querySelectorAll('.v-image__image')) {
        const style = div.getAttribute('style') || '';
        const m = style.match(/url\(["']?(https?[^"')]+)["']?\)/i);
        if (m?.[1]) return tryUrl(m[1]);
      }

      const img = card.querySelector('img');
      if (img) {
        for (const a of ['currentSrc', 'src', 'data-src', 'data-original', 'data-lazy-src']) {
          const v = img.getAttribute(a) || img[a];
          const ok = tryUrl(v);
          if (ok) return ok;
        }
      }

      if (cod) {
        return `https://sistema.zettabrasil.com.br/siggma/catalogos/200/files?type=item&name=${cod}-min.jpg`;
      }
      return '';
    }

      const lista = [];
      const cards = document.querySelectorAll('.v-card.v-sheet');

      cards.forEach((card) => {
        const subtitles = card.querySelectorAll('.v-list-item__subtitle');
        let cod = '';
        let codFab = '';
        let marcaProd = '';

        subtitles.forEach((el) => {
          const txt = (el.innerText || '').trim();
          const codMatch = txt.match(/^C[oó]digo:\s*(.+)$/i);
          if (codMatch) cod = codMatch[1].trim();
          const fabMatch = txt.match(/C[oó]digo\s+(?:de\s+)?Fabrica[cç][aã]o:\s*(.+)/i);
          if (fabMatch) codFab = fabMatch[1].trim();
          const marcaMatch = txt.match(/^Marca:\s*(.+)/i);
          if (marcaMatch) marcaProd = marcaMatch[1].trim();
        });

        const nome =
          card.querySelector('.v-list-item__title b, .v-list-item__title')?.innerText?.trim() || '';

        const precoEl = card.querySelector(
          'span[title="Valor"] .v-chip__content b, span[title="Valor"] b, .v-chip__content b'
        );
        const preco = precoEl ? precoEl.innerText.trim() : '';

        let imgSrc = extractImageFromCard(card, cod);

        if (cod || nome) {
          lista.push({
            cod,
            codFab,
            nome,
            desc: nome,
            marca: marcaProd || defaultMarca || '',
            preco,
            precoNum: null,
            imgSrc: imgSrc || '',
          });
        }
      });

      return lista;
  }, defaultMarca);
}

async function extractProductsFromPage(page, defaultMarca) {
  const html = await page.content();
  let produtos = parseCatalogoFromHtml(html, defaultMarca);

  if (produtos?.length) {
    log.info('extracted via embedded JSON', { count: produtos.length });
    return produtos.map((p) => ({
      ...p,
      imgSrc: resolveImageUrl(p),
    }));
  }

  log.warn('JSON not found — DOM fallback');
  produtos = await extractFromDom(page, defaultMarca);
  return produtos.map((p) => ({
    ...p,
    precoNum: parsePrecoNum(p.preco) ?? parsePrecoNum(String(p.preco || '').replace(/R\$\s*/i, '')),
    imgSrc: resolveImageUrl(p),
  }));
}

async function getTotalPages(page) {
  const pages = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const m = html.match(/\bpages:\s*(\d+)/);
    if (m) return parseInt(m[1], 10);

    const items = [...document.querySelectorAll('.v-pagination__item')];
    const nums = items
      .map((el) => parseInt(el.textContent.trim(), 10))
      .filter((n) => Number.isFinite(n));
    return nums.length ? Math.max(...nums) : 1;
  });
  return pages || 1;
}

module.exports = {
  extractProductsFromPage,
  getTotalPages,
  parseCatalogoFromHtml,
};
