import { html, raw, paragraphs, formatPrice, formatDate } from './html.js';
import { config } from './config.js';
import { LOGO2 } from './logo.js';
import { wavesSvg } from './waves.js';
import { scenes } from './scenes.js';
import { SORTS } from './catalog.js';

const S = config.support;

// ---------- Иконки и знак ----------
const mark = (cls = 'mark') => raw(`<svg class="${cls}" viewBox="0 0 ${LOGO2.markW} ${LOGO2.h}" aria-hidden="true"><path class="lg1" fill="#ff6a13" fill-rule="evenodd" d="${LOGO2.orange}"/><path class="lg2" fill="#ffa36b" d="${LOGO2.light}"/></svg>`);
// Полный логотип: знак — фирменный оранжевый, надпись — цвет текста (белая в тёмной теме)
// Полный логотип: знак R + надпись. Буквы надписи разнесены (G — отступ от знака, LS — межбуквенный интервал)
const LOGO_WORD = (() => {
  const G = 46, LS = 26;
  return { G, LS, w: LOGO2.w + G + LS * 4, paths: LOGO2.letters.map((d, i) => `<path transform="translate(${G + LS * i} 0)" fill="currentColor" fill-rule="evenodd" d="${d}"/>`).join('') };
})();
const logo = (cls = 'logo-svg') => raw(`<svg class="${cls}" viewBox="-28 -30 ${LOGO_WORD.w + 34} ${LOGO2.h + 72}" role="img" aria-label="${config.brand}"><g transform="translate(206.5 223.5) scale(1.1) translate(-206.5 -214.5)"><path class="lg1" fill="#ff6a13" fill-rule="evenodd" d="${LOGO2.orange}"/><path class="lg2" fill="#ffa36b" d="${LOGO2.light}"/></g>${LOGO_WORD.paths}</svg>`);
const svgIcon = (d, size = 20) => raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`);
const icon = {
  arrow: svgIcon('<path d="M5 12h14M13 6l6 6-6 6"/>', 16),
  chevL: svgIcon('<path d="M15 6l-6 6 6 6"/>', 20),
  chevR: svgIcon('<path d="M9 6l6 6-6 6"/>', 20),
  chevD: svgIcon('<path d="M6 9l6 6 6-6"/>', 16),
  chat: svgIcon('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>', 18),
  help: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.2M12 17h.01"/>', 18),
  user: svgIcon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', 18),
  box: svgIcon('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', 18),
  grid: svgIcon('<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>', 18),
  search: svgIcon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 18),
  heart: svgIcon('<path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9z"/>', 18),
  sun: svgIcon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 18),
  moon: svgIcon('<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>', 18),
  shield: svgIcon('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', 22),
  sort: svgIcon('<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>', 18),
  filter: svgIcon('<path d="M4 6h16M7 12h10M10 18h4"/>', 18),
};
// Значки для плашек и вкладок (простые, без чужих логотипов)
const glyphs = {
  gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 18 3-18"/>',
  gamepad: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 13.5h.01"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
  cube: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-3-5-1s3 1 5 1zm0 0c1.5-3 5-3 5-1s-3 1-5 1z"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>',
  apple: '<path d="M16 3c-1 0-2.5.8-3 2 1.2.1 2.6-.7 3-2zM12 7c-1-.6-2-1-3-1-3 0-5 2.5-5 6 0 4 3 9 5 9 1 0 1.5-.5 3-.5s2 .5 3 .5c2 0 4-4 4.5-6-2-1-3-2.6-3-4.5 0-1.6.9-2.9 2-3.6C17.6 6.4 16.4 6 15 6c-1 0-2 .4-3 1z"/>',
};
// Флаги для выбора языка
const flags = {
  ru: '<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#fff"/><rect y=".667" width="3" height=".667" fill="#1c57d6"/><rect y="1.333" width="3" height=".667" fill="#e0322b"/></svg>',
  en: '<svg viewBox="0 0 60 30"><clipPath id="uk"><path d="M0 0v30h60V0z"/></clipPath><g clip-path="url(#uk)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" stroke-width="3"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
  es: '<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#c60b1e"/><rect y=".5" width="3" height="1" fill="#ffc400"/></svg>',
  de: '<svg viewBox="0 0 3 2"><rect width="3" height=".667" fill="#000"/><rect y=".667" width="3" height=".667" fill="#dd0000"/><rect y="1.333" width="3" height=".667" fill="#ffce00"/></svg>',
  pt: '<svg viewBox="0 0 3 2"><rect width="3" height="2" fill="#da291c"/><rect width="1.2" height="2" fill="#046a38"/><circle cx="1.2" cy="1" r=".32" fill="#ffe900"/></svg>',
};
const langs = [['ru', 'Русский'], ['en', 'English'], ['es', 'Español'], ['de', 'Deutsch'], ['pt', 'Português']];
const glyph = (name, size = 22) => svgIcon(glyphs[name] || glyphs.bolt, size);
// Значки сервисов во вкладках пополнения (упрощённые, заливкой)
const brandIco = {
  steam: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><circle cx="15.5" cy="9" r="3.2" fill="none" stroke="var(--ico-bg,#fff)" stroke-width="1.8"/><circle cx="8.2" cy="15.6" r="2.2" fill="none" stroke="var(--ico-bg,#fff)" stroke-width="1.8"/><path d="M3 13.2l5.2 2.4M10.2 14.6l3.4-3.6" stroke="var(--ico-bg,#fff)" stroke-width="1.8"/></svg>',
  ps: '<svg viewBox="0 0 24 24" width="22" height="20" aria-hidden="true"><text x="12" y="17" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="13" fill="currentColor" font-style="italic">PS</text></svg>',
  gta: '<svg viewBox="0 0 24 24" width="22" height="20" aria-hidden="true"><text x="12" y="18" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="16" fill="currentColor">VI</text></svg>',
  xbox: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7 6.5c2.6 1.8 4.2 3.8 5 5.5.8-1.7 2.4-3.7 5-5.5M6.5 17.5c1.6-2.8 3.6-4.8 5.5-6 1.9 1.2 3.9 3.2 5.5 6" fill="none" stroke="var(--ico-bg,#fff)" stroke-width="1.9" stroke-linecap="round"/></svg>',
  tg: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M21.5 3.5L2.8 10.7c-.9.4-.9 1.6.1 1.9l4.6 1.5 1.8 5.6c.3.8 1.3 1 1.9.4l2.6-2.5 4.6 3.4c.7.5 1.7.1 1.9-.8L23 4.8c.2-1-.6-1.7-1.5-1.3zM9.6 14l8.2-6.5-6.6 7.6-.3 3z" fill="currentColor"/></svg>',
  apple: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M16.6 12.8c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8c-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2-1.1 2.8-2.3.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-.9-2.5-3.5zM14.4 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.6-1.3z" fill="currentColor"/></svg>',
};

const salesLabel = (n) => (n == null ? null : n < 100 ? 'Меньше 100 продаж' : `${new Intl.NumberFormat('ru-RU').format(n)} ${plural(n, 'продажа', 'продажи', 'продаж')}`);
const salesShort = (n) => (n == null ? null : n < 100 ? '<100 продаж' : `${new Intl.NumberFormat('ru-RU').format(n)} ${plural(n, 'продажа', 'продажи', 'продаж')}`);
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };

// ---------- Каркас ----------
export function layout({ title, description, user, body, scripts = [], noindex = false, categories = [], q = '', theme = '', home = false }) {
  return html`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${title ? `${title} — ${config.brand}` : `${config.brand} — игры, подписки и сервисы`}</title>
