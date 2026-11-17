// cena.js — "E se você fosse o único imune a um vírus zumbi?" — render(t) desenha o quadro inteiro no segundo t.
// Mesmo t => mesmo quadro (nada aleatório sem semente).
const W = 1080, H = 1920, FPS = 30;
const { draw: drawChar, POSES, mix, ease, INK, part } = window.RIG;

// ---------- utilidades ----------
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => ease(clamp((x - a) / (b - a)));
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
const pop = (t0, t) => { const x = (t - t0) / 0.32; if (x <= 0) return 0; if (x >= 1) return 1; return 1 + Math.sin(x * Math.PI * 1.6) * (1 - x) * 0.35 * 2 - (1 - easeOut(x)); };

// ---------- tempos das palavras ----------
let WORDS = window.WORDS || [];
const DUR = window.DURATION || 46;
function Wt(word, n = 1, after = 0) {
  const k = norm(word); let c = 0;
  for (const w of WORDS) { if (w[1] < after) continue; if (norm(w[0]) === k && ++c === n) return w[1]; }
  console.log('ANCORA FALTANDO', word); return null;
}
function WtEnd(word, n = 1, after = 0) {
  const k = norm(word); let c = 0;
  for (const w of WORDS) { if (w[1] < after) continue; if (norm(w[0]) === k && ++c === n) return w[2]; }
  return null;
}

// ---------- âncoras e planos ----------
const A = {};
function anchors() {
  A.terceiro = Wt('terceiro'); A.piscava = Wt('piscava');
  A.ele = Wt('ele'); A.setimo = Wt('7') ?? Wt('setimo'); A.quarenta = Wt('42') ?? Wt('quarenta'); A.lanterna = Wt('lanterna');
  A.la = Wt('la'); A.portaria = Wt('portaria'); A.circulos = Wt('circulos'); A.segunda = Wt('segunda');
  A.quarta = Wt('quarta'); A.radio = Wt('radio'); A.sangue = Wt('sangue');
  A.porque = Wt('porque'); A.gota = Wt('gota'); A.mil = Wt('mil'); A.vacinas = Wt('vacinas');
  A.laboratorio = Wt('laboratorio'); A.doze = Wt('12') ?? Wt('doze'); A.cidade = WtEnd('cidade');
  A.meia = Wt('meia-noite') ?? Wt('meia'); A.alguem = Wt('alguem'); A.bateu = Wt('bateu'); A.tres = Wt('tres'); A.vezes = Wt('vezes'); A.vezesEnd = WtEnd('vezes');
  A.chamou = Wt('chamou'); A.nome = Wt('nome'); A.nomeEnd = WtEnd('nome');
  A.evoce = Wt('e', 1, A.nomeEnd); A.abriria = Wt('abriria'); A.end = WORDS[WORDS.length - 1][2];
  A.voceQ = Wt('voce', 1, A.nomeEnd);
}

// palavras da fala do personagem (boca mexe)
function speaking(t) {
  if (!A.evoce) return 0;
  for (const w of WORDS) {
    if (w[1] < A.evoce - 0.01) continue;
    if (t >= w[1] && t <= w[2]) { const k = (t - w[1]) / Math.max(0.08, w[2] - w[1]); return 0.25 + 0.75 * Math.abs(Math.sin(k * Math.PI * Math.max(1, Math.round((w[2] - w[1]) / 0.13)))); }
  }
  return 0;
}
// piscadas a cada 2–5 s + piscada forçada em "piscava"
const BLINKS = (() => { const r = rng(7), b = []; let x = 1.2; while (x < 80) { b.push(x); x += 2 + r() * 3; } return b; })();
function blinkAt(t, extra = []) {
  for (const b of BLINKS.concat(extra)) { const d = t - b; if (d >= 0 && d < 0.14) return Math.sin(d / 0.14 * Math.PI); }
  return 0;
}

// ---------- câmera ----------
function camKeys(keys, t) {
  // keys: [[t, x, y, z, r], ...] — interpolação smootherstep + avanço lento contínuo
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3], r: keys[0][4] || 0 };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) { const k = ease((t - a[0]) / (b[0] - a[0])); return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), z: lerp(a[3], b[3], k), r: lerp(a[4] || 0, b[4] || 0, k) }; }
  }
  const l = keys[keys.length - 1]; return { x: l[1], y: l[2], z: l[3], r: l[4] || 0 };
}
function shakeOff(t, hits, amp = 22) {
  let x = 0, y = 0, r = 0;
  for (const h of hits) { const d = t - h; if (d >= 0 && d < 0.4) { const e = Math.exp(-d * 11) * Math.cos(d * 55); x += e * amp * Math.sin(h * 91); y += e * amp; r += e * 1.2; } }
  return { x, y, r };
}
const camT = (c) => `translate(${W / 2},${H / 2}) rotate(${c.r}) scale(${c.z}) translate(${-c.x},${-c.y})`;
// camada com parallax f (dentro do grupo do mundo): f<1 fundo, f>1 frente
let REF = { x: 0, y: 0 };
const par = (c, f, inner) => `<g transform="translate(${(c.x - REF.x) * (1 - f)},${(c.y - REF.y) * (1 - f)})">${inner}</g>`;
const REFS = { sala: { x: 1300, y: 900 }, street: { x: 860, y: 1300 }, macro: { x: 540, y: 960 }, city: { x: 500, y: 1100 } };

// ---------- material simples para objetos (sombra 2 tons + contorno) ----------
const LMOON = { dir: [-0.8, -0.6], rim: '#cfe6ff', rimW: 7 };
const LWARM = { dir: [0.9, 0.2], rim: '#ffbb6a', rimW: 8 };
const LRADIO = { dir: [0.5, -0.8], rim: '#7dffb0', rimW: 8 };
const LTORCH = { dir: [0.9, -0.3], rim: '#ffe6a6', rimW: 7 };
const obj = (d, base, dark, L = LMOON, sh = 14) => part(d, [base, dark], { ...L, rim: L.objRim || base, rimW: 0 }, 0, sh);
const rect = (x, y, w, h, r = 0) => r ? `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z` : `M${x},${y} H${x + w} V${y + h} H${x} Z`;

