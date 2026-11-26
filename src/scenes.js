// Три оригинальные сцены для слайдера первого экрана (рисуются кодом, без сторонних картинок).
import { palm } from './palms.js';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function skyline(baseY, count, minH, maxH, color, windows, winColor) {
  let x = -20, out = '';
  for (let i = 0; i < count && x < 1620; i++) {
    const w = 40 + rnd() * 90, h = minH + rnd() * (maxH - minH);
    out += `<rect x="${x.toFixed(0)}" y="${(baseY - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${color}"/>`;
    if (rnd() > 0.6) out += `<rect x="${(x + w / 2 - 2).toFixed(0)}" y="${(baseY - h - 30).toFixed(0)}" width="4" height="30" fill="${color}"/>`;
    if (windows) for (let wy = baseY - h + 14; wy < baseY - 10; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 14) {
      if (rnd() > 0.72) out += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="6" height="8" fill="${winColor}" opacity="${(0.5 + rnd() * 0.5).toFixed(2)}"/>`;
    }
    x += w + 4 + rnd() * 10;
  }
  return out;
}

const grad = (id, stops, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const svg = (defs, body) => `<svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;

// 1 — Ночной город: сиреневые сумерки, огни, вертолёт с прожектором
function nightCity() {
  seed = 11;
  const stars = Array.from({ length: 70 }, () => `<circle cx="${(rnd() * 1600).toFixed(0)}" cy="${(rnd() * 380).toFixed(0)}" r="${(rnd() * 1.6 + .3).toFixed(1)}" fill="#fff" opacity="${(rnd() * .7 + .2).toFixed(2)}"/>`).join('');
  return svg(
    grad('s1', [[0, '#140a2e'], [.45, '#4b1f7a'], [.75, '#c2448f'], [1, '#ff8fb0']]) +
    grad('w1', [[0, '#5a2a86'], [1, '#160c22']]) +
    grad('beam', [[0, 'rgba(255,240,200,.55)'], [1, 'rgba(255,240,200,0)']]),
    `<rect width="1600" height="900" fill="url(#s1)"/>${stars}
     <g opacity=".55">${skyline(700, 40, 120, 300, '#3a1a5c', false)}</g>
     ${skyline(720, 34, 160, 420, '#1d0f33', true, '#ffd27a')}
     <rect y="720" width="1600" height="180" fill="url(#w1)"/>
     ${Array.from({ length: 22 }, (_, i) => `<rect x="${(rnd() * 1500).toFixed(0)}" y="${730 + i * 7}" width="${(40 + rnd() * 160).toFixed(0)}" height="2" fill="#ff9ad6" opacity="${(.15 + rnd() * .35).toFixed(2)}"/>`).join('')}
     <polygon points="1180,250 1000,720 1330,720" fill="url(#beam)"/>
     <g transform="translate(1150 228)" fill="#120818"><ellipse cx="30" cy="20" rx="42" ry="17"/><rect x="60" y="15" width="70" height="7" rx="3"/><rect x="122" y="5" width="6" height="22"/><rect x="-30" y="-2" width="120" height="3"/><rect x="28" y="-2" width="4" height="8"/><rect x="5" y="38" width="55" height="3"/></g>`
  );
}

// 2 — Закат на пляже: солнце, пальмы, самолёт
function sunsetBeach() {
  seed = 23;
  const palms = [palm(160, 900, 560, 50, 1.4), palm(330, 900, 380, -40, 1), palm(1450, 900, 600, -70, 1.5), palm(1290, 900, 360, 30, .95)].join('');
  return svg(
    grad('s2', [[0, '#5b2a9a'], [.35, '#c94a9e'], [.62, '#ff7a8a'], [.85, '#ffb27a'], [1, '#ffd59a']]) +
    grad('sun2', [[0, '#fff1a8'], [.6, '#ffb36b'], [1, '#ff6fa0']]) +
    grad('sea2', [[0, '#ff8f9e'], [1, '#6a2a7a']]),
    `<rect width="1600" height="900" fill="url(#s2)"/>
     <circle cx="800" cy="560" r="230" fill="url(#sun2)"/>
     ${[0, 1, 2, 3, 4].map((i) => `<rect x="560" y="${600 + i * 26}" width="480" height="${4 + i * 2}" fill="#d9568f" opacity=".75"/>`).join('')}
     <rect y="690" width="1600" height="210" fill="url(#sea2)"/>
     ${Array.from({ length: 18 }, (_, i) => `<rect x="${600 + (rnd() - .5) * 600}" y="${700 + i * 10}" width="${(60 + rnd() * 200).toFixed(0)}" height="3" fill="#ffd59a" opacity="${(.2 + rnd() * .4).toFixed(2)}"/>`).join('')}
     <g transform="translate(1040 200) rotate(-6)" fill="#3a1440"><path d="M0 10 L80 4 L95 0 L100 6 L88 12 L0 16 Z"/><path d="M40 8 L28 -14 L38 -14 L58 8 Z"/><path d="M44 12 L30 34 L40 34 L60 12 Z"/></g>
     <path d="${palms}" fill="#1a0a1c"/>`
  );
}

// 3 — Дневной пирс: бирюзовая вода, пастельные небоскрёбы
function dayPier() {
  seed = 37;
  const towers = Array.from({ length: 9 }, (_, i) => {
    const x = 860 + i * 80 + rnd() * 20, h = 220 + rnd() * 260, w = 56 + rnd() * 30;
    const c = ['#ffd3e6', '#ffe6c9', '#d7e9ff', '#f7c9ff'][i % 4];
    let win = '';
    for (let y = 640 - h + 16; y < 630; y += 16) win += `<rect x="${x + 6}" y="${y}" width="${w - 12}" height="3" fill="#ffffff" opacity=".5"/>`;
    return `<rect x="${x}" y="${640 - h}" width="${w}" height="${h}" fill="${c}"/>${win}`;
  }).join('');
  const posts = Array.from({ length: 9 }, (_, i) => `<rect x="${80 + i * 70}" y="${700 + i * 14}" width="${14 + i * 2}" height="${120 - i * 4}" fill="#5b3a3f"/>`).join('');
  const palms = [palm(130, 680, 360, 40, 1.05), palm(240, 680, 260, -20, .8), palm(1500, 680, 320, -40, 1)].join('');
  return svg(
    grad('s3', [[0, '#7cc8ff'], [.55, '#c9b8ff'], [1, '#ffc6dd']]) +
    grad('sea3', [[0, '#39c6c9'], [1, '#147a99']]),
    `<rect width="1600" height="900" fill="url(#s3)"/>
     <circle cx="1240" cy="190" r="70" fill="#fff6d8" opacity=".9"/>
     <g opacity=".6">${skyline(640, 30, 60, 180, '#b7a3e6', false)}</g>
     ${towers}
     <rect y="640" width="1600" height="260" fill="url(#sea3)"/>
     ${Array.from({ length: 26 }, (_, i) => `<rect x="${(rnd() * 1600).toFixed(0)}" y="${650 + i * 9}" width="${(40 + rnd() * 140).toFixed(0)}" height="2" fill="#e8ffff" opacity="${(.25 + rnd() * .4).toFixed(2)}"/>`).join('')}
     <polygon points="0,690 760,820 760,850 0,760" fill="#8a5a4a"/>
     ${posts}
     <path d="${palms}" fill="#1f3a40" opacity=".9"/>`
  );
}

export const scenes = [nightCity(), sunsetBeach(), dayPier()];
