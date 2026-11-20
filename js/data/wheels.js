/* Wheel catalog — DEMO INVENTORY. These are house-named sample styles with realistic specs so the
 * fitment engine and 3D preview have something to work with. Replace them with the wheels you
 * actually stock (Inventory button in the app, or edit this file).
 *
 * Each line is expanded into one SKU per size × bolt pattern.
 * design: 3D face style — five | split5 | multi | mesh | turbine | six | beadlock | split8
 * load: per-wheel load rating in lb. cb: center bore in mm.
 */
(function (root) {
  const FINISHES = {
    'gloss-black': { name: 'Gloss Black', color: 0x0b0b0d, metalness: 0.75, roughness: 0.22 },
    'satin-black': { name: 'Satin Black', color: 0x141416, metalness: 0.6, roughness: 0.55 },
    gunmetal: { name: 'Gunmetal', color: 0x3c4046, metalness: 0.9, roughness: 0.3 },
    silver: { name: 'Hyper Silver', color: 0xc9cdd2, metalness: 1.0, roughness: 0.24 },
    chrome: { name: 'Chrome', color: 0xffffff, metalness: 1.0, roughness: 0.04 },
    bronze: { name: 'Bronze', color: 0x8a6234, metalness: 0.9, roughness: 0.32 },
    white: { name: 'Gloss White', color: 0xf1f1f1, metalness: 0.15, roughness: 0.3 },
  };

  // pattern → center bore used by that drilling
  const CAR_CB = { '5x100': 73.1, '5x114.3': 73.1, '5x115': 73.1, '5x112': 66.6, '5x120': 72.6 };
  const TRUCK_CB = { '6x139.7': 106.1, '6x135': 87.1, '5x127': 71.5 };
  const HD_CB = { '8x170': 125.1, '8x165.1': 125.1 };

  const REAL_CB = { '6x139.7': 106.1, '6x135': 87.1, '5x127': 71.5, '5x150': 110.1 };
  const REAL_SIZES = [[17, 8.5, 0], [17, 8.5, 18], [17, 9, -12], [18, 9, 18], [20, 9, 18], [20, 9, 0]];
  const REAL_NOTE = ' Real 3D model. Sizes listed are common ones for this style — confirm the exact SKU with your distributor.';
  // Real aftermarket wheels with 3D models (models/rims). Shown first.
  const real = (brand, style, file, finishes, blurb, sizes, pcds, cb, load) => ({
    brand, style, design: 'six', model: 'models/rims/' + file + '.glb', load: load || 2500, finishes, cb: cb || REAL_CB,
    blurb: blurb + REAL_NOTE, sizes: sizes || REAL_SIZES, pcds: pcds || ['6x139.7', '6x135', '5x127', '5x150'] });
  const B = ['satin-black', 'gloss-black', 'bronze', 'gunmetal', 'silver'];

  const LINES = [
    real('Method Race Wheels', '305 NV', 'method_305', ['bronze', 'satin-black', 'gunmetal', 'silver'], 'Street-legal race look with a simulated beadlock ring.'),
    real('Method Race Wheels', '312', 'method_312', ['satin-black', 'bronze', 'gunmetal'], 'Ten-window off-road wheel with a reinforced lip.'),
    real('Fuel Off-Road', 'Syndicate', 'fuel_syndicate', ['satin-black', 'bronze', 'gunmetal'], 'Mesh-style truck wheel.'),
    real('KMC', 'Terra', 'kmc_terra', B, 'Clean eight-spoke overland wheel.'),
    real('XD', 'Grenade', 'xd_grenade', ['satin-black', 'gloss-black', 'gunmetal'], 'Aggressive split-spoke truck wheel.'),
    real('XD', 'Machete', 'xd_machete', ['satin-black', 'gunmetal', 'bronze'], 'Beadlock-style off-road wheel.'),
    real('Moto Metal', 'MO951', 'moto_metal_mO951', ['gloss-black', 'chrome', 'satin-black'], 'Eight-spoke wheel with a deep lip.'),
    real('Dirty Life', 'Mesa Race', 'dirty_life_mesa_race', ['satin-black', 'bronze', 'gunmetal'], 'Race-style wheel with a bolted outer ring.'),
    real('Level 8', 'Strike 6', 'level_8_strike_6', ['satin-black', 'gunmetal', 'bronze'], 'Six-spoke trail wheel.'),
    real('Konig', 'Countersteer', 'konig_countersteer', ['satin-black', 'bronze', 'silver'], 'Lightweight six-spoke.'),
    real('American Racing', 'Mojave', 'ar_mojave', ['silver', 'chrome', 'satin-black'], 'Classic slotted off-road wheel.'),
    real('Cragar', 'Soft 8', 'cragar_soft_8', ['gloss-black', 'chrome', 'white'], 'Classic eight-hole steel wheel.', [[16, 8, 0], [17, 8.5, 0], [17, 9, -12]]),
    real('Toyota', 'TRD Pro', 'toyota_trd', ['satin-black', 'gunmetal'], 'Factory TRD Pro wheel.', [[17, 7, 4]], ['6x139.7'], { '6x139.7': 106.1 }, 2300),

    { style: 'Apex S5', design: 'split5', load: 1565, finishes: ['gloss-black', 'gunmetal', 'silver', 'bronze'], cb: CAR_CB,
      blurb: 'Split five-spoke, flow-formed. Clean OEM-plus look.',
      sizes: [[17, 7.5, 40], [18, 8, 40], [18, 8.5, 35], [19, 8.5, 35], [19, 8.5, 45], [20, 8.5, 35], [20, 9, 35]],
      pcds: ['5x100', '5x114.3', '5x112', '5x120'],
      extra: [{ pcd: '5x112', sizes: [[18, 8, 27], [19, 8, 27]] }] },
    { style: 'Vector M10', design: 'multi', load: 1520, finishes: ['silver', 'gloss-black', 'gunmetal'], cb: CAR_CB,
      blurb: 'Ten thin spokes. Easy to clean, suits sedans and crossovers.',
      sizes: [[15, 6.5, 40], [16, 7, 40], [17, 7.5, 42], [18, 8, 42], [19, 8, 42]],
      pcds: ['5x100', '5x114.3', '5x115', '5x112'] },
    { style: 'Mesh RS', design: 'mesh', load: 1500, finishes: ['silver', 'gloss-black', 'bronze', 'white'], cb: CAR_CB,
      blurb: 'Motorsport mesh. Available in aggressive widths for a flush stance.',
      sizes: [[17, 8, 35], [18, 8.5, 38], [18, 9.5, 35], [19, 8.5, 38], [19, 9.5, 35]],
      pcds: ['5x100', '5x114.3', '5x112', '5x120'] },
    { style: 'Turbine T7', design: 'turbine', load: 1900, finishes: ['satin-black', 'gunmetal', 'silver'], cb: { '5x114.3': 64.1 },
      blurb: 'Directional aero blades, EV load-rated. Hub-centric 64.1 mm bore.',
      sizes: [[18, 8.5, 35], [19, 8.5, 35], [19, 9.5, 40], [20, 9, 35], [20, 9.5, 40]],
      pcds: ['5x114.3'] },
    { style: 'Touring 5', design: 'five', load: 2100, finishes: ['silver', 'gunmetal', 'gloss-black', 'chrome'], cb: Object.assign({}, CAR_CB, { '5x127': 71.5 }),
      blurb: 'Classic five-spoke for crossovers and SUVs.',
      sizes: [[17, 7, 38], [17, 7.5, 40], [17, 7.5, 50], [18, 7.5, 40], [18, 8, 40], [18, 8, 50], [20, 8, 40], [20, 8.5, 40], [20, 8.5, 50]],
      pcds: ['5x114.3', '5x115', '5x127', '5x120'],
      extra: [{ pcd: '5x115', sizes: [[18, 8, 22], [20, 8.5, 22], [20, 9, 20]] }] },
    { style: 'Highline 6', design: 'six', load: 2400, finishes: ['chrome', 'gloss-black', 'silver'], cb: { '6x139.7': 78.1, '6x135': 87.1 },
      blurb: 'Factory-offset truck wheel. Bolts on with no rubbing and no spacers.',
      sizes: [[18, 8.5, 26], [20, 9, 28], [22, 9, 28]], pcds: ['6x139.7'],
      extra: [{ pcd: '6x135', sizes: [[18, 8, 44], [20, 8.5, 44], [22, 9, 44]] }] },
    { style: 'Highline HP', design: 'six', load: 2400, finishes: ['gloss-black', 'gunmetal', 'bronze'], cb: { '6x139.7': 95.1, '5x150': 110.1, '5x139.7': 78.1 },
      blurb: 'High-positive-offset fitment for 2022+ Tundra and Bronco.',
      sizes: [[17, 8, 55], [18, 8, 55], [20, 8.5, 55]], pcds: ['6x139.7', '5x150', '5x139.7'] },
    { style: 'Ridgeline 6', design: 'six', load: 2500, finishes: ['satin-black', 'gunmetal', 'bronze'], cb: TRUCK_CB,
      blurb: 'Six-spoke off-road wheel. Lower offsets widen the stance.',
      sizes: [[16, 8, 0], [17, 8.5, 18], [17, 8.5, 0], [17, 9, -12], [18, 9, 18], [18, 9, 0], [20, 9, 18], [20, 9, 0], [20, 10, -18]],
      pcds: ['6x139.7', '6x135', '5x127'] },
    { style: 'Trail Lock', design: 'beadlock', load: 2500, finishes: ['satin-black', 'bronze', 'gunmetal'], cb: TRUCK_CB,
      blurb: 'Simulated beadlock ring. Built for 33–35" tires.',
      sizes: [[17, 8.5, 25], [17, 9, 0], [17, 9, -12]],
      pcds: ['6x139.7', '6x135', '5x127'] },
    { style: 'Summit HD', design: 'split8', load: 3640, finishes: ['gloss-black', 'chrome', 'gunmetal'], cb: HD_CB,
      blurb: 'Eight-lug wheel with a heavy-duty load rating for 3/4-ton trucks.',
      sizes: [[17, 8, 35], [18, 8.5, 40], [20, 8.5, 40], [18, 9, 18], [20, 9, 18], [20, 9, 0], [20, 10, -18]],
      pcds: ['8x170', '8x165.1'] },
  ];

  const WHEELS = [];
  LINES.forEach(line => {
    const add = (pcd, d, w, et) => {
      const cb = line.cb[pcd];
      if (cb == null) return;
      WHEELS.push({
        id: `${line.style}-${d}x${w}-et${et}-${pcd}`.toLowerCase().replace(/[^a-z0-9.x-]+/g, '-'),
        brand: line.brand || 'CWT Demo', style: line.style, design: line.design, blurb: line.blurb, model: line.model || null,
        d, w, et, pcd, cb, load: line.load, seat: 'conical 60°', finishes: line.finishes,
      });
    };
    line.pcds.forEach(pcd => line.sizes.forEach(s => add(pcd, s[0], s[1], s[2])));
    (line.extra || []).forEach(x => { line.cb[x.pcd] != null && x.sizes.forEach(s => add(x.pcd, s[0], s[1], s[2])); });
  });

  root.WHEELS = WHEELS; root.WHEEL_FINISHES = FINISHES;
  if (typeof module !== 'undefined') module.exports = { WHEELS, FINISHES };
})(typeof window !== 'undefined' ? window : globalThis);