// ---------- cidade (gerada uma vez) ----------
const CITY = (() => {
  const r = rng(11), b = []; let x = -400;
  while (x < 2600) { const w = 90 + r() * 170, h = 200 + r() * 620; const win = []; for (let i = 0; i < 40; i++) win.push([r(), r(), r()]); b.push({ x, w, h, win, ant: r() < 0.25 }); x += w + 6 + r() * 20; }
  return b;
})();
function cityLayer(t, baseY, fires = true, tint = '#1b2547', far = false) {
  let s = '';
  for (const k of CITY) {
    const y = baseY - k.h;
    s += `<rect x="${k.x}" y="${y}" width="${k.w}" height="${k.h + 400}" fill="${tint}" stroke="${INK}" stroke-width="${far ? 3 : 5}"/>`;
    if (k.ant) s += `<line x1="${k.x + k.w / 2}" y1="${y}" x2="${k.x + k.w / 2}" y2="${y - 70}" stroke="${INK}" stroke-width="5"/><circle cx="${k.x + k.w / 2}" cy="${y - 70}" r="6" fill="#ff4040" opacity="${0.4 + 0.6 * (Math.sin(t * 3 + k.x) > 0.6)}"/>`;
    for (const [u, v, l] of k.win) if (l > 0.82) s += `<rect x="${k.x + 12 + u * (k.w - 36)}" y="${y + 20 + v * (k.h - 40)}" width="14" height="18" fill="#ffd36b" opacity="${l > 0.95 ? 0.5 + 0.5 * Math.sin(t * 9 + u * 50) : 0.85}"/>`;
  }
  if (fires) for (const [fx, fh] of [[260, 380], [1350, 520], [2050, 300]]) {
    s += `<ellipse cx="${fx}" cy="${baseY - fh * 0.4}" rx="${160}" ry="${110}" fill="#ff7a2a" opacity="${0.22 + 0.06 * Math.sin(t * 7 + fx)}" style="mix-blend-mode:screen"/>`;
    for (let i = 0; i < 6; i++) { const ph = (t * 0.05 + i / 6) % 1; s += `<circle cx="${fx + Math.sin(ph * 6 + i) * 40 + ph * 120}" cy="${baseY - fh * 0.4 - ph * 700}" r="${50 + ph * 120}" fill="#2a2433" opacity="${0.55 * (1 - ph)}"/>`; }
  }
  return s;
}
function skyRect(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#gSky)"/>` +
    [...Array(40)].map((_, i) => { const r = rng(i * 13 + 3); return `<circle cx="${x + r() * w}" cy="${y + r() * h * 0.5}" r="${1.5 + r() * 2}" fill="#dfe8ff" opacity="${0.4 + r() * 0.5}"/>`; }).join('');
}

// ---------- poeira dentro de um feixe (quadrilátero) ----------
function dust(t, q, n, seed, col = '#eaf3ff', sz = 1) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) {
    const u0 = r(), v0 = r(), sp = 0.01 + r() * 0.02, ph = r() * 6.28;
    const u = (u0 + Math.sin(t * 0.4 + ph) * 0.03 + 1) % 1, v = (v0 + t * sp) % 1;
    const x = lerp(lerp(q[0][0], q[1][0], u), lerp(q[3][0], q[2][0], u), v), y = lerp(lerp(q[0][1], q[1][1], u), lerp(q[3][1], q[2][1], u), v);
    const a = (0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + ph * 3))) * Math.sin(v * Math.PI);
    s += `<circle cx="${x}" cy="${y}" r="${(1.8 + r() * 3.4) * sz}" fill="${col}" opacity="${a.toFixed(2)}"/>`;
  }
  return s;
}
const beam = (q, grad, op) => `<path d="M${q.map(p => p.join(',')).join(' L')} Z" fill="url(#${grad})" opacity="${op}" style="mix-blend-mode:screen"/>`;

