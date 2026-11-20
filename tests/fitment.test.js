// Run with: node tests/fitment.test.js
const assert = require('assert');
const F = require('../js/fitment.js');
const VEHICLES = require('../js/data/vehicles.js');
const { TIRES } = require('../js/data/tires.js');
const { WHEELS } = require('../js/data/wheels.js');

const veh = id => VEHICLES.find(v => v.id === id);
const status = (r, id) => (r.checks.find(c => c.id === id) || {}).status;
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('parses metric, LT and flotation sizes', () => {
  const a = F.parseTire('225/65R17 102H');
  assert.strictEqual(F.round(a.dia), 28.5); assert.strictEqual(a.li, 102); assert.strictEqual(a.sr, 'H'); assert.strictEqual(a.lt, false);
  const b = F.parseTire('LT285/70R17 121/118S E');
  assert.ok(b.lt); assert.strictEqual(b.li, 121); assert.strictEqual(b.sr, 'S'); assert.strictEqual(b.range, 'E'); assert.strictEqual(F.round(b.dia), 32.7);
  const c = F.parseTire('35x12.50R17LT 121Q E');
  assert.ok(c.flotation && c.lt); assert.strictEqual(c.dia, 35); assert.strictEqual(c.rim, 17); assert.strictEqual(c.li, 121);
  const d = F.parseTire('235/45ZR18 98Y XL');
  assert.ok(d.xl); assert.strictEqual(d.rim, 18); assert.strictEqual(d.sr, 'Y');
});

test('approved rim widths match published tables for common sizes', () => {
  const rr = s => { const r = F.rimRange(F.parseTire(s)); return [r.min, r.max]; };
  assert.deepStrictEqual(rr('225/45R17'), [7, 8.5]);
  assert.deepStrictEqual(rr('265/70R17'), [7, 9]);
  assert.deepStrictEqual(rr('205/55R16'), [5.5, 7.5]);
  assert.deepStrictEqual(rr('245/40R18'), [8, 9.5]);
  assert.deepStrictEqual(rr('235/45R18'), [7.5, 9]);
  assert.deepStrictEqual(rr('275/55R20'), [7.5, 9.5]);
  assert.deepStrictEqual(rr('225/65R17'), [6, 8]);
  assert.deepStrictEqual(rr('35x12.50R17'), [8.5, 11]);
});

test('every catalog tire size parses with a load index and speed rating', () => {
  TIRES.forEach(t => t.sizes.forEach(s => {
    const p = F.parseTire(s);
    assert.ok(p && p.li && p.sr && F.loadLbs(p.li), `${t.id}: ${s}`);
  }));
});

test('every factory package passes on its own vehicle', () => {
  VEHICLES.forEach(v => v.oe.forEach((o, i) => {
    const wheel = { d: o.d, w: o.w, et: o.et, pcd: v.pcd, cb: v.cb, load: 9999 };
    const tire = F.parseTire(o.tire, o.li, o.sr); if (o.lt) tire.lt = true;
    const r = F.checkFitment(v, i, wheel, tire, { suspension: 'stock' });
    const bad = r.checks.filter(c => c.status === 'fail' || c.status === 'warn');
    assert.strictEqual(bad.length, 0, `${v.id} ${o.trim}: ${bad.map(c => c.id + ' ' + c.detail).join(' | ')}`);
  }));
});

test('wrong bolt pattern fails, near-miss pattern is called out', () => {
  const w = WHEELS.find(x => x.style === 'Apex S5' && x.pcd === '5x100' && x.d === 18);
  assert.strictEqual(F.wheelStatus(veh('camry-18'), w), 'no');
  const w2 = WHEELS.find(x => x.style === 'Touring 5' && x.pcd === '5x114.3' && x.d === 18);
  const r = F.checkFitment(veh('equinox-18'), 0, w2, null);
  assert.strictEqual(status(r, 'pcd'), 'fail');
  assert.ok(/NOT interchangeable/.test(r.checks.find(c => c.id === 'pcd').detail));
});

test('center bore: too small fails, too large asks for hub rings', () => {
  const turbine = WHEELS.find(x => x.style === 'Turbine T7' && x.d === 19 && x.w === 8.5);
  assert.strictEqual(status(F.checkFitment(veh('cx5-17'), 0, turbine, null), 'cb'), 'fail');   // 64.1 < 67.1
  assert.strictEqual(status(F.checkFitment(veh('model3-17'), 0, turbine, null), 'cb'), 'pass');
  const apex = WHEELS.find(x => x.style === 'Apex S5' && x.pcd === '5x114.3' && x.d === 18 && x.w === 8);
  const r = F.checkFitment(veh('camry-18'), 2, apex, F.parseTire('235/45R18 98Y XL'));
  assert.strictEqual(status(r, 'cb'), 'note');
  assert.ok(r.hardware.some(h => /hub-centric rings, 73.1 mm OD → 60.1 mm ID/.test(h)));
  assert.strictEqual(r.verdict, 'yes');
});

