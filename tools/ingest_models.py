"""Download the chosen candidate per vehicle and optimize it into the project's models/cars folder."""
import json, os, subprocess, sys, urllib.request, concurrent.futures as cf

PROJ = sys.argv[1]
GT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gt')
cands = json.load(open('cands.json'))
PICK = {
 'camry-18': 3, 'corolla-20': 2, 'rav4-19': 0, 'highlander-20': 0, 'tacoma-16': 0, 'tundra-22': 0, 'civic-16': 9, 'accord-18': 1, 'crv-17': 2,
 'f150-15': 1, 'f150-21': 2, 'f250-17': 4, 'mustang-15': 4, 'explorer-20': 3, 'silverado-19': 1, 'tahoe-21': 0, 'equinox-18': 3, 'camaro-16': 1,
 'ram2500-14': 0, 'wrangler-18': 5, 'grandcherokee-14': 0, 'charger-14': 0, 'altima-19': 0, 'rogue-21': 0, 'outback-20': 3, 'wrx-15': 0, 'cx5-17': 0,
 'elantra-21': 1, 'telluride-20': 0, 'model3-17': 0, 'modely-20': 0, 'bmw3-19': 6, 'golf-15': 0, 'gti-15': 1,
}
if len(sys.argv) > 2:   # ingest.py PROJ vid=idx ...
    PICK = {a.split('=')[0]: int(a.split('=')[1]) for a in sys.argv[2:]}
os.makedirs('raw', exist_ok=True)
os.makedirs(os.path.join(PROJ, 'models', 'cars'), exist_ok=True)

def one(item):
    vid, idx = item
    c = cands[vid][idx]
    raw = os.path.abspath(os.path.join('raw', f'{vid}-{idx}.glb'))
    out = os.path.join(PROJ, 'models', 'cars', f'{vid}.glb')
    try:
        if not os.path.exists(raw) or os.path.getsize(raw) < 10000:
            req = urllib.request.Request(c['url'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=300) as r, open(raw, 'wb') as f:
                while True:
                    b = r.read(1 << 20)
                    if not b: break
                    f.write(b)
        cmd = f'npx gltf-transform optimize "{raw}" "{out}" --compress draco --texture-compress webp --texture-size 1024 --simplify false --instance false --palette false --prune-attributes false'
        p = subprocess.run(cmd, shell=True, cwd=GT, capture_output=True, text=True, timeout=1500)
        ok = os.path.exists(out) and os.path.getsize(out) > 10000
        return vid, c, ok, (os.path.getsize(raw), os.path.getsize(out) if ok else 0), (p.stdout + p.stderr)[-300:] if not ok else ''
    except Exception as e:
        return vid, c, False, (0, 0), repr(e)

res = {}
with cf.ThreadPoolExecutor(3) as ex:
    for vid, c, ok, sz, err in ex.map(one, PICK.items()):
        print(f'{vid:18} {"OK " if ok else "FAIL"} {sz[0] / 1e6:6.1f}MB -> {sz[1] / 1e6:5.1f}MB  {c["title"][:40]}  {err}', flush=True)
        if ok: res[vid] = {'title': c['title'], 'by': c['by'], 'src': c['src'], 'id': c['id']}
prev = json.load(open('ingested.json')) if os.path.exists('ingested.json') else {}
prev.update(res)
json.dump(prev, open('ingested.json', 'w'), indent=1)
print('DONE', len(res))
