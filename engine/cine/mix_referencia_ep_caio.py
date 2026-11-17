"""Som do Short "Imune ao vírus zumbi": trilha de tensão sintetizada + ambientes + efeitos sincronizados + mix.
Regras da Pasta de Animação: música ~14 dB abaixo da voz, silêncio total antes da revelação, grave pesado só no impacto.
uso: python3 mix.py PROJ  (lê audio/short.wav e timeline.json; grava mix/{music,sfx,mix}.wav e imprime os níveis)"""
import sys, os, json
import numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt

SR = 48000
P = sys.argv[1]
rng = np.random.default_rng(5)
sr, voice = wf.read(os.path.join(P, 'audio', 'short.wav')); voice = voice.astype(np.float32) / 32768
TL = json.load(open(os.path.join(P, 'timeline.json'))); A = TL['A']; SH = TL['shots']
PAD = 0.2  # capa nos 6 primeiros quadros: tudo desloca 0,2 s
DUR = len(voice) / SR + 1.2
N = int(SR * DUR)

def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b): return sosfilt(butter(2, [a, b], 'band', fs=SR, output='sos'), x)
def tt(d): return np.arange(int(SR * d)) / SR
def add(buf, x, t0, g=1.0):
    i = int(t0 * SR)
    if i < 0: x = x[-i:]; i = 0
    if i >= len(buf): return
    j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i] * g
def env(n, a, r):
    e = np.ones(n); ia, ir = int(a * SR), int(r * SR)
    if ia: e[:ia] = np.linspace(0, 1, ia)
    if ir: e[-ir:] *= np.linspace(1, 0, ir)
    return e
def noise(d): return rng.standard_normal(int(SR * d))
def mid(n): return 440 * 2 ** ((n - 69) / 12)

# ---------------- MÚSICA (tensão: drone grave em ré menor, pulso de coração, tremolo agudo) ----------------
music = np.zeros(N)
chords = [[38, 45, 50, 53], [34, 41, 46, 50], [36, 43, 48, 51], [33, 40, 45, 49]]
bar = 3.6
t_all = tt(DUR)
for b in range(int(DUR / bar) + 1):
    ch = chords[b % 4]; y = tt(bar + 1.5)
    pad = sum(np.sin(2 * np.pi * mid(n) * y + np.sin(2 * np.pi * 0.2 * y) * 0.6) * (0.5 if n < 40 else 0.22) for n in ch)
    pad += 0.15 * np.sin(2 * np.pi * mid(ch[0] - 12) * y)
    add(music, lp(pad, 900) * env(len(y), 0.9, 1.4) * 0.22, b * bar)
# pulso (coração) 64 bpm
beat = 60 / 64
for k in range(int(DUR / beat)):
    for dt, g in [(0, 1.0), (0.22, 0.6)]:
        y = tt(0.35); x = np.sin(2 * np.pi * (52 - 20 * y) * y) * np.exp(-y * 14)
        add(music, x * 0.5 * g, k * beat + dt)
# tremolo agudo de cordas (cresce perto do clímax)
y = t_all; trem = (np.sin(2 * np.pi * mid(74) * y) + 0.5 * np.sin(2 * np.pi * mid(77) * y)) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * y))
grow = np.clip((y - A['quarta']) / max(1, A['meia'] - A['quarta']), 0, 1) * 0.6 + 0.15
music += lp(trem, 3000) * grow * 0.05
# SILÊNCIO TOTAL antes da revelação: de "meia-noite" até a 3ª batida; volta depois do impacto no "nome"
gate = np.ones(N)
s0, s1 = A['cidade'] + 0.05 + PAD, A['nome'] + PAD
i0, i1 = int(s0 * SR), int(s1 * SR); f = int(0.35 * SR)
gate[i0:i0 + f] = np.linspace(1, 0, f); gate[i0 + f:i1] = 0
r1 = int(A['evoce'] * SR + PAD * SR) if A.get('evoce') else i1 + SR
gate[i1:r1] = np.linspace(0, 0.75, max(1, r1 - i1))
music *= gate

# ---------------- EFEITOS ----------------
sfx = np.zeros(N)
def whoosh(d=0.7):
    y = tt(d); x = bp(noise(d), 300, 3000) * np.sin(np.pi * y / d) ** 2
    return x * 0.5
def pop():
    y = tt(0.12); return np.sin(2 * np.pi * (900 - 2500 * y) * y) * np.exp(-y * 40) * 0.5
def click():
    y = tt(0.05); return bp(noise(0.05), 1500, 6000) * np.exp(-y * 120) * 0.9
def buzz(d=0.4):
    y = tt(d); return (np.sign(np.sin(2 * np.pi * 120 * y)) * 0.3 + bp(noise(d), 2000, 5000) * 0.3) * (np.sin(y * 90) > 0) * 0.35
def knock():
    y = tt(0.35); body = np.sin(2 * np.pi * 95 * y) * np.exp(-y * 22) * 1.0
    wood = bp(noise(0.35), 180, 1200) * np.exp(-y * 35) * 1.3
    return (body + wood) * 0.9
def tick():
    y = tt(0.04); return bp(noise(0.04), 2500, 7000) * np.exp(-y * 150) * 0.7
def ting():
    y = tt(1.2); return sum(np.sin(2 * np.pi * f * y) * a for f, a in [(1568, .5), (2349, .3), (3136, .2)]) * np.exp(-y * 4) * 0.35
