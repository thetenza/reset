// Плавные «шёлковые» волны — фон для баннеров и кнопок (рисуется кодом).
export function wavesSvg({ w = 1600, h = 600, lines = 46, colors = ['#ffffff'], opacity = 0.5, seed = 3, bg = null, cls = '' } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let paths = '';
  for (let i = 0; i < lines; i++) {
    const t = i / lines;
    const y0 = h * (0.15 + t * 0.9) - h * 0.2;
    const amp = h * (0.18 + rnd() * 0.12);
    const c = colors[i % colors.length];
    paths += `<path d="M${-w * 0.1} ${y0} C${w * 0.25} ${y0 - amp} ${w * 0.45} ${y0 + amp * 1.3} ${w * 0.7} ${y0 + amp * 0.2} S${w * 1.0} ${y0 - amp * 0.8} ${w * 1.15} ${y0 + amp * 0.4}" fill="none" stroke="${c}" stroke-width="${(0.6 + rnd() * 1.8).toFixed(1)}" opacity="${(opacity * (0.25 + 0.75 * Math.sin(Math.PI * t))).toFixed(2)}"/>`;
  }
  return `<svg ${cls ? `class="${cls}"` : ''} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${paths}</svg>`;
}

// Data-URI для CSS (фон кнопок)
export const wavesDataUri = (opts) => `url("data:image/svg+xml,${encodeURIComponent(wavesSvg(opts))}")`;
