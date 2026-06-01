// ============================================================
// Z Automotiva — Scraper de Catálogos Zetta
// Uso: npm run scrape  ou  node scraper.js
// ============================================================

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const log = require('./utils/logger');
const { scrapeAllPages } = require('./scraper/pagination');
const { generateCatalogHtml, copyAssetsToOutput } = require('./ui/generate-html');

// ─── CONFIGURAÇÃO ────────────────────────────────────────────
// Para adicionar novos catálogos, basta incluir um novo objeto aqui.
// A ordem abaixo é a ordem que será processada e exibida no index.html.
const CATALOGOS = [
  { id: '1436', nome: 'MARCA RETOV', marca: 'RETOV' },
  { id: '1438', nome: 'MARCA RIDA', marca: 'RIDA' },
  { id: '1494', nome: 'MARCA TYC', marca: 'TYC' },
  { id: '1493', nome: 'MARCA RETROVISORES TYC', marca: 'RETROVISORES TYC' },
  { id: '1437', nome: 'MARCA Z AUTO', marca: 'Z AUTO' },
];

const VENDEDORES = [
  { nome: 'Vendedor 1', whatsapp: '554733054401' },
  { nome: 'Vendedor 2', whatsapp: '5547999999999' },
];

const OUTPUT_DIR = path.join(__dirname, 'catalogo-gerado');
const DEBUG_HTML = path.join(__dirname, 'pagina-debug.html');
// ─────────────────────────────────────────────────────────────

function ensureCleanOutputDir() {
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function normalizeProductForCatalog(produto, catalogo) {
  const cod = String(produto.cod || '').trim();
  const codFab = String(produto.codFab || '').trim();
  const nome = String(produto.nome || produto.desc || '').trim();
  const marca = String(produto.marca || catalogo.marca || '').trim();
  const catalogoNome = String(catalogo.nome || '').trim();

  return {
    ...produto,
    cod,
    codFab,
    nome,
    desc: String(produto.desc || nome).trim(),
    marca,
    catalogo: catalogoNome,
    catalogoId: catalogo.id,
    searchText: `${cod} ${codFab} ${nome} ${marca} ${catalogoNome}`.toLowerCase(),
  };
}

async function main() {
  ensureCleanOutputDir();
  copyAssetsToOutput(OUTPUT_DIR);

  log.info('Z Automotiva scraper started', { output: OUTPUT_DIR, catalogos: CATALOGOS.length });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
  });

  const todosProdutos = [];
  const resumoCatalogos = [];

  for (const catalogo of CATALOGOS) {
    log.info('processing catalog', { id: catalogo.id, nome: catalogo.nome });
    const page = await context.newPage();

    try {
      const produtosBrutos = await scrapeAllPages(page, catalogo.id, catalogo.marca, {
        saveDebugHtml: true,
        debugPath: DEBUG_HTML,
      });

      const produtos = produtosBrutos.map((p) => normalizeProductForCatalog(p, catalogo));

      log.info('products extracted', { id: catalogo.id, count: produtos.length });

      const html = generateCatalogHtml(catalogo, produtos, {
        vendedores: VENDEDORES,
        backHref: './index.html',
        backLabel: '← Todos os catálogos',
      });

      const outFile = path.join(OUTPUT_DIR, `${catalogo.id}.html`);
      fs.writeFileSync(outFile, html, 'utf8');
      log.info('catalog saved', { file: outFile });

      const jsonFile = path.join(OUTPUT_DIR, `${catalogo.id}.json`);
      fs.writeFileSync(jsonFile, JSON.stringify(produtos, null, 2), 'utf8');

      todosProdutos.push(...produtos);
      resumoCatalogos.push({
        id: catalogo.id,
        nome: catalogo.nome,
        marca: catalogo.marca,
        total: produtos.length,
        href: `${catalogo.id}.html`,
      });
    } catch (err) {
      log.error('catalog failed', { id: catalogo.id, error: err.message });
      resumoCatalogos.push({
        id: catalogo.id,
        nome: catalogo.nome,
        marca: catalogo.marca,
        total: 0,
        href: `${catalogo.id}.html`,
        erro: err.message,
      });
    } finally {
      await page.close();
    }
  }

  const indexHtml = generateCatalogHtml(
    { id: 'index', nome: 'Todos os Catálogos', marca: 'Z Automotiva' },
    todosProdutos,
    {
      vendedores: VENDEDORES,
      isIndex: true,
      catalogos: resumoCatalogos,
      backHref: '',
    }
  );

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml, 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'catalogo-completo.json'), JSON.stringify(todosProdutos, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'catalogos.json'), JSON.stringify(resumoCatalogos, null, 2), 'utf8');

  await browser.close();
  log.info('done', { output: OUTPUT_DIR, totalProducts: todosProdutos.length });
  console.log('\n✅ Concluído! Abra catalogo-gerado/index.html para ver todos os catálogos.');
}

main().catch((err) => {
  log.error('fatal', { error: err.message, stack: err.stack });
  console.error(err);
  process.exit(1);
});
