// ÚLTIMA LINHA — EP. 02 "Ponto morto". render(t) desenha o quadro inteiro no segundo t (mesmo t = mesmo quadro).
const W = 1080, H = 1920, FPS = 30;
const { draw: drawChar, POSES, mix, ease, INK, part, CAST } = window.RIG;

// ---------- utilidades ----------
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => ease(clamp((x - a) / (b - a)));
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const norm = w => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
const pop = (t0, t) => { const x = (t - t0) / 0.32; if (x <= 0) return 0; if (x >= 1) return 1; return 1 + Math.sin(x * Math.PI * 1.6) * (1 - x) * 0.7 - (1 - easeOut(x)); };
let WORDS = window.WORDS || [];
function Wt(word, n = 1, after = 0) { const k = norm(word); let c = 0; for (const w of WORDS) { if (w[1] < after) continue; if (norm(w[0]) === k && ++c === n) return w[1]; } console.log('ANCORA FALTANDO', word); return null; }
function WtEnd(word, n = 1, after = 0) { const k = norm(word); let c = 0; for (const w of WORDS) { if (w[1] < after) continue; if (norm(w[0]) === k && ++c === n) return w[2]; } return null; }

// zumbis genéricos (figurantes): paleta de gente comum com pele e olhos de repetidor
const ZSKIN = ['#9fb08c', '#6c7d5e'];
[['z1', 'kaua'], ['z2', 'marta'], ['z3', 'osvaldo'], ['z4', 'zelia'], ['z5', 'nina'], ['z6', 'bento']].forEach(([id, b], i) => {
  CAST[id] = { ...CAST[b], skin: ZSKIN, zombie: true, eye: '#fff', badge: false, glasses: false, headphones: false, bag: false,
    top: [['#7a5a3a', '#4a3622'], ['#5a6a7a', '#36424e'], ['#8a3a3a', '#5a2222'], ['#3a5a4a', '#22382e'], ['#6a5a8a', '#423856'], ['#7a7a5a', '#4e4e36']][i] };
});

// ---------- âncoras ----------
const A = {};
function anchors() {
  A.semaforos = Wt('semaforos'); A.amarelo = WtEnd('amarelo'); A.bahia = Wt('bahia'); A.carro = Wt('carro'); A.alarme = Wt('alarme'); A.dezenas = Wt('dezenas'); A.barulho = WtEnd('barulho');
  A.kaua = Wt('kaua'); A.perceber = Wt('perceber'); A.farois = Wt('farois'); A.som = Wt('som'); A.somEnd = WtEnd('som');
  A.desligou = Wt('desligou'); A.motor = Wt('motor'); A.morto = Wt('morto'); A.doze = Wt('doze') ?? Wt('12'); A.silencio = Wt('silencio'); A.passos = Wt('passos'); A.asfalto = WtEnd('asfalto');
  A.quando = Wt('quando'); A.embaixo = Wt('embaixo'); A.relogio = Wt('relogio'); A.apitou = Wt('apitou'); A.cheia = WtEnd('cheia'); A.conta = Wt('conta'); A.fazia = Wt('fazia'); A.quarenta = Wt('quarenta') ?? Wt('40'); A.mordida = WtEnd('mordida');
  A.evoce = Wt('voce', 1, A.mordida); A.coragem = Wt('coragem'); A.end = WORDS[WORDS.length - 1][2];
}
function speaking(t) {
  if (!A.evoce) return 0;
  for (const w of WORDS) { if (w[1] < A.evoce - 0.01) continue;
    if (t >= w[1] && t <= w[2]) { const k = (t - w[1]) / Math.max(0.08, w[2] - w[1]); return 0.25 + 0.75 * Math.abs(Math.sin(k * Math.PI * Math.max(1, Math.round((w[2] - w[1]) / 0.13)))); } }
  return 0;
}
const BLINKS = (() => { const r = rng(7), b = []; let x = 1.1; while (x < 120) { b.push(x); x += 2 + r() * 3; } return b; })();
function blinkAt(t, off = 0) { for (const b of BLINKS) { const d = t - b - off; if (d >= 0 && d < 0.14) return Math.sin(d / 0.14 * Math.PI); } return 0; }

// ---------- câmera ----------
function camKeys(keys, t) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], z: keys[0][3], r: keys[0][4] || 0 };
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) { const k = ease((t - a[0]) / (b[0] - a[0])); return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), z: lerp(a[3], b[3], k), r: lerp(a[4] || 0, b[4] || 0, k) }; } }
  const l = keys[keys.length - 1]; return { x: l[1], y: l[2], z: l[3], r: l[4] || 0 };
}
const camT = c => `translate(${W / 2},${H / 2}) rotate(${c.r}) scale(${c.z}) translate(${-c.x},${-c.y})`;
let REF = { x: 540, y: 960 };
const par = (c, f, inner) => `<g transform="translate(${(c.x - REF.x) * (1 - f)},${(c.y - REF.y) * (1 - f)})">${inner}</g>`;
// tremor do ônibus andando (sempre vivo)
const busShake = t => ({ x: Math.sin(t * 13.1) * 1.6 + Math.sin(t * 7.3) * 1.2, y: Math.sin(t * 11.7) * 2.2 + Math.sin(t * 3.1) * 1.4 });

// ---------- materiais ----------
const LFLUO = { dir: [0.2, -1], rim: '#a8fff0', rimW: 7 };
const LSOD = { dir: [-0.8, -0.5], rim: '#ffcf7a', rimW: 8 };
const LRADIO = { dir: [0.8, 0.3], rim: '#7dffb0', rimW: 8 };
const obj = (d, base, dark, sh = 12) => part(d, [base, dark], { dir: [0.2, -1], rim: base, rimW: 0 }, 0, sh);
const rect = (x, y, w, h, r = 0) => r ? `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z` : `M${x},${y} H${x + w} V${y + h} H${x} Z`;
function dustQ(t, q, n, seed, col = '#eaf3ff') {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) { const u0 = r(), v0 = r(), sp = 0.01 + r() * 0.02, ph = r() * 6.28;
    const u = (u0 + Math.sin(t * 0.4 + ph) * 0.03 + 1) % 1, v = (v0 + t * sp) % 1;
    const x = lerp(lerp(q[0][0], q[1][0], u), lerp(q[3][0], q[2][0], u), v), y = lerp(lerp(q[0][1], q[1][1], u), lerp(q[3][1], q[2][1], u), v);
    s += `<circle cx="${x}" cy="${y}" r="${1.6 + r() * 3.2}" fill="${col}" opacity="${((0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + ph * 3))) * Math.sin(v * Math.PI)).toFixed(2)}"/>`; }
  return `<g style="mix-blend-mode:screen">${s}</g>`;
}