${description ? html`<meta name="description" content="${description}">` : ''}
${noindex || config.demo ? raw('<meta name="robots" content="noindex">') : ''}
<script src="/static/theme.js"></script>
<link rel="stylesheet" href="/static/styles.css">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
</head>
<body>
<header class="site-header">
  <div class="wrap header-row">
    <a class="logo" href="/" aria-label="${config.brand} — на главную">${logo()}</a>
    <details class="catalog-menu">
      <summary class="btn btn-catalog"><span class="cat-ico-wrap" aria-hidden="true"><span class="ci-grid">${icon.grid}</span><span class="ci-close">${svgIcon('<path d="M6 6l12 12M18 6L6 18"/>', 18)}</span></span><span class="cat-label">Каталог</span></summary>
      <div class="catalog-pop">
        ${categories.map((c) => html`<a class="catalog-item" href="/c/${c.slug}"><span class="cat-ico cat-ico-${c.theme}">${c.name.slice(0, 1)}</span><span><b>${c.name}</b>${c.short ? html`<small>${c.short}</small>` : ''}</span></a>`)}
      </div>
    </details>
    <form class="search" action="/search" method="get" role="search">
      ${icon.search}<input type="search" name="q" value="${q}" placeholder="Найти игру, подписку или сервис" aria-label="Поиск товаров" minlength="2" maxlength="80">
    </form>
    <div class="head-right">
      <details class="region2" data-region>
        <summary class="region2-btn" aria-label="Язык и валюта"><span class="flag" data-region-flag>${raw(flags.ru)}</span><span data-region-label>RU · RUB ₽</span>${icon.chevD}</summary>
        <div class="region2-pop">
          <div class="r2-title">Язык</div>
          <div class="r2-list">${langs.map(([k, v], i) => html`<button type="button" class="r2-opt ${i ? '' : 'is-on'}" data-lang="${k}"><span class="flag">${raw(flags[k])}</span>${v}</button>`)}</div>
          <div class="r2-title">Валюта</div>
          <div class="r2-list r2-cur">${[['RUB', '₽', 'Рубль'], ['USD', '$', 'Доллар'], ['EUR', '€', 'Евро']].map(([k, sy, n], i) => html`<button type="button" class="r2-opt ${i ? '' : 'is-on'}" data-cur="${k}" data-sym="${sy}"><b>${sy}</b>${k} · ${n}</button>`)}</div>
          <p class="r2-note muted small">Перевод и другие валюты появятся позже.</p>
        </div>
      </details>
      <button type="button" class="eclipse" data-theme-toggle role="switch" aria-label="Тёмная тема" title="Светлая / тёмная тема"><span class="ec-track"><span class="ec-sun"></span><span class="ec-moon"></span></span></button>
      <a href="${user ? '/account' : '/login'}" class="hb hb-login">${icon.user}<span>${user ? 'Профиль' : 'Войти'}</span></a>
    </div>
  </div>
  ${!home && categories.length ? html`<nav class="wrap quicknav" aria-label="Категории">
    ${categories.map((c) => html`<a href="/c/${c.slug}" class="qn qn-${c.theme}"><span class="cat-ico cat-ico-${c.theme}">${c.name.slice(0, 1)}</span>${c.name}</a>`)}
  </nav>` : ''}
