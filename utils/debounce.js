/**
 * Debounce helper (browser + Node).
 */
function debounce(fn, ms = 300) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

if (typeof module !== 'undefined') module.exports = { debounce };
