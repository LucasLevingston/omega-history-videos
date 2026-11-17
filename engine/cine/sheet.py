# folha de conferência: renderiza quadros em tempos dados e monta grade
import sys, asyncio, json
from playwright.async_api import async_playwright
from PIL import Image
async def main(html, times, out, cols=5):
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1080,'height':1920})
        logs=[]; pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('ERR '+str(e)))
        await pg.goto('file://'+html); await pg.wait_for_timeout(500)
        ims=[]
        for t in times:
            await pg.evaluate(f'render({t})'); await pg.wait_for_timeout(30)
            f=f'/tmp/sh_{t:.2f}.png'; await pg.screenshot(path=f); ims.append(Image.open(f).resize((270,480)))
        await b.close()
    rows=(len(ims)+cols-1)//cols; S=Image.new('RGB',(cols*270,rows*480))
    for i,im in enumerate(ims): S.paste(im,((i%cols)*270,(i//cols)*480))
    S.save(out); print('\n'.join(sorted(set(logs)))[:2000])
times=[float(x) for x in sys.argv[3].split(',')]
asyncio.run(main(sys.argv[1], times, sys.argv[2]))
