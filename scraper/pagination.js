const log = require('../utils/logger');
const { extractProductsFromPage, getTotalPages } = require('./extract');

async function waitForCatalogPage(page, url) {
  // networkidle pode falhar em páginas lentas ou na última página — usa domcontentloaded como fallback
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (err) {
    log.warn('networkidle timeout — retrying with domcontentloaded', { url, error: err.message });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (err2) {
      log.error('page load failed completely', { url, error: err2.message });
      throw err2;
    }
  }

  // Aguarda cards ou paginação — se não aparecer, continua mesmo assim (página pode estar vazia)
  try {
    await page.waitForSelector('.v-card, .v-pagination', { timeout: 20000 });
  } catch {
    log.warn('cards selector timeout — continuing anyway', { url });
  }

  // Scroll para forçar lazy load de imagens
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = Math.max(280, document.body.scrollHeight / 24);
    for (let pos = 0; pos <= document.body.scrollHeight + step; pos += step) {
      window.scrollTo(0, pos);
      await delay(350);
    }
    window.scrollTo(0, 0);
    await delay(400);
  });

  await page.waitForTimeout(1200);
}

async function scrapeAllPages(page, catalogoId, defaultMarca, { saveDebugHtml, debugPath }) {
  const baseUrl = `https://sistema.zettabrasil.com.br/siggma/catalogos/200-3/id/${catalogoId}?p=true`;
  let pagina = 1;
  let totalPages = null;
  const todosProdutos = [];
  const seen = new Set();

  while (true) {
    const url = `${baseUrl}&page=${pagina}`;
    log.info('scraping page', { catalogoId, pagina, url });

    try {
      await waitForCatalogPage(page, url);
    } catch (err) {
      log.error('page load failed — stopping pagination', { pagina, error: err.message });
      if (pagina === 1) throw err; // falha fatal na primeira página
      break; // nas demais, apenas encerra
    }

    if (pagina === 1 && saveDebugHtml && debugPath) {
      const fs = require('fs');
      try {
        fs.writeFileSync(debugPath, await page.content(), 'utf8');
      } catch (e) {
        log.warn('could not save debug html', { error: e.message });
      }
    }

    // Detecta total de páginas na primeira página
    if (totalPages == null) {
      try {
        totalPages = await getTotalPages(page);
        log.info('pagination detected', { totalPages });
      } catch {
        totalPages = 999; // fallback: continua até página vazia
      }
    }

    let produtos = [];
    try {
      produtos = await extractProductsFromPage(page, defaultMarca);
    } catch (err) {
      log.error('extract failed on page — continuing', { pagina, error: err.message });
      produtos = [];
    }

    log.info('page products', { pagina, count: produtos.length });

    if (!produtos.length) {
      log.info('empty page — end of catalog', { pagina });
      break;
    }

    for (const p of produtos) {
      const key = `${p.marca || defaultMarca || ''}|${p.cod || ''}|${p.codFab || ''}|${p.nome || ''}`.toLowerCase();
      if (!key.replace(/\|/g, '').trim() || seen.has(key)) continue;
      seen.add(key);
      todosProdutos.push(p);
    }

    if (pagina >= totalPages) {
      log.info('reached last page', { pagina, totalPages });
      break;
    }

    pagina++;
  }

  log.info('scrape complete', { catalogoId, unique: todosProdutos.length, pages: pagina });
  return todosProdutos;
}

module.exports = { scrapeAllPages, waitForCatalogPage };