</header>
<main id="main" class="${theme ? `theme-${theme}` : ''}">${body}</main>
<footer class="site-footer">
  <div class="wrap footer-row">
    <a class="logo" href="/">${logo()}</a>
    <nav class="footer-links" aria-label="Подвал">
      <a href="${categories[0] ? `/c/${categories[0].slug}` : '/'}">Каталог</a>
      <a href="/support">Помощь</a>
      <a href="/docs/rules">Правила</a>
      <a href="/support#contacts">Контакты</a>
    </nav>
    <a class="footer-chat" href="/support" aria-label="Написать в поддержку">${icon.chat}</a>
  </div>
  <div class="wrap footer-bottom muted small">
    <span>© ${new Date().getFullYear()} ${config.brand}. Оплата и выдача товаров — через Digiseller.</span>
    <span><button type="button" class="accent-dot" data-accent-toggle aria-label="Переключить цвет оформления (оранжевый / зелёный)" title="Оранжевый / зелёный стиль"></button> <a href="/docs/offer">Оферта</a> · <a href="/docs/privacy">Конфиденциальность</a>${S.email ? html` · <a href="mailto:${S.email}">${S.email}</a>` : ''}</span>
  </div>
</footer>
${['/static/site.js', ...scripts].map((s) => html`<script src="${s}" defer></script>`)}
</body>
</html>`;
}

// ---------- Карточка товара ----------
export function productCard(p) {
  const img = p.images[0];
  const href = `/p/${p.row.slug}`;
  const sold = salesLabel(p.sales);
  return html`<article class="pcard reveal ${p.state !== 'available' ? 'pcard-off' : ''}">
    <a class="pcard-media" href="${href}" tabindex="-1" aria-hidden="true">
      ${img ? html`<img src="${img}" alt="" loading="lazy">` : html`<span class="media-placeholder">${mark()}</span>`}
      ${p.row.badge ? html`<span class="pbadge">${p.row.badge}</span>` : ''}
      ${p.state === 'unavailable' ? html`<span class="pbadge pbadge-muted">Нет в наличии</span>` : ''}
    </a>
    <button type="button" class="fav" data-fav="${p.row.slug}" aria-label="В избранное" aria-pressed="false">${icon.heart}</button>
    <div class="pcard-body">
      ${p.state === 'error' ? html`<div class="pcard-price pcard-price-err">Цена уточняется</div>`
        : p.live ? html`<div class="pcard-price">${formatPrice(p.live.price, p.live.currency).replace(',00', '')}</div>` : ''}
      <a class="pcard-title" href="${href}">${p.title}</a>
      <div class="pcard-sales" ${sold ? raw(`title="${sold} — по данным Digiseller"`) : ''}>${sold ? salesShort(p.sales) : p.row.kind || ''}</div>
      <a class="btn btn-buy" href="${href}">${p.state === 'available' ? 'Купить' : 'Подробнее'}</a>
    </div>
  </article>`;
}

const grid = (products, empty = 'Товары скоро появятся.') => products.length
  ? html`<div class="pgrid">${products.map(productCard)}</div>`
  : html`<div class="empty"><div class="empty-ico">${mark()}</div><p>${empty}</p></div>`;

function reviewItem(r, showProduct = false) {
  return html`<li class="review">
    <div class="review-head">
      <span class="rating rating-${r.rating_type}">${r.rating_type === 'good' ? 'Положительный' : 'Отрицательный'}</span>
      <span class="muted small">${r.author_public || 'Покупатель'} · ${formatDate(r.review_date)}</span>
    </div>
    ${showProduct ? html`<a class="small" href="/p/${r.slug}">${r.product_title || r.slug}</a>` : ''}
    ${r.text ? html`<p>${r.text}</p>` : ''}
    ${r.seller_reply ? html`<p class="seller-reply"><b>Ответ продавца:</b> ${r.seller_reply}</p>` : ''}
  </li>`;
}

// Баннер раздела в палитре GTA (сцена рисуется кодом; можно заменить своей картинкой в админке)
function viceBanner(cat, { big = false, title, sub, cta } = {}) {
  return html`<a class="vbanner ${big ? 'vbanner-big' : ''}" href="/c/${cat.slug}">
    <span class="vbanner-bg">${cat.banner_image ? html`<img src="${cat.banner_image}" alt="">` : raw(scenes[1])}</span>
    <span class="vbanner-text">
      <span class="vb-eyebrow">${sub || 'Раздел'}</span>
      <span class="vb-title">${title || cat.name}</span>
      ${cta ? html`<span class="btn btn-vice">${cta} ${icon.arrow}</span>` : ''}
    </span>
  </a>`;
}

const heroScene = (name) => name === 'waves'
  ? wavesSvg({ w: 1600, h: 600, lines: 70, colors: ['#ff8a2a', '#ffb36b', '#ffffff', '#ff6a13'], opacity: 0.55, bg: '#141312', seed: 9, cls: 'scene' })
  : scenes[name === 'night' ? 0 : name === 'pier' ? 2 : 1];

// ---------- Главная (вариант 2) ----------
function spotCard(p, big = false) {
  const href = `/p/${p.row.slug}`;
  const img = p.images[0];
  const price = p.live ? formatPrice(p.live.price, p.live.currency).replace(',00', '') : null;
  const sold = salesLabel(p.sales);
  if (big) return html`<article class="spot spot-big">
    <a class="spot-media" href="${href}" tabindex="-1" aria-hidden="true">${img ? html`<img src="${img}" alt="" loading="lazy">` : html`<span class="media-placeholder">${mark()}</span>`}</a>
    <div class="spot-over">
      <div class="spot-info">
        ${price ? html`<div class="spot-price">${price}</div>` : html`<div class="spot-price">Цена уточняется</div>`}
        <a class="spot-title" href="${href}">${p.title}</a>
        ${p.sales != null ? html`<div class="spot-sub">${salesShort(p.sales)}</div>` : ''}
      </div>
      <a class="btn-buy spot-buy spot-buy-big" href="${href}">Купить</a>
    </div>
  </article>`;
  return html`<article class="spot">
    <a class="spot-media" href="${href}" tabindex="-1" aria-hidden="true">${img ? html`<img src="${img}" alt="" loading="lazy">` : html`<span class="media-placeholder">${mark()}</span>`}</a>
    <div class="spot-body">
      <div class="spot-info">
        ${price ? html`<div class="spot-price">${price}</div>` : html`<div class="spot-price pcard-price-err">Цена уточняется</div>`}
        <a class="spot-title" href="${href}">${p.title}</a>
        ${p.row.short && !big ? html`<div class="spot-sub">${p.row.short}</div>` : ''}
        ${p.sales != null ? html`<div class="spot-sub">${salesShort(p.sales)}</div>` : ''}
      </div>
      <a class="btn-buy spot-buy" href="${href}">Купить</a>
    </div>
  </article>`;
}

export function homePage({ user, categories, featured, reviews, faq, demo, banners = [], tiles = [], topup = [], spot = [], catFilter = '', sort = 'popular' }) {
  return layout({
    user, categories, home: true,
    description: `${config.brand} — игры, подписки и пополнение сервисов. Оплата и получение через Digiseller.`,
    scripts: ['/static/hero.js', '/static/topup.js'],
    body: html`
