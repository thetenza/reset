import { html, raw, paragraphs, formatPrice, formatDate } from './html.js';
import { config } from './config.js';
import { RESET_PATH, WORDMARK } from './logo.js';
import { wavesSvg } from './waves.js';
import { scenes } from './scenes.js';
import { SORTS } from './catalog.js';

const S = config.support;

// ---------- Иконки и знак ----------
const mark = (cls = 'mark') => raw(`<svg class="${cls}" viewBox="0 0 1110 1277" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${RESET_PATH}"/></svg>`);
const wordmark = () => raw(`<svg class="wordmark" viewBox="0 0 ${WORDMARK.w} ${WORDMARK.h}" role="img" aria-label="${config.brand}"><path fill="currentColor" fill-rule="evenodd" d="${WORDMARK.d}"/></svg>`);
const svgIcon = (d, size = 20) => raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`);
const icon = {
  arrow: svgIcon('<path d="M5 12h14M13 6l6 6-6 6"/>', 16),
  chat: svgIcon('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>', 18),
  user: svgIcon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  box: svgIcon('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
  menu: svgIcon('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  search: svgIcon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 18),
  shield: svgIcon('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', 22),
  bolt: svgIcon('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', 22),
  tag: svgIcon('<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>', 22),
  sort: svgIcon('<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>', 18),
  filter: svgIcon('<path d="M4 6h16M7 12h10M10 18h4"/>', 18),
};

const salesLabel = (n) => (n == null ? null : n >= 1000 ? `${Math.floor(n / 1000)} ${'000'}+ продаж` : `${n} ${plural(n, 'продажа', 'продажи', 'продаж')}`);
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };

// ---------- Каркас ----------
export function layout({ title, description, user, body, scripts = [], noindex = false, categories = [], q = '', theme = '' }) {
  return html`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#ffffff">
<title>${title ? `${title} — ${config.brand}` : `${config.brand} — цифровые товары`}</title>
${description ? html`<meta name="description" content="${description}">` : ''}
${noindex || config.demo ? raw('<meta name="robots" content="noindex">') : ''}
<link rel="stylesheet" href="/static/styles.css">
<link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
</head>
<body>
${config.demo ? raw('<div class="demo-banner" role="note">Демо-режим: Digiseller не подключён. Товары с пометкой «Демо» — примеры, покупка недоступна.</div>') : ''}
<header class="site-header">
  <div class="wrap header-row">
    <a class="logo" href="/" aria-label="${config.brand} — на главную">${wordmark()}</a>
    <details class="catalog-menu">
      <summary class="btn btn-catalog">${icon.menu}<span>Каталог</span></summary>
      <div class="catalog-pop">
        ${categories.map((c) => html`<a class="catalog-item" href="/c/${c.slug}"><span class="cat-ico cat-ico-${c.theme}">${c.name.slice(0, 1)}</span><span><b>${c.name}</b>${c.short ? html`<small>${c.short}</small>` : ''}</span></a>`)}
      </div>
    </details>
    <form class="search" action="/search" method="get" role="search">
      ${icon.search}<input type="search" name="q" value="${q}" placeholder="Найти товар" aria-label="Поиск товаров" minlength="2" maxlength="80">
    </form>
    <nav class="head-actions" aria-label="Аккаунт">
      <a href="/support" class="ha">${icon.chat}<span>Помощь</span></a>
      <a href="${user ? '/account' : '/login?next=/account'}" class="ha">${icon.box}<span>Заказы</span></a>
      <a href="${user ? '/account' : '/login'}" class="ha">${icon.user}<span>${user ? 'Профиль' : 'Войти'}</span></a>
    </nav>
  </div>
  ${categories.length ? html`<nav class="wrap quicknav" aria-label="Категории">
    ${categories.map((c) => html`<a href="/c/${c.slug}" class="qn qn-${c.theme}"><span class="cat-ico cat-ico-${c.theme}">${c.name.slice(0, 1)}</span>${c.name}</a>`)}
    <a href="/support" class="qn"><span class="cat-ico">?</span>Поддержка</a>
  </nav>` : ''}
