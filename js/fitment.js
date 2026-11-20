/* CWT fitment engine — pure functions, no DOM. Runs in the browser and in Node (tests). */
(function (root) {
  const IN = 25.4;

  // ── Reference tables ─────────────────────────────────────
  // Load index → max load (kg), per the standard load index table.
  const LOAD_KG = {
    60: 250, 61: 257, 62: 265, 63: 272, 64: 280, 65: 290, 66: 300, 67: 307, 68: 315, 69: 325,
    70: 335, 71: 345, 72: 355, 73: 365, 74: 375, 75: 387, 76: 400, 77: 412, 78: 425, 79: 437,
    80: 450, 81: 462, 82: 475, 83: 487, 84: 500, 85: 515, 86: 530, 87: 545, 88: 560, 89: 580,
    90: 600, 91: 615, 92: 630, 93: 650, 94: 670, 95: 690, 96: 710, 97: 730, 98: 750, 99: 775,
    100: 800, 101: 825, 102: 850, 103: 875, 104: 900, 105: 925, 106: 950, 107: 975, 108: 1000, 109: 1030,
    110: 1060, 111: 1090, 112: 1120, 113: 1150, 114: 1180, 115: 1215, 116: 1250, 117: 1285, 118: 1320, 119: 1360,
    120: 1400, 121: 1450, 122: 1500, 123: 1550, 124: 1600, 125: 1650, 126: 1700, 127: 1750, 128: 1800, 129: 1850, 130: 1900,
  };
  const SPEED_ORDER = ['L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'H', 'V', 'W', 'Y'];
  const SPEED_MPH = { L: 75, M: 81, N: 87, P: 93, Q: 99, R: 106, S: 112, T: 118, U: 124, H: 130, V: 149, W: 168, Y: 186 };
  const IMPERIAL_PCD = { 114.3: '4.5"', 127: '5"', 139.7: '5.5"', 165.1: '6.5"', 120.65: '4.75"' };

  const loadLbs = li => (LOAD_KG[li] ? Math.round(LOAD_KG[li] * 2.20462) : null);
  const speedRank = sr => SPEED_ORDER.indexOf(String(sr || '').toUpperCase().replace('Z', 'W'));
  const round = (n, p = 1) => { const m = Math.pow(10, p); return Math.round(n * m) / m; };
  const half = n => Math.round(n * 2) / 2;

  // ── Tire size parsing ────────────────────────────────────
  // Accepts "225/65R17", "P265/70R17 115T", "LT285/70R17 121/118S E", "235/45ZR18 98Y XL", "35x12.50R17LT 121Q E".
  function parseTire(str, li, sr) {
    if (!str) return null;
    const s = String(str).trim().toUpperCase();
    let t = null;
    let m = s.match(/^(LT|P)?\s*(\d{3})\/(\d{2})\s*Z?R?F?\s*(\d{2}(?:\.5)?)\s*(LT)?/);
    if (m) {
      const sw = +m[2], ar = +m[3], rim = +m[4];
      t = { lt: m[1] === 'LT' || !!m[5], flotation: false, sw, ar, rim, dia: rim + (2 * sw * ar / 100) / IN };
    } else {
      m = s.match(/^(\d{2}(?:\.\d+)?)\s*X\s*(\d{1,2}(?:\.\d+)?)\s*R\s*(\d{2})\s*(LT)?/);
      if (!m) return null;
      const dia = +m[1], swIn = +m[2], rim = +m[3];
      t = { lt: true, flotation: true, sw: Math.round(swIn * IN), ar: Math.round(((dia - rim) / 2) / swIn * 100), rim, dia };
    }
    const rest = s.slice(m[0].length);
    const svc = rest.match(/(\d{2,3})(?:\/(\d{2,3}))?\s*([HL-Y])\b/);
    t.li = li != null ? li : (svc ? +svc[1] : null);
    t.sr = sr != null ? sr : (svc ? svc[3] : null);
    t.xl = /\b(XL|RF|HL)\b/.test(rest);
    const lr = rest.match(/\b([C-F])\s*$/);
    t.range = t.lt && lr ? lr[1] : null;
    t.size = s.slice(0, m[0].length).replace(/\s+/g, '');
    t.raw = str;
    t.sidewall = (t.dia - t.rim) / 2 * IN;      // mm
    t.circ = Math.PI * t.dia;                   // in
    t.revsPerMile = 63360 / t.circ * 1.03;      // ≈3% loaded-radius correction
    return t;
  }

  // Approved rim width range (in). Approximation of the T&RA / ETRTO tables by aspect ratio —
  // good to ±0.5", always confirm against the tire maker's spec sheet for edge cases.
  function rimRange(t) {
    const swIn = t.sw / IN;
    if (t.flotation) return { min: half(swIn * 0.68), max: half(swIn * 0.88), measuring: half(swIn * 0.78) };
    const ar = t.ar;
    // [measuring-rim factor, inches below, inches above]
    const [f, lo, hi] = ar >= 75 ? [0.70, 0.5, 1] : ar >= 70 ? [0.75, 1, 1] : ar >= 60 ? [0.75, 0.5, 1.5]
      : ar >= 55 ? [0.80, 1, 1] : ar >= 50 ? [0.82, 1, 1] : ar >= 45 ? [0.85, 0.5, 1] : [0.90, 0.5, 1];
    const measuring = half(swIn * f);
    return { min: measuring - lo, max: measuring + hi, measuring };
  }

  // Section width actually changes with rim width: ~0.2" per 0.5" of rim (40%).
  function mountedSection(t, wheelW) {
    const meas = rimRange(t).measuring;
    return t.sw + (wheelW - meas) * IN * 0.4;
  }

  // ── Geometry helpers ─────────────────────────────────────
  // Distances (mm) from the hub mounting face to the inner / outer edge of the package.
  function envelope(w, et, tire) {
    const wheelHalf = (w * IN) / 2 + 12;                 // +12 mm ≈ rim flange each side
    const tireHalf = tire ? mountedSection(tire, w) / 2 : 0;
    const h = Math.max(wheelHalf, tireHalf);
    return { inner: h + et, outer: h - et, half: h };
  }

  function oePackages(vehicle) {
    return vehicle.oe.map(o => {
      const tire = parseTire(o.tire, o.li, o.sr);
      if (o.lt) tire.lt = true;
      return Object.assign({}, o, { tireObj: tire, env: envelope(o.w, o.et, tire) });
    });
  }

  const BODY_CLASS = { sedan: 'car', coupe: 'car', hatch: 'car', cuv: 'car', suv: 'car', truck: 'truck', jeep: 'truck', hdtruck: 'truck' };
  // Body-on-frame SUVs (4Runner, Tahoe) carry a maxTireDia and get truck clearances.
  const isTruck = v => BODY_CLASS[v.body] === 'truck' || v.maxTireDia != null;

  const SUSPENSION = {
    stock:   { label: 'Stock height', lift: 0, tireAdd: 0, pokeAdj: 0 },
    lowered: { label: 'Lowered ~1.5"', lift: -1.5, tireAdd: -0.4, pokeAdj: -7 },
    level:   { label: 'Leveling kit (~2")', lift: 2, tireAdd: 1.2, pokeAdj: 0 },
    lift4:   { label: 'Lift kit 3–4"', lift: 3.5, tireAdd: 2.2, pokeAdj: 0 },
    lift6:   { label: 'Lift kit 6"', lift: 6, tireAdd: 3.6, pokeAdj: 0 },
  };
  function suspensionOptions(vehicle) {
    if (isTruck(vehicle)) return ['stock', 'level', 'lift4', 'lift6'];
    return vehicle.body === 'suv' || vehicle.body === 'cuv' ? ['stock'] : ['stock', 'lowered'];
  }

  function clearanceLimits(vehicle, susp) {
    const truck = isTruck(vehicle);
    const adj = (SUSPENSION[susp] || SUSPENSION.stock).pokeAdj;
    return truck
      ? { innerOk: 12, innerWarn: 22, outerOk: 25, outerWarn: 75 }
      : { innerOk: 6, innerWarn: 14, outerOk: 18 + adj, outerWarn: 30 + adj };
  }

  function maxTireDia(vehicle, susp) {
    const pk = oePackages(vehicle);
    const base = vehicle.maxTireDia || Math.max(...pk.map(p => p.tireObj.dia)) * 1.03;
    return base + (SUSPENSION[susp] || SUSPENSION.stock).tireAdd;
  }

  function pcdLabel(pcd) {
    const [l, d] = pcd.split('x');
    return IMPERIAL_PCD[+d] ? `${pcd} (${l}x${IMPERIAL_PCD[+d]})` : pcd;
  }

  // ── Checks ───────────────────────────────────────────────
  const C = (id, group, status, title, detail) => ({ id, group, status, title, detail });

  function wheelChecks(vehicle, wheel, opts) {
    const out = [];
    const o = opts || {};
    const pk = oePackages(vehicle);
    const [wl, wp] = wheel.pcd.split('x').map(Number);

    // Bolt pattern
    if (wl === vehicle.lugs && Math.abs(wp - vehicle.pcdMm) < 0.2) {
      out.push(C('pcd', 'wheel', 'pass', 'Bolt pattern', `${pcdLabel(wheel.pcd)} matches the vehicle.`));
    } else if (wl === vehicle.lugs && Math.abs(wp - vehicle.pcdMm) < 1.5) {
      out.push(C('pcd', 'wheel', 'fail', 'Bolt pattern', `Wheel is ${wheel.pcd}, vehicle is ${vehicle.pcd}. These are close but NOT interchangeable — studs will be side-loaded and can fail.`));
    } else {
      out.push(C('pcd', 'wheel', 'fail', 'Bolt pattern', `Wheel is ${pcdLabel(wheel.pcd)}, vehicle needs ${pcdLabel(vehicle.pcd)}.`));
    }

    // Center bore
    const dcb = wheel.cb - vehicle.cb;
    if (dcb < -0.15) {
      out.push(C('cb', 'wheel', 'fail', 'Center bore', `Wheel bore ${wheel.cb} mm is smaller than the ${vehicle.cb} mm hub — the wheel will not seat on the hub.`));
    } else if (dcb <= 0.15) {
      out.push(C('cb', 'wheel', 'pass', 'Center bore', `${wheel.cb} mm — hub-centric, direct fit on the ${vehicle.cb} mm hub.`));
    } else {
      out.push(C('cb', 'wheel', 'note', 'Center bore', `Wheel bore ${wheel.cb} mm is larger than the ${vehicle.cb} mm hub. Install hub-centric rings (${wheel.cb} → ${vehicle.cb} mm) to prevent vibration.`));
    }

    // Brake clearance (diameter)
    if (wheel.d < vehicle.minDia) {
      out.push(C('brake', 'wheel', 'fail', 'Brake clearance', `${wheel.d}" wheel is smaller than the ${vehicle.minDia}" minimum that clears the factory brakes.`));
    } else if (wheel.d === vehicle.minDia && pk.some(p => p.d > wheel.d)) {
      out.push(C('brake', 'wheel', 'note', 'Brake clearance', `${wheel.d}" is the smallest diameter for this vehicle. Fine on base brakes — test-fit if the customer's trim came with larger wheels or a brake package.`));
    } else {
      out.push(C('brake', 'wheel', 'pass', 'Brake clearance', `${wheel.d}" diameter clears the factory brakes (minimum ${vehicle.minDia}").`));
    }

    // Load rating (approximate: compares to OE tire capacity since GAWR isn't in the database)
    if (wheel.load) {
      const truck = isTruck(vehicle) || vehicle.body === 'suv';
      const need = Math.max(...pk.map(p => (loadLbs(p.li) || 0) / (truck && !p.tireObj.lt ? 1.1 : 1)));
      if (wheel.load < need * 0.70) {
        out.push(C('wload', 'wheel', 'fail', 'Wheel load rating', `Wheel is rated ${wheel.load.toLocaleString()} lb; this vehicle needs roughly ${Math.round(need * 0.82).toLocaleString()} lb per wheel or more.`));
      } else if (wheel.load < need * 0.82) {
        out.push(C('wload', 'wheel', 'warn', 'Wheel load rating', `Wheel is rated ${wheel.load.toLocaleString()} lb — marginal. Confirm it meets half the heaviest axle rating (GAWR ÷ 2) on the door-jamb placard.`));
      } else {
        out.push(C('wload', 'wheel', 'pass', 'Wheel load rating', `${wheel.load.toLocaleString()} lb per wheel is adequate for this vehicle.`));
      }
    }

    // Offset / width position (wheel alone if no tire chosen yet)
    if (!o.skipPosition) out.push(...positionChecks(vehicle, wheel, null, o.suspension));
    return out;
  }

  function positionChecks(vehicle, wheel, tire, susp) {
    const out = [];
    const pk = oePackages(vehicle);
    const lim = clearanceLimits(vehicle, susp);
    const refInner = Math.max(...pk.map(p => p.env.inner));
    const refOuter = Math.max(...pk.map(p => p.env.outer));
    const env = envelope(wheel.w, wheel.et, tire);
    const dIn = round(env.inner - refInner, 0), dOut = round(env.outer - refOuter, 0);
    const what = tire ? 'wheel and tire' : 'wheel';

    if (dIn > lim.innerWarn) {
      out.push(C('inner', 'combo', 'fail', 'Inner clearance', `The ${what} sits ${dIn} mm closer to the suspension than the largest factory setup — expect contact with the strut, control arm or frame.`));
    } else if (dIn > lim.innerOk) {
      out.push(C('inner', 'combo', 'warn', 'Inner clearance', `${dIn} mm closer to the suspension than factory. Test-fit and check strut / upper control arm clearance at full lock.`));
    } else {
      out.push(C('inner', 'combo', 'pass', 'Inner clearance', dIn > 0 ? `${dIn} mm closer to the suspension than factory — within normal tolerance.` : `${Math.abs(dIn)} mm more inner clearance than the largest factory setup.`));
    }

    if (dOut > lim.outerWarn) {
      out.push(C('outer', 'combo', 'fail', 'Fender clearance', `The ${what} sticks out ${dOut} mm past the widest factory setup — it will poke past the fender and rub without body modification.`));
    } else if (dOut > lim.outerOk) {
      out.push(C('outer', 'combo', 'warn', 'Fender clearance', `Sits ${dOut} mm further out than factory. ${isTruck(vehicle) ? 'Expect visible poke; may rub the fender liner or body mount at full lock, and may need mud flaps to stay legal.' : 'May rub the fender lip over bumps — fender roll or camber may be needed.'}`));
    } else {
      out.push(C('outer', 'combo', 'pass', 'Fender clearance', dOut > 0 ? `${dOut} mm further out than factory — sits flush, within tolerance.` : `Tucks ${Math.abs(dOut)} mm inside the widest factory setup.`));
    }
    return { list: out, dIn, dOut }.list.map(c => Object.assign(c, { dIn, dOut }));
  }

  function tireChecks(vehicle, oeIndex, wheel, tire, opts) {
    const out = [];
    const o = opts || {};
    const pk = oePackages(vehicle);
    const oe = pk[oeIndex] || pk[0];
    const truck = isTruck(vehicle);

    // Rim diameter
    if (wheel) {
      if (tire.rim !== wheel.d) {
        out.push(C('rimdia', 'tire', 'fail', 'Tire / wheel diameter', `A ${tire.rim}" tire cannot be mounted on a ${wheel.d}" wheel.`));
        return out;
      }
      const rr = rimRange(tire);
      // The range is an estimate good to ±0.5", so only a miss of more than 0.5" is a hard fail.
      const miss = Math.max(rr.min - wheel.w, wheel.w - rr.max);
      if (miss > 0.5) {
        out.push(C('rimw', 'tire', 'fail', 'Rim width approval', `${tire.size} is approved for roughly ${rr.min}–${rr.max}" wide rims; this wheel is ${wheel.w}". ${wheel.w > rr.max ? 'The tire would be stretched — bead retention is compromised.' : 'The tire would be pinched — uneven wear and poor handling.'}`));
      } else if (miss > 0) {
        out.push(C('rimw', 'tire', 'warn', 'Rim width approval', `${wheel.w}" is just outside the typical ${rr.min}–${rr.max}" approved range for ${tire.size}. Only install if the tire maker's spec sheet lists ${wheel.w}" for this exact tire.`));
      } else if (miss === 0) {
        out.push(C('rimw', 'tire', 'note', 'Rim width approval', `${wheel.w}" is at the edge of the typical ${rr.min}–${rr.max}" approved range for ${tire.size}. Confirm on the tire maker's spec sheet.`));
      } else {
        out.push(C('rimw', 'tire', 'pass', 'Rim width approval', `${wheel.w}" wheel is inside the approved ${rr.min}–${rr.max}" range for ${tire.size}.`));
      }
    }

    // Overall diameter
    const pct = (tire.dia / oe.tireObj.dia - 1) * 100;
    const maxDia = maxTireDia(vehicle, o.suspension);
    const diaTxt = `${round(tire.dia)}" vs ${round(oe.tireObj.dia)}" factory (${pct >= 0 ? '+' : ''}${round(pct)}%)`;
    if (tire.dia > maxDia + 0.05) {
      out.push(C('dia', 'tire', 'fail', 'Overall diameter', `${diaTxt}. Largest that fits at ${(SUSPENSION[o.suspension] || SUSPENSION.stock).label.toLowerCase()} is about ${round(maxDia)}" — needs ${truck ? 'a lift / leveling kit or trimming' : 'a smaller tire'}.`));
    } else if (pct < -5) {
      out.push(C('dia', 'tire', 'fail', 'Overall diameter', `${diaTxt}. More than 5% smaller than factory — speedometer, ABS / stability control and ground clearance are all affected.`));
    } else if (Math.abs(pct) > 3) {
      out.push(C('dia', 'tire', 'warn', 'Overall diameter', `${diaTxt}. Outside the ±3% rule — speedometer will read ${pct > 0 ? 'low' : 'high'}; recalibrate if possible and check ABS / traction control behaviour.`));
    } else {
      out.push(C('dia', 'tire', 'pass', 'Overall diameter', `${diaTxt}. Inside the ±3% rule.`));
    }

    // Load index
    const needLi = oe.li;
    const hd = vehicle.body === 'hdtruck';
    if (tire.li == null) {
      out.push(C('li', 'tire', 'warn', 'Load index', `No load index on file for this tire — factory requires ${needLi} (${loadLbs(needLi)} lb).`));
    } else if (hd && !tire.lt) {
      out.push(C('li', 'tire', 'fail', 'Load index', `Heavy-duty truck requires LT (Load Range E) tires. This is a passenger-construction tire.`));
    } else if (tire.lt && !oe.tireObj.lt) {
      // LT tire replacing P-metric: capacity at equal pressure is lower, so pressure must go up.
      if (tire.li < needLi) out.push(C('li', 'tire', 'fail', 'Load index', `LT tire load index ${tire.li} is below the factory ${needLi} even at maximum pressure.`));
      else out.push(C('li', 'tire', 'note', 'Load index', `${tire.li} (${loadLbs(tire.li)} lb at max pressure) covers the factory ${needLi}. LT tires replacing P-metric need higher inflation than the door placard — set pressure from the LT load/inflation table.`));
    } else if (!tire.lt && oe.tireObj.lt) {
      // P-metric replacing LT on a light truck: sidewall load is derated by 1.1.
      const derated = Math.round(loadLbs(tire.li) / 1.1);
      if (tire.li < needLi) out.push(C('li', 'tire', 'fail', 'Load index', `${tire.li} (${loadLbs(tire.li)} lb) is below the factory LT tire's ${needLi} (${loadLbs(needLi)} lb).`));
      else if (derated < loadLbs(needLi)) out.push(C('li', 'tire', 'warn', 'Load index', `Passenger-construction tire replacing a factory LT tire: its ${loadLbs(tire.li)} lb rating is derated ÷1.1 on a truck to ${derated} lb, below the factory tire's ${loadLbs(needLi)} lb. Confirm it still covers half the axle rating (GAWR ÷ 2) on the door placard — not for towing / heavy loads.`));
      else out.push(C('li', 'tire', 'pass', 'Load index', `${tire.li} (${derated} lb after the ÷1.1 truck derate) covers the factory ${needLi} (${loadLbs(needLi)} lb).`));
    } else if (tire.li < needLi && tire.li >= Math.min(...pk.filter(p => p.tireObj.lt === oe.tireObj.lt).map(p => p.li))) {
      // Below this trim's tire, but the manufacturer fits this load index on another trim of the same model.
      out.push(C('li', 'tire', 'warn', 'Load index', `${tire.li} (${loadLbs(tire.li)} lb) is below this trim's factory ${needLi} (${loadLbs(needLi)} lb), though the manufacturer fits ${tire.li}-rated tires on other trims. Only install if it meets the load on this vehicle's door placard.`));
    } else if (tire.li < needLi) {
      out.push(C('li', 'tire', 'fail', 'Load index', `${tire.li} (${loadLbs(tire.li)} lb) is below the factory ${needLi} (${loadLbs(needLi)} lb). Never install a lower load index than original equipment.`));
    } else {
      out.push(C('li', 'tire', 'pass', 'Load index', `${tire.li}${tire.xl ? ' XL' : ''}${tire.range ? ' Load Range ' + tire.range : ''} (${loadLbs(tire.li)} lb) meets the factory ${needLi} (${loadLbs(needLi)} lb).`));
    }

    // Speed rating
    const have = speedRank(tire.sr), need = speedRank(oe.sr);
    if (tire.sr == null || have < 0) {
      out.push(C('sr', 'tire', 'warn', 'Speed rating', `No speed rating on file — factory is ${oe.sr} (${SPEED_MPH[oe.sr]} mph).`));
    } else if (have >= need) {
      out.push(C('sr', 'tire', 'pass', 'Speed rating', `${tire.sr} (${SPEED_MPH[tire.sr]} mph) meets or exceeds the factory ${oe.sr} (${SPEED_MPH[oe.sr]} mph).`));
    } else if (o.winter) {
      out.push(C('sr', 'tire', 'note', 'Speed rating', `${tire.sr} (${SPEED_MPH[tire.sr]} mph) is below factory ${oe.sr}. Accepted practice for dedicated winter tires — advise the customer the vehicle's top speed is limited to the tire's rating.`));
    } else {
      out.push(C('sr', 'tire', 'warn', 'Speed rating', `${tire.sr} (${SPEED_MPH[tire.sr]} mph) is lower than the factory ${oe.sr} (${SPEED_MPH[oe.sr]} mph). Handling response is reduced and top speed is limited to the tire's rating — get customer sign-off.`));
    }

    if (wheel) out.push(...positionChecks(vehicle, wheel, tire, o.suspension));
    return out;
  }

  const WORST = { pass: 0, note: 0, warn: 1, fail: 2 };
  const verdictOf = checks => ['yes', 'notes', 'no'][Math.max(0, ...checks.map(c => WORST[c.status]))];

  // Full report for a wheel (+ optional tire) on a vehicle.
  function checkFitment(vehicle, oeIndex, wheel, tire, opts) {
    const o = opts || {};
    const pk = oePackages(vehicle);
    const oe = pk[oeIndex] || pk[0];
    let checks = [];
    if (wheel) checks.push(...wheelChecks(vehicle, wheel, { suspension: o.suspension, skipPosition: !!tire }));
    if (tire) checks.push(...tireChecks(vehicle, oeIndex, wheel, tire, o));

    const metrics = { oe: tireMetrics(oe.tireObj), oeWheel: { d: oe.d, w: oe.w, et: oe.et } };
    if (tire) {
      metrics.tire = tireMetrics(tire);
      metrics.diaPct = (tire.dia / oe.tireObj.dia - 1) * 100;
      metrics.speedoAt60 = 60 * tire.dia / oe.tireObj.dia;
      metrics.rideHeight = (tire.dia - oe.tireObj.dia) / 2;
      if (wheel) metrics.rim = rimRange(tire);
    }
    if (wheel) {
      const env = envelope(wheel.w, wheel.et, tire);
      metrics.poke = round(env.outer - oe.env.outer, 0);       // vs the customer's own factory package
      metrics.innerDelta = round(env.inner - oe.env.inner, 0);
    }
    return { verdict: verdictOf(checks), checks, metrics, hardware: wheel ? hardware(vehicle, wheel) : [] };
  }

  function tireMetrics(t) {
    return { size: t.size, dia: t.dia, sw: t.sw, sidewall: t.sidewall, circ: t.circ, revs: t.revsPerMile, rim: t.rim };
  }

  function hardware(vehicle, wheel) {
    const n = vehicle.lugs * 4;
    const kind = vehicle.fastener === 'bolt' ? 'lug bolts' : 'lug nuts';
    const h = [];
    if (wheel.cb - vehicle.cb > 0.15) h.push(`4 × hub-centric rings, ${wheel.cb} mm OD → ${vehicle.cb} mm ID`);
    h.push(`${n} × ${kind}, ${vehicle.thread}, ${wheel.seat || 'conical 60°'} seat${vehicle.fastener === 'bolt' ? ' — verify bolt length for the wheel\'s pad thickness' : ''}`);
    h.push(vehicle.tpms === 'direct'
      ? '4 × TPMS sensors (transfer or new) + sensor relearn'
      : 'Indirect TPMS — no sensors; run TPMS calibration after install');
    h.push(`Torque to ${vehicle.torque} lb-ft in a star pattern; re-torque after 50–100 miles`);
    return h;
  }

  // Quick status for catalog badges.
  function wheelStatus(vehicle, wheel, susp) {
    return verdictOf(wheelChecks(vehicle, wheel, { suspension: susp }));
  }
  function tireStatus(vehicle, oeIndex, wheel, tire, opts) {
    return verdictOf(tireChecks(vehicle, oeIndex, wheel, tire, opts));
  }

  // Alternative sizes for a rim diameter that stay within ±3% of the OE diameter.
  function plusSizes(oeTire, rim, candidates) {
    return candidates
      .map(s => parseTire(s))
      .filter(t => t && t.rim === rim && Math.abs(t.dia / oeTire.dia - 1) <= 0.03)
      .sort((a, b) => Math.abs(a.dia - oeTire.dia) - Math.abs(b.dia - oeTire.dia));
  }

  const api = {
    IN, LOAD_KG, SPEED_MPH, SPEED_ORDER, SUSPENSION, BODY_CLASS, isTruck,
    parseTire, rimRange, mountedSection, envelope, oePackages, loadLbs, speedRank,
    suspensionOptions, clearanceLimits, maxTireDia, pcdLabel,
    wheelChecks, tireChecks, checkFitment, wheelStatus, tireStatus, plusSizes, verdictOf, round,
  };
  root.Fitment = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