def heart():
    y = tt(0.3); return np.sin(2 * np.pi * (60 - 25 * y) * y) * np.exp(-y * 16)
def boom():
    y = tt(2.4); x = np.sin(2 * np.pi * (48 - 18 * y) * y) * np.exp(-y * 1.6) + lp(noise(2.4), 200) * np.exp(-y * 3) * 0.6
    return x * 1.0
def static(d):
    y = tt(d); return bp(noise(d), 800, 6000) * (0.5 + 0.5 * (rng.random(len(y)) > 0.97)) * 0.18
def riser(d=1.5):
    y = tt(d); return bp(noise(d), 400, 4000) * (y / d) ** 2 * 0.35
def growl(d=1.6):
    y = tt(d); x = lp(noise(d) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * y)), 500); return x * np.sin(np.pi * y / d) * 0.5

# trocas de plano (dissolves) -> whoosh; rótulos -> pop
for s in SH[1:]:
    if s['dis'] > 0: add(sfx, whoosh(0.8), s['t0'] - 0.25 + PAD, 0.55)
for s in SH:
    for lt in s['labels']:
        if lt is not None: add(sfx, pop(), lt - 0.03 + PAD, 0.4)
# lanterna: clique + zumbido do pisca
add(sfx, click(), A['lanterna'] - 0.05 + PAD, 0.8); add(sfx, buzz(0.35), A['lanterna'] + PAD, 0.25)
# portaria: gemido do porteiro (ruído filtrado, sem voz), papéis e vento
add(sfx, growl(1.8), A['portaria'] + 0.3 + PAD, 0.45); add(sfx, growl(1.4), A['circulos'] + 0.4 + PAD, 0.35)
# rádio: estática e chiado
add(sfx, static(A['porque'] - A['quarta']), A['quarta'] + PAD, 0.9)
# gota: batida de coração; mil vacinas: ting
add(sfx, heart(), A['gota'] - 0.05 + PAD, 0.6); add(sfx, heart(), A['gota'] + 0.25 + PAD, 0.4)
add(sfx, ting(), A['mil'] - 0.05 + PAD, 0.5)
for k in range(8): add(sfx, tick(), A['doze'] - 0.2 + k * 0.1 + PAD, 0.35)
# meia-noite: só o relógio
for k in range(int((A['bateu'] - A['meia']) / 0.5) + 1): add(sfx, tick(), A['meia'] + k * 0.5 + PAD, 0.5)
# três batidas na porta (grave só aqui e no impacto)
for kt in [A['bateu'], A['tres'], A['vezes']]: add(sfx, knock(), kt - 0.02 + PAD, 1.0)
# impacto no "nome"
add(sfx, boom(), A['nome'] - 0.03 + PAD, 0.9)

# ambiente: vento + sirene distante (sala/cidade), estática do rádio fica nos efeitos
amb = lp(noise(DUR), 600) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t_all)) * 0.12
sir = np.sin(2 * np.pi * (650 + 180 * np.sin(2 * np.pi * 0.4 * t_all)) * t_all) * 0.02 * (np.sin(2 * np.pi * 0.05 * t_all) > 0.3)
heli = lp(noise(DUR), 300) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 11 * t_all))) * 0.12
lab0, lab1 = A['laboratorio'] + PAD - 0.3, A['meia'] + PAD - 0.3
hmask = ((t_all > lab0) & (t_all < lab1)).astype(float)
amb = amb + sir + heli * hmask
amb *= gate * 0.85 + (1 - gate) * 0.15   # no silêncio, o ambiente quase some (sobra só o quarto)

# ---------------- MIX com níveis fixos ----------------
vbuf = np.zeros(N); add(vbuf, voice, PAD)
def rms_gated(x, ref):
    m = np.abs(ref) > 0.02
    win = int(0.05 * SR); e = np.convolve(np.abs(ref), np.ones(win) / win, 'same') > 0.03
    return np.sqrt(np.mean(x[e] ** 2) + 1e-12)
vr = rms_gated(vbuf, vbuf)
def set_level(x, db):
    r = rms_gated(x, vbuf); return x * (vr * 10 ** (db / 20) / max(r, 1e-9))
music_l = set_level(music, -14)
amb_l = set_level(amb, -22)
sfx_l = set_level(sfx, -12)
pk = np.max(np.abs(vbuf)) * 0.7
sfx_l = np.clip(sfx_l, -pk, pk) if np.max(np.abs(sfx_l)) > pk else sfx_l
mix = vbuf + music_l + amb_l + sfx_l
# ganho linear para ~-14 LUFS aproximado (RMS com gate) + limitador de pico -1 dBFS
target = 10 ** (-16 / 20)
g = target / rms_gated(mix, vbuf); mix *= g
lim = 10 ** (-1 / 20); over = np.abs(mix) > lim
mix = np.where(over, np.sign(mix) * (lim - (1 - lim) * np.tanh((np.abs(mix) - lim))), mix)
os.makedirs(os.path.join(P, 'mix'), exist_ok=True)
for nm, x in [('music', music_l), ('sfx', sfx_l + amb_l), ('mix', mix)]:
    wf.write(os.path.join(P, 'mix', nm + '.wav'), SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
db = lambda x: 20 * np.log10(rms_gated(x, vbuf) / vr)
print(f'níveis (RMS com gate, rel. voz): música {db(music_l):.1f} dB | efeitos {db(sfx_l):.1f} dB | ambiente {db(amb_l):.1f} dB | duração {DUR:.1f}s')