${banners.length ? html`<section class="wrap hero" data-hero aria-roledescription="карусель" aria-label="Анонсы">
  <div class="hero-stage">
  ${banners.map((bn, i) => html`<a class="hslide ${i === 0 ? 'is-active' : ''}" href="${bn.href}" ${i ? raw('aria-hidden="true" tabindex="-1"') : ''}>
    <span class="hslide-bg">${bn.image ? html`<img src="${bn.image}" alt="${bn.alt || ''}" draggable="false" ${i ? 'loading="lazy"' : ''}>` : raw(heroScene(bn.scene))}</span>
    ${bn.title ? html`<span class="hslide-text">
      ${bn.eyebrow ? html`<span class="hs-eyebrow">${bn.eyebrow}</span>` : ''}
      <span class="hs-title">${bn.title}</span>
      ${bn.text ? html`<span class="hs-sub">${bn.text}</span>` : ''}
      ${bn.cta ? html`<span class="btn-glass">${bn.cta}</span>` : ''}
    </span>` : ''}
  </a>`)}
  ${banners.length > 1 ? html`
    <button type="button" class="hero-arrow hero-prev" data-prev aria-label="Предыдущий баннер">${icon.chevL}</button>
    <button type="button" class="hero-arrow hero-next" data-next aria-label="Следующий баннер">${icon.chevR}</button>
    <div class="hero-dots" role="tablist">${banners.map((bn, i) => html`<button type="button" role="tab" class="hdot ${i === 0 ? 'is-active' : ''}" data-go="${i}" aria-label="Баннер ${i + 1}" aria-selected="${i === 0}"></button>`)}</div>` : ''}
  </div>
</section>` : ''}

<section class="wrap tiles" aria-label="Популярные игры и сервисы">
  ${tiles.slice(0, 8).map((t) => html`<a class="tile tile-${t.style}" href="${t.href}">
    ${t.image ? html`<img src="${t.image}" alt="" loading="lazy">` : html`<span class="tile-glyph" aria-hidden="true">${t.glyph}</span>`}
    <span class="tile-name">${t.name}</span></a>`)}
</section>

<section class="wrap showcase">
  <div class="glow glow-a" aria-hidden="true"></div><div class="glow glow-b" aria-hidden="true"></div>
  ${spot.length ? html`<div class="glass glass-orange spot-box" aria-label="Главные товары">
    ${spotCard(spot[0], true)}
    <div class="spot-col">${spot.slice(1, 3).map((p) => spotCard(p))}</div>
  </div>` : ''}

  ${topup.length ? html`<div class="glass topup2" data-topup data-brand="${topup[0].brand}" aria-label="Пополнение сервисов">
    <div class="tp2-head">${glyph('wallet', 20)}<b>Пополнение сервисов</b></div>
    <div class="tp2-tabs" role="tablist">
      ${topup.map((t, i) => html`<button type="button" role="tab" class="ttab ttab-${t.brand} ${i === 0 ? 'is-on' : ''}" aria-selected="${i === 0}" data-tab="${i}"><span class="ttab-ico">${raw(brandIco[t.brand] || '')}</span><span class="ttab-txt"><b>${t.short || t.name}</b></span></button>`)}
    </div>
    <form class="tp2-body" data-topup-form novalidate>
      <div class="tp2-row2">
        <span class="tp2-lbl">Баланс <span data-tab-name>${topup[0].name}</span></span>
        <div class="tp2-line">
          <label class="tp2-input tp2-grow"><input type="text" inputmode="numeric" name="amount" value="${topup[0].chips?.[1] ?? 1000}" autocomplete="off" aria-label="Сумма"></label>
          <label class="tp2-input tp2-cur"><select name="currency" data-currency aria-label="Валюта"></select></label>
        </div>
      </div>
      <div class="tp-chips tp2-chips" data-chips></div>
      <div class="tp2-row2">
        <span class="tp2-lbl" data-login-label-vis>Логин</span>
        <label class="tp2-input"><input type="text" name="login" autocomplete="off" data-login aria-label="Логин"><a href="/support" class="tp2-info" data-login-help aria-label="Как узнать логин?">i</a></label>
      </div>
      <span class="visually-hidden" data-login-label></span>
      <button type="submit" class="tp2-btn" data-buy>Купить</button>
      <span class="tp-note small muted" data-note></span>
    </form>
    <script type="application/json" id="topup-data">${raw(JSON.stringify(topup).replace(/</g, '\\u003c'))}</script>
  </div>` : ''}
