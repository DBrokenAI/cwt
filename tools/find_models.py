"""Per-vehicle candidate models from 3D Warehouse (anonymous GLB) and Objaverse; writes cands.json + contact sheets."""
import json, re, sys, time, urllib.parse, urllib.request, html, os

VEH = {
 'camry-18': ('Toyota', 'Camry', 2018, 2024), 'corolla-20': ('Toyota', 'Corolla', 2020, 2025), 'rav4-19': ('Toyota', 'RAV4', 2019, 2025),
 'highlander-20': ('Toyota', 'Highlander', 2020, 2025), 'tacoma-16': ('Toyota', 'Tacoma', 2016, 2023), 'tundra-22': ('Toyota', 'Tundra', 2022, 2025),
 'civic-16': ('Honda', 'Civic', 2016, 2025), 'accord-18': ('Honda', 'Accord', 2018, 2022), 'crv-17': ('Honda', 'CR-V', 2017, 2022),
 'f150-15': ('Ford', 'F-150', 2015, 2020), 'f150-21': ('Ford', 'F-150', 2021, 2025), 'f250-17': ('Ford', 'F-250', 2017, 2025),
 'mustang-15': ('Ford', 'Mustang', 2015, 2023), 'explorer-20': ('Ford', 'Explorer', 2020, 2025), 'silverado-19': ('Chevrolet', 'Silverado', 2019, 2025),
 'tahoe-21': ('Chevrolet', 'Tahoe', 2021, 2025), 'equinox-18': ('Chevrolet', 'Equinox', 2018, 2024), 'camaro-16': ('Chevrolet', 'Camaro', 2016, 2024),
 'ram2500-14': ('Ram', '2500', 2014, 2025), 'wrangler-18': ('Jeep', 'Wrangler', 2018, 2025), 'grandcherokee-14': ('Jeep', 'Grand Cherokee', 2014, 2021),
 'charger-14': ('Dodge', 'Charger', 2014, 2023), 'altima-19': ('Nissan', 'Altima', 2019, 2025), 'rogue-21': ('Nissan', 'Rogue', 2021, 2025),
 'outback-20': ('Subaru', 'Outback', 2020, 2025), 'wrx-15': ('Subaru', 'WRX', 2015, 2021), 'cx5-17': ('Mazda', 'CX-5', 2017, 2025),
 'elantra-21': ('Hyundai', 'Elantra', 2021, 2025), 'telluride-20': ('Kia', 'Telluride', 2020, 2025), 'model3-17': ('Tesla', 'Model 3', 2017, 2023),
 'modely-20': ('Tesla', 'Model Y', 2020, 2024), 'bmw3-19': ('BMW', '3 Series', 2019, 2025), 'golf-15': ('Volkswagen', 'Golf', 2015, 2021),
 'gti-15': ('Volkswagen', 'GTI', 2015, 2021),
}
ALT = {'F-150': ['f150', 'f 150'], 'F-250': ['f250', 'f 250', 'super duty'], 'CR-V': ['crv', 'cr v'], 'CX-5': ['cx5', 'cx 5'], '3 Series': ['330i', '3series', 'g20', '340i', '320i', '3 series'],
       'Model 3': ['model3', 'model 3'], 'Model Y': ['modely', 'model y'], 'GTI': ['gti'], '2500': ['2500'], 'Grand Cherokee': ['grand cherokee', 'grandcherokee'], 'RAV4': ['rav4', 'rav 4']}
BAD = re.compile(r'nascar|police|sheriff|taxi|racing|race car|wreck|crash|damaged|toy|cartoon|interior|engine|wheels?|rims?|logo|bumper|fender|drift|rally|#\d|lowpoly|low poly|low-poly|scan|photogrammetry|speaker|grille|headlight|key|badge|voxel|lego|minecraft|roblox|limo|monster|forza|console|ae86|fleetwood|sprinter|convertibles|e30|e36|e46|e90|touring car|polo', re.I)

def get(url):
    for attempt in range(4):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=40))
        except Exception as e:
            time.sleep(3 + attempt * 5)
    return {}