</header>
<main id="main" class="${theme ? `theme-${theme}` : ''}">${body}</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <a class="logo" href="/">${wordmark()}</a>
      <p class="muted small">Цифровые товары с оплатой и выдачей через Digiseller.</p>
      ${config.legal.ownerName ? html`<p class="muted small">${config.legal.ownerName}</p>` : ''}
      ${config.legal.ownerDetails ? html`<p class="muted small">${config.legal.ownerDetails}</p>` : ''}
    </div>
    <div>
      <h3 class="footer-h">Каталог</h3>
      <ul class="plain">${categories.map((c) => html`<li><a href="/c/${c.slug}">${c.name}</a></li>`)}</ul>
    </div>
    <div>
      <h3 class="footer-h">Помощь</h3>
      <ul class="plain">
        <li><a href="/support">Написать в поддержку</a></li>
        ${S.email ? html`<li><a href="mailto:${S.email}">${S.email}</a></li>` : ''}
        ${S.publicTelegram ? html`<li><a href="https://t.me/${S.publicTelegram.replace(/^@/, '')}" rel="noopener">${S.publicTelegram}</a></li>` : ''}
        ${S.hours ? html`<li class="muted small">${S.hours}</li>` : ''}
      </ul>
    </div>
    <div>
      <h3 class="footer-h">Документы</h3>
      <ul class="plain">
        <li><a href="/docs/rules">Правила</a></li>
        <li><a href="/docs/offer">Публичная оферта</a></li>
        <li><a href="/docs/privacy">Политика конфиденциальности</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-bottom muted small">© ${new Date().getFullYear()} ${config.brand}. Оплата и выдача товаров — через Digiseller.</div>
</footer>
${['/static/site.js', ...scripts].map((s) => html`<script src="${s}" defer></script>`)}
</body>
</html>`;
}

// ---------- Карточка товара (как в маркетплейсах) ----------
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
    <div class="pcard-body">
      ${p.row.kind ? html`<div class="pcard-kind">${p.row.kind}</div>` : ''}
      ${p.state === 'error' ? html`<div class="pcard-price pcard-price-err">Цена уточняется</div>`
        : p.live ? html`<div class="pcard-price">${formatPrice(p.live.price, p.live.currency)}</div>` : ''}
      <a class="pcard-title" href="${href}">${p.title}</a>
      ${sold ? html`<div class="pcard-sales" title="По данным Digiseller">${sold}</div>` : ''}
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

// ---------- Главная ----------
export function homePage({ user, categories, counts, featured, reviews, faq, demo, banners = [], tiles = [] }) {
  const main = categories.find((c) => c.theme === 'vice') || categories[0];
  const others = categories.filter((c) => c !== main);
  return layout({
    user, categories,
    description: `${config.brand} — цифровые товары: игры, ключи, пополнения. Оплата и получение через Digiseller.`,
    scripts: ['/static/hero.js'],
    body: html`
<section class="wrap hero" data-hero aria-roledescription="карусель" aria-label="Анонсы">
  <div class="hero-stage">
  ${banners.map((bn, i) => html`<a class="hslide ${i === 0 ? 'is-active' : ''}" href="${bn.href}" ${i ? raw('aria-hidden="true" tabindex="-1"') : ''}>
    <span class="hslide-bg">${bn.image ? html`<img src="${bn.image}" alt="">` : raw(heroScene(bn.scene))}</span>
    <span class="hslide-text">
      <span class="hs-eyebrow">${bn.eyebrow}</span>
      <span class="hs-title">${bn.title}</span>
      <span class="hs-sub">${bn.text}</span>
      <span class="btn btn-dark btn-arrow">${bn.cta}</span>
    </span>
  </a>`)}
  </div>
  ${banners.length > 1 ? html`<div class="hero-tabs" role="tablist">${banners.map((bn, i) => html`<button type="button" role="tab" class="htab ${i === 0 ? 'is-active' : ''}" data-go="${i}" aria-selected="${i === 0}"><span class="htab-bar"><span></span></span><span class="htab-label">${bn.title}</span></button>`)}</div>` : ''}
</section>