</section>

<section class="wrap section" id="popular">
  <div class="section-head">
    <h2>Чаще покупают</h2>
    <details class="dd"><summary class="dd-btn">${catFilter ? (categories.find((c) => c.slug === catFilter)?.name || 'Все категории') : 'Все категории'} ${icon.chevD}</summary>
      <div class="dd-pop dd-right"><a href="/#popular" class="${!catFilter ? 'is-on' : ''}">Все категории</a>${categories.map((c) => html`<a href="/?cat=${c.slug}#popular" class="${catFilter === c.slug ? 'is-on' : ''}">${c.name}</a>`)}</div></details>
  </div>
  ${grid(featured, 'Скоро здесь появятся товары.')}
</section>

${reviews.length ? html`<section class="wrap section">
  <div class="section-head"><h2>Отзывы</h2><span class="muted small">Отзывы из Digiseller</span></div>
  <ul class="reviews reviews-grid">${reviews.map((r) => reviewItem(r, true))}</ul>
</section>` : ''}

${faq.length ? html`<section class="wrap section narrow-block">
  <h2>Вопросы</h2>
  ${faq.map((f) => html`<details class="faq"><summary>${f.q}</summary>${paragraphs(f.a)}</details>`)}
</section>` : ''}
`,
  });
}

// Нейтральная обложка демо-товара без картинки
export function demoTile(key) {
  const t = { apple: ['Apple Gift Card', '#cfd8ff', '#8a7dff'], telegram: ['Telegram Stars', '#7fd3ff', '#2b8fe0'], minecraft: ['Minecraft', '#8bd36a', '#5a3a22'],
    brawl: ['Brawl Stars', '#ffcf3d', '#7a2ad9'], clash: ['Clash Royale', '#5aa9ff', '#2c3f8f'] }[key];
  if (!t) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${t[1]}"/><stop offset="1" stop-color="${t[2]}"/></radialGradient></defs>
<rect width="600" height="600" fill="url(#g)"/><text x="300" y="320" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="58" fill="#fff">${t[0]}</text>
</svg>`;
}

// ---------- Категория (раздел в стиле маркетплейса) ----------
export function categoryPage({ user, categories, cat, list, facets, filters, sort, demo, quick }) {
  const chipAttr = cat.chip_attr && facets[cat.chip_attr] ? cat.chip_attr : null;
  const qs = (patch) => {
    const p = new URLSearchParams();
    const next = { ...filters, ...patch };
    for (const [k, v] of Object.entries(next)) if (v && k !== 'sort') p.set(`f_${k}`, v);
    const so = patch.sort ?? sort; if (so && so !== 'popular') p.set('sort', so);
    const s = p.toString(); return s ? `?${s}` : '';
  };
  const themed = cat.theme === 'vice';
  return layout({
    user, categories, theme: cat.theme, title: `Купить ${cat.name}`, description: cat.short || undefined,
    scripts: quick ? ['/static/quickbuy.js'] : [],
    body: html`
<div class="wrap cat-page">
  <nav class="crumbs small" aria-label="Навигация"><a href="/">Главная</a> › <a href="/c/${cat.slug}">Каталог</a> › <span>${cat.name}</span></nav>
  <h1 class="cat-h1">Купить ${cat.name} <span class="count">${list.length}</span></h1>
  ${themed ? viceBanner(cat, { title: cat.name, sub: cat.short || 'Раздел' }) : ''}

  ${chipAttr ? html`<div class="chips" role="list">
    <a role="listitem" class="chip ${!filters[chipAttr] ? 'is-on' : ''}" href="${qs({ [chipAttr]: '' })}">Все</a>
    ${facets[chipAttr].map((v) => html`<a role="listitem" class="chip ${filters[chipAttr] === v ? 'is-on' : ''}" href="${qs({ [chipAttr]: v })}"><span class="chip-ico">${v.slice(0, 2)}</span>${v}</a>`)}
  </div>` : ''}

  ${quick ? html`<section class="quickbuy" aria-label="Быстрая покупка">
    <div class="qb-inner">
    <div class="qb-head"><span class="muted small">Быстрый выбор</span><b>${cat.name}</b></div>
    <div class="qb-row">
      ${quick.attrs.map((a) => html`<label class="qb-field"><span>${a}</span><select data-qb-attr="${a}">${(facets[a] || []).map((v) => html`<option>${v}</option>`)}</select></label>`)}
      <a class="btn btn-big qb-buy" href="#" data-qb-buy>Выберите параметры</a>
    </div>
    <p class="qb-hint muted small" data-qb-hint>Подберём самое выгодное доступное предложение.</p>
    </div>
    <script type="application/json" id="qb-data">${raw(JSON.stringify(quick.items).replace(/</g, '\\u003c'))}</script>
  </section>` : ''}

  <form class="toolbar" method="get">
    ${Object.entries(filters).filter(([, v]) => v).map(([k, v]) => html`<input type="hidden" name="f_${k}" value="${v}">`)}
    <label class="tool">${icon.sort}<select name="sort" data-autosubmit aria-label="Сортировка">${Object.entries(SORTS).map(([k, v]) => html`<option value="${k}" ${k === sort ? 'selected' : ''}>${v}</option>`)}</select></label>
    ${Object.entries(facets).filter(([k]) => k !== chipAttr).map(([k, vals]) => html`<label class="tool">${icon.filter}<select name="f_${k}" data-autosubmit aria-label="${k}"><option value="">${k}: все</option>${vals.map((v) => html`<option ${filters[k] === v ? 'selected' : ''}>${v}</option>`)}</select></label>`)}
    ${Object.values(filters).some(Boolean) ? html`<a class="tool tool-reset" href="/c/${cat.slug}">Сбросить</a>` : ''}
    <noscript><button class="btn btn-small" type="submit">Применить</button></noscript>
  </form>
  ${grid(list, Object.values(filters).some(Boolean) ? 'По этим фильтрам ничего не нашлось.' : 'В этом разделе скоро появятся товары.')}
</div>`,
  });
}

