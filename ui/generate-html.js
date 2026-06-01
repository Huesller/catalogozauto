const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('../utils/format');

function readAsset(relPath) {
  return fs.readFileSync(path.join(__dirname, relPath), 'utf8');
}

/**
 * Generate standalone catalog HTML with embedded product JSON + assets.
 */
function generateCatalogHtml(catalogo, produtos, options = {}) {
  const { id, nome, marca } = catalogo;
  const isIndex = Boolean(options.isIndex);
  const catalogos = Array.isArray(options.catalogos) ? options.catalogos : [];
  const backHref = options.backHref;
  const backLabel = options.backLabel || '← Voltar';
  const vendedores = options.vendedores || [
    { nome: 'Vendedor 1', whatsapp: options.whatsNum1 || options.whatsNum || '' },
    { nome: 'Vendedor 2', whatsapp: options.whatsNum2 || '' },
  ];
  const dataGeracao = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const css = readAsset('catalog.css');
  const cartJs = readAsset('../cart/cart.js');
  const catalogJs = readAsset('catalog.js');

  const productsJson = JSON.stringify(produtos).replace(/</g, '\\u003c');

  const configJson = JSON.stringify({
    id,
    nome,
    marca,
    vendedores,
    catalogos,
    isIndex,
    pageSize: 24,
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(nome)} | Z Automotiva</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>${css}</style>
</head>
<body>

<header class="topbar">
  <div class="topbar-left">
    <img class="topbar-logo" src="../logo.png" alt="Z Automotiva" onerror="this.style.display='none'"/>
    <div class="topbar-title">Z <span>Automotiva</span> · ${escapeHtml(marca || nome)}</div>
  </div>
  <div class="topbar-right">
    <span class="data-gen">Atualizado: ${escapeHtml(dataGeracao)}</span>
    ${backHref ? `<a class="back-btn" href="${escapeHtml(backHref)}">${escapeHtml(backLabel)}</a>` : ''}
  </div>
</header>

${isIndex && catalogos.length ? `
<section class="catalogos-nav" aria-label="Catálogos disponíveis">
  ${catalogos
    .map((cat) => `
    <a class="catalogo-link ${cat.erro ? 'erro' : ''}" href="${escapeHtml(cat.href || `${cat.id}.html`)}">
      <strong>${escapeHtml(cat.nome)}</strong>
      <span>ID ${escapeHtml(cat.id)} · ${escapeHtml(String(cat.total || 0))} produtos</span>
    </a>`)
    .join('')}
</section>` : ''}

<div class="toolbar">
  <input class="busca-input" id="buscaInput" type="search" placeholder="Buscar por código, código fabricante, descrição, marca ou catálogo..." autocomplete="off"/>
  <div class="filters">
    <select id="filterMarca" aria-label="Filtrar por marca"><option value="">Marca</option></select>
    <input id="filterPrecoMin" type="number" min="0" step="0.01" placeholder="Preço mín." aria-label="Preço mínimo"/>
    <input id="filterPrecoMax" type="number" min="0" step="0.01" placeholder="Preço máx." aria-label="Preço máximo"/>
    <select id="filterSort" aria-label="Ordenar">
      <option value="name-asc">Nome A-Z</option>
      <option value="name-desc">Nome Z-A</option>
      <option value="price-asc">Menor preço</option>
      <option value="price-desc">Maior preço</option>
    </select>
  </div>
  <span class="total-badge" id="totalBadge">0 produtos</span>
</div>

<div class="main">
  <section class="produtos-area" aria-label="Produtos">
    <div class="produtos-grid" id="produtosGrid"></div>
    <nav class="pagination-bar" id="paginationBar" aria-label="Paginação do catálogo"></nav>
  </section>

  <aside class="cart-panel" aria-label="Carrinho">
    <div class="cart-header">
      <h2 id="cartTitle">Carrinho (0 itens)</h2>
      <p>Adicione itens e envie o pedido pelo WhatsApp.</p>
      <p id="cartTotal" class="cart-count"></p>
    </div>
    <div class="cart-list" id="cartList"></div>
    <div class="cart-empty" id="cartEmpty">
      <p>Seu carrinho está vazio.<br/>Use <strong>Adicionar</strong> nos produtos.</p>
    </div>
    <div class="cart-footer">
      <button type="button" class="btn-whats" data-whats-index="0" disabled>Enviar para Vendedor 1</button>
      <button type="button" class="btn-whats" data-whats-index="1" disabled>Enviar para Vendedor 2</button>
      <button type="button" class="btn-clear" id="btnClear">Limpar carrinho</button>
    </div>
  </aside>
</div>

<div class="toast" id="toast" role="status"></div>

<script id="catalog-data" type="application/json">${productsJson}</script>
<script>window.CATALOG_CONFIG = ${configJson};</script>
<script>${cartJs}</script>
<script>${catalogJs}</script>
</body>
</html>`;
}

/**
 * Copy shared assets next to generated catalogs for optional external hosting.
 */
function copyAssetsToOutput(outputDir) {
  const assetsDir = path.join(outputDir, 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  for (const [src, name] of [
    ['catalog.css', 'catalog.css'],
    ['catalog.js', 'catalog.js'],
    ['../cart/cart.js', 'cart.js'],
  ]) {
    fs.writeFileSync(path.join(assetsDir, name), readAsset(src), 'utf8');
  }
}

module.exports = { generateCatalogHtml, copyAssetsToOutput };
