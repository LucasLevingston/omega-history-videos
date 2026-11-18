---
name: new-omega-history
description: Produz o próximo Short da série de ficção atual do canal New Omega History (hoje ÚLTIMA LINHA, zumbis, 45 eps.) no estilo cinematográfico desenhado por código; quando a série acaba, cria uma série nova e totalmente diferente. Use para "o próximo episódio" ou "o vídeo de hoje do New Omega History".
---

# NEW OMEGA HISTORY — séries em Shorts

O canal publica séries originais de ficção em Shorts verticais (45 episódios por série). A série em andamento está em `SERIE_ATUAL.md` do repositório. Tudo é desenhado em código (sem gerador de imagem ou vídeo) no estilo cinematográfico: personagem em peças com pivôs, contorno de nanquim, sombra em 2 tons, luz de recorte, feixes de luz com poeira, primeiro plano desfocado, grão e vinheta, câmera sempre andando, dissolves e corte seco só no susto.

## 0. Ambiente

1. `add_repo` LucasLevingston/omega-history-videos (push) e `git clone --depth 1` em `/home/claude/omega-history-videos` (REPO). `git pull` antes de escolher o episódio.
2. Ler `REPO/SERIE_ATUAL.md` (qual série, pasta, doc) e, na pasta da série, `BIBLIA.md` (elenco, regras do mundo, registro de produção) e `ROTEIROS.md`.
3. Voz: **VoiceStudio (OmniVoice), voz "Lucas"**, masculina e grave (~88 Hz): `python3 REPO/engine/py/voicestudio.py setup`, referência fixa `engine/vozes/lucas.wav` + `lucas.txt` (autor iluucasz, licença CC BY 4.0, créditos em `engine/vozes/CREDITOS.md`). Nunca trocar a referência, em nenhuma série. Se a voz falhar, parar e avisar com o erro exato, sem usar outra voz. (A VoxCPM2 com semente 20251112 foi descartada em 17/11/2026: saía aguda, ~250 Hz.)
4. `pip install --break-system-packages faster-whisper playwright` se faltar; ffmpeg já existe.
5. Disco: ~10 GB livres (torch + modelo OmniVoice). Não apagar `/tmp/pip-*` enquanto um pip estiver rodando.

## 1. Qual episódio

- O próximo é o primeiro EP do "Registro de produção" da bíblia que ainda não foi produzido. Se o usuário disser o número, usar o dele.
- Texto: o parágrafo do episódio em `ROTEIROS.md` (se o doc da série tiver sido editado, ele vale e o `ROTEIROS.md` é atualizado).
- Copiar para `projetos/<serie>/epNN/script/short.txt`, partindo o parágrafo em 4–5 parágrafos (um por bloco/plano) + a pergunta final no último. Números por extenso. Não mudar palavras sem necessidade; se mudar, atualizar o doc e o `ROTEIROS.md`.

## 1A. A série acabou → criar outra, totalmente diferente

Quando o último episódio da série atual já foi produzido (ou o usuário pedir uma série nova):
1. Criar uma série **inédita e totalmente diferente** das anteriores (listadas em `SERIE_ATUAL.md` > "Séries encerradas"): outro gênero ou subgênero, outro lugar, outra época, outro protagonista e outro elenco, outras regras do mundo. Nada de continuação, spin-off ou personagens reaproveitados, a não ser que o usuário peça. Ideias originais; não copiar obras existentes.
2. Escrever num doc novo (Docs) e na pasta `serie-<slug>/`: `BIBLIA.md` (premissa em 1 frase, formato, elenco com marca visual, regras do mundo, visual e som, 5 arcos de 9) e `ROTEIROS.md` com os **45 episódios** narrados completos (110–150 palavras cada, cada um começando exatamente onde o anterior terminou e respondendo ao gancho dele, gancho nos 3 primeiros segundos, acontecimentos, gancho para o próximo e pergunta final para os comentários, português natural sem gírias, frases ligadas, números por extenso, nada de violência gráfica).
3. Atualizar `SERIE_ATUAL.md` (mover a anterior para "Séries encerradas" com as datas) e criar os personagens novos no `engine/cine/personagem.js` (folha de teste com 3 poses).
4. Se o usuário estiver presente, mostrar a premissa e o elenco antes de escrever os 45; em execução agendada, seguir e avisar no fim.

## 2. Voz (uma geração só)

`cd REPO/projetos/<serie>/epNN && nohup python3 REPO/engine/py/voicestudio.py $PWD short > /tmp/vs.log 2>&1 &` (~10–13 min por episódio de ~45 s na nuvem; ritmo ~2,6 palavras/s). Depois: `python3 engine/py/words.py projetos/<serie>/epNN short` → `audio/words.json`; montar `web/words.js` juntando sufixos que o whisper separa ("meia" + "-noite"), desfazendo horários que ele converte ("12h17" → "duas e dezessete") e corrigindo nomes ouvidos errado ("Fonsu" → "Afonso") só na legenda.