export function favoritesPage({ user, categories, list, loaded }) {
  return layout({
    user, categories, title: 'Избранное', noindex: true, scripts: ['/static/favorites.js'],
    body: html`<div class="wrap cat-page" data-fav-page data-loaded="${loaded ? '1' : '0'}">
      <h1 class="cat-h1">Избранное ${loaded ? html`<span class="count">${list.length}</span>` : ''}</h1>
      ${loaded ? grid(list, 'Здесь появятся товары, которые вы отметите сердечком.') : html`<p class="muted">Загружаем…</p>`}
    </div>`,
  });
}

export function searchPage({ user, categories, q, list }) {
  return layout({
    user, categories, q, title: q ? `Поиск: ${q}` : 'Поиск', noindex: true,
    body: html`<div class="wrap cat-page">
      <h1 class="cat-h1">${q ? html`Результаты: «${q}» <span class="count">${list.length}</span>` : 'Поиск'}</h1>
      ${grid(list, q && q.length >= 2 ? 'Ничего не нашлось. Попробуйте другой запрос.' : 'Введите название товара — от 2 символов.')}
    </div>`,
  });
}

// ---------- Страница товара ----------
export function productPage({ p, cat, categories, reviews, user }) {
  const live = p.live;
  const states = {
    unavailable: html`<div class="notice notice-muted" role="status"><b>Товар закончился или временно недоступен.</b> Покупка сейчас невозможна. <a href="/support?product=${p.row.slug}">Спросить в поддержке</a></div>`,
    error: html`<div class="notice notice-warn" role="alert"><b>Не удалось получить актуальную цену и наличие.</b> Покупка временно недоступна — попробуйте обновить страницу позже.</div>`,
  };
  const optionField = (o) => {
    const name = `opt_${o.id}`;
    const req = o.required ? raw(' <span class="req" aria-label="обязательно">*</span>') : '';
    const err = html`<span class="field-error" data-error-for="${o.id}" hidden></span>`;
    const mod = (v) => (v.modify ? ` (${v.modify > 0 ? '+' : ''}${v.modifyType === '%' ? `${v.modify}%` : formatPrice(v.modify, live.currency)})` : '');
    if (o.type === 'text') {
      return html`<label class="field"><span class="label">${o.label}${req}</span>
        <input type="text" name="${name}" data-opt="${o.id}" ${o.required ? 'required' : ''} maxlength="500" autocomplete="off">
        ${o.comment ? html`<span class="hint">${o.comment}</span>` : ''}${err}</label>`;
    }
    if (o.type === 'radio' || o.type === 'checkbox') {
      return html`<fieldset class="field"><legend class="label">${o.label}${req}</legend>
        <div class="seg">${o.variants.map((v) => html`<label class="choice"><input type="${o.type}" name="${name}" value="${v.id}" data-opt="${o.id}" data-modify="${v.modify}" data-modify-type="${v.modifyType || ''}" ${v.isDefault ? 'checked' : ''}>
          <span>${v.text}${v.modify ? html` <span class="muted">${mod(v)}</span>` : ''}</span></label>`)}</div>
        ${o.comment ? html`<span class="hint">${o.comment}</span>` : ''}${err}</fieldset>`;
    }
    return html`<label class="field"><span class="label">${o.label}${req}</span>
      <select name="${name}" data-opt="${o.id}" ${o.required ? 'required' : ''}>
        <option value="">— выберите —</option>
        ${o.variants.map((v) => html`<option value="${v.id}" data-modify="${v.modify}" data-modify-type="${v.modifyType || ''}" ${v.isDefault ? 'selected' : ''}>${v.text}${mod(v)}</option>`)}
      </select>${o.comment ? html`<span class="hint">${o.comment}</span>` : ''}${err}</label>`;
  };

  const canBuy = p.state === 'available';
  const tabs = [
    ['desc', 'Описание', p.description],
    ['terms', 'Условия', p.row.limitations],
    ['delivery', 'Получение', p.row.delivery],
    ['guide', 'Инструкция', p.row.instruction || live?.addInfo],
  ].filter(([, , t]) => t);
  const sold = salesLabel(p.sales);

  return layout({
    title: p.title, description: p.row.short || undefined, user, categories, theme: cat?.theme,
    scripts: ['/static/product.js'],
    body: html`
<div class="wrap product">
  <nav class="crumbs small" aria-label="Навигация"><a href="/">Главная</a> › ${cat ? html`<a href="/c/${cat.slug}">${cat.name}</a> › ` : ''}<span>${p.title}</span></nav>
  <div class="product-grid">
    <div class="gallery">
      <div class="gallery-main">${p.images.length ? html`<img src="${p.images[0]}" alt="${p.title}" data-gallery-main>` : html`<span class="media-placeholder big">${mark()}</span>`}
        ${p.row.badge ? html`<span class="pbadge">${p.row.badge}</span>` : ''}</div>
      ${p.images.length > 1 ? html`<div class="thumbs">${p.images.map((src, i) => html`<button type="button" class="thumb ${i ? '' : 'is-on'}" data-thumb="${src}" aria-label="Изображение ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`)}</div>` : ''}
    </div>

    <aside class="buybox" aria-label="Покупка">
      ${p.row.kind ? html`<div class="pcard-kind">${p.row.kind}</div>` : ''}
      <h1>${p.title}</h1>
      <div class="meta-row">
        ${sold ? html`<span title="По данным Digiseller">${sold}</span>` : ''}
        ${reviews.length ? html`<a href="#reviews">${reviews.length} ${plural(reviews.length, 'отзыв', 'отзыва', 'отзывов')}</a>` : ''}
        ${Object.entries(p.row.attrs || {}).map(([k, v]) => html`<span class="attr"><span class="muted">${k}:</span> ${v}</span>`)}
      </div>
      ${p.row.short ? html`<p class="lead-sm">${p.row.short}</p>` : ''}
      ${states[p.state] || ''}
      ${live ? html`
      <form id="buy-form" class="buy-form" data-slug="${p.row.slug}" data-base-price="${live.price}" data-currency="${live.currency}" novalidate>
        ${live.options.map(optionField)}
        <div id="buy-message" class="buy-message" role="status" aria-live="polite" hidden></div>
        <button type="submit" class="btn btn-wide btn-big btn-dark btn-arrow btn-buy-main" id="buy-btn" ${canBuy ? '' : 'disabled'}>
          ${p.state === 'available' ? html`Купить за <span id="total-price">${formatPrice(live.price, live.currency)}</span>` : html`Недоступно · <span id="total-price">${formatPrice(live.price, live.currency)}</span>`}
        </button>
        <p class="hint">Оплата и получение — на стороне Digiseller. Цена и наличие проверяются перед переходом.</p>
      </form>` : ''}
      <ul class="trust small">
        <li>${icon.shield} Платёж проходит через Digiseller</li>
        <li>${icon.chat} <a href="/support?product=${p.row.slug}">Вопрос по товару — в поддержку</a></li>
      </ul>
    </aside>
  </div>

  ${tabs.length ? html`<section class="ptabs" data-tabs>
    <div class="tablist" role="tablist">${tabs.map(([id, name], i) => html`<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}" class="tab ${i === 0 ? 'is-on' : ''}" data-tab="${id}">${name}</button>`)}</div>
    ${tabs.map(([id, , text], i) => html`<div role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" class="tabpanel" ${i ? 'hidden' : ''}>${paragraphs(text)}</div>`)}
  </section>` : ''}

  <section class="pblock" id="reviews">
    <div class="section-head"><h2>Отзывы</h2>${reviews.length ? html`<span class="muted small">Отзывы из Digiseller</span>` : ''}</div>
    ${reviews.length ? html`<ul class="reviews">${reviews.map((r) => reviewItem(r))}</ul>` : html`<p class="muted">Отзывов пока нет.</p>`}
  </section>
</div>`,
  });
}