// ---------- cidade ----------
const CITY = (() => { const r = rng(11), b = []; let x = -1200; while (x < 4200) { const w = 90 + r() * 170, h = 200 + r() * 620, win = []; for (let i = 0; i < 40; i++) win.push([r(), r(), r()]); b.push({ x, w, h, win }); x += w + 6 + r() * 20; } return b; })();
function cityRow(t, baseY, tint, scroll = 0, wrap = 5400) {
  let s = '';
  for (const k of CITY) { const x = ((k.x - scroll) % wrap + wrap) % wrap - 1200, y = baseY - k.h;
    s += `<rect x="${x}" y="${y}" width="${k.w}" height="${k.h + 600}" fill="${tint}" stroke="${INK}" stroke-width="5"/>`;
    for (const [u, v, l] of k.win) if (l > 0.8) s += `<rect x="${x + 12 + u * (k.w - 36)}" y="${y + 20 + v * (k.h - 40)}" width="14" height="18" fill="#ffd36b" opacity="${l > 0.95 ? 0.5 + 0.5 * Math.sin(t * 9 + u * 50) : 0.85}"/>`; }
  return s;
}
const sky = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#gSky)"/>` + [...Array(50)].map((_, i) => { const r = rng(i * 13 + 3); return `<circle cx="${x + r() * w}" cy="${y + r() * h * 0.45}" r="${1.4 + r() * 2}" fill="#dfe8ff" opacity="${0.35 + r() * 0.5}"/>`; }).join('');

// =====================================================================
// CENÁRIO 1 — AVENIDA (vista lateral, câmera acompanha o ônibus)
// =====================================================================
function bus(t, x, y, s, lights = true) {
  const sh = busShake(t); let b = `<g transform="translate(${x + sh.x},${y + sh.y}) scale(${s})">`;
  b += `<ellipse cx="0" cy="250" rx="760" ry="34" fill="#000" opacity=".45"/>`;
  b += obj('M-720,-260 Q-720,-300 -680,-300 H660 Q720,-300 730,-240 L760,120 Q764,200 700,200 H-700 Q-740,200 -740,160 Z', '#e9ecef', '#a9b0b8', 16);
  b += `<path d="M-738,40 H758 V110 H-738 Z" fill="#2f6fd0" stroke="${INK}" stroke-width="6"/><path d="M-738,120 H760" stroke="#f2b33a" stroke-width="10"/>`;
  // janelas acesas com passageiros (silhuetas)
  for (let i = 0; i < 7; i++) { const wx = -640 + i * 175;
    b += `<rect x="${wx}" y="-250" width="150" height="190" rx="10" fill="#bff6ea" stroke="${INK}" stroke-width="7"/><rect x="${wx}" y="-250" width="150" height="190" rx="10" fill="#7fe0d0" opacity=".35"/>`;
    if ([1, 2, 4, 6].includes(i)) b += `<circle cx="${wx + 75}" cy="-150" r="30" fill="#24303f"/><path d="M${wx + 35},-60 Q${wx + 75},-120 ${wx + 115},-60 Z" fill="#24303f"/>`;
  }
  b += `<rect x="610" y="-250" width="110" height="250" rx="12" fill="#0f1a26" stroke="${INK}" stroke-width="7"/><text x="0" y="-268" text-anchor="middle" font-family="M9" font-size="34" fill="#ffb02e">1040</text>`;
  b += `<rect x="-700" y="-292" width="420" height="40" rx="6" fill="#111" stroke="${INK}" stroke-width="4"/><text x="-490" y="-262" text-anchor="middle" font-family="M9" font-size="28" fill="#ffb02e" letter-spacing="2">ÚLTIMA LINHA</text>`;
  for (const wx of [-470, 480]) { const rot = -t * 520; b += `<g transform="translate(${wx},190)"><circle r="78" fill="#1b1b1f" stroke="${INK}" stroke-width="8"/><g transform="rotate(${rot})"><circle r="34" fill="#9aa0a8" stroke="${INK}" stroke-width="6"/><path d="M0,-34 V34 M-34,0 H34" stroke="${INK}" stroke-width="5"/></g></g>`; }
  b += lights ? `<path d="M762,40 L1500,-80 L1500,260 Z" fill="url(#gHead)" opacity=".55" style="mix-blend-mode:screen"/><circle cx="752" cy="80" r="22" fill="#fff6d0"/>` : `<circle cx="752" cy="80" r="22" fill="#3a3a30" stroke="${INK}" stroke-width="4"/>`;
  return b + '</g>';
}
function avenida(t, c) {
  let s = par(c, 0.2, sky(-2000, -1200, 6000, 3600) + `<circle cx="760" cy="420" r="60" fill="#eef3ff"/><circle cx="760" cy="420" r="130" fill="#cfe0ff" opacity=".15"/>`);
  s += par(c, 0.35, `<g transform="translate(0,980) scale(.6)">${cityRow(t, 0, '#1d2850', t * 60)}</g>`);
  s += par(c, 0.6, `<g transform="translate(0,1240) scale(.85)">${cityRow(t + 2, 0, '#26315e', t * 260)}</g>`);
  // rua
  s += `<path d="M-2000,1260 H4000 V3000 H-2000 Z" fill="#232838"/>` + [...Array(14)].map((_, i) => { const x = ((i * 420 - t * 900) % 5880 + 5880) % 5880 - 2000; return `<rect x="${x}" y="1560" width="200" height="16" fill="#e8e0b0" opacity=".7"/>`; }).join('');
  s += `<path d="M-2000,1260 H4000" stroke="${INK}" stroke-width="8"/>`;
  // postes passando (luz de sódio)
  for (let i = 0; i < 6; i++) { const x = ((i * 900 - t * 900) % 5400 + 5400) % 5400 - 2000;
    s += `<rect x="${x}" y="560" width="22" height="720" fill="#20232c" stroke="${INK}" stroke-width="5"/><path d="M${x - 50},560 H${x + 80} L${x + 60},590 H${x - 30} Z" fill="#16181f" stroke="${INK}" stroke-width="4"/><ellipse cx="${x + 15}" cy="${595}" rx="40" ry="10" fill="#ffd36b"/>`;
    s += `<path d="M${x - 30},600 L${x + 60},600 L${x + 300},1600 L${x - 260},1600 Z" fill="url(#gSod)" opacity=".5" style="mix-blend-mode:screen"/>`; }
  s += bus(t, 1500, 1180, 0.78);
  // frente desfocada: grade passando
  s += par(c, 1.6, `<g filter="url(#fBlur)">${[...Array(10)].map((_, i) => { const x = ((i * 600 - t * 2400) % 6000 + 6000) % 6000 - 2400; return `<rect x="${x}" y="1500" width="70" height="900" fill="#0b0a12"/>`; }).join('')}</g>`);
  return s;
}

