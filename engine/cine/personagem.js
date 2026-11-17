// personagem.js — boneco em peças (rig) com pivôs, sombra em 2 tons, luz de recorte e contorno de nanquim.
// O MESMO arquivo serve para todos os episódios: só muda pose, expressão e luz, nunca o desenho.
// Coordenadas locais: quadril em (0,0), y para baixo; ângulo 0 = membro pendurado para baixo; positivo = horário.

(function () {
  let UID = 0;
  const INK = '#120b16';

  // ---------- elenco ----------
  const CAST = {
    caio: {
      skin: ['#f0b48c', '#c47f62'], hair: ['#2b1a14', '#140c09'], top: ['#e0902f', '#a85c1e'],
      topIn: '#7a3f14', pants: ['#2f3e5c', '#1d2740'], shoe: ['#e9e4dc', '#a49d95'], eye: '#2a1810',
      hairStyle: 'messy', zombie: false,
    },
    porteiro: {
      skin: ['#9fb08c', '#6c7d5e'], hair: ['#3a3a36', '#222220'], top: ['#3d5a7a', '#263b54'],
      topIn: '#1b2a3d', pants: ['#2b2f38', '#191b21'], shoe: ['#2a2420', '#120e0c'], eye: '#ffffff',
      hairStyle: 'cap', zombie: true,
    },
    legionario: {
      skin: ['#93a882', '#62744f'], hair: ['#b8902e', '#7a5c18'], top: ['#9c2a22', '#611712'],
      topIn: '#3a0d0a', pants: ['#6b5a44', '#463a2b'], shoe: ['#5a3d24', '#36230f'], eye: '#ffffff',
      hairStyle: 'helmet', zombie: true,
    },
    camponesa: {
      skin: ['#a3b38f', '#6f7f5f'], hair: ['#3b2a20', '#1f150f'], top: ['#5e6b3a', '#3b4424'],
      topIn: '#262c16', pants: ['#4a3b2c', '#2e241a'], shoe: ['#3a2a1c', '#21170e'], eye: '#ffffff',
      hairStyle: 'messy', zombie: true,
    },
    bento: {
      skin: ['#c98d66', '#9a6247'], hair: ['#2a1d17', '#120c09'], top: ['#3f6fa8', '#284a75'],
      topIn: '#1d3557', pants: ['#2b3346', '#191e2b'], shoe: ['#2a2420', '#120e0c'], eye: '#2a1810',
      hairStyle: 'short', jacket: ['#4a6d96', '#2e4766'], badge: true, stubble: true, zombie: false,
    },
    osvaldo: {
      skin: ['#b98262', '#8a5a42'], hair: ['#3a2a22', '#1c140f'], top: ['#2a2a30', '#141418'],
      topIn: '#0c0c10', pants: ['#22222a', '#121216'], shoe: ['#141414', '#050505'], eye: '#2a1810',
      hairStyle: 'bald', mustache: true, badge: true, zombie: false,
    },
    zelia: {
      skin: ['#e8b48e', '#b8836a'], hair: ['#d9d4cc', '#a39e96'], top: ['#6b4a7a', '#47304f'],
      topIn: '#2e1f34', pants: ['#3a2f3f', '#231c27'], shoe: ['#3a2a1c', '#21170e'], eye: '#2a1810',
      hairStyle: 'bun', glasses: true, shawl: ['#c0303a', '#7d1a22'], zombie: false,
    },
    kaua: {
      skin: ['#8c5a3c', '#633c26'], hair: ['#1a120e', '#0a0605'], top: ['#2f8f5a', '#1e5e3b'],
      topIn: '#123d26', pants: ['#2b3346', '#191e2b'], shoe: ['#e9e4dc', '#a49d95'], eye: '#1a0e08',
      hairStyle: 'cap', capColor: ['#e04a2a', '#9a2c16'], bag: true, zombie: false,
    },
    marta: {
      skin: ['#f0c09a', '#c48e70'], hair: ['#3b2418', '#1e110a'], top: ['#eef2f4', '#b9c2c8'],
      topIn: '#8a98a2', pants: ['#3b4a63', '#222b3c'], shoe: ['#e9e4dc', '#a49d95'], eye: '#3a2214',
      hairStyle: 'long', badge: true, zombie: false,
    },
    nina: {
      skin: ['#6e4430', '#4c2c1e'], hair: ['#d94fa0', '#8f2a68'], top: ['#262233', '#14121d'],
      topIn: '#0a0910', pants: ['#1d1b26', '#0e0d13'], shoe: ['#f2f2f2', '#b0b0b0'], eye: '#1a0e08',
      hairStyle: 'long', headphones: true, zombie: false,
    },
  };

  // ---------- formas (caminhos locais, pivô na origem) ----------
  const capsule = (w, L) => {
    const r = w / 2;
    return `M${-r},0 A${r},${r} 0 0 1 ${r},0 L${r * 0.92},${L} A${r * 0.92},${r * 0.92} 0 0 1 ${-r * 0.92},${L} Z`;
  };
  const ellipse = (cx, cy, rx, ry) =>
    `M${cx - rx},${cy} A${rx},${ry} 0 1 0 ${cx + rx},${cy} A${rx},${ry} 0 1 0 ${cx - rx},${cy} Z`;
  const TORSO = 'M-78,6 C-84,-90 -104,-200 -98,-262 C-94,-296 -60,-306 0,-306 C60,-306 94,-296 98,-262 C104,-200 84,-90 78,6 C40,18 -40,18 -78,6 Z';
  const HOOD = 'M-70,-300 C-80,-336 -40,-352 0,-352 C40,-352 80,-336 70,-300 C40,-284 -40,-284 -70,-300 Z';
  const HEAD = 'M-92,-118 C-96,-190 -52,-236 2,-236 C58,-236 98,-192 94,-118 C92,-60 58,-6 2,-4 C-56,-6 -90,-58 -92,-118 Z';
  const NECK = 'M-24,10 L-22,-34 L22,-34 L24,10 Z';
  const HAIR_MESSY = 'M-98,-128 C-110,-200 -70,-262 -6,-258 C-30,-276 20,-284 34,-262 C60,-274 96,-246 92,-214 C110,-196 106,-150 96,-126 C88,-160 70,-186 44,-196 C30,-176 -6,-170 -30,-190 C-52,-172 -78,-160 -98,-128 Z';
  const CAP = 'M-96,-150 C-98,-226 -46,-250 4,-250 C56,-250 100,-226 96,-150 C40,-170 -40,-170 -96,-150 Z M-96,-150 C-60,-160 30,-162 130,-146 C134,-136 120,-128 96,-132 C40,-146 -40,-146 -96,-140 Z';
  const HELMET = 'M-100,-140 C-104,-232 -50,-258 2,-258 C58,-258 104,-232 100,-140 L84,-130 C80,-180 60,-200 2,-202 C-56,-200 -80,-180 -84,-130 Z M-14,-258 C-30,-330 30,-336 70,-300 C40,-300 20,-290 14,-258 Z M-100,-140 L-110,-60 L-80,-70 L-84,-130 Z M100,-140 L110,-60 L80,-70 L84,-130 Z';
  const HAIR_SHORT = 'M-98,-132 C-104,-206 -62,-252 2,-252 C66,-252 106,-206 98,-132 C90,-168 70,-196 30,-204 C0,-196 -40,-196 -60,-188 C-80,-176 -92,-156 -98,-132 Z';
  const HAIR_BUN = 'M-98,-128 C-104,-210 -60,-248 2,-248 C64,-248 106,-210 98,-128 C88,-170 60,-200 2,-202 C-58,-200 -88,-170 -98,-128 Z M-46,-248 C-50,-300 50,-300 46,-248 C30,-238 -30,-238 -46,-248 Z';
  const HAIR_LONG_BACK = 'M-112,-150 C-120,-240 -60,-262 2,-262 C64,-262 122,-240 112,-150 L124,30 C90,50 60,40 50,20 L-50,20 C-60,40 -90,50 -124,30 Z';
  const HAIR_LONG_FRONT = 'M-100,-120 C-108,-210 -60,-254 2,-254 C64,-254 108,-210 100,-120 C80,-176 40,-206 -10,-200 C-50,-186 -80,-160 -100,-120 Z';
  const FOOT = 'M-30,-10 C-34,20 -30,38 -10,40 L52,40 C66,40 70,26 60,16 C46,4 24,-6 18,-14 Z';
  const HAND = ellipse(0, 14, 26, 28);

  function lightLocal(L, ang) {
    const a = -ang * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [L[0] * c - L[1] * s, L[0] * s + L[1] * c];
  }

  // Peça com cel-shading: cor base + sombra (lado oposto à luz) + luz de recorte (lado da luz) + contorno.
  function part(d, cols, light, ang, shift, extra) {
    const [lx, ly] = lightLocal(light.dir, ang);
    const a = 'p' + (UID++), b = 'p' + (UID++);
    const rim = light.rim, rw = light.rimW == null ? 6 : light.rimW;
    return `<g>
<clipPath id="${a}"><path d="${d}"/></clipPath>
<clipPath id="${b}"><path d="${d}" transform="translate(${-lx * rw},${-ly * rw})"/></clipPath>
<g clip-path="url(#${a})"><path d="${d}" fill="${rim}"/>
<g clip-path="url(#${b})"><path d="${d}" fill="${cols[1]}"/><path d="${d}" fill="${cols[0]}" transform="translate(${lx * shift},${ly * shift})"/>${extra || ''}</g></g>
<path d="${d}" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/></g>`;
  }

  // ---------- poses (listas de ângulos) ----------
  const POSES = {
    idle:    { torso: 0, head: 0, uaL: 8, faL: -6, uaR: -8, faR: 6, thL: 3, shL: 0, thR: -3, shR: 0 },
    scared:  { torso: -3, head: 4, uaL: 18, faL: -128, uaR: -18, faR: 128, thL: 6, shL: -4, thR: -6, shR: 4 },
    flash:   { torso: 2, head: -4, uaL: 10, faL: -6, uaR: -60, faR: -40, thL: 3, shL: 0, thR: -3, shR: 0 },
    radio:   { torso: 2, head: -8, uaL: 8, faL: -4, uaR: -22, faR: 186, thL: 3, shL: 0, thR: -3, shR: 0 },
    finger:  { torso: 0, head: 6, uaL: 30, faL: 110, uaR: -30, faR: -110, thL: 3, shL: 0, thR: -3, shR: 0 },
    point:   { torso: 0, head: 0, uaL: 8, faL: -4, uaR: -70, faR: -10, thL: 3, shL: 0, thR: -3, shR: 0 },
    walkA:   { torso: 4, head: 6, uaL: -30, faL: -60, uaR: -40, faR: -70, thL: 22, shL: 10, thR: -18, shR: 22 },
    walkB:   { torso: 4, head: 6, uaL: -40, faL: -70, uaR: -30, faR: -60, thL: -18, shL: 22, thR: 22, shR: 10 },
  };
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10);
  function mix(a, b, k) {
    k = ease(k); const o = {};
    for (const key in a) o[key] = a[key] + ((b[key] ?? a[key]) - a[key]) * k;
    return o;
  }

  // ---------- rosto ----------
  // face: { look:[-1..1,-1..1], turn:-1..1, blink:0..1, brow:'neutral'|'fear'|'worry'|'angry', mouth:0..1 (abertura), smile:-1..1, wide:0..1 }
  function face(C, f, light) {
    const tx = (f.turn || 0) * 26, lk = f.look || [0, 0];
    const eyeY = -122, ex = 38, rx = 21 + (f.wide || 0) * 5, ry = 25 + (f.wide || 0) * 7;
    const bl = Math.max(0.06, 1 - (f.blink || 0));
    let s = '';
    for (const sx of [-1, 1]) {
      const cx = tx + sx * ex * (1 - Math.abs(f.turn || 0) * (sx * (f.turn || 0) > 0 ? 0.25 : 0.05));
      if (C.zombie) {
        s += `<ellipse cx="${cx}" cy="${eyeY}" rx="${rx * 0.9}" ry="${ry * 0.55 * bl}" fill="#e8f0d8" stroke="${INK}" stroke-width="5"/>`;
        s += `<circle cx="${cx}" cy="${eyeY}" r="3" fill="#6c7d5e"/>`;
        continue;
      }
      s += `<g transform="translate(${cx},${eyeY}) scale(1,${bl})">
<ellipse rx="${rx}" ry="${ry}" fill="#fbf6ee" stroke="${INK}" stroke-width="5"/>
<circle cx="${lk[0] * 9}" cy="${lk[1] * 9 + 2}" r="${11 - (f.wide || 0) * 3}" fill="${C.eye}"/>
<circle cx="${lk[0] * 9 - 4}" cy="${lk[1] * 9 - 3}" r="3.6" fill="#fff"/></g>`;
      if (bl < 0.5) s += `<path d="M${cx - rx},${eyeY} Q${cx},${eyeY + 8} ${cx + rx},${eyeY}" stroke="${INK}" stroke-width="5" fill="none"/>`;
      // sobrancelha
      const by = eyeY - ry - 16 - (f.wide || 0) * 10;
      const b = f.brow || 'neutral';
      let inner = 0, outer = 0;
      if (b === 'fear') { inner = -16; outer = 4; }
      if (b === 'worry') { inner = -10; outer = 2; }
      if (b === 'angry') { inner = 10; outer = -6; }
      const x0 = cx - sx * 4, x1 = cx + sx * 30;
      s += `<path d="M${x0 - sx * 4},${by + inner} Q${(x0 + x1) / 2},${by - 8 + (inner + outer) / 2} ${x1},${by + outer}" stroke="${C.hair[1]}" stroke-width="10" stroke-linecap="round" fill="none"/>`;
    }
    // nariz
    s += `<path d="M${tx + 2},-100 Q${tx + 12},-78 ${tx - 4},-74" stroke="${C.skin[1]}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    // boca
    const mo = f.mouth || 0, sm = f.smile || 0, my = -48, mw = 22 + mo * 4;
    if (mo < 0.08) {
      s += `<path d="M${tx - mw},${my - sm * 4} Q${tx},${my + sm * 10} ${tx + mw},${my - sm * 4}" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    } else {
      const h = 6 + mo * 26;
      s += `<path d="M${tx - mw},${my} Q${tx},${my - 6 - sm * 4} ${tx + mw},${my} Q${tx},${my + h * 2} ${tx - mw},${my} Z" fill="#4a1420" stroke="${INK}" stroke-width="5"/>`;
      s += `<path d="M${tx - mw * 0.55},${my + h * 0.9} Q${tx},${my + h * 1.3} ${tx + mw * 0.55},${my + h * 0.9}" stroke="#d0606a" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    }
    // bochechas e marcas (zumbi: olheiras)
    if (C.zombie) s += `<path d="M${tx - 60},-96 q20,10 40,0 M${tx + 20},-96 q20,10 40,0" stroke="#55654a" stroke-width="5" fill="none"/>`;
    else s += `<ellipse cx="${tx - 58}" cy="-78" rx="16" ry="9" fill="#e88a78" opacity=".45"/><ellipse cx="${tx + 58}" cy="-78" rx="16" ry="9" fill="#e88a78" opacity=".45"/>`;
    return s;
  }

  // ---------- montagem ----------
  // opts: { who, pose, face, light:{dir:[x,y] (aponta PARA a luz), rim:'#cor', rimW}, x, y, scale, flip, hold:'flashlight'|'radio'|null, legs:true }
  function draw(o) {
    const C = CAST[o.who || 'caio'], P = o.pose, L = o.light;
    const sc = o.scale || 1, fl = o.flip ? -1 : 1;
    const Lc = o.flip ? { ...L, dir: [-L.dir[0], L.dir[1]] } : L;
    const T = P.torso, H = T + P.head;
    let s = `<g transform="translate(${o.x || 0},${o.y || 0}) scale(${sc * fl},${sc})">`;
    // sombra no chão
    if (o.legs !== false) s += `<ellipse cx="0" cy="${420}" rx="150" ry="22" fill="#000" opacity=".35"/>`;
    const limb = (side, which) => {
      const sx = side === 'L' ? -1 : 1;
      if (which === 'leg') {
        const th = P['th' + side], sh = P['sh' + side];
        return `<g transform="translate(${sx * 42},0) rotate(${T + th})">${part(capsule(74, 210), C.pants, Lc, T + th, 16)}
<g transform="translate(0,205) rotate(${sh})">${part(capsule(64, 200), C.pants, Lc, T + th + sh, 14)}
<g transform="translate(0,200) rotate(${-th - sh - T})">${part(sx < 0 ? `M30,-10 C34,20 30,38 10,40 L-52,40 C-66,40 -70,26 -60,16 C-46,4 -24,-6 -18,-14 Z` : FOOT, C.shoe, Lc, 0, 8)}</g></g></g>`;
      }
      const ua = P['ua' + side], fa = P['fa' + side];
      let held = '';
      if (side === 'R' && o.hold === 'flashlight') held = `<g transform="translate(0,170) rotate(-90)">${part('M-16,-20 L60,-20 L60,20 L-16,20 Z', ['#3b3f47', '#22252b'], Lc, T + ua + fa - 90, 6)}${part('M60,-30 L92,-30 L92,30 L60,30 Z', ['#5a606a', '#363a42'], Lc, T + ua + fa - 90, 6)}<rect x="92" y="-26" width="8" height="52" fill="#fff6c8"/></g>`;
      if (side === 'R' && o.hold === 'radio') held = `<g transform="rotate(${-(T + ua + fa)}) translate(18,-40) scale(.8)">${part('M-46,-70 L46,-70 L46,70 L-46,70 Z', ['#2d3236', '#191c1f'], Lc, 0, 8)}<rect x="-32" y="-52" width="64" height="40" rx="5" fill="#5dff9a" opacity=".9"/><path d="M${-26},-32 ${[...Array(12)].map((_, i) => `L${-26 + i * 4.7},${-32 + Math.sin((o.t || 0) * 30 + i * 1.7) * (o.radioAmp || 0) * 12}`).join(' ')}" stroke="#0b3a1f" stroke-width="3" fill="none"/><circle cx="-18" cy="30" r="12" fill="#111" stroke="${INK}" stroke-width="4"/><circle cx="18" cy="30" r="12" fill="#111" stroke="${INK}" stroke-width="4"/><line x1="30" y1="-70" x2="40" y2="-150" stroke="${INK}" stroke-width="8" stroke-linecap="round"/></g>`;
      return `<g transform="translate(${sx * 92},-270) rotate(${ua})">${part(capsule(58, 150), C.top, Lc, T + ua, 14)}
<g transform="translate(0,146) rotate(${fa})">${part(capsule(52, 140), C.top, Lc, T + ua + fa, 12)}
<g transform="translate(0,136)">${part(HAND, C.skin, Lc, T + ua + fa, 8)}${held}</g></g></g>`;
    };
    if (o.legs !== false) s += limb('L', 'leg') + limb('R', 'leg');
    s += `<g transform="rotate(${T})">`;
    s += limb('L', 'arm').replace(/^/, '') ;
    s += part(TORSO, C.top, Lc, T, 20, `<path d="M-30,-140 L30,-140 L36,-70 L-36,-70 Z" fill="${C.topIn}" opacity=".55"/>${C.hairStyle === 'bald' || C.badge || C.shawl || C.bag ? '' : '<line x1="-20" y1="-290" x2="-24" y2="-200" stroke="#f3e3c3" stroke-width="5"/><line x1="20" y1="-290" x2="24" y2="-200" stroke="#f3e3c3" stroke-width="5"/>'}${C.jacket ? `<path d="M-98,-262 C-104,-200 -84,-90 -78,6 L-34,10 L-30,-280 Z M98,-262 C104,-200 84,-90 78,6 L34,10 L30,-280 Z" fill="${C.jacket[0]}" stroke="${INK}" stroke-width="5"/>` : ''}${C.shawl ? `<path d="M-100,-290 C-60,-250 60,-250 100,-290 L110,-150 C60,-120 -60,-120 -110,-150 Z" fill="${C.shawl[0]}" stroke="${INK}" stroke-width="5"/><path d="M-80,-150 l-10,40 M-40,-132 l-6,40 M0,-128 v40 M40,-132 l6,40 M80,-150 l10,40" stroke="${C.shawl[1]}" stroke-width="6"/>` : ''}${C.bag ? `<path d="M-90,-290 L80,-40" stroke="#1a1a1a" stroke-width="16"/>` : ''}${C.badge ? `<rect x="-62" y="-200" width="44" height="58" rx="6" fill="#f5f2ea" stroke="${INK}" stroke-width="4"/><rect x="-56" y="-192" width="32" height="14" fill="#3f6fa8"/>` : ''}`);
    s += part(HOOD, [C.top[1], C.topIn], Lc, T, 8);
    s += `<g transform="translate(0,-296) rotate(${P.head})">`;
    s += part(NECK, C.skin, Lc, H, 8);
    s += `<g transform="translate(0,-14)">`;
    s += part(ellipse(-92, -110, 16, 24), C.skin, Lc, H, 6) + part(ellipse(92, -110, 16, 24), C.skin, Lc, H, 6);
    if (C.hairStyle === 'long') s += part(HAIR_LONG_BACK, C.hair, Lc, H, 14);
    s += part(HEAD, C.skin, Lc, H, 26);
    if (C.stubble) s += `<path d="M-70,-70 C-60,-10 60,-10 70,-70 C50,-30 -50,-30 -70,-70 Z" fill="${C.hair[0]}" opacity=".28"/>`;
    if (C.mustache) s += `<path d="M-34,-62 C-20,-74 20,-74 34,-62 C20,-56 -20,-56 -34,-62 Z" fill="${C.hair[0]}" stroke="${INK}" stroke-width="4"/>`;
    s += face(C, o.face || {}, Lc);
    if (C.hairStyle !== 'bald') s += part(C.hairStyle === 'cap' ? CAP : C.hairStyle === 'helmet' ? HELMET : C.hairStyle === 'short' ? HAIR_SHORT : C.hairStyle === 'bun' ? HAIR_BUN : C.hairStyle === 'long' ? HAIR_LONG_FRONT : HAIR_MESSY, (C.hairStyle === 'cap' && C.capColor) ? C.capColor : C.hair, Lc, H, 14);

    if (C.glasses) s += `<g fill="none" stroke="${INK}" stroke-width="6"><circle cx="-38" cy="-122" r="30"/><circle cx="38" cy="-122" r="30"/><path d="M-8,-124 Q0,-130 8,-124 M-68,-126 L-96,-132 M68,-126 L96,-132"/></g><circle cx="-38" cy="-122" r="28" fill="#cfe6ff" opacity=".12"/><circle cx="38" cy="-122" r="28" fill="#cfe6ff" opacity=".12"/>`;
    if (C.headphones) s += `<path d="M-104,-110 C-110,-250 110,-250 104,-110" stroke="#1a1a22" stroke-width="16" fill="none"/><rect x="-124" y="-150" width="34" height="70" rx="14" fill="#39ff9c" stroke="${INK}" stroke-width="6"/><rect x="90" y="-150" width="34" height="70" rx="14" fill="#39ff9c" stroke="${INK}" stroke-width="6"/>`;
    s += `</g></g>`;
    s += limb('R', 'arm');
    s += `</g></g>`;
    return s;
  }

  window.RIG = { draw, POSES, mix, ease, CAST, INK, part };
})();
