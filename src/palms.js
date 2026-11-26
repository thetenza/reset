// Силуэты пальм для первого экрана — генерируются кодом, без сторонних изображений.
export function palm(x, baseY, h, lean, scale = 1) {
  const cx = x + lean, cy = baseY - h;
  const w = 9 * scale;
  // ствол: изогнутая полоса, сужается к верху
  const trunk = `M${x - w} ${baseY} Q${x + lean * 0.3 - w} ${baseY - h * 0.55} ${cx - w * 0.45} ${cy}`
    + ` L${cx + w * 0.45} ${cy} Q${x + lean * 0.3 + w} ${baseY - h * 0.55} ${x + w} ${baseY} Z`;
  const leaves = [];
  const angles = [-172, -150, -128, -100, -72, -48, -24, -6, 160, 20];
  for (const a of angles) {
    const r = (a * Math.PI) / 180;
    const L = (120 + (Math.abs(Math.sin(r * 3)) * 40)) * scale;
    const droop = (Math.abs(Math.cos(r)) * 55 + 10) * scale;
    const tx = cx + Math.cos(r) * L, ty = cy + Math.sin(r) * L * 0.55 + droop;
    const mx = cx + Math.cos(r) * L * 0.5, my = cy + Math.sin(r) * L * 0.5 - 18 * scale;
    const nx = -Math.sin(r) * 13 * scale, ny = Math.cos(r) * 13 * scale;
    leaves.push(`M${cx} ${cy} Q${mx + nx} ${my + ny} ${tx} ${ty} Q${mx - nx} ${my - ny + 8 * scale} ${cx} ${cy} Z`);
  }
  return trunk + leaves.join('');
}

export function palmsSvg() {
  const d = [
    palm(70, 620, 420, 40, 1.15), palm(190, 620, 300, -30, 0.85),
    palm(1130, 620, 450, -55, 1.2), palm(1010, 620, 280, 25, 0.8), palm(1240, 620, 330, -20, 0.9),
  ].join('');
  return `<svg class="hero-palms" viewBox="0 0 1280 620" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="${d}"/></svg>`;
}