<section class="wrap tiles-wrap" aria-label="Популярные игры и сервисы">
  <button type="button" class="tiles-arrow tiles-prev" data-tiles-prev aria-label="Прокрутить назад">${icon.arrow}</button>
  <div class="tiles" data-tiles>
    ${tiles.map((t) => html`<a class="tile tile-${t.style}" href="${t.href}"><span class="tile-glyph" aria-hidden="true">${t.glyph}</span><span class="tile-name">${t.name}</span></a>`)}
  </div>
  <button type="button" class="tiles-arrow" data-tiles-next aria-label="Прокрутить вперёд">${icon.arrow}</button>
</section>

<section class="wrap section">
  <div class="section-head"><h2>Популярное</h2>${main ? html`<a class="more" href="/c/${main.slug}">Все товары ${icon.arrow}</a>` : ''}</div>
  ${demo ? html`<p class="muted small demo-note">Это демо-товары. После подключения Digiseller здесь будут ваши товары, отмеченные «На главной».</p>` : ''}
  ${grid(featured, 'Скоро здесь появятся товары.')}
</section>

<section class="wrap section">
  <div class="section-head"><h2>Категории</h2></div>
  <div class="cat-tiles">
    ${categories.map((c) => html`<a class="cat-tile cat-tile-${c.theme} reveal" href="/c/${c.slug}">
      <span class="cat-ico cat-ico-${c.theme} big">${c.name.slice(0, 1)}</span>
      <b>${c.name}</b>
      <span class="muted small">${counts[c.id] ? `${counts[c.id]} ${plural(counts[c.id], 'товар', 'товара', 'товаров')}` : 'Скоро'}</span>
    </a>`)}
  </div>
</section>

<section class="wrap section">
  <div class="features">
    <div class="feature reveal">${icon.shield}<b>Оплата через Digiseller</b><span>Платёж и выдача товара проходят на стороне Digiseller.</span></div>
    <div class="feature reveal">${icon.tag}<b>Честная цена</b><span>Цена с учётом выбранных вариантов видна до оплаты.</span></div>
    <div class="feature reveal">${icon.bolt}<b>Понятное получение</b><span>Способ получения указан на странице каждого товара.</span></div>
    <div class="feature reveal">${icon.chat}<b>Помощь по покупке</b><span>Обращение по любой покупке — из аккаунта или формы поддержки.</span></div>
  </div>
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

  ${demo ? html`<p class="muted small demo-note">Демо-товары для примера. Ваши товары добавляются в админке.</p>` : ''}
  ${grid(list, Object.values(filters).some(Boolean) ? 'По этим фильтрам ничего не нашлось.' : 'В этом разделе скоро появятся товары.')}
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

  const canBuy = p.state === 'available' && !config.demo;
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
          ${config.demo ? html`Демо · <span id="total-price">${formatPrice(live.price, live.currency)}</span>`
            : p.state === 'available' ? html`Купить за <span id="total-price">${formatPrice(live.price, live.currency)}</span>` : html`Недоступно · <span id="total-price">${formatPrice(live.price, live.currency)}</span>`}
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
  const labels = ['PS', 'PS5', 'XBOX', 'XBOX', 'PS5', 'PC', 'PSN', 'PC'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">${scene}
<rect width="900" height="900" fill="url(#vg)"/><defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#160c13" stop-opacity="0"/><stop offset="1" stop-color="#160c13" stop-opacity=".75"/></linearGradient></defs>
<rect x="${860 - (labels[n - 1].length * 34 + 40)}" y="40" rx="14" width="${labels[n - 1].length * 34 + 40}" height="64" fill="#160c13" opacity=".85"/><text x="${880 - (labels[n - 1].length * 34 + 40)}" y="86" font-family="Impact, Arial Black, sans-serif" font-size="40" fill="#fff">${labels[n - 1] || 'PC'}</text>
<text x="50" y="800" font-family="Impact, Arial Black, sans-serif" font-size="128" fill="#fff" letter-spacing="2">ДЕМО</text>
<text x="56" y="852" font-family="Arial, sans-serif" font-weight="700" font-size="34" fill="#ffd0e8">Товар-пример № ${n}</text></svg>`;
}
