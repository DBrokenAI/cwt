/* Vehicle fitment database.
 *
 * Units: pcd / cb / et in mm, wheel d / w in inches, torque in lb-ft, dims in mm.
 * oe[]  = factory wheel + tire packages (square setups). The fitment engine measures
 *         every aftermarket combo against these, so they must be right.
 * minDia = smallest wheel diameter that clears the factory brakes on common trims.
 * maxTireDia = largest overall tire diameter (in) that fits at stock ride height
 *         without trimming. Omit to default to largest OE diameter + 3%.
 * notes = fitment facts shown to the salesperson.
 * flags = specs where published sources disagree or could not be confirmed —
 *         shown as "confirm before ordering". Rows were cross-checked against
 *         published fitment tables in Nov 2026; clear a flag once you've confirmed it.
 */
(function (root) {
  const V = (id, make, model, y0, y1, body, pcd, cb, thread, fastener, torque, tpms, dims, minDia, maxTireDia, oe, notes, aliases, flags) => ({
    id, make, model, years: [y0, y1], body,
    pcd, lugs: +pcd.split('x')[0], pcdMm: +pcd.split('x')[1],
    cb, thread, fastener, torque, tpms,
    dims: { wheelbase: dims[0], length: dims[1], width: dims[2], height: dims[3] },
    minDia, maxTireDia: maxTireDia || null,
    oe: oe.map(o => ({ trim: o[0], d: o[1], w: o[2], et: o[3], tire: o[4], li: o[5], sr: o[6], lt: !!o[7] })),
    notes: notes || [], aliases: aliases || [], flags: flags || [],
  });

  const HONDA_SEAT = 'Factory Honda lug nuts use a ball (radius) seat — aftermarket wheels almost always need conical-seat nuts.';
  const NOT_1143 = '5x115 is NOT interchangeable with 5x114.3 despite being close — do not mix.';
  const AWD = 'Symmetrical AWD: all four tires must match — keep rolling circumference within 1/4" (a little over 1/32" of tread depth). Use Tools → AWD match.';
  const EV = 'EV: use XL / HL load-rated tires — the car is heavy and torque is instant. Never replace an HL tire with XL.';
  const HD = 'Heavy-duty truck: requires LT tires, Load Range E. Wheels must carry an HD load rating.';

  const VEHICLES = [
    // ── Toyota ─────────────────────────────────────────────
    V('camry-18', 'Toyota', 'Camry', 2018, 2024, 'sedan', '5x114.3', 60.1, 'M12x1.5', 'nut', 76, 'direct', [2825, 4880, 1840, 1445], 16, null, [
      ['L', 16, 6.5, 40, '205/65R16', 95, 'H'],
      ['LE', 17, 7.5, 45, '215/55R17', 94, 'V'],
      ['SE / XLE', 18, 8, 50, '235/45R18', 94, 'V'],
      ['XSE / TRD', 19, 8, 50, '235/40R19', 92, 'V'],
    ], [], [], ['XSE 19" tire is listed as both 92V and 92W — check the door placard.']),
    V('corolla-20', 'Toyota', 'Corolla', 2020, 2025, 'sedan', '5x100', 54.1, 'M12x1.5', 'nut', 76, 'direct', [2700, 4630, 1780, 1435], 15, null, [
      ['L', 15, 6.5, 40, '195/65R15', 91, 'S'],
      ['LE', 16, 7, 40, '205/55R16', 91, 'H'],
      ['SE / XSE', 18, 8, 40, '225/40R18', 88, 'V'],
    ], ['5x100 bolt pattern — most other Toyota wheels (5x114.3) will NOT fit.', 'Sedan, 2020+ generation only. The 2019 sedan is the older generation with different wheels.']),
    V('rav4-19', 'Toyota', 'RAV4', 2019, 2025, 'cuv', '5x114.3', 60.1, 'M12x1.5', 'nut', 76, 'direct', [2690, 4600, 1855, 1700], 17, null, [
      ['LE / XLE', 17, 7, 35, '225/65R17', 102, 'H'],
      ['TRD Off-Road / Hybrid XLE Premium, SE, XSE, Limited', 18, 7, 35, '225/60R18', 100, 'H'],
      ['XLE Premium / Adventure / Limited (gas)', 19, 7.5, 40, '235/55R19', 101, 'V'],
    ]),
    V('highlander-20', 'Toyota', 'Highlander', 2020, 2025, 'suv', '5x114.3', 60.1, 'M12x1.5', 'nut', 76, 'direct', [2850, 4950, 1930, 1730], 18, null, [
      ['L / LE / XLE', 18, 8, 35, '235/65R18', 106, 'V'],
      ['Limited / Platinum', 20, 8, 35, '235/55R20', 102, 'V'],
    ], [], [], ['20" wheel offset is listed as ET35 by OEM-wheel resellers and ET30 by one fitment table.']),
    V('tacoma-16', 'Toyota', 'Tacoma', 2016, 2023, 'truck', '6x139.7', 106.1, 'M12x1.5', 'nut', 83, 'direct', [3235, 5390, 1890, 1790], 16, 32.0, [
      ['SR / SR5', 16, 7, 25, '245/75R16', 109, 'S'],
      ['TRD Off-Road', 16, 7, 25, '265/70R16', 112, 'T'],
      ['TRD Sport', 17, 7.5, 30, '265/65R17', 110, 'S'],
      ['Limited', 18, 7.5, 30, '265/60R18', 109, 'H'],
    ], [], [], ['TRD Off-Road 16" wheel offset is listed as ET25 by one source and ET13 by another.']),
    V('tundra-22', 'Toyota', 'Tundra', 2022, 2025, 'truck', '6x139.7', 95.1, 'M14x1.5', 'nut', 97, 'direct', [3700, 5930, 2035, 1980], 18, 34.0, [
      ['SR5', 18, 8, 60, '265/70R18', 116, 'T'],
      ['Limited / Platinum', 20, 8, 60, '265/60R20', 112, 'H'],
    ], ['2022+ Tundra changed from 5x150 to 6x139.7 with a 95.1 mm hub bore — older Tundra wheels do not fit.', 'Base SR runs 245/75R18.'],
    [], ['18" wheel width is listed as 8" and 7.5" by different sources.', '20" tire load / speed rating (112H) not confirmed — check the door placard.']),
    V('4runner-10', 'Toyota', '4Runner', 2010, 2024, 'suv', '6x139.7', 106.1, 'M12x1.5', 'nut', 83, 'direct', [2790, 4830, 1925, 1815], 17, 32.8, [
      ['SR5 / TRD Off-Road', 17, 7, 15, '265/70R17', 113, 'S'],
      ['Limited', 20, 7, 15, '245/60R20', 107, 'H'],
    ]),

    // ── Honda ──────────────────────────────────────────────
    V('civic-16', 'Honda', 'Civic', 2016, 2025, 'sedan', '5x114.3', 64.1, 'M12x1.5', 'nut', 80, 'indirect', [2700, 4650, 1800, 1415], 16, null, [
      ['LX', 16, 7, 45, '215/55R16', 93, 'H'],
      ['EX / Sport (17")', 17, 7, 45, '215/50R17', 91, 'H'],
      ['Sport / Touring (18")', 18, 8, 50, '235/40R18', 91, 'W'],
    ], [HONDA_SEAT, 'Excludes Type R (5x120, 19–20" wheels, M14 studs).']),
    V('accord-18', 'Honda', 'Accord', 2018, 2022, 'sedan', '5x114.3', 64.1, 'M12x1.5', 'nut', 80, 'indirect', [2830, 4880, 1860, 1450], 17, null, [
      ['LX / EX', 17, 7.5, 45, '225/50R17', 94, 'V'],
      ['Sport / Touring', 19, 8.5, 50, '235/40R19', 96, 'V'],
    ], [HONDA_SEAT]),
    V('crv-17', 'Honda', 'CR-V', 2017, 2022, 'cuv', '5x114.3', 64.1, 'M12x1.5', 'nut', 80, 'indirect', [2660, 4590, 1855, 1680], 17, null, [
      ['LX', 17, 7.5, 45, '235/65R17', 104, 'H'],
      ['EX / EX-L / Touring (2017–19)', 18, 7.5, 45, '235/60R18', 103, 'H'],
      ['Touring (2020–22)', 19, 7.5, 45, '235/55R19', 101, 'H'],
    ], [HONDA_SEAT]),

    // ── Ford ───────────────────────────────────────────────
    V('f150-15', 'Ford', 'F-150', 2015, 2020, 'truck', '6x135', 87.1, 'M14x1.5', 'nut', 150, 'direct', [3690, 5890, 2030, 1960], 17, 33.5, [
      ['XL (base)', 17, 7.5, 44, '245/70R17', 110, 'T'],
      ['XL / XLT', 17, 7.5, 44, '265/70R17', 115, 'T'],
      ['XLT / Lariat', 18, 7.5, 44, '275/65R18', 116, 'T'],
      ['Lariat / Platinum', 20, 8.5, 44, '275/55R20', 113, 'T'],
    ], ['Excludes Raptor (wider track, 315/70R17).']),
    V('f150-21', 'Ford', 'F-150', 2021, 2025, 'truck', '6x135', 87.1, 'M14x1.5', 'nut', 150, 'direct', [3690, 5890, 2030, 1960], 17, 33.8, [
      ['XL (base)', 17, 7.5, 44, '245/70R17', 110, 'T'],
      ['XL / XLT', 17, 7.5, 44, '265/70R17', 115, 'T'],
      ['XLT / Lariat', 18, 7.5, 44, '275/65R18', 116, 'T'],
      ['Lariat / Platinum', 20, 8.5, 44, '275/60R20', 115, 'T'],
    ], ['Excludes Raptor (wider track, 35–37" tires).', '2021+ moved the 20" package to the taller 275/60R20.']),
    V('f250-17', 'Ford', 'F-250 Super Duty', 2017, 2025, 'hdtruck', '8x170', 124.9, 'M14x1.5', 'nut', 165, 'direct', [4040, 6350, 2030, 2060], 17, 34.5, [
      ['XL', 17, 7.5, 40, 'LT245/75R17', 121, 'S', 1],
      ['XLT / Lariat', 18, 8, 40, 'LT275/70R18', 125, 'S', 1],
      ['Lariat / Platinum', 20, 8, 40, 'LT275/65R20', 126, 'S', 1],
    ], [HD], [], ['Tire load index / speed rating per trim not confirmed — read the door placard.']),
    V('mustang-15', 'Ford', 'Mustang', 2015, 2023, 'coupe', '5x114.3', 70.5, 'M14x1.5', 'nut', 150, 'direct', [2720, 4790, 1915, 1380], 17, null, [
      ['EcoBoost', 17, 7.5, 37.5, '235/55R17', 99, 'H'],
      ['EcoBoost Premium / GT', 18, 8, 40, '235/50R18', 97, 'W'],
      ['GT Premium (19")', 19, 8.5, 42.5, '255/40R19', 96, 'W'],
    ], ['17" wheels only clear EcoBoost / V6 base brakes — the GT needs 18" minimum.', 'GT Performance Pack uses Brembo 6-piston fronts (19" or brake-specific 18") and runs a staggered 19x9 / 19x9.5 setup.'],
    [], ['Factory wheel offsets are listed differently by different sources (37.5–45 mm). Measure the customer\'s wheel if the new offset is aggressive.']),
    V('explorer-20', 'Ford', 'Explorer', 2020, 2025, 'suv', '5x114.3', 70.5, 'M14x1.5', 'nut', 150, 'direct', [3025, 5050, 2005, 1775], 18, null, [
      ['Base / XLT', 18, 7.5, 37.5, '255/65R18', 111, 'H'],
      ['XLT / Limited (20")', 20, 8, 37.5, '255/55R20', 110, 'V'],
    ], ['20" OE tire is XL (110V). ST / Platinum use a 20x8.5 ET40 or 21" wheel.'], [], ['Factory wheel offsets are listed as 37.5–44.5 mm by different sources.']),
    V('bronco-21', 'Ford', 'Bronco', 2021, 2025, 'jeep', '6x139.7', 93.1, 'M12x1.5', 'nut', 100, 'direct', [2950, 4810, 1930, 1850], 16, 33.2, [
      ['Base', 16, 7, 55, '255/70R16', 111, 'T'],
      ['Big Bend', 17, 7.5, 55, '255/75R17', 115, 'T'],
      ['Black Diamond', 17, 7.5, 55, 'LT265/70R17', 112, 'S', 1],
      ['Outer Banks', 18, 7.5, 55, '255/70R18', 113, 'T'],
      ['Badlands', 17, 8, 55, 'LT285/70R17', 116, 'S', 1],
    ], ['Sasquatch package (17x8.5 ET30, LT315/70R17, lifted, wider fenders) clears ~35" — treat as lifted.', 'Full-size Bronco only; Bronco Sport is 5x108.'],
    [], ['Tire speed ratings and the Black Diamond steel-wheel width are not confirmed.', 'Lug torque is listed as 100 lb-ft by most sources and 140 by one — check the owner\'s manual.']),

    // ── Chevrolet / GMC ────────────────────────────────────
    V('silverado-19', 'Chevrolet', 'Silverado 1500', 2019, 2025, 'truck', '6x139.7', 78.1, 'M14x1.5', 'nut', 140, 'direct', [3745, 5885, 2060, 1920], 17, 33.5, [
      ['WT / Custom', 17, 8, 24, '255/70R17', 112, 'S'],
      ['LT', 18, 8.5, 26, '265/65R18', 114, 'T'],
      ['RST / LTZ', 20, 9, 28, '275/60R20', 115, 'S'],
      ['High Country', 22, 9, 28, '275/50R22', 111, 'H'],
    ], [], ['GMC Sierra 1500'], ['17" tire is listed as 110S and 112S; 22" speed rating as T and H. The higher value is used here.']),
    V('tahoe-21', 'Chevrolet', 'Tahoe', 2021, 2025, 'suv', '6x139.7', 78.1, 'M14x1.5', 'nut', 140, 'direct', [3070, 5350, 2060, 1925], 18, 33.5, [
      ['LS / LT', 18, 8.5, 26, '265/65R18', 114, 'T'],
      ['RST / Z71', 20, 9, 28, '275/60R20', 115, 'T'],
      ['Premier / High Country', 22, 9, 28, '275/50R22', 111, 'H'],
    ], [], ['GMC Yukon'], ['20" and 22" tire speed ratings are listed differently by different sources (S/T and T/H). The higher value is used here.']),
    V('equinox-18', 'Chevrolet', 'Equinox', 2018, 2024, 'cuv', '5x115', 70.3, 'M14x1.5', 'nut', 100, 'direct', [2725, 4650, 1845, 1660], 17, null, [
      ['LS / LT', 17, 7, 41, '225/65R17', 102, 'H'],
      ['LT / Premier', 18, 7, 43, '225/60R18', 100, 'H'],
      ['Premier (19")', 19, 7.5, 46, '235/50R19', 99, 'H'],
    ], [NOT_1143], [], ['LUG THREAD: sources disagree between M14x1.5 and M12x1.5. Check a stud on the vehicle before selling lug nuts.']),
    V('camaro-16', 'Chevrolet', 'Camaro', 2016, 2024, 'coupe', '5x120', 66.9, 'M14x1.5', 'nut', 140, 'direct', [2810, 4785, 1900, 1350], 18, null, [
      ['LS / LT', 18, 8.5, 32, '245/50R18', 100, 'V'],
      ['LT RS (20")', 20, 8.5, 25, '245/40R20', 95, 'V'],
    ], ['SS / ZL1 run staggered 20" setups with larger Brembo brakes — check brake clearance per trim.']),

    // ── Ram / Jeep / Dodge ─────────────────────────────────
    V('ram1500-19', 'Ram', '1500', 2019, 2025, 'truck', '6x139.7', 77.8, 'M14x1.5', 'nut', 130, 'direct', [3670, 5915, 2085, 1970], 18, 33.5, [
      ['Tradesman / Big Horn', 18, 8, 19, '275/65R18', 116, 'T'],
      ['Laramie', 20, 9, 19, '275/55R20', 113, 'T'],
      ['Limited', 22, 9, 19, '285/45R22', 114, 'H'],
    ], ['2019+ (DT) only. Ram 1500 Classic (DS) is 5x139.7 — wheels do not interchange.']),
    V('ram2500-14', 'Ram', '2500', 2014, 2025, 'hdtruck', '8x165.1', 121.3, 'M14x1.5', 'nut', 130, 'direct', [3785, 6040, 2010, 2000], 17, 34.5, [
      ['Tradesman', 17, 7.5, 57, 'LT245/70R17', 119, 'S', 1],
      ['Big Horn / Laramie', 18, 8, 57, 'LT275/70R18', 125, 'S', 1],
      ['Laramie / Limited', 20, 8, 54.65, 'LT285/60R20', 125, 'R', 1],
    ], [HD], [], ['Tire load index / speed rating per trim not confirmed — read the door placard.', 'Hub bore is listed as 120.9–121.3 mm by different sources.']),
    V('wrangler-18', 'Jeep', 'Wrangler (JL)', 2018, 2025, 'jeep', '5x127', 71.5, 'M14x1.5', 'nut', 130, 'direct', [3010, 4785, 1875, 1870], 17, 33.2, [
      ['Sport', 17, 7.5, 44.45, '245/75R17', 112, 'T'],
      ['Sahara', 18, 7.5, 44.45, '255/70R18', 113, 'T'],
      ['Rubicon', 17, 7.5, 44.45, 'LT285/70R17', 116, 'Q', 1],
    ], ['Rubicon has high-clearance fenders and clears 35" stock; Sport / Sahara clear ~33" stock.'], ['Jeep Gladiator (JT)'],
    ['Tire load / speed ratings per trim not confirmed — read the door placard.']),
    V('grandcherokee-14', 'Jeep', 'Grand Cherokee', 2014, 2021, 'suv', '5x127', 71.5, 'M14x1.5', 'nut', 130, 'direct', [2915, 4820, 1945, 1760], 17, null, [
      ['Laredo', 17, 8, 56.4, '245/70R17', 108, 'T'],
      ['Limited', 18, 8, 56.4, '265/60R18', 110, 'T'],
      ['Overland / Summit', 20, 8, 56.4, '265/50R20', 107, 'V'],
    ], ['Excludes SRT / Trackhawk (larger Brembo brakes, 20x10).', '2011–2013 models share the fitment but use 110 lb-ft lug torque.'],
    [], ['18" load index (109 vs 110) and 20" speed rating (T vs V) changed during this range — the higher value is used here.']),
    V('charger-14', 'Dodge', 'Charger', 2014, 2023, 'sedan', '5x115', 71.5, 'M14x1.5', 'nut', 130, 'direct', [3050, 5040, 1905, 1480], 17, null, [
      ['SXT', 17, 7, 24, '215/65R17', 99, 'V'],
      ['SXT / GT (18")', 18, 7.5, 24, '235/55R18', 100, 'V'],
      ['GT / R/T (20")', 20, 8, 24, '245/45R20', 99, 'V'],
    ], [NOT_1143, 'Scat Pack / Hellcat use larger Brembo brakes and 20x9+ wheels.', 'Challenger and Chrysler 300 share the hub specs but have different factory packages — enter those as a custom vehicle.'],
    [], ['20" tire is listed as 99V and 99W by different sources.']),

    // ── Nissan / Subaru / Mazda / Hyundai / Kia ────────────
    V('altima-19', 'Nissan', 'Altima', 2019, 2025, 'sedan', '5x114.3', 66.1, 'M12x1.25', 'nut', 83, 'direct', [2825, 4900, 1850, 1440], 16, null, [
      ['S', 16, 7, 45, '215/60R16', 95, 'H'],
      ['SV', 17, 7.5, 50, '215/55R17', 94, 'V'],
      ['SR / Platinum', 19, 8, 55, '235/40R19', 92, 'V'],
    ]),
    V('rogue-21', 'Nissan', 'Rogue', 2021, 2025, 'cuv', '5x114.3', 66.1, 'M12x1.25', 'nut', 83, 'direct', [2705, 4650, 1840, 1690], 17, null, [
      ['S', 17, 7.5, 40, '235/65R17', 104, 'H'],
      ['SV', 18, 7.5, 40, '235/60R18', 103, 'H'],
      ['SL / Platinum', 19, 7.5, 40, '235/55R19', 101, 'V'],
    ]),
    V('outback-20', 'Subaru', 'Outback', 2020, 2025, 'cuv', '5x114.3', 56.1, 'M12x1.25', 'nut', 89, 'direct', [2745, 4860, 1855, 1680], 17, null, [
      ['Base / Premium', 17, 7, 55, '225/65R17', 102, 'H'],
      ['Limited / Touring', 18, 7, 55, '225/60R18', 100, 'H'],
    ], [AWD]),
    V('wrx-15', 'Subaru', 'WRX', 2015, 2021, 'sedan', '5x114.3', 56.1, 'M12x1.25', 'nut', 89, 'direct', [2650, 4595, 1795, 1475], 17, null, [
      ['Base / Premium', 17, 8, 55, '235/45R17', 94, 'W'],
      ['Limited', 18, 8.5, 55, '245/40R18', 97, 'W'],
    ], [AWD, 'STI uses larger Brembo brakes — 18" minimum.']),
    V('cx5-17', 'Mazda', 'CX-5', 2017, 2025, 'cuv', '5x114.3', 67.1, 'M12x1.5', 'nut', 94, 'direct', [2700, 4550, 1840, 1680], 17, null, [
      ['Sport / Touring', 17, 7, 45, '225/65R17', 102, 'H'],
      ['Grand Touring', 19, 7, 45, '225/55R19', 99, 'V'],
    ]),
    V('elantra-21', 'Hyundai', 'Elantra', 2021, 2025, 'sedan', '5x114.3', 67.1, 'M12x1.5', 'nut', 87, 'direct', [2720, 4675, 1825, 1415], 15, null, [
      ['SE', 15, 6, 42, '195/65R15', 91, 'H'],
      ['SEL', 16, 6.5, 46, '205/55R16', 91, 'H'],
      ['Limited', 17, 7, 49, '225/45R17', 91, 'W'],
      ['N Line', 18, 8, 56, '235/40R18', 95, 'W'],
    ], ['Hyundai specifies lug torque as a range: 79–94 lb-ft.'], [], ['Factory wheel offsets come from a single source; the N Line wheel is also listed as 18x7.5 ET50.5 (outside the 235/40R18 approved rim range, so 18x8 ET56 is used here).']),
    V('telluride-20', 'Kia', 'Telluride', 2020, 2025, 'suv', '5x114.3', 67.1, 'M12x1.5', 'nut', 87, 'direct', [2900, 5000, 1990, 1750], 18, null, [
      ['LX / S', 18, 7.5, 49.5, '245/60R18', 105, 'H'],
      ['EX / SX', 20, 7.5, 49.5, '245/50R20', 102, 'V'],
    ], ['Kia specifies lug torque as a range: 79–94 lb-ft.'], ['Hyundai Palisade']),

    // ── Tesla / BMW / VW ───────────────────────────────────
    V('model3-17', 'Tesla', 'Model 3', 2017, 2023, 'sedan', '5x114.3', 64.1, 'M14x1.5', 'nut', 129, 'direct', [2875, 4695, 1850, 1445], 18, null, [
      ['RWD / Long Range (18")', 18, 8.5, 40, '235/45R18', 98, 'W'],
      ['Long Range (19")', 19, 8.5, 40, '235/40R19', 96, 'W'],
      ['Performance (20x8.5)', 20, 8.5, 35, '235/35R20', 92, 'Y'],
      ['Performance (20x9)', 20, 9, 34, '235/35R20', 92, 'Y'],
    ], [EV, 'Performance trim (larger brakes, stepped rear hub) may need Performance-specific wheels — test-fit.', 'Pre-refresh cars only (2024+ "Highland" not covered).'],
    [], ['Performance cars shipped with either a 20x8.5 or a 20x9 wheel depending on year — check the wheel stamp.']),
    V('modely-20', 'Tesla', 'Model Y', 2020, 2024, 'cuv', '5x114.3', 64.1, 'M14x1.5', 'nut', 129, 'direct', [2890, 4750, 1920, 1625], 19, null, [
      ['Long Range (19")', 19, 9.5, 45, '255/45R19', 104, 'W'],
      ['Long Range (20")', 20, 9.5, 45, '255/40R20', 101, 'W'],
    ], [EV, 'Performance trim runs staggered 21" wheels (21x9.5 / 21x10.5).', 'Pre-refresh cars only (2025+ "Juniper" has different packages).']),
    V('bmw3-19', 'BMW', '3 Series (G20)', 2019, 2025, 'sedan', '5x112', 66.6, 'M14x1.25', 'bolt', 103, 'direct', [2850, 4710, 1825, 1440], 17, null, [
      ['330i (18")', 18, 7.5, 25, '225/45R18', 95, 'Y'],
    ], ['Uses lug BOLTS (not nuts) — bolt length and seat type must match the wheel.', 'G20 uses 5x112 / 66.6 mm — older 5x120 BMW wheels do not fit.', 'M Sport / M340i brakes need 18"+. 19" factory setups are staggered (19x8 front / 19x8.5 rear) — this tool checks square setups only.'],
    [], ['18" tire speed rating varies by tire type (H / V / Y) — check the door placard.']),
    V('golf-15', 'Volkswagen', 'Golf (Mk7)', 2015, 2021, 'hatch', '5x112', 57.1, 'M14x1.5', 'bolt', 89, 'indirect', [2630, 4270, 1800, 1450], 15, null, [
      ['Golf S', 15, 6, 43, '195/65R15', 91, 'H'],
      ['Golf SE / SEL', 16, 6.5, 46, '205/55R16', 91, 'H'],
    ], ['Uses lug BOLTS with a ball (radius) seat from the factory — aftermarket wheels usually need conical-seat bolts.', 'Non-GTI Golf only. GTI and Golf R have larger brakes — use the GTI entry.']),
    V('gti-15', 'Volkswagen', 'GTI (Mk7)', 2015, 2021, 'hatch', '5x112', 57.1, 'M14x1.5', 'bolt', 89, 'indirect', [2630, 4270, 1800, 1450], 17, null, [
      ['GTI', 18, 7.5, 49, '225/40R18', 92, 'H'],
    ], ['Uses lug BOLTS with a ball (radius) seat from the factory — aftermarket wheels usually need conical-seat bolts.', 'Performance Pack / Golf R brakes: most 17" wheels do not clear — use 18".', 'Summer-tire cars came with 92Y tires; all-season cars with 92H.'],
    [], ['Factory 18" offset is listed as ET49 and ET51 depending on wheel style.']),

    // ── Older generations added for their real 3D models (specs from memory — not cross-checked) ──
    V('tacoma-05', 'Toyota', 'Tacoma', 2005, 2015, 'truck', '6x139.7', 106.1, 'M12x1.5', 'nut', 83, 'direct', [3245, 5285, 1895, 1785], 16, 32.0, [
      ['Base 4x4 / PreRunner', 16, 7, 30, '245/75R16', 109, 'S'],
      ['TRD Off-Road', 16, 7, 30, '265/70R16', 111, 'T'],
      ['TRD Sport', 17, 7.5, 30, '265/65R17', 110, 'T'],
    ], ['6-lug 4x4 / PreRunner trucks only — 2WD 5-lug trucks are 5x114.3.'], [], ['NOT CROSS-CHECKED: this row was entered from memory. Confirm every spec before ordering.']),
    V('tundra-07', 'Toyota', 'Tundra', 2007, 2021, 'truck', '5x150', 110.1, 'M14x1.5', 'nut', 97, 'direct', [3700, 5815, 2030, 1930], 18, 34.0, [
      ['SR / SR5', 18, 8, 60, '255/70R18', 112, 'T'],
      ['SR5 / Limited', 18, 8, 60, '275/65R18', 114, 'T'],
      ['Limited / Platinum', 20, 8, 60, '275/55R20', 111, 'H'],
    ], ['5x150 bolt pattern — 2022+ Tundra wheels (6x139.7) do not fit.'], [], ['NOT CROSS-CHECKED: this row was entered from memory. Confirm every spec before ordering.']),
    V('wrangler-07', 'Jeep', 'Wrangler Unlimited (JK)', 2007, 2018, 'jeep', '5x127', 71.5, '1/2"-20', 'nut', 100, 'direct', [2946, 4750, 1877, 1840], 16, 33.0, [
      ['Sport', 16, 7, 44.45, '225/75R16', 104, 'S'],
      ['Sahara', 18, 7.5, 44.45, '255/70R18', 113, 'T'],
      ['Rubicon', 17, 7.5, 44.45, 'LT255/75R17', 111, 'Q', 1],
    ], ['JK uses 1/2"-20 studs — JL (2018+) lug nuts are M14x1.5 and do not interchange.'], [], ['NOT CROSS-CHECKED: this row was entered from memory. Confirm every spec before ordering.']),

    // ── Added Nov 2026 with their 3D models (researched; offsets mostly from a single fitment table) ──
    V('escalade-21', 'Cadillac', 'Escalade', 2021, 2025, 'suv', '6x139.7', 78.1, 'M14x1.5', 'nut', 140, 'direct', [3071, 5382, 2060, 1948], 22, 33.5, [
      ['All trims (22")', 22, 9, 28, '275/50R22', 111, 'H'],
    ], ['Escalade IQ (electric) is a different vehicle with a different hub — not covered.'], [],
    ['One source says 20x9 wheels are standard on Luxury / Premium Luxury; 18" and 20" brake clearance is not confirmed, so the minimum here is 22".', 'Lug torque is from fitment sites, not a GM manual.']),
    V('suburban-15', 'Chevrolet', 'Suburban', 2015, 2020, 'suv', '6x139.7', 78.1, 'M14x1.5', 'nut', 140, 'direct', [3302, 5700, 2045, 1890], 17, 33.0, [
      ['Base / fleet (17")', 17, 8, 24, '265/70R17', 115, 'S'],
      ['LS / LT', 18, 8.5, 24, '265/65R18', 112, 'T'],
      ['LTZ / Premier', 20, 9, 27, '275/55R20', 111, 'S'],
      ['Optional 22"', 22, 9, 24, '285/45R22', 110, 'H'],
    ], ['Excludes the 8-lug 3500HD.'], [], ['20" wheel offset is listed as ET27 and ET28.']),
    V('durango-14', 'Dodge', 'Durango', 2014, 2025, 'suv', '5x127', 71.5, 'M14x1.5', 'nut', 130, 'direct', [3043, 5100, 1925, 1800], 18, null, [
      ['SXT / V6', 18, 8, 56.4, '265/60R18', 109, 'T'],
      ['GT / R/T / Citadel', 20, 8, 56.4, '265/50R20', 108, 'H'],
    ], ['SRT 392 / Hellcat use 20x10 ET50 wheels, 295/45ZR20 tires and 110 lb-ft lug torque — not covered by this entry.', 'The 3D model shown is the SRT body.'], [],
    ['Wheel packages follow the engine more than the trim name — check what is on the vehicle.']),
    V('sportage-23', 'Kia', 'Sportage', 2023, 2025, 'cuv', '5x114.3', 67.1, 'M12x1.5', 'nut', 87, 'direct', [2756, 4661, 1864, 1661], 17, null, [
      ['LX / X-Pro', 17, 7, 48, '235/65R17', 104, 'H'],
      ['EX / SX', 18, 7.5, 51, '235/60R18', 103, 'H'],
      ['SX Prestige / X-Line / PHEV', 19, 7.5, 51, '235/55R19', 101, 'V'],
    ], ['Kia specifies lug torque as a range: 79–94 lb-ft.'], [], ['Wheel offsets come from a single source.', 'Speed ratings on the 18" and 19" tires were hard to read in the manual — check the door placard.']),
    V('kona-18', 'Hyundai', 'Kona', 2018, 2023, 'cuv', '5x114.3', 67.1, 'M12x1.5', 'nut', 87, 'direct', [2600, 4205, 1800, 1565], 16, null, [
      ['SE (2.0)', 16, 6.5, 44, '205/60R16', 92, 'H'],
      ['SEL (2.0) / Electric', 17, 7, 50, '215/55R17', 94, 'V'],
      ['Limited / Ultimate / N Line (1.6T)', 18, 7.5, 52, '235/45R18', 94, 'V'],
    ], ['Hyundai specifies lug torque as a range: 79–94 lb-ft.', 'Kona N uses 19x8 ET48 with 235/40R19 — not covered.', 'The 3D model shown is the Kona Electric body.'], [],
    ['Whether 16" wheels clear the 1.6T brakes is not confirmed.', 'Wheel offsets come from a single source.']),
    V('r1t-22', 'Rivian', 'R1T', 2022, 2025, 'truck', '5x139.7', 64.1, 'M14x1.5', 'nut', 140, 'direct', [3449, 5514, 2007, 1986], 20, 35.0, [
      ['All-Terrain (20")', 20, 8.5, 48, '275/65R20', 116, 'H'],
      ['Road (21")', 21, 8.5, 48, '275/55R21', 116, 'H'],
    ], ['EV: heavy vehicle — match or exceed the factory load index. Later 22" cars use HL-rated tires; never replace HL with XL.'], [],
    ['21" package and all wheel widths are from forum / retailer listings, not Rivian.', 'Hub bore 64.1 mm comes from a single fitment table — measure before ordering hub rings.', '22" Sport package is not listed because its tire rating could not be confirmed.']),

    // ── Real-3D-model demo ─────────────────────────────────
    V('ferrari458-10', 'Ferrari', '458 Italia (3D demo)', 2010, 2015, 'coupe', '5x114.3', 67.1, 'M14x1.5', 'bolt', 74, 'direct', [2650, 4527, 1937, 1213], 19, null, [
      ['Front axle size', 20, 8.5, 35, '235/35R20', 88, 'Y'],
    ], ['Demo vehicle for the real 3D model viewer. The real car runs staggered wheels (wider rears) — this tool checks square setups only.'],
    [], ['DEMO DATA: these specs were not verified. Do not use this entry to sell parts.']),
  ];

  root.VEHICLES = VEHICLES;
  if (typeof module !== 'undefined') module.exports = VEHICLES;
})(typeof window !== 'undefined' ? window : globalThis);