// =====================================================================
// CENÁRIO 2 — INTERIOR (do para-brisa olhando para o fundo do ônibus)
// =====================================================================
const VP = [540, 790];
const ROWS = [ // [xEsq, xDir, yQuadril, escala]
  [250, 840, 1430, 0.6], [345, 745, 1215, 0.45], [405, 680, 1085, 0.36], [445, 640, 1000, 0.29]];
function seatBack(x, y, s) { return `<g transform="translate(${x},${y}) scale(${s})">${obj('M-150,-430 Q-150,-470 -110,-470 H110 Q150,-470 150,-430 V0 H-150 Z', '#2e5aa0', '#1d3c70', 14)}<path d="M-120,-430 H120" stroke="#6f9be0" stroke-width="8" opacity=".6"/></g>`; }
function seatFront(x, y, s) { return `<g transform="translate(${x},${y}) scale(${s})">${obj('M-170,-40 H170 V140 H-170 Z', '#2a5394', '#1a3666', 10)}<path d="M-170,-40 H170" stroke="#7ea6e8" stroke-width="6" opacity=".7"/></g>`; }
function interior(t, c, o = {}) {
  let s = `<rect x="-600" y="-400" width="2400" height="2900" fill="#1a2433"/>`;
  // janela de trás com a rua passando
  s += `<clipPath id="cBack"><rect x="400" y="660" width="280" height="190" rx="14"/></clipPath><g clip-path="url(#cBack)"><rect x="380" y="640" width="320" height="230" fill="#141c3a"/>`;
  for (let i = 0; i < 5; i++) { const ph = ((t * 0.9 + i / 5) % 1); s += `<circle cx="${540 + (i % 2 ? 1 : -1) * (30 + ph * 260)}" cy="${700 - ph * 30}" r="${4 + ph * 16}" fill="#ffd36b" opacity="${0.9 - ph * 0.6}"/>`; }
  s += `<g transform="translate(380,820) scale(.22)">${cityRow(t, 0, '#1d2850', -t * 200)}</g></g><rect x="400" y="660" width="280" height="190" rx="14" fill="none" stroke="${INK}" stroke-width="8"/>`;
  // paredes laterais em perspectiva com janelas
  s += `<path d="M-600,-400 L400,640 L400,880 L-600,2500 Z" fill="#2c3a52" stroke="${INK}" stroke-width="6"/><path d="M1680,-400 L680,640 L680,880 L1680,2500 Z" fill="#283650" stroke="${INK}" stroke-width="6"/>`;
  s += `<path d="M-600,240 L400,700 L400,800 L-600,1400 Z M1680,240 L680,700 L680,800 L1680,1400 Z" fill="#0f1830" stroke="${INK}" stroke-width="6"/>`;
  // luzes da rua varrendo as janelas
  for (let i = 0; i < 3; i++) { const ph = (t * 0.55 + i / 3) % 1, u = ph;
    const xl = lerp(400, -600, u), yl0 = lerp(700, 240, u), yl1 = lerp(800, 1400, u);
    s += `<path d="M${xl},${yl0} L${xl - 120 * u - 20},${yl0 - 30 * u} L${xl - 120 * u - 20},${yl1 + 60 * u} L${xl},${yl1} Z" fill="#ffcf7a" opacity="${0.5 * Math.sin(u * Math.PI)}" style="mix-blend-mode:screen"/>`;
    const xr = lerp(680, 1680, (u + 0.33) % 1), ur = (u + 0.33) % 1;
    s += `<path d="M${xr},${lerp(700, 240, ur)} L${xr + 120 * ur + 20},${lerp(700, 240, ur) - 30 * ur} L${xr + 120 * ur + 20},${lerp(800, 1400, ur) + 60 * ur} L${xr},${lerp(800, 1400, ur)} Z" fill="#ffcf7a" opacity="${0.45 * Math.sin(ur * Math.PI)}" style="mix-blend-mode:screen"/>`; }
  // teto e luzes frias
  s += `<path d="M-600,-400 L400,640 H680 L1680,-400 Z" fill="#202b3e" stroke="${INK}" stroke-width="6"/>`;
  const fl = 0.85 + 0.15 * Math.sin(t * 31) * (Math.sin(t * 2.7) > 0.85 ? 1 : 0);
  s += `<path d="M90,-400 L500,640 L520,640 L250,-400 Z M990,-400 L580,640 L560,640 L830,-400 Z" fill="#dffaf4" opacity="${0.9 * fl}" stroke="${INK}" stroke-width="3"/>`;
  // chão e corredor
  s += `<path d="M-600,2500 L400,880 H680 L1680,2500 Z" fill="#1c1f2a"/><path d="M380,880 L700,880 L1000,2500 L80,2500 Z" fill="#2a2f3d" stroke="${INK}" stroke-width="5"/>` + [...Array(8)].map((_, i) => { const y = 900 + Math.pow(i / 8, 1.8) * 1600; return `<path d="M${lerp(380, 80, (y - 880) / 1620)},${y} H${lerp(700, 1000, (y - 880) / 1620)}" stroke="#3b4152" stroke-width="4"/>`; }).join('');
  // banco do fundo + Osvaldo (quando já sentou)
  const watchGlow = o.watch ? `<circle cx="506" cy="860" r="${10 + 4 * Math.sin(t * 25)}" fill="#7dffb0" opacity=".9"/><circle cx="506" cy="860" r="40" fill="#7dffb0" opacity=".3" style="mix-blend-mode:screen"/>` : '';
  s += `<g transform="translate(540,905) scale(.24)">${obj('M-500,-430 Q-500,-470 -460,-470 H460 Q500,-470 500,-430 V0 H-500 Z', '#2e5aa0', '#1d3c70', 14)}</g>`;
  if (o.osvaldoBack) s += drawChar({ who: 'osvaldo', pose: o.osvaldoBack.pose, face: o.osvaldoBack.face, light: LFLUO, x: 540, y: 905, scale: 0.24, legs: false, t }) + `<g transform="translate(540,905) scale(.24)">${obj('M-520,-40 H520 V140 H-520 Z', '#2a5394', '#1a3666', 10)}</g>` + watchGlow;
  // fileiras do fundo pra frente
  const pax = { 3: ['marta', null], 2: [null, 'nina'], 1: [null, 'kaua'], 0: ['zelia', null] };
  for (let r = ROWS.length - 1; r >= 0; r--) { const [xl, xr, y, sc] = ROWS[r];
    s += seatBack(xl, y, sc) + seatBack(xr, y, sc);
    pax[r].forEach((who, k) => { if (!who) return; const x = k ? xr : xl;
      const ov = (o.pax || {})[who] || {};
      s += drawChar({ who, pose: ov.pose || { ...POSES.idle, head: Math.sin(t * 1.3 + r) * 3 + (o.paxLook ? -8 * (k ? 1 : -1) : 0) }, face: ov.face || { look: o.paxLook ? [k ? -0.6 : 0.6, 0] : [0, 0.2], turn: o.paxLook ? (k ? -0.3 : 0.3) : 0, brow: o.paxBrow || 'neutral', blink: blinkAt(t, r * 0.7 + k) }, light: ov.light || LFLUO, x, y, scale: sc, legs: false, t }); });
    s += seatFront(xl, y, sc) + seatFront(xr, y, sc);
    // barras amarelas
    if (!o.noPoles) s += `<rect x="${xl + 170 * sc}" y="${y - 900 * sc}" width="${14 * sc + 4}" height="${1100 * sc}" fill="#f2b33a" stroke="${INK}" stroke-width="3"/><rect x="${xr - 170 * sc}" y="${y - 900 * sc}" width="${14 * sc + 4}" height="${1100 * sc}" fill="#f2b33a" stroke="${INK}" stroke-width="3"/>`;
  }
  // porta da frente (à esquerda) — Osvaldo entrando
  const dop = o.door || 0;
  s += obj('M-40,620 H230 V1960 H-40 Z', '#1a2230', '#0f141c', 8);
  s += `<rect x="-30" y="640" width="250" height="1300" fill="#0d1424"/>`;
  if (o.osvaldoDoor) s += drawChar({ who: 'osvaldo', pose: o.osvaldoDoor.pose, face: o.osvaldoDoor.face, light: LSOD, x: o.osvaldoDoor.x, y: 1500, scale: 0.72, legs: false, t });
  s += `<g>${obj(`M${-30 - dop * 120},640 H${95 - dop * 120} V1940 H${-30 - dop * 120} Z`, '#c9d4dc', '#8a96a0', 8)}${obj(`M${95 + dop * 120},640 H${220 + dop * 120} V1940 H${95 + dop * 120} Z`, '#c9d4dc', '#8a96a0', 8)}</g>`;
  // Bento ao volante (frente, à direita)
  if (o.bento) { const b = o.bento;
    s += drawChar({ who: 'bento', pose: b.pose, face: b.face, light: b.light || LFLUO, x: 820, y: 1720, scale: 1.0, legs: false, t });
    // volante
    s += `<g transform="translate(780,1700) rotate(${Math.sin(t * 0.9) * 6})"><ellipse rx="300" ry="110" fill="none" stroke="#14161c" stroke-width="40"/><ellipse rx="300" ry="110" fill="none" stroke="${INK}" stroke-width="6"/><path d="M-60,0 H60 M0,0 V100" stroke="#14161c" stroke-width="34"/></g>`;
  }
  // rádio no painel
  const rad = o.radio || 0;
  s += `<g transform="translate(980,1860)">${obj('M-150,-70 H150 V70 H-150 Z', '#2d3236', '#191c1f', 8)}<rect x="-128" y="-50" width="180" height="60" rx="6" fill="${rad ? '#5dff9a' : '#2e6b46'}"/><path d="M-118,-20 ${[...Array(16)].map((_, i) => `L${-118 + i * 10.5},${-20 + Math.sin(t * 30 + i * 1.7) * rad * 18}`).join(' ')}" stroke="#0b3a1f" stroke-width="4" fill="none"/><circle cx="100" cy="-20" r="26" fill="#111" stroke="${INK}" stroke-width="5"/></g>`;
  if (rad) s += `<circle cx="960" cy="1700" r="${330 + 20 * Math.sin(t * 9)}" fill="#5dff9a" opacity="${0.14 * rad}" style="mix-blend-mode:screen"/>`;
  // retrovisor interno
  s += `<g transform="translate(540,140)"><rect x="-8" y="-200" width="16" height="200" fill="#111"/>${obj('M-300,-20 H300 Q330,-20 330,10 V120 Q330,150 300,150 H-300 Q-330,150 -330,120 V10 Q-330,-20 -300,-20 Z', '#2a2d33', '#16181c', 6)}<rect x="-300" y="0" width="600" height="130" rx="18" fill="#7f9ab8" opacity=".5"/></g>`;
  s += dustQ(t, [[200, 0], [880, 0], [880, 1200], [200, 1200]], 50, 4, '#e0fff8');
  return s;
}