// =====================================================================
// CENÁRIO 1 — SALA DO 7º ANDAR (mundo 2700 × 2000)
// =====================================================================
const BEAM_SALA = [[300, 300], [740, 300], [1820, 1980], [900, 1990]];
function cans() {
  let s = ''; const r = rng(5); let n = 0;
  for (const [sy, cnt] of [[640, 8], [900, 8], [1160, 8], [1420, 8]]) {
    for (let row = 0; row < 2; row++) for (let i = 0; i < (row ? cnt - 3 : cnt) && n < 42; i++, n++) {
      const cx = 1300 + i * 54 + row * 27, cy = sy - 70 - row * 74;
      s += obj(rect(cx, cy, 48, 72, 6), r() < 0.5 ? '#c9473a' : '#b9a24a', '#6e2a24', LMOON, 8) + `<rect x="${cx}" y="${cy + 26}" width="48" height="22" fill="#f1e6c8" stroke="${INK}" stroke-width="3"/>`;
    }
  }
  return s;
}
const CANS = cans();
function sala(t, c, o = {}) {
  let s = '';
  // fora da janela (fundo distante, parallax)
  s += `<clipPath id="cWin"><rect x="220" y="280" width="520" height="760"/></clipPath><g clip-path="url(#cWin)">`;
  s += par(c, 0.5, skyRect(-200, -200, 1400, 1500) + `<circle cx="560" cy="430" r="62" fill="#eef3ff"/><circle cx="560" cy="430" r="120" fill="#cfe0ff" opacity=".18"/>` + `<g transform="translate(-150,330) scale(.6)">${cityLayer(t, 1150, true, '#1d2850', true)}</g>`);
  s += `<rect x="220" y="280" width="520" height="760" fill="#9fb8ff" opacity=".10"/></g>`;
  // parede (com textura de faixa escura)
  s += `<path d="M-400,-200 H3100 V1500 H-400 Z M220,280 V1040 H740 V280 Z" fill-rule="evenodd" fill="#3a4a72"/>`;
  s += `<path d="M-400,1100 H3100 V1500 H-400 Z" fill="#33426a"/><line x1="-400" y1="1100" x2="3100" y2="1100" stroke="${INK}" stroke-width="6"/>`;
  // janela: moldura e cortina
  s += obj('M200,260 H760 V1060 H200 Z M226,286 V1034 H734 V286 Z', '#d8d2c4', '#8f8a80', LMOON, 10);
  s += `<path d="M480,286 V1034 M226,660 H734" stroke="${INK}" stroke-width="12"/><path d="M480,286 V1034 M226,660 H734" stroke="#d8d2c4" stroke-width="6"/>`;
  s += obj(`M760,230 C${800 + Math.sin(t) * 6},500 ${780 + Math.sin(t * 0.8) * 10},800 ${820},1120 L940,1120 C900,800 920,500 900,230 Z`, '#7b2f3a', '#4a1a24', LMOON, 18);
  // chão
  s += `<path d="M-400,1500 H3100 V2400 H-400 Z" fill="#2a2f45"/>` + [...Array(14)].map((_, i) => `<line x1="${-400 + i * 260}" y1="1500" x2="${-900 + i * 360}" y2="2400" stroke="#1d2133" stroke-width="5"/>`).join('');
  s += `<line x1="-400" y1="1500" x2="3100" y2="1500" stroke="${INK}" stroke-width="8"/>`;
  // estante (despensa)
  s += obj('M1260,420 H1760 V1480 H1260 Z', '#6b4a35', '#3e2a1e', LMOON, 16);
  s += `<path d="M1290,450 H1730 V1450 H1290 Z" fill="#2b1d16"/>`;
  for (const y of [640, 900, 1160, 1420]) s += obj(`M1270,${y} H1750 V${y + 26} H1270 Z`, '#8a6146', '#4e3626', LMOON, 6);
  s += CANS;
  // mesa + rádio (quando não está na mão)
  s += obj('M1880,1260 H2330 V1300 H1880 Z', '#7a5338', '#47301f', LMOON, 8) + obj('M1910,1300 H1940 V1500 H1910 Z M2270,1300 H2300 V1500 H2270 Z', '#5d3f2a', '#382518', LMOON, 6);
  if (!o.radioInHand) s += obj('M2040,1150 H2150 V1260 H2040 Z', '#2d3236', '#191c1f', LMOON, 8) + `<rect x="2056" y="1166" width="78" height="40" rx="5" fill="#2e6b46"/><line x1="2130" y1="1150" x2="2150" y2="1060" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`;
  // porta
  const ds = o.doorShake || 0;
  s += obj('M2340,470 H2680 V1500 H2340 Z', '#c9c2b4', '#7e786c', LMOON, 10);
  s += `<g transform="translate(${ds * 6},0)">` + obj('M2370,500 H2650 V1500 H2370 Z', '#5b3b2a', '#33211a', LMOON, 18) +
    obj('M2400,540 H2620 V900 H2400 Z', '#664430', '#3c271c', LMOON, 8) + obj('M2400,960 H2620 V1440 H2400 Z', '#664430', '#3c271c', LMOON, 8) +
    `<circle cx="2600" cy="1000" r="16" fill="#d9b25a" stroke="${INK}" stroke-width="5"/><circle cx="2510" cy="700" r="9" fill="#111" stroke="#d9b25a" stroke-width="4"/>` +
    `<path d="M2400,820 q40,30 80,0" stroke="#b9b2a4" stroke-width="6" fill="none"/></g>`;
  // luz do corredor por baixo da porta
  if (o.doorGlow) {
    s += `<rect x="2370" y="1488" width="280" height="12" fill="#ffcf7a" opacity="${o.doorGlow}"/>`;
    s += `<path d="M2370,1500 L2650,1500 L2850,1900 L2170,1900 Z" fill="url(#gDoor)" opacity="${o.doorGlow * 0.7}" style="mix-blend-mode:screen"/>`;
    if (o.feet) s += `<rect x="${2440}" y="1488" width="50" height="12" fill="#120b16" opacity="${o.feet}"/><rect x="${2530}" y="1488" width="50" height="12" fill="#120b16" opacity="${o.feet}"/>` +
      `<path d="M2440,1500 L2490,1500 L2560,1900 L2420,1900 Z M2530,1500 L2580,1500 L2700,1900 L2590,1900 Z" fill="#120b16" opacity="${o.feet * 0.55}"/>`;
  }
  // relógio de parede
  const hh = o.clockMidnight ? 0 : 23.6 + t * 0.002;
  s += `<g transform="translate(2510,330)"><circle r="70" fill="#efe8da" stroke="${INK}" stroke-width="8"/>${[...Array(12)].map((_, i) => `<line x1="0" y1="-56" x2="0" y2="-46" stroke="${INK}" stroke-width="5" transform="rotate(${i * 30})"/>`).join('')}
<line x1="0" y1="0" x2="0" y2="-34" stroke="${INK}" stroke-width="8" stroke-linecap="round" transform="rotate(${hh * 30})"/><line x1="0" y1="0" x2="0" y2="-52" stroke="${INK}" stroke-width="5" stroke-linecap="round" transform="rotate(${(hh % 1) * 360})"/><circle r="6" fill="${INK}"/></g>`;
  return s;
}
// frente (desfocada): folhas de planta e abajur, parallax 1.5
function salaFront(c, t, which = 'plant') {
  if (which === 'plant') return par(c, 1.5, `<g filter="url(#fBlur)" opacity=".95">${[0, 1, 2, 3].map(i => `<path d="M${120 + i * 70},2200 C${60 + i * 90},1900 ${40 + i * 120 + Math.sin(t + i) * 15},1700 ${i * 150},1560 C${120 + i * 120},1720 ${200 + i * 60},1950 ${210 + i * 70},2200 Z" fill="#0f2a1c"/>`).join('')}</g>`);
  if (which === 'lamp') return par(c, 1.45, `<g filter="url(#fBlur)"><path d="M2280,600 L2560,600 L2620,820 L2220,820 Z" fill="#2b1f2a"/><rect x="2400" y="820" width="30" height="900" fill="#1a1219"/></g>`);
  return '';
}