test('brake clearance blocks wheels below the minimum diameter', () => {
  const w = WHEELS.find(x => x.style === 'Vector M10' && x.pcd === '5x114.3' && x.d === 16);
  assert.strictEqual(status(F.checkFitment(veh('model3-17'), 0, w, null), 'brake'), 'fail');
});

test('lower load index fails; lower speed rating warns; winter tire gets the allowance', () => {
  const v = veh('camry-18'); // SE: 235/45R18 94V
  const w = { d: 18, w: 8, et: 50, pcd: v.pcd, cb: v.cb, load: 9999 };
  assert.strictEqual(status(F.checkFitment(v, 2, w, F.parseTire('235/45R18 91V')), 'li'), 'fail');
  assert.strictEqual(status(F.checkFitment(v, 2, w, F.parseTire('235/45R18 94H')), 'sr'), 'warn');
  assert.strictEqual(status(F.checkFitment(v, 2, w, F.parseTire('235/45R18 94H'), { winter: true }), 'sr'), 'note');
});

test('load index below this trim but used on another factory trim is a warning, not a pass', () => {
  const v = veh('modely-20'); // 19" trim is 104, 20" trim is 101
  const w = { d: 20, w: 9.5, et: 45, pcd: v.pcd, cb: v.cb, load: 9999 };
  assert.strictEqual(status(F.checkFitment(v, 0, w, F.parseTire('255/40R20 101Y XL')), 'li'), 'warn');
  assert.strictEqual(status(F.checkFitment(v, 1, w, F.parseTire('255/40R20 101Y XL')), 'li'), 'pass');
  assert.strictEqual(status(F.checkFitment(v, 0, w, F.parseTire('255/40R20 97Y')), 'li'), 'fail');
});

test('rim width outside the approved range fails', () => {
  const v = veh('wrx-15');
  const w = WHEELS.find(x => x.style === 'Mesh RS' && x.pcd === '5x114.3' && x.d === 18 && x.w === 9.5);
  assert.strictEqual(status(F.checkFitment(v, 1, w, F.parseTire('225/40R18 92Y XL')), 'rimw'), 'warn'); // 0.5" over: confirm on spec sheet
  assert.strictEqual(status(F.checkFitment(v, 1, Object.assign({}, w, { w: 10.5 }), F.parseTire('225/40R18 92Y XL')), 'rimw'), 'fail');
});

test('oversize truck tire needs a lift; leveling kit changes the answer', () => {
  const v = veh('tacoma-16');
  const w = WHEELS.find(x => x.style === 'Ridgeline 6' && x.pcd === '6x139.7' && x.d === 17 && x.et === 0);
  const t = F.parseTire('LT285/70R17 121S E');
  assert.strictEqual(status(F.checkFitment(v, 2, w, t, { suspension: 'stock' }), 'dia'), 'fail');
  assert.strictEqual(status(F.checkFitment(v, 2, w, t, { suspension: 'level' }), 'dia'), 'warn');
});

test('heavy-duty truck rejects passenger tires and light-duty wheels', () => {
  const v = veh('f250-17');
  const w = { d: 20, w: 8, et: 40, pcd: v.pcd, cb: v.cb, load: 2400 };
  const r = F.checkFitment(v, 2, w, F.parseTire('275/65R20 116T'));
  assert.strictEqual(status(r, 'li'), 'fail');
  assert.notStrictEqual(status(r, 'wload'), 'pass');
});

test('aggressive offset is flagged for poke; speedometer math is right', () => {
  const v = veh('civic-16');
  const w = WHEELS.find(x => x.style === 'Mesh RS' && x.pcd === '5x114.3' && x.d === 18 && x.w === 9.5);
  const r = F.checkFitment(v, 2, w, F.parseTire('245/40R18 97Y XL'));
  assert.ok(['warn', 'fail'].includes(status(r, 'outer')));
  const r2 = F.checkFitment(veh('f150-15'), 1, null, F.parseTire('LT285/70R17 121S E'));
  assert.ok(Math.abs(r2.metrics.speedoAt60 - 60 * 32.71 / 31.61) < 0.05);
});

test('catalog has at least one clean-fitting wheel and tire for every vehicle', () => {
  VEHICLES.forEach(v => {
    const ws = WHEELS.filter(w => F.wheelStatus(v, w, 'stock') === 'yes');
    assert.ok(ws.length > 0, `no wheel fits ${v.id}`);
    const ok = ws.some(w => TIRES.some(t => t.sizes.some(s => {
      const p = F.parseTire(s);
      return p.rim === w.d && F.checkFitment(v, 0, w, p, { suspension: 'stock', winter: t.tread === 'winter' }).verdict === 'yes';
    })));
    assert.ok(ok, `no clean wheel+tire combo for ${v.id}`);
  });
});

console.log(`\n${n} tests passed`);