// =====================================================================
// CENÁRIO 3 — O PONTO (pelo para-brisa)
// =====================================================================
function ponto(t, c) {
  let s = par(c, 0.3, sky(-1200, -800, 3400, 2600));
  s += par(c, 0.45, `<g transform="translate(-300,1050) scale(.6)">${cityRow(t, 0, '#1d2850')}</g>`);
  s += `<path d="M-1200,1050 H2400 V3200 H-1200 Z" fill="#262b3c"/><path d="M-1200,1250 H2400 V1330 H-1200 Z" fill="#3a3f52" stroke="${INK}" stroke-width="5"/>`;
  // abrigo do ponto
  s += obj('M120,620 H980 V660 H120 Z', '#3b4a6a', '#24304a', 6) + obj('M140,660 H170 V1260 H140 Z M930,660 H960 V1260 H930 Z', '#5a6278', '#363c4e', 4);
  s += `<rect x="190" y="700" width="300" height="420" fill="#ffe9a0" opacity=".25" stroke="${INK}" stroke-width="5"/>`;
  // placa do ponto
  s += `<rect x="742" y="560" width="16" height="720" fill="#20232c" stroke="${INK}" stroke-width="4"/><g transform="translate(750,560)">${obj('M-90,-120 H90 V0 H-90 Z', '#f2f2f2', '#b9b9b9', 6)}<rect x="-80" y="-110" width="160" height="40" fill="#2f6fd0"/><text y="-80" text-anchor="middle" font-family="M9" font-size="26" fill="#fff">PONTO</text><text y="-28" text-anchor="middle" font-family="M9" font-size="30" fill="#111">1040</text></g>`;
  // farol do ônibus
  s += `<path d="M-200,2200 L500,1100 L1100,1100 L1600,2200 Z" fill="url(#gHeadV)" opacity=".55" style="mix-blend-mode:screen"/>`;
  // 8 repetidores andando em círculo em volta da placa
  const ids = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z2', 'z1'], arr = [];
  for (let i = 0; i < 8; i++) { const a = t * 0.55 + i / 8 * Math.PI * 2, x = 750 + Math.cos(a) * 330, y = 1290 + Math.sin(a) * 90;
    arr.push({ i, a, x, y, sc: 0.36 + (Math.sin(a) + 1) * 0.04 }); }
  arr.sort((p, q) => p.y - q.y).forEach(p => { const k = (Math.sin(t * 7 + p.i) + 1) / 2;
    s += drawChar({ who: ids[p.i], pose: { ...mix(POSES.walkA, POSES.walkB, k), uaL: -6 + Math.sin(t * 7 + p.i) * 8, faL: 6, uaR: 6 - Math.sin(t * 7 + p.i) * 8, faR: -6, head: 22 }, face: { mouth: 0.3 }, light: LSOD, x: p.x, y: p.y - 140, scale: p.sc, flip: Math.sin(p.a) < 0, t }); });
  // para-brisa (frente desfocada): moldura, limpador, painel
  s += par(c, 1.3, `<g filter="url(#fBlur)"><path d="M-1200,-800 H2400 V2700 H-1200 Z M-60,200 Q540,120 1140,200 L1180,1600 Q540,1680 -100,1600 Z" fill-rule="evenodd" fill="#0b0c12"/><path d="M80,1560 L${520 + Math.sin(t * 2.2) * 60},${980 + Math.cos(t * 2.2) * 30}" stroke="#0b0c12" stroke-width="30"/></g>`);
  s += `<rect x="-1200" y="1600" width="3600" height="1400" fill="url(#gDash)"/>`;
  return s;
}