// =====================================================================
// CENÁRIO 2 — PORTARIA VISTA DE CIMA (mundo 1600 × 2400)
// =====================================================================
function street(t, c) {
  let s = `<rect x="-600" y="-600" width="2800" height="3600" fill="#20263a"/>`;
  // calçada e rua
  s += `<path d="M-600,1100 H2200 V3000 H-600 Z" fill="#2c3247"/>` + [...Array(12)].map((_, i) => `<line x1="${-600 + i * 260}" y1="1100" x2="${-600 + i * 260}" y2="3000" stroke="#232838" stroke-width="5"/>`).join('') + [...Array(8)].map((_, i) => `<line x1="-600" y1="${1100 + i * 240}" x2="2200" y2="${1100 + i * 240}" stroke="#232838" stroke-width="5"/>`).join('');
  s += `<path d="M-600,2350 H2200 V3000 H-600 Z" fill="#181c2a"/>` + [...Array(6)].map((_, i) => `<rect x="${-500 + i * 520}" y="2600" width="240" height="22" fill="#c9c08a" opacity=".6"/>`).join('');
  // prédio: entrada e guarita
  s += obj('M-600,-600 H2200 V1100 H-600 Z', '#3b4566', '#262d45', LMOON, 10);
  s += obj('M520,560 H1080 V1100 H520 Z', '#1a2030', '#10141f', LMOON, 6) + `<path d="M540,580 H1060 V1100 H540 Z" fill="#ffcf7a" opacity="${0.18 + 0.05 * Math.sin(t * 13) * (Math.sin(t * 2.3) > 0.7)}"/>`;
  s += `<path d="M800,580 V1100" stroke="${INK}" stroke-width="10"/>`;
  s += obj('M200,700 H460 V1100 H200 Z', '#4c5878', '#2e3650', LMOON, 8) + `<rect x="226" y="740" width="208" height="140" fill="#ffcf7a" opacity=".55"/><text x="330" y="680" font-family="M9" font-size="44" fill="#c9d3f0" text-anchor="middle">PORTARIA</text>`;
  // poste e cone de luz
  s += obj('M1260,200 H1290 V1180 H1260 Z', '#2a2f3c', '#15181f', LMOON, 6) + `<path d="M1180,180 H1380 L1350,220 H1210 Z" fill="#1c1f28" stroke="${INK}" stroke-width="5"/><ellipse cx="1280" cy="226" rx="70" ry="12" fill="#ffd36b"/>`;
  s += `<ellipse cx="900" cy="1500" rx="560" ry="300" fill="url(#gSodium)" opacity=".85" style="mix-blend-mode:screen"/>`;
  // carro abandonado com pisca-alerta
  const blink = Math.sin(t * Math.PI * 2 * 0.9) > 0 ? 1 : 0.15;
  s += `<g transform="translate(1250,1880) rotate(-14)">` + obj('M-230,-110 H230 Q260,-110 260,-60 V80 Q260,120 220,120 H-220 Q-260,120 -260,80 V-60 Q-260,-110 -230,-110 Z', '#8a2f2f', '#521a1c', LMOON, 14) +
    obj('M-150,-80 H140 V60 H-150 Z', '#26304a', '#151a2a', LMOON, 6) + `<circle cx="-245" cy="-80" r="16" fill="#ffae3a" opacity="${blink}"/><circle cx="-245" cy="90" r="16" fill="#ffae3a" opacity="${blink}"/><circle cx="-245" cy="-80" r="60" fill="#ffae3a" opacity="${blink * 0.25}" style="mix-blend-mode:screen"/></g>`;
  // papéis voando
  for (let i = 0; i < 5; i++) { const ph = (t * 0.12 + i * 0.21) % 1; s += `<rect x="${-200 + ph * 2000}" y="${1300 + i * 170 + Math.sin(ph * 12 + i) * 60}" width="44" height="30" fill="#d8d4c8" stroke="${INK}" stroke-width="3" transform="rotate(${ph * 700 + i * 40} ${-200 + ph * 2000} ${1300 + i * 170})"/>`; }
  // porteiro zumbi andando em círculo
  const ang = t * 0.9, cx = 880 + Math.cos(ang) * 210, cy = 1520 + Math.sin(ang) * 110;
  const vx = -Math.sin(ang), stepK = (Math.sin(t * 7.5) + 1) / 2;
  s += drawChar({ who: 'porteiro', pose: { ...mix(POSES.walkA, POSES.walkB, stepK), uaL: -80 + Math.sin(t * 7.5) * 6, faL: -10, uaR: -80 - Math.sin(t * 7.5) * 6, faR: -10, head: 14 + Math.sin(t * 3) * 6 },
    face: { look: [0, 0], mouth: 0.4 + 0.2 * Math.sin(t * 4) }, light: { dir: [0.2, -1], rim: '#ffd36b', rimW: 7 }, x: cx, y: cy - 150, scale: 0.75, flip: vx < 0, t });
  // névoa
  s += `<rect x="-600" y="-600" width="2800" height="3600" fill="url(#gFog)" opacity=".55"/>`;
  return s;
}

