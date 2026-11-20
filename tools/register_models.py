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
    c = ing[vid]
    if ov.get(vid, {}).get('skip'): continue
    f = ov.get(vid, {}).get('file', f'models/cars/{vid}.glb')
    if not os.path.exists(os.path.join(PROJ, f)): continue
    if c['src'] == 'gh':
        credit = f"\"{c['title'].strip()}\" from Sketchfab, {c.get('lic') or 'CC BY 4.0'}, via github.com/{c['id']}"
    else:
        src = '3D Warehouse' if c['src'] == '3dw' else 'Sketchfab / Objaverse'
        credit = f"model by {c['by'] or 'unknown'}, {src}"
    e = {'file': f, 'name': c['title'].strip(), 'credit': credit, 'auto': True}
    e.update({k: v for k, v in ov.get(vid, {}).items() if k != 'skip'})
    lines.append(f"    '{vid}': {json.dumps(e, ensure_ascii=False)},")
lines.append("    // </auto>")
anchor = "    'ferrari458-10':"
assert anchor in s
s = s.replace(anchor, '\n'.join(lines) + '\n' + anchor, 1)
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('registered', len(lines) - 2)