// =====================================================================
// RETROVISOR — o interior espelhado dentro do espelho
// =====================================================================
function mirror(t, c, osv) {
  let s;
  // close no espelho: moldura grande em volta, o resto escurecido
  const inner = `<g transform="translate(540,960) scale(-1,1) translate(-540,-960)">${interior(t, c, { osvaldoBack: osv, noPoles: true, paxBrow: 'worry' })}</g>`;
  s = `<rect x="-2000" y="-2000" width="5000" height="6000" fill="#0b0d14"/>`;
  s += `<clipPath id="cMir"><rect x="40" y="680" width="1000" height="560" rx="60"/></clipPath><g clip-path="url(#cMir)"><g transform="translate(540,980) scale(3.4) translate(-540,-830)">${inner}</g><rect x="40" y="680" width="1000" height="560" fill="#9fb8d8" opacity=".12"/></g>`;
  s += `<path d="M-2000,-2000 H3000 V4000 H-2000 Z M40,420 V1240 H1040 V680 Z" fill-rule="evenodd" fill="#15171d" opacity=".0"/>`;
  s += `<rect x="40" y="680" width="1000" height="560" rx="60" fill="none" stroke="#2a2d33" stroke-width="46"/><rect x="40" y="680" width="1000" height="560" rx="60" fill="none" stroke="${INK}" stroke-width="8"/><path d="M90,710 L300,710 L120,960 Z" fill="#fff" opacity=".07"/>`;
  s += `<rect x="530" y="-400" width="20" height="1080" fill="#111"/>`;
  // olhos do Bento embaixo, refletidos no vidro (plano de reação)
  return s;
}