// =====================================================================
// CENÁRIO 3 — CLOSE DO DEDO COM A GOTA (mundo 1080 × 1920)
// =====================================================================
function macro(t, c) {
  let s = `<rect x="-600" y="-600" width="2400" height="3200" fill="#141a2e"/>`;
  // bokeh do apartamento (fundo desfocado)
  s += par(c, 0.6, `<g filter="url(#fBlurBig)">${[...Array(14)].map((_, i) => { const r = rng(i + 40); return `<circle cx="${r() * 1300 - 100}" cy="${r() * 1700}" r="${60 + r() * 110}" fill="${r() < 0.5 ? '#ffcf7a' : '#7da6ff'}" opacity="${0.18 + r() * 0.2}"/>`; }).join('')}</g>`);
  // frascos de vacina surgindo atrás (mil vacinas)
  if (A.mil) {
    const k = clamp((t - A.mil + 0.1) / 1.2);
    let v = ''; const N = 60;
    for (let i = 0; i < N; i++) {
      const ring = Math.floor(i / 12), a = (i % 12) / 12 * Math.PI * 2 + ring * 0.26, R = 330 + ring * 120;
      const show = clamp((k * N - i) / 3); if (show <= 0) continue;
      const x = 540 + Math.cos(a) * R, y = 760 + Math.sin(a) * R * 1.05;
      v += `<g transform="translate(${x},${y}) scale(${1.15 * pop(A.mil + i / N * 1.2 - 0.1, t)})"><rect x="-18" y="-40" width="36" height="70" rx="8" fill="#cfe9ff" stroke="${INK}" stroke-width="5"/><rect x="-18" y="-6" width="36" height="36" rx="6" fill="#ff4a5a"/><rect x="-14" y="-56" width="28" height="18" fill="#3a4a72" stroke="${INK}" stroke-width="4"/></g>`;
    }
    s += par(c, 0.85, v);
  }
  // mão/dedo indicador vindo de baixo
  const L = { dir: [-0.6, -0.8], rim: '#ffd6c0', rimW: 8 };
  s += `<g transform="translate(540,1180)">` + part('M-120,900 C-130,500 -110,300 -70,160 C-60,60 -60,-160 -40,-250 C-30,-300 30,-300 40,-250 C60,-160 60,40 70,120 C130,180 150,400 150,900 Z', ['#f0b48c', '#c47f62'], L, 0, 30) +
    `<path d="M-30,-262 Q0,-292 30,-262 L30,-220 Q0,-200 -30,-220 Z" fill="#f7d6c4" stroke="${INK}" stroke-width="5"/><path d="M-40,-60 q40,16 80,0 M-46,60 q46,18 92,0" stroke="#b06a50" stroke-width="5" fill="none"/></g>`;
  // gota de sangue
  if (A.gota) {
    const g = sstep(A.gota - 0.4, A.gota + 0.3, t);
    s += `<g transform="translate(548,${880 - 6}) scale(${0.3 + g * 0.7})"><path d="M0,-90 C30,-40 62,0 62,40 C62,80 32,104 0,104 C-32,104 -62,80 -62,40 C-62,0 -30,-40 0,-90 Z" fill="#c1121f" stroke="${INK}" stroke-width="6"/><ellipse cx="-22" cy="30" rx="12" ry="24" fill="#ff8a8a" opacity=".8"/><circle r="${140 + 10 * Math.sin(t * 6)}" cy="20" fill="#ff2a3a" opacity=".16" style="mix-blend-mode:screen"/></g>`;
  }
  return s;
}

// =====================================================================
// CENÁRIO 4 — A CIDADE PELA JANELA, LABORATÓRIO A 12 KM
// =====================================================================
function cityView(t, c) {
  let s = par(c, 0.4, skyRect(-800, -800, 2700, 2400) + `<circle cx="820" cy="300" r="70" fill="#eef3ff"/><circle cx="820" cy="300" r="150" fill="#cfe0ff" opacity=".14"/>`);
  // laboratório distante com farol azul
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  s += par(c, 0.45, `<g transform="translate(-300,700) scale(.55)">${cityLayer(t, 1000, true, '#1a2347', true)}</g><g transform="translate(330,1250) scale(1.25)">${obj('M-70,-260 H70 V40 H-70 Z', '#2a3560', '#1a2244', LMOON, 6)}<rect x="-14" y="-330" width="28" height="70" fill="#2a3560" stroke="${INK}" stroke-width="4"/><circle cy="-340" r="14" fill="#7fd6ff"/><circle cy="-340" r="${70 + pulse * 50}" fill="#5fc4ff" opacity="${0.18 + 0.2 * pulse}" style="mix-blend-mode:screen"/><path d="M-30,-180 h60 M0,-210 v60" stroke="#7fd6ff" stroke-width="12"/></g>` +
    '');
  // fumaça + holofote de helicóptero
  const hx = 700 + Math.sin(t * 0.35) * 260;
  s += par(c, 0.6, `<path d="M${hx},120 L${hx - 160 + Math.sin(t * 0.7) * 120},1400 L${hx + 120 + Math.sin(t * 0.7) * 120},1400 Z" fill="url(#gSearch)" opacity=".5" style="mix-blend-mode:screen"/><g transform="translate(${hx},110)"><ellipse rx="40" ry="16" fill="${INK}"/><line x1="-70" y1="-16" x2="70" y2="-16" stroke="${INK}" stroke-width="5"/><circle r="5" cy="12" fill="#ff4040" opacity="${Math.sin(t * 8) > 0 ? 1 : 0.2}"/></g>`);
  s += par(c, 0.75, `<g transform="translate(-560,1500) scale(.8)">${cityLayer(t + 3, 600, true, '#222d55')}</g>`);
  // linha tracejada até o laboratório + 12 km
  if (A.doze) {
    const k = sstep(A.doze - 0.4, A.doze + 0.6, t);
    s += par(c, 0.45, `<path d="M560,1950 Q470,1500 330,1190" stroke="#ffe08a" stroke-width="9" stroke-dasharray="26 20" fill="none" pathLength="1000" stroke-dashoffset="0" opacity=".95" style="clip-path:inset(${(1 - k) * 100}% 0 0 0)"/>`);
  }
  // parapeito e moldura da janela (frente, desfocada)
  s += par(c, 1.35, `<g filter="url(#fBlur)"><path d="M-500,1700 H1600 V2600 H-500 Z" fill="#1b1622"/><path d="M-500,-600 H-40 V2600 H-500 Z M1120,-600 H1600 V2600 H1120 Z" fill="#141019"/><path d="M780,-600 V1720" stroke="#141019" stroke-width="40"/></g>`);
  return s;
}