objv = json.load(open('cars_all.json'))
out = {}
for vid, (make, model, y0, y1) in VEH.items():
    names = [model.lower()] + ALT.get(model, [])
    def match(title):
        t = re.sub(r'[^a-z0-9]+', ' ', title.lower())
        return any(n in t or n.replace(' ', '') in t.replace(' ', '') for n in names) and not BAD.search(title)
    def yscore(title):
        ys = [int(y) for y in re.findall(r'\b(19[5-9]\d|20[0-3]\d)\b', title)]
        if not ys: return 0
        return 2 if any(y0 <= y <= y1 for y in ys) else -3
    rows = []
    seen = set()
    for q in [f'{y0 + 1} {make} {model}', f'{y1 - 1} {make} {model}', f'{make} {model}', f'{(y0 + y1) // 2} {model}']:
        d = get('https://3dwarehouse.sketchup.com/warehouse/v1.0/entities?' + urllib.parse.urlencode({'q': q, 'count': 60, 'offset': 0, 'contentType': '3dw', 'class': 'entity', 'showBinaryMetadata': 'true'}))
        for e in d.get('entries', []):
            b = e.get('binaries') or {}
            g = b.get('glb')
            if not g or e['id'] in seen or not match(e.get('title', '')): continue
            seen.add(e['id'])
            sz = g.get('fileSize') or 0
            if sz < 250_000 or sz > 70_000_000: continue
            th = (b.get('bot_lt') or b.get('bot_lt_wp') or b.get('bot_st') or {}).get('contentUrl', '')
            rows.append({'src': '3dw', 'id': e['id'], 'title': e.get('title', ''), 'dl': e.get('downloads') or 0, 'views': e.get('views') or 0, 'size': sz,
                         'ys': yscore(e.get('title', '')), 'thumb': th, 'url': g.get('contentUrl') or f"https://3dwarehouse.sketchup.com/warehouse/v1.0/entities/{e['id']}/binaries/glb?download=true",
                         'by': (e.get('creator') or {}).get('displayName', '')})
        time.sleep(0.4)
    for r in objv:
        if not r['obj'] or r['faces'] < 15000 or not match(r['name']): continue
        t = r['name'] + ' ' + ' '.join(r['tags'])
        if make.lower()[:4] not in t.lower() and model.lower() not in ('wrx', 'gti', 'mustang', 'camaro', 'civic', 'camry', 'corolla', 'tacoma', 'tundra', 'wrangler', 'silverado', 'f-150', 'model 3', 'model y'): continue
        rows.append({'src': 'obj', 'id': r['uid'], 'title': r['name'], 'dl': r['likes'] * 25, 'views': r['views'], 'size': r['size'], 'faces': r['faces'],
                     'ys': yscore(r['name'] + ' ' + r['desc']), 'thumb': r['thumb'], 'url': 'https://huggingface.co/datasets/allenai/objaverse/resolve/main/' + r['obj'], 'by': r['user'], 'license': r['license']})
    rows.sort(key=lambda r: -(r['ys'] * 100000 + r['dl']))
    out[vid] = rows[:10]
    print(f'{vid:18} {len(rows):3} candidates; top:', [(r['src'], r['title'][:28], r['dl'], round(r['size'] / 1e6, 1)) for r in rows[:3]], flush=True)
json.dump(out, open('cands.json', 'w'), indent=1)

# contact sheets: 6 vehicles per page, 10 thumbs per vehicle
vids = list(out)
os.makedirs('sheets', exist_ok=True)
for p in range(0, len(vids), 6):
    h = ['<meta charset=utf-8><style>body{margin:6px;background:#111;color:#eee;font:11px Segoe UI}h3{margin:6px 0 2px;font-size:13px}.r{display:flex;gap:4px}.c{width:182px}.c img{width:182px;height:112px;object-fit:cover;background:#333;display:block}.c div{height:26px;overflow:hidden;line-height:13px}b{color:#6cf}</style>']
    for vid in vids[p:p + 6]:
        mk, md, y0, y1 = VEH[vid]
        h.append(f'<h3>{vid} — {mk} {md} {y0}-{y1}</h3><div class=r>')
        for i, r in enumerate(out[vid][:10]):
            h.append(f'<div class=c><img src="{html.escape(r["thumb"])}"><div><b>{i}</b> {r["src"]} {html.escape(r["title"][:34])} · {r["dl"]}dl · {r["size"] / 1e6:.1f}MB</div></div>')
        h.append('</div>')
    open(f'sheets/sheet{p // 6}.html', 'w', encoding='utf-8').write('\n'.join(h))
print('DONE')