// =====================================================================
// CENÁRIO 4 — CRUZAMENTO DA RUA DA BAHIA (pelo para-brisa)
// =====================================================================
function cruzamento(t, c) {
  let s = par(c, 0.3, sky(-1200, -800, 3400, 2600));
  s += par(c, 0.45, `<g transform="translate(-300,1050) scale(.6)">${cityRow(t + 5, 0, '#1d2850')}</g>`);
  s += `<path d="M-1200,1050 H2400 V3200 H-1200 Z" fill="#262b3c"/>` + [...Array(7)].map((_, i) => `<rect x="${-200 + i * 220}" y="1330" width="120" height="24" fill="#d8d8d0" opacity=".55"/>`).join('');
  // prédio da esquina com placa da rua
  s += obj('M-400,300 H260 V1060 H-400 Z', '#3a4566', '#252d47', 10) + [...Array(12)].map((_, i) => `<rect x="${-360 + (i % 4) * 150}" y="${360 + Math.floor(i / 4) * 200}" width="90" height="110" fill="${(i * 7) % 5 ? '#14182a' : '#ffd36b'}" stroke="${INK}" stroke-width="4" opacity=".9"/>`).join('');
  s += `<g transform="translate(230,900)"><rect x="-6" y="0" width="12" height="160" fill="#20232c"/><g transform="translate(0,-10)">${obj('M-120,-50 H120 V10 H-120 Z', '#1f6a3a', '#124424', 4)}<text y="-10" text-anchor="middle" font-family="M9" font-size="30" fill="#fff">R. DA BAHIA</text></g></g>`;
  // semáforo piscando amarelo
  const yel = Math.sin(t * Math.PI * 2 * 0.8) > 0 ? 1 : 0.12;
  s += `<rect x="884" y="540" width="16" height="740" fill="#20232c" stroke="${INK}" stroke-width="4"/><g transform="translate(892,520)">${obj('M-44,-150 H44 V40 H-44 Z', '#22252e', '#121419', 6)}<circle cy="-112" r="24" fill="#3a1414"/><circle cy="-52" r="24" fill="#ffc21a" opacity="${yel}"/><circle cy="8" r="24" fill="#123a1c"/><circle cy="-52" r="90" fill="#ffc21a" opacity="${yel * 0.22}" style="mix-blend-mode:screen"/></g>`;
  // carro batido no poste com alarme (pisca-alerta) e fumaça
  const bl = Math.sin(t * Math.PI * 2 * 1.6) > 0 ? 1 : 0.15;
  s += `<g transform="translate(560,1180) rotate(-10)">${obj('M-260,-60 Q-250,-140 -150,-150 L120,-150 Q220,-140 260,-60 V40 Q260,70 230,70 H-230 Q-260,70 -260,40 Z', '#c9c9c4', '#8a8a86', 14)}${obj('M-140,-140 L-90,-230 H100 L150,-140 Z', '#9fb4c8', '#6c8094', 8)}<path d="M-120,-200 l40,30 l-20,40 M60,-210 l-30,50" stroke="#fff" stroke-width="4" opacity=".7"/>
    <circle cx="-262" cy="-20" r="16" fill="#ffae3a" opacity="${bl}"/><circle cx="262" cy="-20" r="16" fill="#ffae3a" opacity="${bl}"/><circle cx="-262" cy="-20" r="70" fill="#ffae3a" opacity="${bl * 0.28}" style="mix-blend-mode:screen"/><circle cx="262" cy="-20" r="70" fill="#ffae3a" opacity="${bl * 0.28}" style="mix-blend-mode:screen"/>
    <g transform="translate(-170,70)"><circle r="54" fill="#1b1b1f" stroke="${INK}" stroke-width="6"/></g><g transform="translate(170,70)"><circle r="54" fill="#1b1b1f" stroke="${INK}" stroke-width="6"/></g></g>`;
  for (let i = 0; i < 6; i++) { const ph = (t * 0.25 + i / 6) % 1; s += `<circle cx="${420 + Math.sin(ph * 8 + i) * 30 + ph * 60}" cy="${1060 - ph * 520}" r="${30 + ph * 90}" fill="#9aa4b8" opacity="${0.35 * (1 - ph)}"/>`; }
  // multidão caminhando devagar na direção do barulho
  const ids = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6'], crowd = [];
  for (let i = 0; i < 14; i++) { const r = rng((i + 1) * 2654435761 % 4294967296); r(); r(); const ang = r() * Math.PI * 2, R0 = 520 + r() * 380, k = (t * 0.035 + r() * 0.2) % 1;
    const R = R0 * (1 - 0.45 * k); crowd.push({ i, x: 560 + Math.cos(ang) * R * 1.1, y: 1230 + Math.sin(ang) * R * 0.22 + 40, flip: Math.cos(ang) > 0, who: ids[i % 6] }); }
  crowd.sort((p, q) => p.y - q.y).forEach(p => { const k = (Math.sin(t * 5 + p.i) + 1) / 2, sc = 0.2 + (p.y - 1000) / 1600;
    s += drawChar({ who: p.who, pose: { ...mix(POSES.walkA, POSES.walkB, k), uaL: -60, faL: -10, uaR: -66, faR: -6, head: 16 }, face: { mouth: 0.35 }, light: { dir: [0.6, -0.6], rim: '#ffcf7a', rimW: 7 }, x: p.x, y: p.y - 150, scale: sc, flip: p.flip, t }); });
  // para-brisa (frente desfocada) e painel
  s += par(c, 1.3, `<g filter="url(#fBlur)"><path d="M-1200,-800 H2400 V2700 H-1200 Z M-60,200 Q540,120 1140,200 L1180,1600 Q540,1680 -100,1600 Z" fill-rule="evenodd" fill="#0b0c12"/></g>`);
  s += `<rect x="-1200" y="1600" width="3600" height="1400" fill="url(#gDash)"/>`;
  return s;
}

// =====================================================================
// CENÁRIO 5 — A DESCIDA EM PONTO MORTO (vista lateral, ônibus apagado entre eles)
// =====================================================================
function descida(t, c) {
  const roll = A.desligou ? clamp((t - A.desligou) / 6) : 0;
  let s = `<g transform="rotate(9 1500 1200)">`;
  s += par(c, 0.2, sky(-2000, -1400, 6000, 3800) + `<circle cx="900" cy="300" r="60" fill="#eef3ff"/>`);
  s += par(c, 0.35, `<g transform="translate(0,980) scale(.6)">${cityRow(t, 0, '#1d2850', t * 30)}</g>`);
  s += `<path d="M-2000,1260 H4000 V3000 H-2000 Z" fill="#232838"/><path d="M-2000,1260 H4000" stroke="${INK}" stroke-width="8"/>` + [...Array(14)].map((_, i) => { const x = ((i * 420 - t * 260) % 5880 + 5880) % 5880 - 2000; return `<rect x="${x}" y="1560" width="200" height="16" fill="#e8e0b0" opacity=".6"/>`; }).join('');
  // repetidores atrás do ônibus (na calçada do fundo)
  const back = [], front = [];
  for (let i = 0; i < 9; i++) { const r = rng((i + 7) * 2246822519 % 4294967296); r(); r(); const x = ((r() * 3200 - t * 260) % 3600 + 3600) % 3600 - 300; (i % 2 ? back : front).push({ i, x, who: ['z1', 'z2', 'z3', 'z4', 'z5', 'z6'][i % 6] }); }
  for (const p of back) { const k = (Math.sin(t * 4 + p.i) + 1) / 2; s += drawChar({ who: p.who, pose: { ...mix(POSES.walkA, POSES.walkB, k), uaL: -50, faL: -10, uaR: -56, faR: -6, head: 14 }, face: { mouth: 0.3 }, light: LSOD, x: p.x, y: 1080, scale: 0.3, flip: p.i % 3 === 0, t }); }
  s += bus(t * (1 - roll * 0.6), 1500, 1180, 0.78, !A.desligou || t < A.desligou);
  for (const p of front) { const k = (Math.sin(t * 4 + p.i) + 1) / 2; s += drawChar({ who: p.who, pose: { ...mix(POSES.walkA, POSES.walkB, k), uaL: -50, faL: -10, uaR: -56, faR: -6, head: 14 }, face: { mouth: 0.3 }, light: LSOD, x: p.x, y: 1320, scale: 0.4, flip: p.i % 3 === 1, t }); }
  s += `</g>`;
  s += par(c, 1.6, `<g filter="url(#fBlur)">${[...Array(10)].map((_, i) => { const x = ((i * 600 - t * 700) % 6000 + 6000) % 6000 - 2400; return `<rect x="${x}" y="1500" width="70" height="900" fill="#0b0a12"/>`; }).join('')}</g>`);
  return s;
}

