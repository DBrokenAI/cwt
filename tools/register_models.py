"""Write the auto-fit car entries into models/models.js from ingested.json + overrides.json."""
import json, os, re, sys
PROJ = sys.argv[1]
ing = json.load(open('ingested.json'))
ov = json.load(open('overrides.json')) if os.path.exists('overrides.json') else {}
p = os.path.join(PROJ, 'models', 'models.js')
s = open(p, encoding='utf-8').read()
s = re.sub(r"\n    // <auto>.*?// </auto>\n", "\n", s, flags=re.S)
lines = ["    // <auto> complete-car models fitted automatically (generated — edit flip / paint / drop per car if one looks wrong)"]
for vid in sorted(ing):
    if not os.path.exists(os.path.join(PROJ, 'models', 'cars', vid + '.glb')): continue
    c = ing[vid]
    if ov.get(vid, {}).get('skip'): continue
    src = '3D Warehouse' if c['src'] == '3dw' else 'Sketchfab / Objaverse'
    e = {'file': f'models/cars/{vid}.glb', 'name': c['title'].strip(), 'credit': f"model by {c['by'] or 'unknown'}, {src} — in-store preview only", 'auto': True}
    e.update({k: v for k, v in ov.get(vid, {}).items() if k != 'skip'})
    lines.append(f"    '{vid}': {json.dumps(e, ensure_ascii=False)},")
lines.append("    // </auto>")
anchor = "    'ferrari458-10':"
assert anchor in s
s = s.replace(anchor, '\n'.join(lines) + '\n' + anchor, 1)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('registered', len(lines) - 2)
