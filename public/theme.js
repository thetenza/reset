// Тема и цвет оформления ставятся до отрисовки, чтобы не было вспышки.
(function () {
  try {
    var t = localStorage.getItem('reset:theme'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
    if (localStorage.getItem('reset:accent') === 'green') document.documentElement.dataset.accent = 'green';
  } catch (e) {}
})();