// =====================================================================
// PLANOS
// =====================================================================
let SHOTS = [];
function buildShots() {
  anchors();
  const bentoDrive = t => ({ pose: { ...POSES.idle, uaL: 30, faL: -60, uaR: -30, faR: 60, head: Math.sin(t * 0.8) * 2 }, face: { look: [0, 0.3], brow: 'worry', blink: blinkAt(t) } });
  const osv = t => ({ pose: { ...POSES.idle, uaL: 22, faL: -125 }, face: { brow: 'fear', blink: blinkAt(t), look: [0, 0.4] } });
  SHOTS = [
    { id: 'cruzamento', t0: 0, set: 'cruz', dis: 0, cam: t => camKeys([[0, 560, 1060, 1.05], [A.kaua, 600, 1160, 1.4]], t),
      labels: [[A.semaforos, '02:31'], [A.bahia, 'R. DA BAHIA']] },
    { id: 'kaua', t0: A.kaua - 0.3, set: 'int', dis: 0.55, cam: t => camKeys([[A.kaua - 0.3, 720, 1040, 2.5], [A.desligou, 745, 1015, 3.1]], t),
      int: t => ({ bento: null, noPoles: true, osvaldoBack: osv(t), paxBrow: 'worry',
        pax: { kaua: { pose: mix(POSES.idle, { ...POSES.idle, uaR: -60, faR: -40, head: -6 }, sstep(A.som - 0.6, A.som, t)), face: { look: t < A.farois ? [-0.9, 0] : [-0.2, 0], turn: t < A.farois ? -0.5 : -0.1, brow: t > A.som - 0.4 ? 'fear' : 'worry', wide: sstep(A.som - 0.4, A.som, t), blink: blinkAt(t) } } } }),
      labels: [[A.som, 'ELES SEGUEM O SOM']] },
    { id: 'descida', t0: A.desligou - 0.3, set: 'desc', dis: 0.6, cam: t => camKeys([[A.desligou - 0.3, 1480, 1120, 1.12], [A.passos, 1530, 1160, 1.3], [A.quando, 1560, 1190, 1.42]], t),
      labels: [[A.motor, 'MOTOR DESLIGADO'], [A.doze, '12 TONELADAS']] },
    { id: 'relogio', t0: A.quando - 0.25, set: 'int', dis: 0.55, cam: t => camKeys([[A.quando - 0.25, 470, 930, 3.0], [A.mordida, 500, 880, 3.6]], t),
      int: t => ({ osvaldoBack: osv(t), watch: t > A.apitou ? 1 : 0, paxBrow: 'worry', noPoles: true,
        pax: { marta: { pose: { ...POSES.idle, head: 6 }, face: { look: [0.8, -0.2], turn: 0.35, brow: 'fear', blink: blinkAt(t), mouth: (t > A.fazia && t < A.mordida) ? 0.3 + 0.4 * Math.abs(Math.sin(t * 20)) : 0 } } } }),
      labels: [[A.apitou, 'BIP · 03:00'], [A.quarenta, '40 MIN DA MORDIDA']] },
    { id: 'pergunta', t0: A.evoce - 0.35, set: 'int', dis: 0.45, cam: t => camKeys([[A.evoce - 0.35, 745, 1010, 3.4], [A.end + 0.6, 745, 1020, 3.0]], t),
      int: t => ({ osvaldoBack: osv(t), paxBrow: 'worry', bento: null, noPoles: true,
        pax: { kaua: { pose: POSES.idle, face: { look: [0, 0], turn: 0, brow: 'worry', blink: blinkAt(t), mouth: speaking(t) } } } }) },
  ];
}

// ---------- desenha um plano ----------
function drawShot(sh, t) {
  let c = sh.cam(t);
  if (sh.set === 'int' || sh.set === 'ponto' || sh.set === 'mirror' || sh.set === 'cruz') { const b = busShake(t); c = { ...c, x: c.x + b.x / c.z, y: c.y + b.y / c.z }; }
  REF = { avenida: { x: 1400, y: 1000 }, int: { x: 540, y: 960 }, ponto: { x: 560, y: 1080 }, mirror: { x: 540, y: 960 }, cruz: { x: 560, y: 1060 }, desc: { x: 1500, y: 1050 } }[sh.set];
  let s = `<g transform="${camT(c)}">`;
  if (sh.set === 'avenida') s += avenida(t, c);
  else if (sh.set === 'int') { const o = sh.int(t); if (false) o.osvaldoBack = o.osvaldoBack || { pose: { ...POSES.idle, uaL: 22, faL: -125 }, face: { brow: 'fear', blink: blinkAt(t) } }; s += interior(t, c, o); }
  else if (sh.set === 'ponto') s += ponto(t, c);
  else if (sh.set === 'cruz') s += cruzamento(t, c);
  else if (sh.set === 'desc') s += descida(t, c);
  else if (sh.set === 'mirror') { const osv = sh.osv(t);
    // gotas de suor animadas no rosto (desenhadas por cima no espelho)
    s += mirror(t, c, osv);
    for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; s += `<path d="M${520 + i * 22},${660 + ph * 40} q-7,12 0,18 q7,-6 0,-18 Z" fill="#cfefff" stroke="${INK}" stroke-width="2" opacity="${1 - ph}"/>`; } }
  s += `</g>`;
  const grade = { avenida: '#14204a', int: '#0e2a2e', ponto: '#16204a', mirror: '#101a2a', cruz: '#16204a', desc: '#14204a' }[sh.set];
  s += `<rect width="${W}" height="${H}" fill="${grade}" opacity="${sh.quiet ? 0.38 : 0.22}" style="mix-blend-mode:multiply"/>`;
  for (const [lt, txt] of sh.labels || []) if (lt != null && t >= lt - 0.05) s += label(txt, t - lt, (sh.labels || []).findIndex(l => l[1] === txt), sh.labelRight);
  return s;
}
function label(txt, dt, idx, right) {
  const p = pop(0, dt), y = 330 + idx * 92, w = txt.length * 30 + 60, x = right ? W - 90 - w : 90;
  return `<g transform="translate(${x},${y}) rotate(-3) scale(${p})" opacity="${clamp(dt / 0.12)}"><rect x="-10" y="-46" width="${w}" height="68" fill="#0d0a12" opacity=".8" stroke="#ffb347" stroke-width="3"/><text x="18" y="4" font-family="M9" font-size="44" letter-spacing="2" fill="#fff4e0">${txt}</text></g>`;
}