// =====================================================================
// PLANOS (sequência) — cada um com cenário, câmera, personagem e luz
// =====================================================================
let SHOTS = [];
function buildShots() {
  anchors();
  const D = 0.75;
  SHOTS = [
    { id: 'gancho', t0: 0, set: 'sala', dis: 0,
      cam: t => camKeys([[0, 760, 600, 1.85], [A.ele, 770, 600, 2.1]], t),
      caio: t => ({ x: 720, y: 1150, s: 1.5, pose: mix(POSES.idle, { ...POSES.idle, head: -6 }, sstep(0.2, 1.2, t)), light: LMOON,
        face: { look: t < A.piscava - 0.3 ? [-0.8, -0.1] : [0, 0], turn: t < A.piscava - 0.3 ? -0.35 : 0, brow: 'worry', blink: blinkAt(t, [A.piscava + 0.08]) } }),
      front: 'plant', labels: [[A.terceiro, 'DIA 3']] },
    { id: 'despensa', t0: A.ele - 0.15, set: 'sala', dis: D,
      cam: t => camKeys([[A.ele, 1080, 740, 1.25], [A.quarenta - 0.2, 1330, 800, 1.35], [A.la, 1400, 880, 1.5]], t),
      caio: t => ({ x: 1100, y: 1150, s: 1.5, pose: mix(POSES.idle, POSES.flash, sstep(A.lanterna - 0.6, A.lanterna, t)), light: t > A.lanterna ? LTORCH : LMOON, hold: t > A.lanterna - 0.5 ? 'flashlight' : null,
        face: { look: [0.8, 0.2], turn: 0.4, brow: 'neutral', blink: blinkAt(t) } }),
      torch: true, front: 'lamp', labelRight: true, labels: [[A.setimo, '7º ANDAR'], [A.quarenta, '42 LATAS'], [A.lanterna + 0.2, '2 NOITES DE PILHA']] },
    { id: 'portaria', t0: A.la - 0.2, set: 'street', dis: D,
      cam: t => camKeys([[A.la, 820, 1250, 1.0, -3], [A.quarta, 880, 1300, 1.9, 2]], t),
      labels: [[A.portaria, 'PORTARIA · TÉRREO'], [A.segunda, 'DESDE SEGUNDA']] },
    { id: 'radio', t0: A.quarta - 0.25, set: 'sala', dis: D, radio: true,
      cam: t => camKeys([[A.quarta, 2080, 760, 1.6], [A.porque, 2060, 640, 2.05, -2]], t),
      caio: t => ({ x: 2060, y: 1150, s: 1.5, pose: mix(POSES.idle, POSES.radio, sstep(A.quarta - 0.3, A.quarta + 0.4, t)), hold: 'radio', radioAmp: t > A.radio ? 1 : 0.2, light: LRADIO,
        face: { look: [-0.4, -0.3], turn: -0.2, brow: t > A.sangue ? 'fear' : 'worry', wide: t > A.sangue ? 0.6 : 0, blink: blinkAt(t), mouth: t > A.sangue ? 0.35 : 0 } }),
      labels: [[A.quarta, 'DIA 4 · 23h']] },
    { id: 'gota', t0: A.porque - 0.1, set: 'macro', dis: 0.5,
      cam: t => camKeys([[A.porque, 540, 960, 1.0], [A.gota + 0.2, 545, 900, 1.35], [A.laboratorio, 540, 860, 1.12]], t),
      labels: [[A.gota, '1 GOTA'], [A.mil, '= 1.000 VACINAS']] },
    { id: 'cidade', t0: A.laboratorio - 0.25, set: 'city', dis: D,
      cam: t => camKeys([[A.laboratorio, 560, 1150, 1.0], [A.cidade + 0.5, 420, 1080, 1.4]], t),
      labels: [[A.doze, '12 KM']] },
    { id: 'meianoite', t0: A.meia - 0.45, set: 'sala', dis: D, night: true,
      cam: t => camKeys([[A.meia - 0.45, 2230, 820, 1.2], [A.bateu, 2300, 880, 1.38]], t),
      caio: t => ({ x: 2050, y: 1150, s: 1.5, pose: mix(POSES.idle, POSES.scared, sstep(A.alguem - 0.3, A.alguem + 0.5, t)), light: LWARM,
        face: { look: [1, 0], turn: 0.5, brow: 'fear', wide: sstep(A.alguem - 0.3, A.alguem, t), blink: blinkAt(t) } }),
      labels: [] },
    { id: 'batidas', t0: A.bateu, set: 'sala', dis: 0, night: true, knocks: true,
      cam: t => camKeys([[A.bateu, 2510, 1180, 2.1], [A.chamou, 2510, 1240, 2.35]], t) },
    { id: 'nome', t0: A.chamou - 0.05, set: 'sala', dis: 0, night: true,
      cam: t => camKeys([[A.chamou, 2060, 640, 2.4, 0], [A.evoce, 2060, 600, 2.75, -4]], t),
      caio: t => ({ x: 2050, y: 1150, s: 1.5, pose: POSES.scared, light: LWARM,
        face: { look: [0.9, -0.1], turn: 0.45, brow: 'fear', wide: 1, blink: blinkAt(t), mouth: 0.25 } }) },
    { id: 'pergunta', t0: A.evoce - 0.35, set: 'sala', dis: 0.6,
      cam: t => camKeys([[A.evoce - 0.35, 790, 580, 2.3], [A.end + 0.4, 760, 600, 1.85]], t),
      caio: t => ({ x: 720, y: 1150, s: 1.5, pose: mix(POSES.idle, POSES.point, sstep(A.abriria - 0.5, A.abriria, t)), light: LMOON,
        face: { look: [0, 0], turn: 0, brow: 'worry', blink: blinkAt(t), mouth: speaking(t) } }),
      front: 'plant', bubble: true },
  ];
}

