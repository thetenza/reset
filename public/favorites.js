// Страница избранного: подставляет сохранённые в браузере товары в адрес и перезагружает.
(() => {
  const page = document.querySelector('[data-fav-page]');
  if (!page || page.dataset.loaded === '1') return;
  let f = []; try { f = JSON.parse(localStorage.getItem('reset:fav') || '[]'); } catch {}
  location.replace(`/favorites?s=${encodeURIComponent(f.join(','))}`);
})();
