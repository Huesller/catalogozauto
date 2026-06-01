/**
 * Shopping cart with localStorage persistence (browser).
 */
(function (global) {
  const STORAGE_PREFIX = 'zautomotiva_cart_';

  function storageKey(catalogId) {
    return STORAGE_PREFIX + String(catalogId || 'default');
  }

  function load(catalogId) {
    try {
      const raw = localStorage.getItem(storageKey(catalogId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save(catalogId, items) {
    try {
      localStorage.setItem(storageKey(catalogId), JSON.stringify(items));
    } catch {
      /* quota / private mode */
    }
  }

  function lineKey(item) {
    return `${item.marca || ''}|${item.cod || ''}|${item.codFab || ''}|${item.nome || ''}`;
  }

  function add(catalogId, product, qty = 1) {
    const items = load(catalogId);
    const key = lineKey(product);
    const existing = items.find((i) => lineKey(i) === key);
    if (existing) {
      existing.qty += qty;
    } else {
      items.unshift({
        cod: product.cod,
        codFab: product.codFab,
        nome: product.nome,
        marca: product.marca,
        catalogo: product.catalogo,
        catalogoId: product.catalogoId,
        qty: Math.max(1, qty),
      });
    }
    save(catalogId, items);
    return items;
  }

  function setQty(catalogId, index, qty) {
    const items = load(catalogId);
    if (index < 0 || index >= items.length) return items;
    if (qty <= 0) items.splice(index, 1);
    else items[index].qty = qty;
    save(catalogId, items);
    return items;
  }

  function remove(catalogId, index) {
    const items = load(catalogId);
    items.splice(index, 1);
    save(catalogId, items);
    return items;
  }

  function clear(catalogId) {
    save(catalogId, []);
    return [];
  }

  function totalPieces(items) {
    return items.reduce((s, i) => s + (i.qty || 0), 0);
  }

  function displayCode(item) {
    if (item.cod && item.codFab) return `${item.cod} / ${item.codFab}`;
    return item.cod || item.codFab || '—';
  }

  function buildWhatsAppMessage(items) {
    const lines = ['Olá, gostaria de solicitar:', ''];
    items.forEach((item) => {
      lines.push(`${item.qty}x ${displayCode(item)}${item.nome ? ` - ${item.nome}` : ''}${item.marca ? ` (${item.marca})` : ''}`);
    });
    lines.push('');
    lines.push(`Total de itens: ${totalPieces(items)}`);
    return lines.join('\n');
  }

  global.ZCart = {
    load,
    save,
    add,
    setQty,
    remove,
    clear,
    totalPieces,
    displayCode,
    buildWhatsAppMessage,
    storageKey,
  };
})(typeof window !== 'undefined' ? window : global);