// ---------- desenha um plano ----------
function drawShot(sh, t) {
  let c = sh.cam(t);
  const hits = sh.knocks ? [A.bateu, A.tres, A.vezes] : (sh.id === 'nome' ? [A.chamou] : []);
  const sk = shakeOff(t, hits, sh.knocks ? 26 : 12);
  c = { x: c.x - sk.x / c.z, y: c.y - sk.y / c.z, z: c.z, r: c.r + sk.r };
  REF = REFS[sh.set];
  let s = `<g transform="${camT(c)}">`;
  if (sh.set === 'sala') {
    const night = sh.night;
    const glow = night ? 1 : 0;
    const feet = sh.knocks || sh.id === 'nome' ? 1 : (sh.id === 'meianoite' ? sstep(A.alguem, A.bateu, t) : 0);
    let doorShake = 0; if (sh.knocks) for (const h of hits) { const d = t - h; if (d >= 0 && d < 0.25) doorShake += Math.sin(d * 60) * Math.exp(-d * 14) * 3; }
    s += sala(t, c, { radioInHand: sh.radio || sh.id === 'meianoite' || sh.id === 'batidas' || sh.id === 'nome' ? false : false, doorGlow: glow, feet, doorShake, clockMidnight: night });
    // feixe de luar com poeira (ou luz quente da porta à noite)
    s += beam(BEAM_SALA, 'gMoon', night ? 0.16 : 0.32) + `<g style="mix-blend-mode:screen">${dust(t, BEAM_SALA, 90, 3)}</g>`;
    if (sh.torch && t > A.lanterna) {
      const fl = t < A.lanterna + 0.35 ? (Math.sin(t * 90) > 0 ? 1 : 0.2) : 0.85 + 0.15 * Math.sin(t * 23);
      const q = [[1290, 860], [1290, 900], [1780, 1250], [1760, 380]];
      s += `<path d="M1240,880 L1760,400 L1760,1300 Z" fill="url(#gTorch)" opacity="${0.55 * fl}" style="mix-blend-mode:screen"/><g style="mix-blend-mode:screen">${dust(t, [[1300, 830], [1750, 460], [1750, 1260], [1300, 930]], 40, 9, '#fff1c4')}</g>`;
    }
    if (sh.caio) { const cc = sh.caio(t); const br = Math.sin(t * 2.4) * 1.2;
      s += drawChar({ who: 'caio', pose: { ...cc.pose, torso: cc.pose.torso + br * 0.4, head: cc.pose.head + Math.sin(t * 1.7) * 1.2 }, face: cc.face, light: cc.light, x: cc.x, y: cc.y + br, scale: cc.s, hold: cc.hold, radioAmp: cc.radioAmp, t }); }
    if (sh.radio) s += `<circle cx="2160" cy="${560}" r="${260 + 20 * Math.sin(t * 9)}" fill="#5dff9a" opacity=".13" style="mix-blend-mode:screen"/>`;
    if (sh.front) s += salaFront(c, t, sh.front);
  } else if (sh.set === 'street') s += street(t, c);
  else if (sh.set === 'macro') s += macro(t, c);
  else if (sh.set === 'city') s += cityView(t, c);
  s += `</g>`;
  // gradação de cor da cena
  const grade = { sala: sh.night ? '#2a1830' : '#14204a', street: '#16204a', macro: '#1a1430', city: '#101a44' }[sh.set];
  s += `<rect width="${W}" height="${H}" fill="${grade}" opacity="${sh.night ? 0.32 : 0.22}" style="mix-blend-mode:multiply"/>`;
  // rótulos
  for (const [lt, txt] of sh.labels || []) if (lt != null && t >= lt - 0.05) s += label(txt, t - lt, sh);
  if (sh.bubble && t > A.evoce - 0.1) s += bubble('E VOCÊ, ABRIRIA ESSA PORTA?', t - A.evoce);
  return s;
}
function label(txt, dt, sh) {
  const p = pop(0, dt), idx = (sh.labels || []).findIndex(l => l[1] === txt);
  const y = 300 + idx * 92, w = txt.length * 30 + 60, x = sh.labelRight ? W - 90 - w : 90;
  return `<g transform="translate(${x},${y}) rotate(-3) scale(${p})" opacity="${clamp(dt / 0.12)}"><rect x="-10" y="-46" width="${w}" height="68" fill="#0d0a12" opacity=".78" stroke="#ffb347" stroke-width="3"/><text x="18" y="4" font-family="M9" font-size="44" letter-spacing="2" fill="#fff4e0">${txt}</text></g>`;
}
function bubble(txt, dt) {
  const p = pop(0, dt);
  return `<g transform="translate(540,250) scale(${p})"><path d="M-430,-80 H430 Q460,-80 460,-50 V60 Q460,90 430,90 H60 L0,150 L-20,90 H-430 Q-460,90 -460,60 V-50 Q-460,-80 -430,-80 Z" fill="#fbf6ee" stroke="${INK}" stroke-width="7"/><rect x="-440" y="-120" width="140" height="56" rx="10" fill="#e0902f" stroke="${INK}" stroke-width="5"/><text x="-370" y="-80" font-family="M9" font-size="34" text-anchor="middle" fill="#fff">CAIO</text><text x="0" y="22" font-family="M9" font-size="50" text-anchor="middle" fill="#120b16">${txt}</text></g>`;
}