## 3. Cenas (`projetos/<serie>/epNN/web/`)

- Copiar o `web/` do episódio anterior como base (modelo: `projetos/ultima-linha/ep01`: `cena.html` + `cena.js`). Cenários prontos da ÚLTIMA LINHA: `avenida` (ônibus andando, vista lateral), `interior` (do para-brisa olhando o fundo do ônibus, passageiros nas fileiras, luzes da rua varrendo as janelas), `ponto` (pelo para-brisa, repetidores em círculo), `mirror` (close no retrovisor). Cenário novo = nova função no `cena.js` do episódio; se for reutilizável, levar para `engine/cine/` e registrar na bíblia.
- Personagens: `engine/cine/personagem.js` (`RIG.draw`). Personagem novo = entrada em `CAST` (cores, `hairStyle` short/bun/long/cap/bald/messy/helmet, acessórios `glasses`, `headphones`, `badge`, `shawl`, `bag`, `jacket`, `stubble`, `mustache`) e folha de teste antes de animar. O visual de cada personagem nunca muda entre episódios.
- `buildShots()`: um plano por bloco, ancorado nas palavras (`Wt('palavra')`); câmera com `camKeys` (nunca parada), dissolve 0,45–0,75 s entre cenários, corte seco só no susto. Rótulos curtos (hora, lugar, número) com `labels`. Selo "EP. NN/45" no canto (`epTag`). A pergunta final é dita por um personagem olhando pra câmera (boca com `speaking(t)`).
- Rosto entre y 330 e 1100; legenda em y 1270 (2–3 palavras, laranja nas palavras-chave, tamanho reduzido automático em blocos longos).

## 4. Conferência antes do render

`python3 REPO/engine/cine/sheet.py $PWD/web/cena.html /tmp/sheet.png t1,t2,...` (1 quadro a cada 2 s) e olhar: tela preta, legenda cortada, rosto coberto, personagem pequeno, objeto citado sem aparecer, rótulo em cima do rosto. Corrigir e só então renderizar.

## 5. Som e render

1. Exportar `timeline.json` (`timeline()` da página) e a capa (`thumb()` → `thumb.jpg`, 1080×1920, com o nome da série, uma pergunta curta e "EP. NN/45").
2. `python3 mix.py .` (copiar e adaptar o do episódio anterior): música de tensão sintetizada ~14 dB abaixo da voz, ambiente do lugar, efeitos sincronizados às palavras (sem voz escondida), **silêncio total antes do gancho final** e grave pesado só no impacto.
3. `nohup python3 REPO/engine/cine/render.py $PWD/web/cena.html $PWD/frames N_QUADROS 2` (~5 quadros/s).
4. ffmpeg: capa nos 6 primeiros quadros + quadros + `mix/mix.wav` (já tem 0,2 s de folga no início), H.264 `-preset veryfast -crf 18`, AAC 48 kHz, ajuste linear até ~−14 LUFS com limitador (−1 dBFS). Conferir `freezedetect`, `blackdetect` e uma folha de contato do vídeo final.

## 6. Entrega

- Vídeo e thumb com SendUserFile; textos prontos: título (até ~70 caracteres, com "EP. NN"), descrição para TikTok, Instagram e YouTube Shorts com hashtags (#NewOmegaHistory + nome da série + gênero, #Shorts / #fyp) e a pergunta do episódio. Toda descrição leva, antes das hashtags, a linha de crédito obrigatória "🎙️ Voz: Lucas por iluucasz (CC BY 4.0)".
- Postagem: pelos agendadores das próprias redes (YouTube Studio, TikTok, Meta Business Suite); só agendar se o usuário pedir.
- Atualizar o "Registro de produção" da bíblia, salvar `POST.md` na pasta do episódio e fazer commit/push (sem `frames/`).

## 7. Regras

- Uma voz só (VoiceStudio "Lucas") em todas as séries, narração grave de narrador; nunca regerar a voz por conta própria.
- Nada de violência gráfica: a ameaça vem do som, da sombra e da reação.
- **Continuação direta:** cada episódio começa exatamente onde o anterior parou e responde ao gancho/pergunta dele na primeira frase; o primeiro plano retoma o lugar e os personagens do último plano do anterior. Sem salto de tempo ou de lugar sem explicar. O que aconteceu num episódio aparece igual no seguinte; conferir a bíblia.
- Cada correção do usuário vira regra nova em "Regras aprendidas" e na bíblia.

## Regras aprendidas

- (17/11/2026) Cada episódio tem que ser continuação direta do anterior (ver seção 7).

- (17/11/2026) A narração tem que ser voz masculina grossa de narrador: voz fixa VoiceStudio "Lucas" (não usar VoxCPM2).

- (ÚLTIMA LINHA, ep. 01) Barras do ônibus não podem passar na frente de um rosto em close: usar `noPoles` no plano.
