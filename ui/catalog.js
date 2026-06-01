/**
 * Catalog UI: search, filters, sort, pagination, cart integration.
 */
(function () {
  const cfg = window.CATALOG_CONFIG || {};
  const catalogId = cfg.id || 'default';
  const PAGE_SIZE = cfg.pageSize || 24;

  const els = {
    grid: document.getElementById('produtosGrid'),
    busca: document.getElementById('buscaInput'),
    marcaFilter: document.getElementById('filterMarca'),
    precoMin: document.getElementById('filterPrecoMin'),
    precoMax: document.getElementById('filterPrecoMax'),
    sort: document.getElementById('filterSort'),
    totalBadge: document.getElementById('totalBadge'),
    cartList: document.getElementById('cartList'),
    cartEmpty: document.getElementById('cartEmpty'),
    cartTitle: document.getElementById('cartTitle'),
    cartTotal: document.getElementById('cartTotal'),
    btnWhats: Array.from(document.querySelectorAll('[data-whats-index]')),
    btnClear: document.getElementById('btnClear'),
    toast: document.getElementById('toast'),
    pagination: document.getElementById('paginationBar'),
  };

  let products = [];
  let filtered = [];
  let currentPage = 1;
  let toastTimer;

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function showToast(msg, ok) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.className = 'toast show' + (ok ? ' ok' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  function parsePreco(p) {
    if (p?.precoNum != null) return p.precoNum;
    if (!p?.preco) return null;
    const s = String(p.preco).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  function populateMarcaFilter() {
    if (!els.marcaFilter) return;
    const marcas = [...new Set(products.map((p) => p.marca).filter(Boolean))].sort();
    els.marcaFilter.innerHTML =
      '<option value="">Todas as marcas</option>' +
      marcas.map((m) => `<option value="${escapeAttr(m)}">${escapeHtml(m)}</option>`).join('');
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function applyFilters() {
    const q = (els.busca?.value || '').toLowerCase().trim();
    const marca = els.marcaFilter?.value || '';
    const min = els.precoMin?.value ? parseFloat(els.precoMin.value) : null;
    const max = els.precoMax?.value ? parseFloat(els.precoMax.value) : null;
    const sort = els.sort?.value || '';

    filtered = products.filter((p) => {
      const hay = (p.searchText || `${p.nome} ${p.desc} ${p.cod} ${p.codFab} ${p.marca} ${p.catalogo}`).toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (marca && p.marca !== marca) return false;
      const price = parsePreco(p);
      if (min != null && price != null && price < min) return false;
      if (max != null && price != null && price > max) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const pa = parsePreco(a) ?? 0;
      const pb = parsePreco(b) ?? 0;
      const na = (a.nome || '').toLowerCase();
      const nb = (b.nome || '').toLowerCase();
      switch (sort) {
        case 'price-asc':
          return pa - pb;
        case 'price-desc':
          return pb - pa;
        case 'name-desc':
          return nb.localeCompare(na);
        case 'name-asc':
        default:
          return na.localeCompare(nb);
      }
    });

    currentPage = 1;
    render();
  }

  function productKey(p) {
    return `${p.catalogoId || catalogId}|${p.marca || ''}|${p.cod || ''}|${p.codFab || ''}|${p.nome || ''}`;
  }

  function renderCard(p) {
    const key = productKey(p);
    const preco = p.preco || (p.precoNum != null ? `R$ ${p.precoNum.toFixed(2).replace('.', ',')}` : '');
    const img = p.imgSrc || '';
    return `
      <article class="prod-card" data-product-key="${escapeAttr(key)}"
        data-cod="${escapeAttr(p.cod)}" data-cod-fab="${escapeAttr(p.codFab)}"
        data-nome="${escapeAttr(p.nome)}" data-marca="${escapeAttr(p.marca)}">
        <div class="prod-img${img ? '' : ' sem-img'}">
          ${img ? `<img src="${escapeAttr(img)}" alt="" loading="lazy" decoding="async">` : '<span class="no-img">Sem imagem</span>'}
        </div>
        <div class="prod-body">
          <div class="prod-desc">${escapeHtml(p.nome)}</div>
          <div class="prod-meta">
            ${p.catalogo ? `<span>Catálogo: <b>${escapeHtml(p.catalogo)}</b></span>` : ''}
            ${p.marca ? `<span>Marca: <b>${escapeHtml(p.marca)}</b></span>` : ''}
            ${p.cod ? `<span>Código: <b>${escapeHtml(p.cod)}</b></span>` : ''}
            ${p.codFab ? `<span>Cód. fab.: <b>${escapeHtml(p.codFab)}</b></span>` : ''}
          </div>
          <div class="prod-preco${preco ? '' : ' empty'}">${preco || 'Consulte'}</div>
        </div>
        <div class="prod-footer">
          <div class="qty-control" role="group" aria-label="Quantidade">
            <button type="button" class="qty-btn" data-action="minus" aria-label="Diminuir">−</button>
            <span class="qty-num">1</span>
            <button type="button" class="qty-btn" data-action="plus" aria-label="Aumentar">+</button>
          </div>
          <button type="button" class="btn-add">Adicionar</button>
        </div>
      </article>`;
  }

  function render() {
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > pages) currentPage = pages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);

    if (els.totalBadge) {
      els.totalBadge.textContent = `${total} produto${total !== 1 ? 's' : ''}`;
    }

    if (!els.grid) return;

    if (!total) {
      els.grid.innerHTML = '<p class="cart-empty">Nenhum produto encontrado.</p>';
    } else {
      els.grid.innerHTML = slice.map(renderCard).join('');
      els.grid.querySelectorAll('.prod-img img').forEach((img) => {
        const onLoad = () => img.classList.add('loaded');
        if (img.complete) onLoad();
        else {
          img.addEventListener('load', onLoad, { once: true });
          img.addEventListener('error', () => {
            img.style.display = 'none';
            img.parentElement?.classList.add('sem-img');
          }, { once: true });
        }
      });
    }

    renderPagination(pages);
    renderCart();
  }

  function renderPagination(pages) {
    if (!els.pagination) return;
    if (pages <= 1) {
      els.pagination.innerHTML = '';
      return;
    }

    const btns = [];
    btns.push(`<button type="button" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`);

    const windowSize = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(pages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    for (let i = start; i <= end; i++) {
      btns.push(
        `<button type="button" data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`
      );
    }

    btns.push(`<button type="button" data-page="next" ${currentPage >= pages ? 'disabled' : ''}>›</button>`);
    els.pagination.innerHTML = btns.join('');
  }

  function renderCart() {
    const items = window.ZCart.load(catalogId);
    const pieces = window.ZCart.totalPieces(items);

    if (els.cartTitle) {
      els.cartTitle.textContent = `Carrinho (${pieces} ${pieces === 1 ? 'item' : 'itens'})`;
    }

    if (els.cartTotal) {
      els.cartTotal.textContent = pieces
        ? items.map((i) => `${i.qty}x ${window.ZCart.displayCode(i)}`).join(' · ')
        : '';
    }

    if (!els.cartList) return;

    if (!items.length) {
      els.cartList.innerHTML = '';
      if (els.cartEmpty) els.cartEmpty.style.display = 'flex';
      els.btnWhats.forEach((btn) => { btn.disabled = true; });
      return;
    }

    if (els.cartEmpty) els.cartEmpty.style.display = 'none';
    els.btnWhats.forEach((btn) => { btn.disabled = false; });

    els.cartList.innerHTML = items
      .map(
        (item, idx) => `
      <div class="cart-item" data-idx="${idx}">
        <div class="cart-item-top">
          <span class="cart-item-code">${escapeHtml(window.ZCart.displayCode(item))}</span>
          <div class="qty-control">
            <button type="button" class="qty-btn" data-cart-action="minus" data-idx="${idx}">−</button>
            <span class="qty-num">${item.qty}</span>
            <button type="button" class="qty-btn" data-cart-action="plus" data-idx="${idx}">+</button>
          </div>
          <button type="button" class="qty-btn" data-cart-action="remove" data-idx="${idx}" aria-label="Remover">×</button>
        </div>
        ${item.nome ? `<div class="cart-item-name">${escapeHtml(item.nome)}</div>` : ''}
      </div>`
      )
      .join('');
  }

  function bindEvents() {
    const debouncedFilter = debounce(applyFilters, 280);
    els.busca?.addEventListener('input', debouncedFilter);
    els.marcaFilter?.addEventListener('change', applyFilters);
    els.precoMin?.addEventListener('input', debouncedFilter);
    els.precoMax?.addEventListener('input', debouncedFilter);
    els.sort?.addEventListener('change', applyFilters);

    els.grid?.addEventListener('click', (e) => {
      const card = e.target.closest('.prod-card');
      if (!card) return;

      const key = card.dataset.productKey;
      const product = products.find((p) => productKey(p) === key);
      if (!product) return;

      if (e.target.closest('.qty-btn')) {
        const action = e.target.dataset.action;
        const numEl = card.querySelector('.qty-num');
        let n = parseInt(numEl.textContent, 10) || 1;
        if (action === 'plus') n = Math.min(99, n + 1);
        if (action === 'minus') n = Math.max(1, n - 1);
        numEl.textContent = String(n);
        return;
      }

      if (e.target.closest('.btn-add')) {
        const qty = parseInt(card.querySelector('.qty-num')?.textContent || '1', 10) || 1;
        window.ZCart.add(catalogId, product, qty);
        renderCart();
        showToast(`${window.ZCart.displayCode(product)} adicionado`, true);
      }
    });

    els.cartList?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cart-action]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      const items = window.ZCart.load(catalogId);
      const item = items[idx];
      if (!item) return;

      if (btn.dataset.cartAction === 'remove') {
        window.ZCart.remove(catalogId, idx);
      } else if (btn.dataset.cartAction === 'plus') {
        window.ZCart.setQty(catalogId, idx, item.qty + 1);
      } else if (btn.dataset.cartAction === 'minus') {
        window.ZCart.setQty(catalogId, idx, item.qty - 1);
      }
      renderCart();
    });

    els.btnClear?.addEventListener('click', () => {
      window.ZCart.clear(catalogId);
      renderCart();
      showToast('Carrinho limpo');
    });

    els.btnWhats.forEach((btn) => {
      btn.addEventListener('click', () => {
        const items = window.ZCart.load(catalogId);
        if (!items.length) return;

        const idx = Number(btn.dataset.whatsIndex || 0);
        const vendedores = Array.isArray(cfg.vendedores) ? cfg.vendedores : [];
        const vendedor = vendedores[idx] || {};
        if (vendedor.nome) btn.textContent = `Enviar para ${vendedor.nome}`;
        const numero = String(vendedor.whatsapp || '').replace(/\D/g, '');

        if (!numero) {
          showToast('Número do WhatsApp não configurado');
          return;
        }

        const msg = window.ZCart.buildWhatsAppMessage(items);
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
      });
    });

    els.pagination?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-page]');
      if (!btn || btn.disabled) return;
      const pages = Math.ceil(filtered.length / PAGE_SIZE);
      const p = btn.dataset.page;
      if (p === 'prev') currentPage = Math.max(1, currentPage - 1);
      else if (p === 'next') currentPage = Math.min(pages, currentPage + 1);
      else currentPage = parseInt(p, 10);
      render();
      document.querySelector('.produtos-area')?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function init() {
    const dataEl = document.getElementById('catalog-data');
    if (dataEl) {
      try {
        products = JSON.parse(dataEl.textContent);
      } catch {
        products = [];
      }
    }
    filtered = [...products];
    els.btnWhats.forEach((btn) => {
      const idx = Number(btn.dataset.whatsIndex || 0);
      const vendedor = Array.isArray(cfg.vendedores) ? cfg.vendedores[idx] : null;
      if (vendedor?.nome) btn.textContent = `Enviar para ${vendedor.nome}`;
    });
    populateMarcaFilter();
    bindEvents();
    applyFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
