// node mats.mjs <dir> [vid ...] — per-material surface area, colour and texture for each car GLB
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import fs from 'fs';
import path from 'path';

const dir = process.argv[2];
const only = process.argv.slice(3);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const hex = c => '#' + c.slice(0, 3).map(v => Math.round(Math.pow(v, 1 / 2.2) * 255).toString(16).padStart(2, '0')).join('');
const out = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.glb'))) {
  const vid = f.replace('.glb', '');
  if (only.length && !only.includes(vid)) continue;
  let doc;
  try { doc = await io.read(path.join(dir, f)); } catch (e) { console.log(vid, 'READ FAIL', e.message); continue; }
  const area = new Map(); let total = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const m = node.getWorldMatrix();
    const sc = Math.cbrt(Math.abs(m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8])));
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue;
      const pos = prim.getAttribute('POSITION'), idx = prim.getIndices(); if (!pos) continue;
      const n = idx ? idx.getCount() / 3 : pos.getCount() / 3, st = Math.max(1, Math.floor(n / 3000));
      let sum = 0; const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
      for (let t = 0; t < n; t += st) {
        const i0 = idx ? idx.getScalar(t * 3) : t * 3, i1 = idx ? idx.getScalar(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getScalar(t * 3 + 2) : t * 3 + 2;
        pos.getElement(i0, a); pos.getElement(i1, b); pos.getElement(i2, c);
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        sum += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) * st;
      }
      sum *= sc * sc;
      const mat = prim.getMaterial();
      area.set(mat, (area.get(mat) || 0) + sum); total += sum;
    }
  }
  const rows = [...area.entries()].sort((p, q) => q[1] - p[1]).slice(0, 9).map(([m, a]) => ({
    name: m ? m.getName() : '(none)', pct: Math.round(a / total * 100), color: m ? hex(m.getBaseColorFactor()) : '', tex: !!(m && m.getBaseColorTexture()),
    alpha: m ? m.getAlphaMode() : '', a: m ? +m.getBaseColorFactor()[3].toFixed(2) : 1,
  }));
  out[vid] = rows;
  console.log(vid.padEnd(17), rows.map(r => `${r.name || '?'}:${r.pct}%${r.color}${r.tex ? 'T' : ''}${r.alpha !== 'OPAQUE' ? 'a' + r.a : ''}`).join('  '));
}
fs.writeFileSync('mats.json', JSON.stringify(out, null, 1));
