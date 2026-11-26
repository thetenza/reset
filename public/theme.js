// Тема ставится до отрисовки страницы, чтобы не было вспышки светлого фона.
(function () {
  try { var t = localStorage.getItem('reset:theme'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; } catch (e) {}
})();