// ---------- Вход ----------
export function loginPage({ user, next, categories }) {
  return layout({
    title: 'Вход', user, categories, noindex: true, scripts: ['/static/login.js'],
    body: html`
<div class="wrap narrow page">
  <div class="auth-card">
  <h1>Вход в ${config.brand}</h1>
  <p class="muted">Без пароля: отправим одноразовый код на email. Если аккаунта ещё нет — он будет создан.</p>
  <form id="login-email" class="stack" novalidate>
    <label class="field"><span class="label">Email</span>
      <input type="email" name="email" autocomplete="email" inputmode="email" required></label>
    <button class="btn btn-wide btn-big" type="submit">Получить код</button>
  </form>
  <form id="login-code" class="stack" hidden novalidate data-next="${next || '/account'}">
    <p>Код отправлен на <b id="sent-to"></b>. <button type="button" class="linkish" id="change-email">Изменить email</button></p>
    <label class="field"><span class="label">Код из письма</span>
      <input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" required></label>
    <button class="btn btn-wide btn-big" type="submit">Войти</button>
    <button class="btn btn-ghost btn-wide" type="button" id="resend" disabled>Отправить код ещё раз</button>
  </form>
  <div id="login-msg" class="notice" role="alert" hidden></div>
  <p class="muted small">Для покупки вход не обязателен: оплата проходит на Digiseller. Аккаунт нужен, чтобы видеть свои покупки и писать по ним в поддержку.</p>
  </div>
</div>`,
  });
}

// ---------- Аккаунт ----------
const orderStatus = { paid: 'Оплачено (подтверждено Digiseller)', refunded: 'Возврат' };
export function accountPage({ user, orders, flash, categories }) {
  return layout({
    title: 'Аккаунт', user, categories, noindex: true,
    body: html`
<div class="wrap narrow page">
  <h1>Профиль</h1>
  <p>Email: <b>${user.email}</b>${user.isAdmin ? html` · <a href="/admin">Админка</a>` : ''}</p>
  ${flash ? html`<div class="notice ${flash.ok ? 'notice-ok' : 'notice-warn'}" role="status">${flash.text}</div>` : ''}

  <h2>Мои заказы</h2>
  ${orders.length ? html`<ul class="orders">${orders.map((o) => html`<li class="order">
      <div><b>${o.title || o.slug || `Товар Digiseller ${o.external_product_id}`}</b>
        <div class="muted small">Заказ Digiseller № ${o.external_id} · ${o.paid_at ? formatDate(o.paid_at) : ''}</div></div>
      <div class="order-side">${o.amount !== null ? formatPrice(o.amount, o.currency || '') : ''}
        <div class="small">${orderStatus[o.status] || o.status}</div>
        <a class="small" href="/support?order=${o.id}">Помощь по покупке</a></div>
    </li>`)}</ul>`
    : html`<p class="muted">Здесь появятся покупки, которые вы привязали к аккаунту.</p>`}

  <div class="card-plain">
    <h3>Привязать покупку</h3>
    <p class="small muted">Покупки на Digiseller не связываются с аккаунтом по email автоматически. Введите уникальный код, который Digiseller показал после оплаты (он также есть в письме о покупке).</p>
    <form method="post" action="/account/link" class="inline-form">
      <input type="text" name="code" placeholder="Уникальный код" required maxlength="32" autocomplete="off" aria-label="Уникальный код">
      <button class="btn" type="submit">Привязать</button>
    </form>
  </div>

  <p class="small">Товар выдаётся на странице Digiseller и в письме от Digiseller. Если не получили товар — <a href="/support">напишите в поддержку</a>.</p>
  <form method="post" action="/logout"><button class="btn btn-ghost" type="submit">Выйти</button></form>
</div>`,
  });
}

