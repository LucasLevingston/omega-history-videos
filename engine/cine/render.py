# uso: python3 render.py HTML OUTDIR N_FRAMES WORKERS [start end]
import sys, asyncio, os
from playwright.async_api import async_playwright
html, out, n, workers = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
os.makedirs(out, exist_ok=True)
async def worker(p, frames):
    b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1080, 'height': 1920})
    await pg.goto('file://' + html); await pg.wait_for_timeout(500)
    for i in frames:
        f = f'{out}/{i:05d}.jpg'
        if os.path.exists(f): continue
        await pg.evaluate(f'render({i/30})')
        await pg.screenshot(path=f, type='jpeg', quality=93)
        if i % 150 == 0: print('frame', i, flush=True)
    await b.close()
async def main():
    async with async_playwright() as p:
        await asyncio.gather(*[worker(p, range(k, n, workers)) for k in range(workers)])
asyncio.run(main())
