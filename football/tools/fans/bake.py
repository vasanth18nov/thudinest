# Rebuild football/models/fans.*: serve the repo root on port 8767 (python3 -m http.server 8767), then
#   python3 football/tools/fans/poses.py > /dev/null   (writes poses.json beside it, if the poses changed)
#   python3 football/tools/fans/bake.py adam,ch01,ch42,josh,pete 1000
import sys, json, base64, struct, math, os
from playwright.sync_api import sync_playwright
names = sys.argv[1]; tris = sys.argv[2] if len(sys.argv) > 2 else '1400'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page()
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text))
    pg.goto(f'http://localhost:8767/football/tools/fans/bake.html?n={names}&tris={tris}')
    try: pg.wait_for_function('window.done', timeout=170000)
    except Exception: print('timeout', errs[:8]); sys.exit(1)
    R = pg.evaluate('window.result'); print('log', errs[:8])
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models') + '/'
import os; os.makedirs(out, exist_ok=True)
open(out + 'fans.webp', 'wb').write(base64.b64decode(R['atlas'].split(',')[1]))
# binary: per character: 6 position sets (int16, 1/8000 m), 2 normal sets (int8), uv (uint16), index (uint16)
S = 8000.0
blob = bytearray(); meta = []
def pad4():
    while len(blob) % 4: blob.append(0)
for c in R['chars']:
    m = {'name': c['name'], 'nv': c['nv'], 'ni': c['ni'], 'seatFoot': c['seatFoot']}
    pad4(); m['pos'] = len(blob)
    for arr in c['pos']: blob.extend(struct.pack(f'<{len(arr)}h', *[max(-32767, min(32767, round(v * S))) for v in arr]))
    pad4(); m['nrm'] = len(blob)
    for arr in c['nrm']: blob.extend(struct.pack(f'<{len(arr)}b', *[max(-127, min(127, round(v * 127))) for v in arr]))
    pad4(); m['uv'] = len(blob)
    blob.extend(struct.pack(f'<{len(c["uv"])}H', *[max(0, min(65535, round(v * 65535))) for v in c['uv']]))
    pad4(); m['idx'] = len(blob)
    blob.extend(struct.pack(f'<{len(c["idx"])}H', *c['idx']))
    meta.append(m); print(c['name'], c['nv'], 'verts', c['tris'], 'tris', 'seatFoot', round(c['seatFoot'], 3))
open(out + 'fans.bin', 'wb').write(blob)
json.dump({'scale': S, 'poses': ['sit', 'clapA', 'clapB', 'groan', 'upA', 'upB'], 'chars': meta, 'cells': R['cells']}, open(out + 'fans.json', 'w'))
print('bin', len(blob), 'atlas', R['W'], R['H'], 'cells', len(R['cells']))