// ---------- legenda ----------
const KEY = new Set(['semaforos', 'amarelo', 'bahia', 'alarme', 'barulho', 'som', 'farois', 'motor', 'morto', 'doze', 'toneladas', 'passos', 'relogio', 'apitou', 'quarenta', 'minutos', 'coragem', 'ladeira', 'silencio', '12', '40', 'duas', 'dezessete', 'ultimo', 'onibus', 'seis', 'passageiros', 'seguranca', 'mordido', 'cachorro', 'oito', 'nenhuma', 'circulos', 'radio', 'nenhum', 'retrovisor', 'braco', 'suando', 'frio', 'fundo', 'deixaria', 'homem', '8', '6']);
let CHUNKS = [];
function buildChunks() { CHUNKS = []; let cur = [];
  WORDS.forEach((w, i) => { cur.push(w); const n = WORDS[i + 1], gap = n ? n[1] - w[2] : 9;
    if (cur.length >= 3 || /[.,?!]$/.test(w[0]) || gap > 0.25 || (cur.length >= 2 && w[0].length > 7)) { CHUNKS.push(cur); cur = []; } });
  if (cur.length) CHUNKS.push(cur); }
function caption(t) {
  for (let i = 0; i < CHUNKS.length; i++) { const ch = CHUNKS[i], a = ch[0][1], b = Math.min(ch[ch.length - 1][2] + 0.15, CHUNKS[i + 1] ? CHUNKS[i + 1][0][1] : 1e9);
    if (t < a - 0.03 || t > b) continue;
    const nch = ch.map(w => w[0]).join(' ').length, sc = (0.9 + 0.1 * easeOut((t - a + 0.03) / 0.12)) * Math.min(1, 15 / nch);
    const words = ch.map(w => { const raw = w[0].replace(/[.,?!"“”]/g, '').toUpperCase(), k = KEY.has(norm(w[0])); return `<tspan fill="${k ? '#ff9a1f' : '#ffffff'}" opacity="${t >= w[1] - 0.03 ? 1 : 0.55}">${raw}</tspan>`; }).join(' ');
    return `<g transform="translate(540,1270) scale(${sc})"><text text-anchor="middle" font-family="M9" font-size="78" stroke="#000" stroke-width="16" stroke-linejoin="round" paint-order="stroke">${words}</text></g>`; }
  return '';
}
const epTag = () => `<g transform="translate(${W - 70},150)"><rect x="-210" y="-42" width="210" height="58" rx="8" fill="#0d0a12" opacity=".75" stroke="#ffb02e" stroke-width="3"/><text x="-105" y="0" text-anchor="middle" font-family="M9" font-size="32" fill="#ffb02e" letter-spacing="2">EP. 02/45</text></g>`;

// ---------- quadro final ----------
let READY = false;
function render(t) {
  if (!READY) { buildShots(); buildChunks(); READY = true; }
  let k = 0; for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t0) k = i;
  const sh = SHOTS[k]; let s = '';
  if (k > 0 && sh.dis > 0 && t < sh.t0 + sh.dis) s += drawShot(SHOTS[k - 1], t) + `<g opacity="${ease((t - sh.t0) / sh.dis)}">${drawShot(sh, t)}</g>`;
  else s += drawShot(sh, t);
  const g = Math.floor(t * FPS) % 4, r = rng(Math.floor(t * FPS) + 1);
  s += `<image href="../../../../engine/cine/grain${g}.png" x="${-r() * 200}" y="${-r() * 300}" width="1400" height="2400" preserveAspectRatio="none" opacity=".09" style="mix-blend-mode:overlay"/>`;
  s += `<rect width="${W}" height="${H}" fill="url(#gVig)"/>` + epTag() + caption(t);
  document.getElementById('root').innerHTML = s; return true;
}
window.render = render;
window.timeline = () => { if (!READY) { buildShots(); buildChunks(); READY = true; } return { A, shots: SHOTS.map(s => ({ id: s.id, t0: s.t0, dis: s.dis, labels: (s.labels || []).map(l => l[0]) })) }; };
window.thumb = () => {
  if (!READY) { buildShots(); buildChunks(); READY = true; }
  const sh = SHOTS.find(s => s.id === 'cruzamento'); const t = A.dezenas + 0.5;
  let s = drawShot({ ...sh, labels: [], cam: () => ({ x: 560, y: 1080, z: 1.15, r: -2 }) }, t);
  s += `<rect width="${W}" height="${H}" fill="url(#gVig)"/>`;
  const T = (txt, y, size, fill) => `<text x="540" y="${y}" text-anchor="middle" font-family="M9" font-size="${size}" fill="${fill}" stroke="#120b16" stroke-width="20" stroke-linejoin="round" paint-order="stroke">${txt}</text>`;
  s += `<g transform="translate(540,330)"><rect x="-230" y="-52" width="460" height="74" rx="10" fill="#120b16" stroke="#ffb02e" stroke-width="4"/><text y="2" text-anchor="middle" font-family="M9" font-size="44" fill="#ffb02e" letter-spacing="4">ÚLTIMA LINHA</text></g>`;
  s += T('ELES SEGUEM', 500, 108, '#ffffff') + T('O SOM', 630, 140, '#ff9a1f');
  s += `<g transform="translate(540,1470) rotate(-3)"><rect x="-210" y="-58" width="420" height="84" fill="#120b16" stroke="#ff4a3a" stroke-width="5"/><text y="4" text-anchor="middle" font-family="M9" font-size="50" fill="#fff">EP. 02/45</text></g>`;
  s += `<text x="540" y="1585" text-anchor="middle" font-family="M9" font-size="36" letter-spacing="6" fill="#e9e4dc" stroke="#120b16" stroke-width="10" paint-order="stroke">NEW OMEGA HISTORY</text>`;
  document.getElementById('root').innerHTML = s;
};
