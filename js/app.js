/* CWT app — UI state, catalog rendering, fitment report. */
(function () {
  const F = window.Fitment;
  const DBG = /dbg=1/.test(location.hash);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cwt.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('cwt.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  const PAINTS = [
    ['Super White', '#f2f3f1', 'gloss'], ['Pearl White', '#e6e4dc', 'metallic'], ['Silver', '#b8bcc2', 'metallic'], ['Gunmetal', '#4a4f57', 'metallic'],
    ['Jet Black', '#0b0b0d', 'gloss'], ['Midnight Blue', '#141f3d', 'metallic'], ['Electric Blue', '#1657c9', 'metallic'], ['Ice Blue', '#8fb1c9', 'metallic'],
    ['Race Red', '#c4161c', 'gloss'], ['Ruby', '#6d0f1c', 'metallic'], ['Burnt Orange', '#c9541a', 'metallic'], ['Yellow', '#e8c21a', 'gloss'],
    ['Army Green', '#4b5a3c', 'gloss'], ['Lunar Rock', '#8d9488', 'gloss'], ['Sand', '#b9a47e', 'metallic'], ['Cement', '#9da2a6', 'gloss'],
  ];
  const BODY_LABEL = { sedan: 'Sedan', coupe: 'Coupe', hatch: 'Hatchback', cuv: 'Crossover', suv: 'SUV', truck: 'Pickup', hdtruck: 'HD Pickup', jeep: 'Off-roader' };
  const TIRE_GROUPS = [['all', 'All'], ['touring', 'Touring'], ['performance', 'Performance'], ['winter', 'Winter'], ['offroad', 'Off-road']];
  const groupOf = t => ({ touring: 'touring', highway: 'touring', allweather: 'touring', performance: 'performance', summer: 'performance', winter: 'winter', at: 'offroad', mt: 'offroad' }[t.tread] || 'touring');
  const RATING_LABELS = [['dry', 'Dry grip'], ['wet', 'Wet grip'], ['snow', 'Snow'], ['ice', 'Ice'], ['offroad', 'Off-road'], ['comfort', 'Ride comfort'], ['quiet', 'Quiet'], ['life', 'Tread life']];
  const VERDICT = { yes: ['Direct fit', 'Everything checks out'], notes: ['Fits — with notes', ''], no: ['Does not fit', ''], oe: ['Factory setup', 'Pick a wheel or tire to check it'] };

  // ── State ────────────────────────────────────────────────
  const custom = store.get('inventory', { wheels: [], tires: [] });
  const customVehicles = store.get('vehicles', []);
  const allVehicles = () => window.VEHICLES.concat(customVehicles);
  const allWheels = () => custom.wheels.concat(window.WHEELS);
  const allTires = () => custom.tires.concat(window.TIRES);

  const S = {
    vehicle: null, year: null, oeIndex: 0, suspension: 'stock',
    paint: store.get('paint', { hex: '#b8bcc2', finish: 'metallic', name: 'Silver' }),
    wheel: null, finish: null, tire: null, tireModel: null,
    tab: 'wheels', wheelDia: null, fitsOnly: true, tireGroup: 'all',
  };
  let viewer = null;

  // ── Helpers ──────────────────────────────────────────────
  const oePk = () => F.oePackages(S.vehicle)[S.oeIndex];
  const vehName = (v, y) => `${y || v.years[1]} ${v.make} ${v.model}`;
  const wheelLabel = w => `${w.d}×${w.w} ET${w.et}`;
  const sign = (n, d) => (n > 0 ? '+' : '') + F.round(n, d == null ? 1 : d);

  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  }

  // The wheel the fitment engine should use: the selected one, or the factory wheel that matches the tire.
  function effectiveWheel() {
    if (S.wheel) return S.wheel;
    if (!S.tire) return null;
    const pk = F.oePackages(S.vehicle);
    const m = pk[S.oeIndex].d === S.tire.rim ? pk[S.oeIndex] : pk.find(p => p.d === S.tire.rim);
    return m ? { d: m.d, w: m.w, et: m.et, pcd: S.vehicle.pcd, cb: S.vehicle.cb, factory: true, style: 'Factory wheel' } : null;
  }
  const targetRim = () => (S.wheel ? S.wheel.d : oePk().d);
  const fitOpts = model => ({ suspension: S.suspension, winter: !!model && model.tread === 'winter' });

  function report() {
    const w = effectiveWheel();
    if (!S.wheel && !S.tire) return null;
    const r = F.checkFitment(S.vehicle, S.oeIndex, w, S.tire, fitOpts(S.tireModel));
    if (w && w.factory) r.checks = r.checks.filter(c => c.group !== 'wheel'), r.hardware = [];
    r.verdict = F.verdictOf(r.checks);
    return r;
  }

  // ── Vehicle search ───────────────────────────────────────
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  function searchVehicles(q) {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    let year = null;
    const words = [];
    tokens.forEach(t => {
      if (/^(19|20)\d\d$/.test(t)) year = +t;
      else if (/^'?\d\d$/.test(t) && +t.replace("'", '') <= 35) year = 2000 + +t.replace("'", '');
      else words.push(norm(t));
    });
    const out = [];
    allVehicles().forEach(v => {
      const names = [[`${v.make} ${v.model}`, null]].concat(v.aliases.map(a => [a, a]));
      names.forEach(([name, alias]) => {
        const hay = norm(name);
        if (!words.every(w => hay.includes(w))) return;
        const inRange = year == null || (year >= v.years[0] && year <= v.years[1]);
        if (year != null && !inRange) { out.push({ v, alias, year: null, miss: year, score: 5 }); return; }
        out.push({ v, alias, year, score: (words.length ? 0 : 2) + (alias ? 1 : 0) });
      });
    });
    const hit = new Set(out.filter(r => !r.miss).map(r => r.v.make + r.v.model));
    return out.filter(r => !r.miss || !hit.has(r.v.make + r.v.model)).sort((a, b) => a.score - b.score || a.v.make.localeCompare(b.v.make) || b.v.years[1] - a.v.years[1]).slice(0, 9);
  }

  function renderResults() {
    const q = $('#q').value.trim();
    const box = $('#results');
    if (!q) { box.hidden = true; return; }
    if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(q)) {
      box.innerHTML = `<button class="res" data-vin="${esc(q.toUpperCase())}"><b>Decode VIN</b><span>${esc(q.toUpperCase())}</span><em>NHTSA lookup</em></button>`;
      box.hidden = false; return;
    }
    const res = searchVehicles(q);
    box.innerHTML = res.map((r, i) => {
      const v = r.v, yrs = `${v.years[0]}–${v.years[1]}`;
      const title = r.alias ? `${esc(r.alias)}` : `${esc(v.make)} ${esc(v.model)}`;
      const sub = r.miss ? `Not covered for ${r.miss} — database has ${yrs}` : r.alias ? `Same fitment as ${esc(v.make)} ${esc(v.model)}` : `${F.pcdLabel(v.pcd)} · ${BODY_LABEL[v.body]}`;
      return `<button class="res${r.miss ? ' miss' : ''}" data-i="${i}"><b>${r.year ? r.year + ' ' : ''}${title}</b><span>${sub}</span><em>${yrs}</em></button>`;
    }).join('') + `<button class="res add" data-custom="1"><b>+ Add “${esc(q)}” as a custom vehicle</b><span>Enter its specs yourself</span><em></em></button>`;
    box.hidden = false;
    box._res = res;
  }

  function pickResult(el) {
    const box = $('#results');
    if (el.dataset.vin) { decodeVin(el.dataset.vin); }
    else if (el.dataset.custom) { openCustom(parseFree($('#q').value)); }
    else {
      const r = box._res[+el.dataset.i];
      if (r.miss) { toast(`${r.v.make} ${r.v.model} data covers ${r.v.years[0]}–${r.v.years[1]} only. Add ${r.miss} as a custom vehicle.`, 'warn'); return; }
      selectVehicle(r.v, r.year);
    }
    box.hidden = true; $('#q').value = ''; $('#q').blur();
  }

  function parseFree(q) {
    const m = q.match(/\b(19|20)\d\d\b/);
    const rest = q.replace(/\b(19|20)\d\d\b/, '').trim().split(/\s+/);
    return { year: m ? +m[0] : '', make: rest[0] || '', model: rest.slice(1).join(' ') };
  }

  // ── Vehicle selection ────────────────────────────────────
  function selectVehicle(v, year, keep) {
    S.vehicle = v;
    S.year = year || v.years[1];
    S.oeIndex = keep && keep.oeIndex < v.oe.length ? keep.oeIndex : 0;
    S.suspension = 'stock';
    S.wheel = null; S.finish = null; S.tire = null; S.tireModel = null; S.wheelDia = null;
    renderVehicle();
    rebuildBody();
    refresh();
    store.set('last', { id: v.id, year: S.year, oeIndex: S.oeIndex });
  }

  function renderVehicle() {
    const v = S.vehicle;
    $('#veh-name').textContent = vehName(v, S.year);
    $('#veh-body').textContent = BODY_LABEL[v.body];
    const ys = []; for (let y = v.years[1]; y >= v.years[0]; y--) ys.push(y);
    $('#sel-year').innerHTML = ys.map(y => `<option${y === S.year ? ' selected' : ''}>${y}</option>`).join('');
    $('#sel-oe').innerHTML = v.oe.map((o, i) => `<option value="${i}"${i === S.oeIndex ? ' selected' : ''}>${esc(o.trim)} — ${o.d}" · ${esc(o.tire)}</option>`).join('');
    $('#sel-susp').innerHTML = F.suspensionOptions(v).map(k => `<option value="${k}"${k === S.suspension ? ' selected' : ''}>${F.SUSPENSION[k].label}</option>`).join('');
    const o = v.oe[S.oeIndex];
    const spec = (k, val, hint) => `<div><dt>${k}</dt><dd>${val}${hint ? `<small>${hint}</small>` : ''}</dd></div>`;
    $('#veh-specs').innerHTML = [
      spec('Bolt pattern', esc(F.pcdLabel(v.pcd))),
      spec('Hub bore', `${v.cb} mm`),
      spec(v.fastener === 'bolt' ? 'Lug bolts' : 'Lug nuts', esc(v.thread)),
      spec('Torque', `${v.torque} lb-ft`),
      spec('TPMS', v.tpms === 'direct' ? 'Direct' : 'Indirect', v.tpms === 'direct' ? 'sensors in wheels' : 'no sensors'),
      spec('Min wheel', `${v.minDia}"`, 'brake clearance'),
      spec('Factory wheel', `${o.d}×${o.w} ET${o.et}`),
      spec('Factory tire', `${esc(o.tire)}`, `${o.li}${o.sr}`),
    ].join('');
    $('#veh-flags').innerHTML = v.flags.length ? `<div class="callout warn"><b>Confirm before ordering</b><ul>${v.flags.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : '';
    $('#veh-notes').innerHTML = v.notes.length ? `<div class="callout"><b>Know before you quote</b><ul>${v.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : '';
  }

  function rebuildBody() {
    if (!viewer) return;
    const pk = F.oePackages(S.vehicle), o = pk[S.oeIndex];
    viewer.setVehicle(S.vehicle, {
      tireDia: o.tireObj.dia, archDia: Math.max(...pk.map(p => p.tireObj.dia)),
      tireSw: F.mountedSection(o.tireObj, o.w), et: o.et,
    });
  }

  // What to draw: selected parts, falling back to factory parts so the car always has wheels.
  function visualSetup() {
    const o = oePk(), pk = F.oePackages(S.vehicle);
    const ew = effectiveWheel();
    const wheel = S.wheel
      ? { d: S.wheel.d, w: S.wheel.w, et: S.wheel.et, design: S.wheel.design, model: S.wheel.model, finish: window.WHEEL_FINISHES[S.finish || S.wheel.finishes[0]] }
      : ew ? { d: ew.d, w: ew.w, et: ew.et, design: 'oe', finish: window.WHEEL_FINISHES.silver }
        : S.tire ? { d: S.tire.rim, w: o.w, et: o.et, design: 'oe', finish: window.WHEEL_FINISHES.silver }
          : { d: o.d, w: o.w, et: o.et, design: 'oe', finish: window.WHEEL_FINISHES.silver };
    if (!S.wheel) wheel.model = ((window.CAR_MODELS || {})[S.vehicle.id] || {}).oeRim;
    let tire, placeholder = false;
    if (S.tire) tire = { dia: S.tire.dia, sw: F.mountedSection(S.tire, wheel.w), tread: S.tireModel ? S.tireModel.tread : 'touring', model: S.tireModel && S.tireModel.model3d };
    else {
      const m = pk.find(p => p.d === wheel.d && p === o) || pk.find(p => p.d === wheel.d);
      if (m) tire = { dia: m.tireObj.dia, sw: F.mountedSection(m.tireObj, wheel.w), tread: m.tireObj.lt ? 'at' : 'touring' };
      else { tire = { dia: Math.max(o.tireObj.dia, wheel.d + 3.2), sw: o.tireObj.sw, tread: 'touring' }; placeholder = true; }
    }
    return { wheel, tire, lift: F.SUSPENSION[S.suspension].lift, placeholder };
  }

  // Tells the salesperson what they are looking at: a real model, or the stylized stand-in.
  function renderModelNote(state, spec) {
    const el = $('#model-note');
    const txt = {
      model: spec && `3D model: ${esc(spec.name)}`,
      loading: 'Loading 3D model…',
      failed: spec && `Couldn't load ${esc(spec.file)} — showing the stylized body.`,
      'needs-launcher': 'A real 3D model is available for this vehicle — open CWT with “Start CWT.bat” to see it.',
      procedural: 'Stylized body (no 3D model mapped for this vehicle yet). Wheels and tires are to scale.',
    }[state];
    el.innerHTML = txt || ''; el.dataset.state = state; el.title = (spec && spec.credit) || '';
    if (DBG && state === 'model' && viewer.geo.auto) el.innerHTML = `<div style="text-align:left;background:#000c;color:#fff;padding:4px;font:11px monospace">axles ${viewer.geo.found ? 'found' : 'GUESSED'} · r0 ${viewer.geo.r0.toFixed(3)} · paint ${esc(viewer.geo.paintName)} ${viewer.geo.painted ? '' : '(NOT applied)'}<br>${viewer.geo.mats.map(esc).join('<br>')}</div>`;
  }

  // ── Refresh everything that depends on the selection ─────
  function refresh() {
    const vs = visualSetup();
    if (viewer) viewer.setSetup(vs);
    const r = report();
    renderVerdict(r);
    renderCaption(vs);
    renderStats(r);
    renderReport(r);
    renderCatalog();
    try {
      const p = new URLSearchParams({ v: S.vehicle.id, y: S.year, oe: S.oeIndex });
      if (S.suspension !== 'stock') p.set('s', S.suspension);
      if (S.wheel) { p.set('w', S.wheel.id); p.set('f', S.finish); }
      if (S.tire) { p.set('t', S.tireModel.id); p.set('ts', S.tire.raw); }
      history.replaceState(null, '', '#' + p.toString());
    } catch (e) { /* file:// in some browsers */ }
  }

  function renderVerdict(r) {
    const v = r ? r.verdict : 'oe';
    const el = $('#verdict');
    el.dataset.v = v;
    const issues = r ? r.checks.filter(c => c.status === 'warn' || c.status === 'fail') : [];
    const sub = !r ? VERDICT.oe[1] : v === 'yes' ? (S.tire && S.wheel ? 'Wheel and tire both check out' : S.wheel ? 'Wheel checks out — now pick a tire' : 'Tire checks out on the factory wheel')
      : `${issues.length} item${issues.length > 1 ? 's' : ''} need${issues.length > 1 ? '' : 's'} attention: ${issues.map(c => c.title.toLowerCase()).join(', ')}`;
    $('b', el).textContent = VERDICT[v][0];
    $('span', el).textContent = sub;
  }

  function renderCaption(vs) {
    const w = S.wheel, t = S.tire;
    const lines = [];
    lines.push(w ? `<b>${esc(w.brand)} ${esc(w.style)}</b> ${wheelLabel(w)} · ${esc(window.WHEEL_FINISHES[S.finish || w.finishes[0]].name)}` : `<b>Factory wheel</b> ${vs.wheel.d}×${vs.wheel.w} ET${vs.wheel.et}`);
    lines.push(t ? `<b>${esc(S.tireModel.brand)} ${esc(S.tireModel.model)}</b> ${esc(t.raw)}` : vs.placeholder ? `<i>Tire shown for scale only — pick a ${vs.wheel.d}" tire</i>` : `<b>Factory tire</b> ${esc((F.oePackages(S.vehicle).find(p => p.d === vs.wheel.d) || oePk()).tire)}`);
    $('#caption').innerHTML = lines.map(l => `<div>${l}</div>`).join('');
  }

  function renderStats(r) {
    const o = oePk();
    const t = S.tire || o.tireObj;
    const m = r && r.metrics;
    const stat = (label, val, sub, tone) => `<div class="stat ${tone || ''}"><small>${label}</small><b>${val}</b><span>${sub || '&nbsp;'}</span></div>`;
    const pct = m && m.tire ? m.diaPct : 0;
    const tone = Math.abs(pct) > 3 ? 'warn' : '';
    $('#stats').innerHTML = [
      stat('Overall diameter', `${F.round(t.dia)}"`, S.tire ? `${sign(pct)}% vs factory` : 'factory', tone),
      stat('Sidewall', `${F.round(t.sidewall / 25.4, 2)}"`, `${Math.round(t.sidewall)} mm`),
      stat('Speedo reads 60', `${m && m.tire ? F.round(m.speedoAt60) : 60} mph`, 'actual speed', tone),
      stat('Ride height', m && m.tire ? `${sign(m.rideHeight + F.SUSPENSION[S.suspension].lift, 2)}"` : `${sign(F.SUSPENSION[S.suspension].lift, 2)}"`, 'vs factory'),
      stat('Stance', m && m.poke != null ? `${sign(m.poke, 0)} mm` : '0 mm', m && m.poke > 0 ? 'further out per side' : m && m.poke < 0 ? 'further in per side' : 'same as factory', m && Math.abs(m.poke) > 25 ? 'warn' : ''),
      stat('Revs / mile', `${Math.round(t.revsPerMile)}`, S.tire ? `factory ${Math.round(o.tireObj.revsPerMile)}` : 'factory'),
    ].join('');
  }

  const ICON = { pass: '✓', note: 'i', warn: '!', fail: '✕' };
  function renderReport(r) {
    const o = oePk();
    if (!r) {
      $('#report-sub').textContent = 'Factory reference';
      $('#checks').innerHTML = `<div class="empty"><b>Pick a wheel or tire on the right.</b><p>Every option is checked against this vehicle's bolt pattern, hub bore, brake clearance, load index, speed rating, approved rim width, overall diameter and fender / suspension clearance.</p></div>`;
      $('#diagram').innerHTML = diagram(null);
      $('#compare').innerHTML = compareTable(null);
      $('#hardware').innerHTML = installBlock(null);
      return;
    }
    $('#report-sub').textContent = `${r.checks.filter(c => c.status === 'pass').length} of ${r.checks.length} checks clean`;
    const order = { fail: 0, warn: 1, note: 2, pass: 3 };
    $('#checks').innerHTML = r.checks.slice().sort((a, b) => order[a.status] - order[b.status]).map(c =>
      `<div class="check ${c.status}"><i>${ICON[c.status]}</i><div><b>${esc(c.title)}</b><p>${esc(c.detail)}</p></div></div>`).join('');
    $('#diagram').innerHTML = diagram(r);
    $('#compare').innerHTML = compareTable(r);
    $('#hardware').innerHTML = installBlock(r);
  }

  function compareTable(r) {
    const o = oePk(), ot = o.tireObj, t = S.tire, w = effectiveWheel();
    const row = (k, a, b, d) => `<tr><th>${k}</th><td>${a}</td><td>${b == null ? '—' : b}</td><td class="d">${d || ''}</td></tr>`;
    const inch = n => F.round(n, 1) + '"';
    return `<thead><tr><th></th><th>Factory</th><th>Selected</th><th></th></tr></thead><tbody>` + [
      row('Wheel', `${o.d}×${o.w} ET${o.et}`, w ? `${w.d}×${w.w} ET${w.et}` : null),
      row('Tire', esc(o.tire), t ? esc(t.size) : null),
      row('Diameter', inch(ot.dia), t ? inch(t.dia) : null, t ? sign(t.dia - ot.dia) + '"' : ''),
      row('Section width', `${ot.sw} mm`, t ? `${t.sw} mm` : null, t ? sign(t.sw - ot.sw, 0) + ' mm' : ''),
      row('Sidewall', `${Math.round(ot.sidewall)} mm`, t ? `${Math.round(t.sidewall)} mm` : null, t ? sign(t.sidewall - ot.sidewall, 0) + ' mm' : ''),
      row('Load / speed', `${o.li}${o.sr}`, t ? `${t.li || '?'}${t.sr || '?'}${t.xl ? ' XL' : ''}` : null),
      row('Max load', `${F.loadLbs(o.li)} lb`, t && t.li ? `${F.loadLbs(t.li)} lb` : null),
      row('Rim range', '', r && r.metrics.rim ? `${r.metrics.rim.min}–${r.metrics.rim.max}"` : null, 'approved'),
    ].join('') + '</tbody>';
  }

  // Top-down cross-section: where the new package sits relative to factory, measured from the hub face.
  function diagram(r) {
    const o = oePk(), w = effectiveWheel();
    const oe = o.env, nw = w ? F.envelope(w.w, w.et, S.tire) : null;
    const W = 320, H = 158, cx = 150, sc = 0.62, top = 34, hgt = 72;
    const X = mm => cx + mm * sc;
    const rect = (e, cls) => `<rect class="${cls}" x="${X(-e.inner)}" y="${top}" width="${(e.inner + e.outer) * sc}" height="${hgt}" rx="9"/>`;
    const lim = F.clearanceLimits(S.vehicle, S.suspension);
    const pk = F.oePackages(S.vehicle);
    const fender = Math.max(...pk.map(p => p.env.outer)) + lim.outerOk;
    const strut = Math.max(...pk.map(p => p.env.inner)) + lim.innerOk;
    let dims = '';
    if (nw) {
      const dOut = Math.round(nw.outer - oe.outer), dIn = Math.round(nw.inner - oe.inner);
      dims = `<text class="dim" x="${W - 8}" y="${top + hgt + 20}" text-anchor="end">${dOut >= 0 ? dOut + ' mm further out →' : '← ' + -dOut + ' mm further in'}</text>
        <text class="dim" x="8" y="${top + hgt + 20}">${dIn >= 0 ? '← ' + dIn + ' mm closer in' : -dIn + ' mm more room →'}</text>`;
    }
    return `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wheel position compared with factory">
      <text class="lbl" x="${X(-strut) - 4}" y="14" text-anchor="middle">suspension</text><text class="lbl" x="${X(fender) + 2}" y="14" text-anchor="middle">fender</text>
      <line class="wall" x1="${X(-strut)}" y1="20" x2="${X(-strut)}" y2="${top + hgt + 6}"/><line class="wall" x1="${X(fender)}" y1="20" x2="${X(fender)}" y2="${top + hgt + 6}"/>
      ${rect(oe, 'oe')}${nw ? rect(nw, 'new ' + (r ? r.verdict : '')) : ''}
      <line class="hub" x1="${cx}" y1="${top - 8}" x2="${cx}" y2="${top + hgt + 8}"/><text class="lbl" x="${cx}" y="${top - 12}" text-anchor="middle">hub face</text>
      ${dims}
      <g class="legend"><rect class="oe" x="6" y="${H - 12}" width="14" height="8" rx="2"/><text x="24" y="${H - 5}">factory</text>${nw ? `<rect class="new ${r ? r.verdict : ''}" x="78" y="${H - 12}" width="14" height="8" rx="2"/><text x="96" y="${H - 5}">selected</text>` : ''}</g>
    </svg>`;
  }

  function installBlock(r) {
    const v = S.vehicle;
    const hw = r && r.hardware.length ? r.hardware : [
      `${v.lugs * 4} × ${v.fastener === 'bolt' ? 'lug bolts' : 'lug nuts'}, ${v.thread}`,
      v.tpms === 'direct' ? 'Direct TPMS — sensors must be transferred and relearned with new wheels' : 'Indirect TPMS — recalibrate after any tire change',
      `Torque to ${v.torque} lb-ft in a star pattern; re-torque after 50–100 miles`,
    ];
    return `<div class="card-h sub"><span>Install sheet</span></div><ul class="hw">${hw.map(h => `<li>${esc(h)}</li>`).join('')}</ul>`;
  }

  // ── Catalog (right column) ───────────────────────────────
  function wheelThumb(design, color) {
    const dark = ((color >> 16) & 255) + ((color >> 8) & 255) + (color & 255) < 120;
    const hex = dark ? (color === 0x0b0b0d ? '#3a3e46' : '#4d525b') : '#' + color.toString(16).padStart(6, '0');
    const D = { oe: [5, 9], five: [5, 10], split5: [5, 4, 13], multi: [10, 4.5], mesh: [10, 2.6, 0, 16], turbine: [9, 7, 0, 0, 20], six: [6, 12], beadlock: [8, 10], split8: [8, 6.5] }[design] || [5, 10];
    let sp = '';
    const line = (a, w, skew) => { const r = a * Math.PI / 180, r2 = (a + (skew || 0)) * Math.PI / 180; return `<line x1="${32 + 9 * Math.cos(r)}" y1="${32 + 9 * Math.sin(r)}" x2="${32 + 23 * Math.cos(r2)}" y2="${32 + 23 * Math.sin(r2)}" stroke-width="${w}"/>`; };
    for (let i = 0; i < D[0]; i++) {
      const a = i * 360 / D[0] - 90;
      if (D[2]) sp += line(a - D[2], D[1]) + line(a + D[2], D[1]);
      else if (D[3]) sp += line(a, D[1], D[3]) + line(a, D[1], -D[3]);
      else sp += line(a, D[1], D[4]);
    }
    return `<svg class="thumb" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#0c0d0f"/><circle cx="32" cy="32" r="24.5" fill="#1a1c20" stroke="${hex}" stroke-width="3"/>
      <g stroke="${hex}" stroke-linecap="round">${sp}</g><circle cx="32" cy="32" r="8.5" fill="${hex}"/><circle cx="32" cy="32" r="3" fill="#0c0d0f"/>${design === 'beadlock' ? `<circle cx="32" cy="32" r="26" fill="none" stroke="${hex}" stroke-width="1.5" stroke-dasharray="1.5 3"/>` : ''}</svg>`;
  }

  function renderCatalog() {
    $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === S.tab));
    const wl = wheelRows(), tl = tireRows();
    $('#count-wheels').textContent = wl.count;
    $('#count-tires').textContent = tl.count;
    if (S.tab === 'wheels') { $('#filters').innerHTML = wl.filters; $('#list').innerHTML = wl.html; }
    else { $('#filters').innerHTML = tl.filters; $('#list').innerHTML = tl.html; }
  }

  const fitsToggle = () => `<label class="switch"><input type="checkbox" id="fits-only"${S.fitsOnly ? ' checked' : ''}><i></i>Only show what fits</label>`;

  function wheelRows() {
    const v = S.vehicle;
    const rows = allWheels().map(w => ({ w, st: F.wheelStatus(v, w, S.suspension) }));
    const fitting = rows.filter(r => r.st !== 'no');
    const pool = S.fitsOnly ? fitting : rows;
    const dias = [...new Set(pool.map(r => r.w.d))].sort((a, b) => a - b);
    if (S.wheelDia && !dias.includes(S.wheelDia)) S.wheelDia = null;
    const shown = pool.filter(r => !S.wheelDia || r.w.d === S.wheelDia);
    const groups = new Map();
    shown.forEach(r => { const k = r.w.brand + '|' + r.w.style; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    const html = [...groups.values()].map(g => {
      const w0 = g[0].w, sel = S.wheel && g.some(r => r.w.id === S.wheel.id);
      const fin = sel && S.finish ? S.finish : w0.finishes[0];
      const chips = g.sort((a, b) => a.w.d - b.w.d || a.w.w - b.w.w || b.w.et - a.w.et).map(r =>
        `<button class="size ${r.st}${S.wheel && S.wheel.id === r.w.id ? ' on' : ''}" data-wheel="${esc(r.w.id)}" title="${r.st === 'yes' ? 'Direct fit' : r.st === 'notes' ? 'Fits with notes' : 'Does not fit'} · ${esc(r.w.pcd)} · bore ${r.w.cb} mm">${r.w.d}×${r.w.w} <small>ET${r.w.et}</small></button>`).join('');
      return `<article class="item${sel ? ' sel' : ''}">
        <div class="item-h">${wheelThumb(w0.design, window.WHEEL_FINISHES[fin].color)}
          <div><h4>${esc(w0.style)}${w0.model ? ' <span class="badge real">Real 3D</span>' : ''}</h4><p>${esc(w0.brand)} · ${esc(w0.pcd === v.pcd ? F.pcdLabel(v.pcd) : 'other patterns')}${w0.load ? ` · ${w0.load.toLocaleString()} lb` : ''}</p>${w0.blurb ? `<p class="blurb">${esc(w0.blurb)}</p>` : ''}</div></div>
        <div class="finishes">${w0.finishes.map(f => `<button class="fin${f === fin ? ' on' : ''}" data-fin="${f}" data-style="${esc(w0.brand + '|' + w0.style)}" title="${esc(window.WHEEL_FINISHES[f].name)}" style="--c:#${window.WHEEL_FINISHES[f].color.toString(16).padStart(6, '0')}"></button>`).join('')}<span>${esc(window.WHEEL_FINISHES[fin].name)}</span></div>
        <div class="sizes">${chips}</div></article>`;
    }).join('') || `<div class="empty"><b>No wheels match.</b><p>${fitting.length ? 'Clear the diameter filter.' : `Nothing in inventory fits ${esc(F.pcdLabel(v.pcd))} on this vehicle. Turn off “Only show what fits” to see why, or add wheels under Inventory.`}</p></div>`;
    const filters = `<div class="chips"><button class="chip${!S.wheelDia ? ' on' : ''}" data-dia="">All sizes</button>${dias.map(d => `<button class="chip${S.wheelDia === d ? ' on' : ''}" data-dia="${d}">${d}"</button>`).join('')}</div>${fitsToggle()}`;
    return { html, filters, count: fitting.length };
  }

  function tireRows() {
    const v = S.vehicle, rim = targetRim(), w = effectiveWheel() || (() => { const o = oePk(); return { d: o.d, w: o.w, et: o.et, pcd: v.pcd, cb: v.cb }; })();
    let count = 0;
    const cards = [];
    allTires().forEach(model => {
      const sizes = model.sizes.map(s => F.parseTire(s)).filter(p => p && p.rim === rim)
        .map(p => ({ p, st: F.tireStatus(v, S.oeIndex, w.d === rim ? w : null, p, fitOpts(model)) }));
      const fit = sizes.filter(s => s.st !== 'no');
      count += fit.length ? 1 : 0;
      if (S.tireGroup !== 'all' && groupOf(model) !== S.tireGroup) return;
      const shown = S.fitsOnly ? fit : sizes;
      if (!shown.length) return;
      const sel = S.tireModel && S.tireModel.id === model.id;
      const meter = (k, label) => `<div class="meter"><span>${label}</span><i><b style="width:${model.ratings[k] * 10}%"></b></i><em>${model.ratings[k]}</em></div>`;
      const badges = [
        model.threePMS ? '<span class="badge snow" title="Three-Peak Mountain Snowflake: meets the severe-snow traction standard">❄ 3PMSF</span>' : '',
        model.utqg ? `<span class="badge" title="UTQG treadwear / traction / temperature">UTQG ${model.utqg.join(' ')}</span>` : '',
        model.warranty ? `<span class="badge">${model.warranty / 1000}k mi</span>` : '',
      ].join('');
      const chips = shown.sort((a, b) => a.p.dia - b.p.dia).map(s =>
        `<button class="size ${s.st}${sel && S.tire && S.tire.raw === s.p.raw ? ' on' : ''}" data-tire="${esc(model.id)}" data-size="${esc(s.p.raw)}" title="${F.round(s.p.dia)}&quot; overall">${esc(s.p.size)} <small>${s.p.li}${s.p.sr}${s.p.xl ? ' XL' : ''}${s.p.range ? ' ' + s.p.range : ''}</small></button>`).join('');
      const detail = sel ? `<div class="detail">
          <p class="blurb">${esc(model.blurb || '')}</p>
          <div class="meters full">${RATING_LABELS.map(([k, l]) => meter(k, l)).join('')}</div>
          ${model.utqg ? `<dl class="utqg"><div><dt>Treadwear ${model.utqg[0]}</dt><dd>Wears about ${F.round(model.utqg[0] / 100, 1)}× as long as the government reference tire.</dd></div>
            <div><dt>Traction ${model.utqg[1]}</dt><dd>${esc(window.UTQG_TRACTION[model.utqg[1]] || '')} Straight-line wet braking only.</dd></div>
            <div><dt>Temperature ${model.utqg[2]}</dt><dd>${esc(window.UTQG_TEMP[model.utqg[2]] || '')}</dd></div></dl>`
          : `<p class="muted small">No UTQG grades — ${model.tread === 'winter' ? 'winter tires' : 'LT-metric tires'} are exempt from the grading standard.</p>`}
          <p class="muted small">Bars are CWT guide scores (1–10) for comparing tire types. Edit them in js/data/tires.js.</p></div>` : '';
      cards.push(`<article class="item tire${sel ? ' sel' : ''}">
        <div class="item-h"><div class="tread ${model.tread}" aria-hidden="true"></div>
          <div><h4>${esc(model.brand)} ${esc(model.model)}${model.model3d ? ' <span class="badge real">Real 3D</span>' : ''}</h4><p>${esc(model.category)}</p><div class="badges">${badges}</div></div></div>
        ${sel ? '' : `<div class="meters">${meter('dry', 'Dry')}${meter('wet', 'Wet')}${meter('snow', 'Snow')}${groupOf(model) === 'offroad' ? meter('offroad', 'Off-road') : meter('life', 'Life')}</div>`}
        ${detail}<div class="sizes">${chips}</div></article>`);
    });
    const html = cards.join('') || `<div class="empty"><b>No ${rim}" tires match.</b><p>Try another category, turn off “Only show what fits”, or add tires under Inventory.</p></div>`;
    const filters = `<div class="chips">${TIRE_GROUPS.map(([k, l]) => `<button class="chip${S.tireGroup === k ? ' on' : ''}" data-group="${k}">${l}</button>`).join('')}</div>
      <div class="filter-note">Showing ${rim}" tires for ${S.wheel ? 'the selected wheel' : 'the factory wheel'}</div>${fitsToggle()}`;
    return { html, filters, count };
  }

  // ── Selection actions ────────────────────────────────────
  function selectWheel(id) {
    const w = allWheels().find(x => x.id === id);
    if (!w) return;
    if (S.wheel && S.wheel.id === id) { S.wheel = null; S.finish = null; }
    else {
      if (!S.wheel || S.wheel.style !== w.style || !w.finishes.includes(S.finish)) S.finish = w.finishes[0];
      S.wheel = w;
    }
    if (S.tire && S.tire.rim !== targetRim()) { toast(`Tire cleared — pick a ${targetRim()}" tire for this wheel.`); S.tire = null; S.tireModel = null; }
    refresh();
    if (viewer && S.wheel) viewer._idleAt = performance.now() + 4000;
  }
  function selectTire(id, size) {
    const model = allTires().find(t => t.id === id);
    if (!model) return;
    if (S.tire && S.tire.raw === size && S.tireModel.id === id) { S.tire = null; S.tireModel = null; }
    else { S.tire = F.parseTire(size); S.tireModel = model; }
    refresh();
  }

  // ── VIN decode (NHTSA vPIC — free, no key) ───────────────
  async function decodeVin(vin) {
    const dlg = $('#dlg-vin'), body = $('#vin-body'), go = $('#vin-go');
    go.hidden = true; body.textContent = 'Looking up ' + vin + '…';
    dlg.showModal();
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`);
      const d = (await res.json()).Results[0];
      if (!d.Make || !d.ModelYear) throw new Error('VIN not recognized');
      const year = +d.ModelYear, title = `${year} ${d.Make} ${d.Model}${d.Trim ? ' ' + d.Trim : ''}`;
      const hits = searchVehicles(`${year} ${d.Make} ${d.Model}`).filter(r => !r.miss);
      const facts = [['Drive', d.DriveType], ['Body', d.BodyClass], ['GVWR', d.GVWR], ['TPMS', d.TPMS], ['Factory wheel dia', d.WheelSizeFront && d.WheelSizeFront + '"']].filter(f => f[1]);
      body.innerHTML = `<p class="vin-title">${esc(title)}</p><dl class="specs">${facts.map(f => `<div><dt>${f[0]}</dt><dd>${esc(f[1])}</dd></div>`).join('')}</dl>` +
        (hits.length ? `<p>Matched to <b>${esc(vehName(hits[0].v, year))}</b> in the fitment database.</p>` : `<p>This vehicle isn't in the fitment database yet. Add it as a custom vehicle — the VIN details will be filled in for you.</p>`);
      go.hidden = false;
      go.textContent = hits.length ? 'Use this vehicle' : 'Add as custom vehicle';
      go.onclick = () => {
        dlg.close();
        if (hits.length) selectVehicle(hits[0].v, year);
        else openCustom({ year, make: d.Make, model: d.Model, tpms: /indirect/i.test(d.TPMS || '') ? 'indirect' : 'direct' });
      };
    } catch (e) {
      body.innerHTML = `<p>Couldn't decode that VIN (${esc(e.message)}). The lookup needs an internet connection — you can still search by year, make and model.</p>`;
    }
  }

  // ── Custom vehicle ───────────────────────────────────────
  function openCustom(pre) {
    const f = $('#form-custom'); f.reset();
    Object.entries(pre || {}).forEach(([k, v]) => { if (f.elements[k] && v !== '') f.elements[k].value = v; });
    $('#dlg-custom').showModal();
  }
  function saveCustom(e) {
    const f = e.target, d = Object.fromEntries(new FormData(f));
    const tire = F.parseTire(d.tire);
    if (!tire) { e.preventDefault(); toast('Tire size not recognized — use a format like 225/65R17.', 'bad'); return; }
    const dimsBy = { sedan: [2800, 4850, 1840, 1445], coupe: [2750, 4780, 1900, 1370], hatch: [2640, 4300, 1800, 1450], cuv: [2700, 4620, 1850, 1680], suv: [2900, 4950, 1950, 1780], truck: [3650, 5850, 2030, 1950], hdtruck: [3950, 6300, 2030, 2040], jeep: [3000, 4790, 1880, 1860] }[d.body];
    const pcd = d.pcd.toLowerCase();
    const v = {
      id: 'custom-' + Date.now(), make: d.make.trim(), model: d.model.trim(), years: [+d.year, +d.year], body: d.body,
      pcd, lugs: +pcd.split('x')[0], pcdMm: +pcd.split('x')[1], cb: +d.cb, thread: d.thread.trim(), fastener: d.fastener, torque: +d.torque, tpms: d.tpms,
      dims: { wheelbase: dimsBy[0], length: dimsBy[1], width: dimsBy[2], height: dimsBy[3] },
      minDia: +d.d, maxTireDia: F.BODY_CLASS[d.body] === 'truck' ? F.round(tire.dia * 1.045, 1) : null,
      oe: [{ trim: 'As entered', d: +d.d, w: +d.w, et: +d.et, tire: tire.size, li: +d.li, sr: d.sr.toUpperCase(), lt: tire.lt }],
      notes: ['Custom vehicle — specs were entered by hand. Minimum wheel diameter is assumed to be the factory diameter.'], aliases: [], flags: [], custom: true,
    };
    customVehicles.push(v); store.set('vehicles', customVehicles);
    selectVehicle(v, +d.year);
    toast(`${vehName(v, +d.year)} saved.`, 'good');
  }

  // ── Inventory ────────────────────────────────────────────
  function renderInventory() {
    const rows = custom.wheels.map((w, i) => `<tr><td>Wheel</td><td>${esc(w.brand)} ${esc(w.style)}</td><td>${wheelLabel(w)} · ${esc(w.pcd)} · bore ${w.cb}</td><td><button class="link" data-del="wheels:${i}">Remove</button></td></tr>`)
      .concat(custom.tires.map((t, i) => `<tr><td>Tire</td><td>${esc(t.brand)} ${esc(t.model)}</td><td>${t.sizes.map(esc).join(', ')}</td><td><button class="link" data-del="tires:${i}">Remove</button></td></tr>`));
    $('#inv-list').innerHTML = rows.length ? `<table class="compare inv"><thead><tr><th>Type</th><th>Item</th><th>Spec</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table>` : `<p class="muted">Nothing added yet. Built-in demo catalog: ${window.WHEELS.length} wheel SKUs, ${window.TIRES.length} tire lines.</p>`;
  }
  function saveInventory() { store.set('inventory', custom); renderInventory(); if (S.vehicle) refresh(); }
  function addWheel(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    custom.wheels.push({ id: 'cw-' + Date.now(), brand: d.brand.trim(), style: d.style.trim(), design: d.design, d: +d.d, w: +d.w, et: +d.et, pcd: d.pcd.toLowerCase(), cb: +d.cb, load: d.load ? +d.load : null, seat: 'conical 60°', finishes: [d.finish], blurb: 'Shop inventory' });
    e.target.reset(); saveInventory(); toast('Wheel added.', 'good');
  }
  function addTire(e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const p = F.parseTire(d.size);
    if (!p || !p.li || !p.sr) { toast('Enter the size with load index and speed rating, e.g. 235/45R18 98Y XL.', 'bad'); return; }
    const u = (d.utqg || '').trim().toUpperCase().match(/^(\d{2,3})\s+(AA|A|B|C)\s+(A|B|C)$/);
    const ex = custom.tires.find(t => t.brand.toLowerCase() === d.brand.trim().toLowerCase() && t.model.toLowerCase() === d.model.trim().toLowerCase());
    if (ex) ex.sizes.push(d.size.trim());
    else {
      const base = { touring: [7, 7, 5, 4, 2, 8, 8, 8], allweather: [7, 8, 7, 6, 2, 7, 7, 7], performance: [9, 8, 5, 3, 1, 7, 7, 6], summer: [10, 9, 1, 1, 1, 6, 6, 5], winter: [5, 7, 10, 9, 3, 7, 6, 4], highway: [7, 7, 5, 4, 4, 8, 8, 9], at: [7, 7, 7, 5, 8, 6, 6, 7], mt: [5, 5, 4, 2, 10, 4, 3, 6] }[d.tread];
      custom.tires.push({ id: 'ct-' + Date.now(), brand: d.brand.trim(), model: d.model.trim(), category: e.target.elements.tread.selectedOptions[0].textContent, tread: d.tread, utqg: u ? [+u[1], u[2], u[3]] : null, threePMS: !!d.threePMS, ms: d.tread !== 'summer', warranty: +d.warranty || 0,
        ratings: { dry: base[0], wet: base[1], snow: base[2], ice: base[3], offroad: base[4], comfort: base[5], quiet: base[6], life: base[7] }, blurb: 'Shop inventory — guide scores are category defaults.', sizes: [d.size.trim()] });
    }
    e.target.elements.size.value = ''; saveInventory(); toast('Tire added.', 'good');
  }

  // ── Tools ────────────────────────────────────────────────
  function dotDecode() {
    const v = $('#dot-in').value.trim(), out = $('#dot-out');
    if (!/^\d{4}$/.test(v)) { out.innerHTML = ''; return; }
    const wk = +v.slice(0, 2), yr = 2000 + +v.slice(2);
    if (wk < 1 || wk > 53) { out.innerHTML = '<div class="check fail"><i>✕</i><div><b>Not a valid code</b><p>The first two digits are the week (01–53).</p></div></div>'; return; }
    const made = new Date(yr, 0, 1 + (wk - 1) * 7), now = new Date();
    if (made > now) { out.innerHTML = '<div class="check fail"><i>✕</i><div><b>Date is in the future</b><p>Re-read the code — three-digit codes are pre-2000 tires and must be replaced.</p></div></div>'; return; }
    const age = (now - made) / (365.25 * 864e5);
    const st = age >= 10 ? 'fail' : age >= 6 ? 'warn' : 'pass';
    const msg = age >= 10 ? 'Ten years or older — replace regardless of tread depth.' : age >= 6 ? 'Six years or older — several vehicle and tire makers recommend replacement; inspect closely and advise the customer.' : 'Within normal service age.';
    out.innerHTML = `<div class="check ${st}"><i>${ICON[st]}</i><div><b>Built week ${wk}, ${yr} — ${F.round(age, 1)} years old</b><p>${msg}</p></div></div>`;
  }
  function awdCheck() {
    const vals = $$('.awd').map(i => parseFloat(i.value)), out = $('#awd-out');
    if (vals.some(isNaN)) { out.innerHTML = ''; return; }
    const diff = Math.max(...vals) - Math.min(...vals), circ = 2 * Math.PI * diff / 32;
    const st = circ > 0.25 ? (diff > 3 ? 'fail' : 'warn') : 'pass';
    const msg = st === 'pass' ? 'Within 1/4" of rolling circumference — fine for AWD, including Subaru.'
      : st === 'warn' ? 'Over the 1/4" circumference limit Subaru publishes. Many AWD systems tolerate 2/32–3/32", but check the maker\'s limit — replace as a set or shave the new tire to match.'
        : 'Too far apart for an AWD driveline — replace all four, or shave new tires to match the worn ones.';
    out.innerHTML = `<div class="check ${st}"><i>${ICON[st]}</i><div><b>${F.round(diff, 1)}/32" spread = ${F.round(circ, 2)}" circumference difference</b><p>${msg}</p></div></div>`;
  }

  // ── Print sheet ──────────────────────────────────────────
  function printSheet() {
    const v = S.vehicle, r = report(), o = oePk(), w = effectiveWheel();
    const img = viewer ? viewer.snapshot() : '';
    const vd = r ? VERDICT[r.verdict][0] : 'Factory setup';
    const rows = r ? r.checks.map(c => `<tr class="${c.status}"><td>${{ pass: 'OK', note: 'NOTE', warn: 'CHECK', fail: 'FAIL' }[c.status]}</td><td><b>${esc(c.title)}</b> — ${esc(c.detail)}</td></tr>`).join('') : '';
    $('#print-sheet').innerHTML = `
      <header><div><h1>CWT Fitment Sheet</h1><p>${new Date().toLocaleDateString()} · ${esc(vehName(v, S.year))} · ${esc(o.trim)}</p></div><div class="pv ${r ? r.verdict : 'oe'}">${vd}</div></header>
      ${img ? `<img src="${img}" alt="">` : ''}
      <table class="pt"><tr><th>Vehicle</th><td>${esc(F.pcdLabel(v.pcd))} · hub ${v.cb} mm · ${esc(v.thread)} · ${v.torque} lb-ft · TPMS ${v.tpms}</td></tr>
        <tr><th>Factory</th><td>${o.d}×${o.w} ET${o.et} · ${esc(o.tire)} ${o.li}${o.sr}</td></tr>
        <tr><th>Wheel</th><td>${S.wheel ? `${esc(S.wheel.brand)} ${esc(S.wheel.style)} ${wheelLabel(S.wheel)} · ${esc(S.wheel.pcd)} · bore ${S.wheel.cb} mm · ${esc(window.WHEEL_FINISHES[S.finish || S.wheel.finishes[0]].name)}` : w ? 'Factory wheel' : '—'}</td></tr>
        <tr><th>Tire</th><td>${S.tire ? `${esc(S.tireModel.brand)} ${esc(S.tireModel.model)} ${esc(S.tire.raw)} · ${F.round(S.tire.dia)}" overall (${sign(r.metrics.diaPct)}%) · speedometer 60 = ${F.round(r.metrics.speedoAt60)} mph actual` : '—'}</td></tr>
        <tr><th>Suspension</th><td>${F.SUSPENSION[S.suspension].label}</td></tr></table>
      ${rows ? `<h2>Fitment checks</h2><table class="pc">${rows}</table>` : ''}
      <h2>Install</h2><ul>${(r && r.hardware.length ? r.hardware : [`Torque to ${v.torque} lb-ft in a star pattern; re-torque after 50–100 miles`]).map(h => `<li>${esc(h)}</li>`).join('')}</ul>
      ${v.flags.length ? `<h2>Confirm before ordering</h2><ul>${v.flags.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      <footer><p>Fitment guidance only. Confirm against the vehicle's door-jamb placard and test-fit one wheel before mounting tires.</p><div class="sig"><span>Customer</span><span>Technician</span><span>Re-torque due</span></div></footer>`;
    window.print();
  }

  // ── Wiring ───────────────────────────────────────────────
  function init() {
    // paint
    $('#paint-swatches').innerHTML = PAINTS.map(p => `<button class="sw" data-hex="${p[1]}" data-fin="${p[2]}" data-name="${p[0]}" title="${p[0]}" style="--c:${p[1]}"></button>`).join('');
    const applyPaint = () => {
      if (viewer) viewer.setPaint(S.paint.hex, S.paint.finish);
      $('#paint-name').textContent = S.paint.name || S.paint.hex.toUpperCase();
      $('#paint-custom').value = S.paint.hex;
      $$('#paint-swatches .sw').forEach(b => b.classList.toggle('on', b.dataset.hex === S.paint.hex));
      $$('#paint-finish button').forEach(b => b.classList.toggle('on', b.dataset.f === S.paint.finish));
      store.set('paint', S.paint);
    };
    $('#paint-swatches').addEventListener('click', e => { const b = e.target.closest('.sw'); if (!b) return; S.paint = { hex: b.dataset.hex, finish: b.dataset.fin, name: b.dataset.name }; applyPaint(); });
    $('#paint-custom').addEventListener('input', e => { S.paint = { hex: e.target.value, finish: S.paint.finish, name: 'Custom ' + e.target.value.toUpperCase() }; applyPaint(); });
    $('#paint-finish').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.paint.finish = b.dataset.f; applyPaint(); });

    // 3D
    try { viewer = new window.CWTViewer($('#viewport')); window.cwtViewer = viewer; viewer.onModel = renderModelNote; }
    catch (err) { console.error(err); $('#nogl').hidden = false; $('#hint').hidden = true; }
    applyPaint();

    // search
    const q = $('#q'), box = $('#results');
    q.addEventListener('input', renderResults);
    q.addEventListener('focus', renderResults);
    q.addEventListener('keydown', e => {
      const items = $$('.res', box), cur = items.findIndex(i => i.classList.contains('kb'));
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; items.forEach(i => i.classList.remove('kb')); items[(cur + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].classList.add('kb'); }
      else if (e.key === 'Enter' && items.length) pickResult(items[Math.max(cur, 0)]);
      else if (e.key === 'Escape') { box.hidden = true; q.blur(); }
    });
    box.addEventListener('click', e => { const b = e.target.closest('.res'); if (b) pickResult(b); });
    document.addEventListener('click', e => { if (!e.target.closest('#search')) box.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); q.focus(); } });

    // vehicle controls
    $('#sel-year').addEventListener('change', e => { S.year = +e.target.value; $('#veh-name').textContent = vehName(S.vehicle, S.year); });
    $('#sel-oe').addEventListener('change', e => {
      S.oeIndex = +e.target.value;
      if (S.tire && S.tire.rim !== targetRim()) { S.tire = null; S.tireModel = null; }
      renderVehicle(); rebuildBody(); refresh();
    });
    $('#sel-susp').addEventListener('change', e => { S.suspension = e.target.value; refresh(); });

    // stage controls
    $('#views').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !viewer) return; $$('#views button').forEach(x => x.classList.toggle('on', x === b)); viewer.setView(b.dataset.view); });
    $('#btn-rotate').addEventListener('click', e => { const on = e.currentTarget.classList.toggle('on'); if (viewer) viewer.setAutoRotate(on); });
    $('#btn-env').addEventListener('click', e => { const on = e.currentTarget.classList.toggle('on'); if (viewer) viewer.setEnvironment(on ? 'night' : 'studio'); });
    $('#btn-reset').addEventListener('click', () => { S.wheel = null; S.finish = null; S.tire = null; S.tireModel = null; refresh(); });
    $('#viewport').addEventListener('pointerdown', () => { $('#hint').classList.add('gone'); }, { once: true });

    // catalog
    $$('.tab').forEach(t => t.addEventListener('click', () => { S.tab = t.dataset.tab; renderCatalog(); $('#list').scrollTop = 0; }));
    $('#filters').addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (!c) return;
      if ('dia' in c.dataset) S.wheelDia = c.dataset.dia ? +c.dataset.dia : null;
      if ('group' in c.dataset) S.tireGroup = c.dataset.group;
      renderCatalog();
    });
    $('#filters').addEventListener('change', e => { if (e.target.id === 'fits-only') { S.fitsOnly = e.target.checked; renderCatalog(); } });
    $('#list').addEventListener('click', e => {
      const sz = e.target.closest('.size'), fin = e.target.closest('.fin');
      if (sz && sz.dataset.wheel) selectWheel(sz.dataset.wheel);
      else if (sz && sz.dataset.tire) selectTire(sz.dataset.tire, sz.dataset.size);
      else if (fin) {
        const [brand, style] = fin.dataset.style.split('|');
        if (S.wheel && S.wheel.brand === brand && S.wheel.style === style) { S.finish = fin.dataset.fin; refresh(); }
        else {
          const first = $$('.size', fin.closest('.item')).find(b => !b.classList.contains('no')) || $('.size', fin.closest('.item'));
          if (first) { selectWheel(first.dataset.wheel); S.finish = fin.dataset.fin; refresh(); }
        }
      }
    });

    // dialogs
    $$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
    $('#btn-custom').addEventListener('click', () => openCustom({}));
    $('#form-custom').addEventListener('submit', saveCustom);
    $('#btn-inventory').addEventListener('click', () => { renderInventory(); $('#dlg-inventory').showModal(); });
    $('#inv-finish').innerHTML = Object.entries(window.WHEEL_FINISHES).map(([k, f]) => `<option value="${k}">${f.name}</option>`).join('');
    $('#form-wheel').addEventListener('submit', addWheel);
    $('#form-tire').addEventListener('submit', addTire);
    $('#inv-list').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; const [k, i] = b.dataset.del.split(':'); custom[k].splice(+i, 1); saveInventory(); });
    $('#inv-export').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ inventory: custom, vehicles: customVehicles }, null, 2)], { type: 'application/json' }));
      a.download = 'cwt-inventory.json'; a.click(); URL.revokeObjectURL(a.href);
    });
    $('#inv-import').addEventListener('change', async e => {
      try {
        const d = JSON.parse(await e.target.files[0].text());
        (d.inventory && d.inventory.wheels || []).forEach(w => custom.wheels.push(w));
        (d.inventory && d.inventory.tires || []).forEach(t => custom.tires.push(t));
        (d.vehicles || []).forEach(v => customVehicles.push(v));
        store.set('vehicles', customVehicles); saveInventory(); toast('Inventory imported.', 'good');
      } catch (err) { toast('That file is not a CWT inventory export.', 'bad'); }
      e.target.value = '';
    });
    $('#btn-tools').addEventListener('click', () => $('#dlg-tools').showModal());
    $('#dot-in').addEventListener('input', dotDecode);
    $$('.awd').forEach(i => i.addEventListener('input', awdCheck));
    $('#btn-print').addEventListener('click', printSheet);

    // start on the last vehicle used, or a popular default
    // A link with #v=… reopens an exact build (the address bar always holds the current one).
    const h = new URLSearchParams(location.hash.slice(1));
    const linked = h.get('v') && allVehicles().find(x => x.id === h.get('v'));
    const last = store.get('last', null);
    const v = linked || (last && allVehicles().find(x => x.id === last.id)) || window.VEHICLES.find(x => x.id === 'tacoma-16');
    if (linked) {
      selectVehicle(v, +h.get('y') || null, { oeIndex: +h.get('oe') || 0 });
      if (F.SUSPENSION[h.get('s')]) { S.suspension = h.get('s'); renderVehicle(); }
      const w = h.get('w') && allWheels().find(x => x.id === h.get('w'));
      if (w) { S.wheel = w; S.finish = w.finishes.includes(h.get('f')) ? h.get('f') : w.finishes[0]; }
      const tm = h.get('t') && allTires().find(x => x.id === h.get('t'));
      const tp = tm && F.parseTire(h.get('ts') || '');
      if (tp && tp.rim === targetRim()) { S.tire = tp; S.tireModel = tm; }
      if (h.get('tab') === 'tires') S.tab = 'tires';
      refresh();
      if (viewer && h.get('view')) { viewer.setView(h.get('view')); $$('#views button').forEach(x => x.classList.toggle('on', x.dataset.view === h.get('view'))); Object.assign(viewer.orbit, { theta: viewer.goal.theta, phi: viewer.goal.phi, radius: viewer.goal.radius }); viewer.orbit.target.copy(viewer.goal.target); }
    } else {
      selectVehicle(v, last && last.year, last || null);
      if (!last) toast('Type a vehicle in the search bar to begin.');
    }
  }

  window.CWT = { state: S, selectVehicle, selectWheel, selectTire, refresh, report, allVehicles, allWheels, allTires };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