export function returnPage({ user, categories }) {
  return layout({
    title: 'Проверка оплаты', user, categories, noindex: true,
    body: html`
<div class="wrap narrow page">
  <h1>Проверяем оплату</h1>
  <div class="notice notice-muted" role="status">Возврат на сайт сам по себе не подтверждает оплату. Не оплачивайте повторно, пока результат не известен.</div>
  <ul>
    <li>Если оплата прошла, Digiseller показал страницу с товаром и отправил письмо на указанный email.</li>
    <li>Чтобы видеть покупку в аккаунте ${config.brand}, ${user ? html`<a href="/account">привяжите её уникальным кодом</a>` : html`<a href="/login?next=/account">войдите</a> и привяжите её уникальным кодом`}.</li>
    <li>Если списание было, а товара нет — <a href="/support">напишите в поддержку</a>, указав email и время оплаты.</li>
  </ul>
  <a class="btn" href="/">На главную</a>
</div>`,
  });
}

export function supportPage({ user, products, selected, orderId, result, form = {}, categories }) {
  return layout({
    title: 'Поддержка', user, categories,
    body: html`
<div class="wrap narrow page">
  <h1>Поддержка</h1>
  <p class="muted">Отвечает человек${S.hours ? html`: ${S.hours}` : ''}. Ответ придёт на указанный email.</p>
  ${S.email || S.publicTelegram ? html`<p>Напрямую: ${S.email ? html`<a href="mailto:${S.email}">${S.email}</a>` : ''}${S.email && S.publicTelegram ? ' · ' : ''}${S.publicTelegram ? html`<a href="https://t.me/${S.publicTelegram.replace(/^@/, '')}" rel="noopener">${S.publicTelegram}</a>` : ''}</p>` : ''}
  ${result?.ok ? html`<div class="notice notice-ok" role="status"><b>Обращение отправлено.</b> Номер: ${result.id}. Ответ придёт на ${form.email}.</div>` : ''}
  ${result && !result.ok ? html`<div class="notice notice-warn" role="alert">
    ${result.error === 'validation' ? 'Проверьте email и текст сообщения.' : html`<b>Не удалось доставить обращение.</b> Сообщение не отправлено — напишите нам напрямую${S.email ? html` на <a href="mailto:${S.email}">${S.email}</a>` : ''}${S.publicTelegram ? html` или в ${S.publicTelegram}` : ''}.`}
  </div>` : ''}
  ${!result?.ok ? html`
  <form method="post" action="/support" class="stack card-plain">
    <label class="field"><span class="label">Email для ответа</span>
      <input type="email" name="email" required value="${form.email || user?.email || ''}" autocomplete="email"></label>
    <label class="field"><span class="label">Товар</span>
      <select name="product"><option value="">— не выбран —</option>
        ${products.map((p) => html`<option value="${p.row.slug}" ${selected === p.row.slug ? 'selected' : ''}>${p.title}</option>`)}
      </select></label>
    ${orderId ? html`<input type="hidden" name="order" value="${orderId}"><p class="small muted">Обращение по покупке ${orderId}</p>` : ''}
    <label class="field"><span class="label">Сообщение</span>
      <textarea name="message" rows="6" required maxlength="5000">${form.message || ''}</textarea>
      <span class="hint">Если вопрос о покупке — укажите время оплаты и email, указанный на Digiseller. Не присылайте пароли и ключи.</span></label>
    <button class="btn btn-big" type="submit">Отправить</button>
  </form>` : ''}
</div>`,
  });
}

export function docPage({ user, title, content, categories }) {
  return layout({ title, user, categories, body: html`<div class="wrap narrow page doc"><h1>${title}</h1>${content ? raw(content) : html`<p class="muted">Документ будет опубликован владельцем магазина.</p>`}</div>` });
}

export function messagePage({ user, title, text, categories = [] }) {
  return layout({ title, user, categories, noindex: true, body: html`<div class="wrap narrow page"><div class="empty"><div class="empty-ico">${mark()}</div><h1>${title}</h1><p>${text}</p><a class="btn" href="/">На главную</a></div></div>` });
}

// Обложка демо-товара (квадрат, вырезка из сцены)
export function demoCover(n) {
  const scene = scenes[(n - 1) % scenes.length].replace('<svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">', '<svg x="-350" y="0" width="1600" height="900" viewBox="0 0 1600 900">');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">${scene}
<rect width="900" height="900" fill="url(#vg)"/><defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#160c13" stop-opacity="0"/><stop offset="1" stop-color="#160c13" stop-opacity=".75"/></linearGradient></defs>
<text x="50" y="800" font-family="Impact, Arial Black, sans-serif" font-size="128" fill="#fff" letter-spacing="2">GTA VI</text>
</svg>`;
}
