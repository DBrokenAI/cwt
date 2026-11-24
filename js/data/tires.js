/* Tire catalog — STARTER DATA. Replace / extend with your shop's real inventory (Inventory button in the app).
 *
 * utqg: [treadwear, traction, temperature] from the sidewall, or null (winter and LT tires are exempt from UTQG).
 * ratings: 1–10 CWT guide scores for comparing categories at the counter. They are a sales aid,
 *          not lab data — edit them to match your own experience and the maker's test results.
 * sizes: "<size> <load index><speed> [XL] [load range]" — cross-checked against published spec tables
 *        in Nov 2026, but lines change: always confirm the exact service description with your
 *        distributor before ordering.
 */
(function (root) {
  const T = (id, brand, model, category, tread, utqg, threePMS, warranty, ratings, blurb, sizes) => ({
    id, brand, model, category, tread, utqg, threePMS, ms: tread !== 'summer', warranty,
    ratings: { dry: ratings[0], wet: ratings[1], snow: ratings[2], ice: ratings[3], offroad: ratings[4], comfort: ratings[5], quiet: ratings[6], life: ratings[7] },
    blurb, sizes,
  });

  const TIRES = [
    T('defender2', 'Michelin', 'Defender2', 'All-Season Touring', 'touring', [840, 'B', 'B'], false, 80000,
      [7, 8, 5, 4, 2, 9, 9, 10],
      'Long-life commuter tire. The pick when the customer says "I just want them to last."',
      ['205/55R16 91H', '215/55R16 97H XL', '215/60R16 95H', '205/65R16 95H', '215/55R17 94H', '225/50R17 98H XL', '215/50R17 95H XL', '225/65R17 102H', '235/65R17 104H',
        '225/60R18 100H', '235/60R18 107H XL', '235/45R18 98H XL', '235/55R19 105H XL', '225/55R19 99H', '235/50R19 103H XL', '235/65R18 106H']),

    T('crossclimate2', 'Michelin', 'CrossClimate2', 'All-Weather', 'allweather', [640, 'B', 'A'], true, 60000,
      [8, 9, 8, 6, 2, 8, 7, 8],
      'Year-round tire with a real winter rating (3PMSF). Best single-set answer where it snows but not enough for a second set.',
      ['205/55R16 91H', '215/55R16 97H XL', '215/55R17 94V', '225/50R17 98V XL', '215/50R17 95V XL', '225/65R17 102H', '235/65R17 104H', '225/60R18 100H', '235/60R18 107H XL',
        '235/45R18 98V XL', '235/65R18 106V', '245/60R18 105H', '235/55R19 105V XL', '235/40R19 96V XL', '255/55R20 110V XL', '235/55R20 102V', '245/50R20 102V', '255/45R19 104V XL', '255/40R20 101V XL']),

    T('altimaxrt45', 'General', 'AltiMAX RT45', 'All-Season Touring', 'touring', [700, 'A', 'A'], false, 75000,
      [7, 7, 5, 3, 2, 8, 8, 9],
      'Value touring tire with a long warranty (75k miles on T/H sizes, 65k on V). Solid budget option that does not feel like one.',
      ['195/65R15 91H', '205/55R16 91H', '215/55R16 97H XL', '215/60R16 95H', '205/65R16 95H', '215/55R17 94V', '225/50R17 98V XL', '215/50R17 95V XL', '215/65R17 99T',
        '225/65R17 102H', '235/65R17 104H', '225/60R18 100H', '235/45R18 98V XL', '235/60R18 107H XL']),

    T('dws06plus', 'Continental', 'ExtremeContact DWS06 Plus', 'Ultra-High-Performance All-Season', 'performance', [560, 'AA', 'A'], false, 50000,
      [9, 9, 6, 4, 1, 7, 7, 7],
      'Sporty all-season: sharp steering and strong wet grip without giving up light-snow usability.',
      ['215/50R17 95W XL', '225/45R17 91W', '235/45R17 94W', '235/55R17 99W', '225/50R17 94W', '225/40R18 92Y XL', '225/45R18 91Y', '235/40R18 95Y XL', '245/40R18 97Y XL', '235/45R18 98Y XL',
        '235/50R18 97W', '245/50R18 100W', '225/40R19 93Y XL', '235/40R19 96W XL', '255/40R19 100Y XL', '245/40R20 99Y XL', '245/45R20 103Y XL', '255/40R20 101Y XL', '255/45R19 104W XL']),

    T('ps4s', 'Michelin', 'Pilot Sport 4S', 'Max Performance Summer', 'summer', [300, 'AA', 'A'], false, 30000,
      [10, 10, 1, 1, 1, 6, 6, 5],
      'Benchmark summer tire: maximum dry and wet grip. Not for use near freezing — the compound hardens below ~45°F.',
      ['225/45R17 94Y XL', '235/45R17 97Y XL', '225/40R18 92Y XL', '225/45R18 95Y XL', '235/40R18 95Y XL', '245/40R18 97Y XL', '235/45R18 98Y XL', '225/40R19 93Y XL', '235/40R19 96Y XL',
        '255/40R19 100Y XL', '235/35R20 92Y XL', '245/40R20 99Y XL', '255/40R20 101Y XL', '245/45R20 103Y XL']),

    T('ws90', 'Bridgestone', 'Blizzak WS90', 'Studless Winter', 'winter', null, true, 0,
      [5, 7, 10, 10, 2, 7, 6, 4],
      'Dedicated winter tire for cars. Unmatched ice and packed-snow braking; remove when temperatures stay above ~45°F.',
      ['195/65R15 91H', '205/55R16 91H', '215/55R16 97H XL', '215/60R16 95H', '205/65R16 95T', '215/55R17 94H', '225/50R17 94H', '215/50R17 95H XL', '225/45R17 91H', '235/45R17 97H XL',
        '225/40R18 92H XL', '235/45R18 94H', '245/40R18 97H XL']),

    T('dmv2', 'Bridgestone', 'Blizzak DM-V2', 'Studless Winter (SUV / Truck)', 'winter', null, true, 0,
      [5, 7, 10, 9, 4, 7, 6, 4],
      'Dedicated winter tire for crossovers, SUVs and trucks.',
      ['225/65R17 102S', '235/65R17 108S XL', '225/60R18 100S', '235/60R18 107S XL', '235/65R18 106S', '245/60R18 105S', '235/55R19 105T XL', '255/55R20 107T', '245/50R20 102T',
        '265/70R17 115R', '265/65R17 112R', '265/65R18 112R', '275/65R18 114R', '265/60R18 110R', '275/55R20 117T XL', '275/60R20 115R', '255/65R18 109S']),

    T('ltxms2', 'Michelin', 'Defender LTX M/S2', 'Highway All-Season (Truck / SUV)', 'highway', [820, 'B', 'A'], false, 70000,
      [8, 8, 5, 4, 4, 9, 9, 10],
      'Quiet, long-wearing highway tire for trucks and SUVs. The default for towing and daily driving on pavement. 70k-mile warranty on T/H sizes, 50k on LT.',
      ['245/70R17 114T XL', '255/70R17 116T XL', '265/70R17 116T XL', '265/65R17 116T XL', '265/70R16 116T XL', '265/65R18 116T XL', '265/60R18 114H XL', '275/65R18 116T', '265/70R18 116T',
        '255/70R18 116T XL', '265/50R20 111H XL', '275/55R20 117T XL', '275/60R20 116H XL', '265/60R20 115H XL', '275/65R20 116H XL', '275/50R22 115H XL', '285/45R22 114H XL',
        'LT245/75R17 121S E', 'LT265/70R17 123S E', 'LT275/70R18 125S E']),

    T('attrail', 'Falken', 'Wildpeak A/T Trail', 'All-Terrain (Crossover)', 'at', [680, 'A', 'A'], true, 65000,
      [7, 7, 8, 5, 6, 7, 7, 8],
      'Light all-terrain built for crossovers: gravel-road toughness and a winter rating without the truck-tire ride.',
      ['225/65R17 102H', '235/65R17 108H XL', '225/60R18 100H', '235/60R18 107H XL', '235/65R18 106H', '245/60R18 105H', '235/55R19 105V XL', '255/55R20 110V XL', '245/50R20 102V', '255/65R18 111H']),

    T('at3w', 'Falken', 'Wildpeak A/T3W', 'All-Terrain', 'at', [660, 'A', 'B'], true, 55000,
      [7, 8, 8, 5, 8, 6, 6, 8],
      'All-terrain with deep tread and a winter rating. Strong wet grip for an A/T; a good value against the big names. Being replaced by the Wildpeak A/T4W — check availability.',
      ['245/75R16 112T XL', '265/70R16 112T', '245/70R17 114T XL', '255/70R17 112T', '265/70R17 115T', '265/65R17 116T XL', '245/75R17 112T', '255/70R18 113T', '265/65R18 114T', '265/60R18 114T XL',
        '275/65R18 116T', '265/70R18 116T', '275/55R20 117T XL', '275/60R20 115T', '255/70R16 115T XL',
        'LT265/70R17 121S E', 'LT285/70R17 121S E', 'LT275/70R18 125S E', 'LT275/65R20 126S E', 'LT285/60R20 125R E', 'LT245/75R17 121S E', 'LT285/75R17 121S E']),

    Object.assign(T('toyomt', 'Toyo', 'Open Country M/T', 'Mud-Terrain', 'mt', null, false, 0,
      [5, 5, 4, 2, 10, 4, 3, 7],
      'Heavy-duty mud-terrain with a long-wearing compound. Sizes and ratings here were not cross-checked — confirm with your distributor.',
      ['LT285/70R17 121P E', 'LT285/75R17 121P E', 'LT275/70R18 125P E', '35x12.50R17LT 121Q E', '35x12.50R20LT 121Q E', '37x12.50R17LT 124Q D']), {}),

    T('ko2', 'BFGoodrich', 'All-Terrain T/A KO2', 'All-Terrain', 'at', null, true, 50000,
      [7, 6, 8, 5, 9, 5, 5, 8],
      'The classic tough all-terrain: reinforced sidewalls and off-road traction. Firmer and louder on the highway. Being phased out for the KO3 — check availability.',
      ['LT245/75R16 120S E', 'LT265/70R16 121S E', 'LT265/70R17 121S E', 'LT265/65R17 120S E', 'LT255/75R17 111S C', 'LT245/75R17 121S E', 'LT245/70R17 119S E', 'LT285/70R17 121R E', 'LT285/75R17 121S E',
        'LT265/60R18 119S E', 'LT265/65R18 122R E', 'LT275/65R18 123R E', 'LT275/70R18 125R E', 'LT285/65R18 125R E', 'LT265/70R18 124R E',
        'LT275/55R20 115S D', 'LT275/60R20 119S D', 'LT275/65R20 126S E', 'LT285/55R20 117T D', 'LT285/60R20 125S E', '35x12.50R17LT 121R E', '35x12.50R20LT 121R E', '33x12.50R17LT 120S E']),

    T('ridgegrappler', 'Nitto', 'Ridge Grappler', 'Hybrid Terrain (A/T × M/T)', 'mt', null, false, 0,
      [6, 6, 5, 3, 9, 5, 5, 7],
      'Aggressive hybrid: mud-terrain looks and bite with all-terrain road manners. The lifted-truck favorite.',
      ['LT265/70R17 121Q E', 'LT285/70R17 121Q E', 'LT285/75R17 121Q E', 'LT275/65R18 123Q E', 'LT275/70R18 125Q E', 'LT285/65R18 125Q E', 'LT275/60R20 123Q E', 'LT275/65R20 126Q E',
        'LT285/55R20 122Q E', 'LT285/60R20 125Q E', 'LT305/55R20 125Q F', '35x12.50R17LT 121Q E', '35x12.50R18LT 128Q F', '35x12.50R20LT 125Q F', '33x12.50R20LT 119Q F', '37x12.50R17LT 124Q D']),

    T('km3', 'BFGoodrich', 'Mud-Terrain T/A KM3', 'Mud-Terrain', 'mt', null, false, 0,
      [5, 5, 4, 2, 10, 3, 2, 6],
      'Purpose-built for mud and rock. Loud on pavement and weak on ice — sell it to customers who really go off-road.',
      ['LT255/75R17 111Q C', 'LT265/70R17 121Q E', 'LT285/70R17 121Q E', 'LT285/75R17 121Q E', 'LT275/70R18 125Q E', 'LT285/65R18 125Q E', '35x12.50R17LT 121Q E', '35x12.50R20LT 121Q E', '37x12.50R17LT 124Q D']),

    T('psas4', 'Michelin', 'Pilot Sport All Season 4', 'Ultra-High-Performance All-Season', 'performance', [540, 'AA', 'A'], false, 45000,
      [10, 9, 6, 4, 1, 7, 7, 7],
      'Near-summer-tire grip that still works in the cold. A strong match for EVs and sport sedans driven year-round.',
      ['225/45R17 94Y XL', '235/45R17 97Y XL', '225/40R18 92Y XL', '225/45R18 95Y XL', '235/40R18 95Y XL', '245/40R18 97Y XL', '235/45R18 98Y XL', '235/50R18 101Y XL', '225/40R19 93Y XL', '235/40R19 96Y XL',
        '255/40R19 100Y XL', '255/45R19 104Y XL', '235/35R20 92Y XL', '245/40R20 99Y XL', '255/40R20 101Y XL', '245/45R20 103Y XL']),
  ];

  // UTQG traction grade = straight-line wet braking on government test surfaces (does not cover cornering or hydroplaning).
  const UTQG_TRACTION = {
    AA: 'Highest wet-braking grade (above 0.54 g on wet asphalt).',
    A: 'Strong wet braking (above 0.47 g on wet asphalt).',
    B: 'Acceptable wet braking (above 0.38 g on wet asphalt).',
    C: 'Lowest passing grade (0.38 g or less on wet asphalt).',
  };
  const UTQG_TEMP = { A: 'Resists heat above 115 mph.', B: 'Resists heat between 100 and 115 mph.', C: 'Resists heat between 85 and 100 mph.' };

  // A tire can name a real 3D tread model with `model3d: 'models/tires/<file>.glb'`. None ship at the moment
  // (the earlier ones had no redistribution licence), so every tire is drawn procedurally.

  root.TIRES = TIRES; root.UTQG_TRACTION = UTQG_TRACTION; root.UTQG_TEMP = UTQG_TEMP;
  if (typeof module !== 'undefined') module.exports = { TIRES, UTQG_TRACTION, UTQG_TEMP };
})(typeof window !== 'undefined' ? window : globalThis);