// ---------- legenda (2–3 palavras, laranja nas palavras-chave) ----------
const KEY = new Set(['7', '42', '12', 'imune', 'zumbi', 'piscava', 'setimo', 'andar', 'quarenta', 'duas', 'latas', 'lanterna', 'portaria', 'circulos', 'sangue', 'gota', 'mil', 'vacinas', 'doze', 'quilometros', 'meia-noite', 'tres', 'vezes', 'nome', 'abriria', 'porta', 'unico', 'cientista']);
let CHUNKS = [];
function buildChunks() {
  CHUNKS = []; let cur = [];
  WORDS.forEach((w, i) => {
    cur.push(w);
    const next = WORDS[i + 1], gap = next ? next[1] - w[2] : 9, end = /[.,?!]$/.test(w[0]);
    if (cur.length >= 3 || end || gap > 0.25 || (cur.length >= 2 && w[0].length > 7)) { CHUNKS.push(cur); cur = []; }
  });
  if (cur.length) CHUNKS.push(cur);
}
function caption(t) {
  for (let i = 0; i < CHUNKS.length; i++) {
    const ch = CHUNKS[i], a = ch[0][1], b = Math.min(ch[ch.length - 1][2] + 0.15, CHUNKS[i + 1] ? CHUNKS[i + 1][0][1] : 1e9);
    if (t < a - 0.03 || t > b) continue;
    const nch = ch.map(w => w[0]).join(' ').length; const sc = (0.9 + 0.1 * easeOut((t - a + 0.03) / 0.12)) * Math.min(1, 15 / nch);
    const words = ch.map(w => { const raw = w[0].replace(/[.,?!"“”]/g, '').toUpperCase(); const k = KEY.has(norm(w[0])); const on = t >= w[1] - 0.03;
      return `<tspan fill="${k ? '#ff9a1f' : '#ffffff'}" opacity="${on ? 1 : 0.55}">${raw}</tspan>`; }).join(' ');
    return `<g transform="translate(540,1270) scale(${sc})"><text text-anchor="middle" font-family="M9" font-size="78" stroke="#000" stroke-width="16" stroke-linejoin="round" paint-order="stroke" letter-spacing="1">${words}</text></g>`;
  }
  return '';
}

// ---------- quadro final ----------
let READY = false;
function render(t) {
  if (!READY) { buildShots(); buildChunks(); READY = true; }
  let k = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t0) k = i;
  let s = '';
  const sh = SHOTS[k];
  if (k > 0 && sh.dis > 0 && t < sh.t0 + sh.dis) {
    const a = (t - sh.t0) / sh.dis;
    s += drawShot(SHOTS[k - 1], t) + `<g opacity="${ease(a)}">${drawShot(sh, t)}</g>`;
  } else s += drawShot(sh, t);
  // pós: grão + vinheta + legenda
  const g = Math.floor(t * FPS) % 4, r = rng(Math.floor(t * FPS) + 1);
  s += `<image href="grain${g}.png" x="${-r() * 200}" y="${-r() * 300}" width="1400" height="2400" preserveAspectRatio="none" opacity=".09" style="mix-blend-mode:overlay"/>`;
  s += `<rect width="${W}" height="${H}" fill="url(#gVig)"/>`;
  s += caption(t);
  // fade-in do 1º quadro não (gancho já no quadro 0); flash preto nenhum
  document.getElementById('root').innerHTML = s;
  return true;
}
window.render = render;
window.setWords = (w, d) => { WORDS = w; READY = false; };

// ---------- linha do tempo para o som + capa ----------
window.timeline = () => { if (!READY) { buildShots(); buildChunks(); READY = true; }
  return { A, shots: SHOTS.map(s => ({ id: s.id, t0: s.t0, dis: s.dis, labels: (s.labels || []).map(l => l[0]) })) }; };
window.thumb = () => {
  if (!READY) { buildShots(); buildChunks(); READY = true; }
  const sh = SHOTS.find(s => s.id === 'nome'); const t = A.chamou + 0.6;
  let s = drawShot({ ...sh, cam: () => ({ x: 2140, y: 551, z: 1.3, r: -3 }), labels: [] }, t);
  s += `<rect width="${W}" height="${H}" fill="url(#gVig)"/>`;
  const T = (txt, y, size, fill) => `<text x="540" y="${y}" text-anchor="middle" font-family="M9" font-size="${size}" fill="${fill}" stroke="#120b16" stroke-width="20" stroke-linejoin="round" paint-order="stroke">${txt}</text>`;
  s += T('E SE SÓ VOCÊ', 420, 112, '#ffffff') + T('FOSSE IMUNE?', 545, 124, '#ffb02e');
  s += `<g transform="translate(540,1460) rotate(-3)"><rect x="-250" y="-58" width="500" height="84" fill="#120b16" stroke="#ff4a3a" stroke-width="5"/><text y="4" text-anchor="middle" font-family="M9" font-size="50" fill="#fff">VÍRUS ZUMBI</text></g>`;
  s += `<text x="540" y="1580" text-anchor="middle" font-family="M9" font-size="38" letter-spacing="6" fill="#e9e4dc" stroke="#120b16" stroke-width="10" paint-order="stroke">OUTRA REALIDADE</text>`;
  document.getElementById('root').innerHTML = s;
};
