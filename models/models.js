/* 3D model manifest: maps real glTF/GLB files to vehicles.
 *
 * Two kinds of car file are supported:
 *
 * 1. Body without wheels, origin on the axle line midway between the axles:
 *      { file, name, credit, front, axle: { wb, half, drop?, shift? }, oeRim? }
 *    wb    = wheelbase of the model (m)
 *    half  = distance from the centreline to the middle of the factory tire (m)
 *    drop  = optional vertical nudge of the body (m); shift = optional fore/aft nudge
 *    oeRim = rim model to show as the factory wheel
 *
 * 2. Complete car with its own wheels as four separate nodes:
 *      { file, name, credit, front, wheels: [four node names], paint: [...], glass: [...] }
 *    CWT hides those wheels, measures where they were, and draws the selected wheels there.
 *
 * front = which way the nose points in the file: '+x' | '-x' | '+z' | '-z'.
 * Materials named body / glass / chrome / black / headlight… are styled automatically.
 *
 * The truck, rim and tire models come from the open-source 4x4builder project. No licence file
 * ships with them, so treat them as an in-store preview only.
 */
(function (root) {
  const SRC = '4x4builder project model (licence not stated — in-store preview only)';
  root.CAR_MODELS = {
    '4runner-10': { file: 'models/cars/4runner.glb', name: 'Toyota 4Runner (5th gen, 2014+)', credit: SRC, front: '+z', axle: { wb: 2.789, half: 0.80 }, oeRim: 'models/rims/toyota_4runner.glb' },
    'bronco-21': { file: 'models/cars/bronco.glb', name: 'Ford Bronco (6th gen)', credit: SRC, front: '+z', axle: { wb: 2.95, half: 0.85 }, oeRim: 'models/rims/ford_bronco.glb' },
    'ram1500-19': { file: 'models/cars/ram1500.glb', name: 'Ram 1500 Crew Cab (2019+)', credit: SRC, front: '+z', axle: { wb: 3.453, half: 0.85 } },
    'tacoma-05': { file: 'models/cars/tacoma2g.glb', name: 'Toyota Tacoma (2nd gen)', credit: SRC, front: '+z', axle: { wb: 3.245, half: 0.81 }, oeRim: 'models/rims/toyota_4runner.glb' },
    'tundra-07': { file: 'models/cars/tundra2g.glb', name: 'Toyota Tundra CrewMax (2nd gen)', credit: SRC, front: '+z', axle: { wb: 3.7, half: 0.85 }, oeRim: 'models/rims/toyota_4runner.glb' },
    'wrangler-07': { file: 'models/cars/jku.glb', name: 'Jeep Wrangler Unlimited (JK)', credit: SRC, front: '+z', axle: { wb: 2.946, half: 0.80 } },
    // <auto> complete-car models fitted automatically (generated — edit flip / paint / drop per car if one looks wrong)
    'accord-18': {"file": "models/cars/accord-18.glb", "name": "2019 Honda Accord LX", "credit": "model by Ghøst, 3D Warehouse", "auto": true, "paint": ["Platinum White Metallic"]},
    'altima-19': {"file": "models/cars/altima-19.glb", "name": "Nissan Altima 2022", "credit": "model by David W., 3D Warehouse", "auto": true, "paint": ["Material_01", "Material_02"]},
    'bmw3-19': {"file": "models/cars/bmw3-19.glb", "name": "BMW ALPINA B3 (3 Series) Touring - Stance", "credit": "model by White Horse AutoGarage, 3D Warehouse", "auto": true, "paint": ["Dravit Gray Metallic"], "hide": ["Color_004"]},
    'camaro-16': {"file": "models/cars/camaro-16.glb", "name": "Chevrolet Camaro 2020", "credit": "model by Studio.MKS, 3D Warehouse", "auto": true, "paint": ["vehicle_gene.003"]},
    'camry-18': {"file": "models/cars/camry-18.glb", "name": "2023 Toyota Camry 2.5 Premium", "credit": "model by Cartoon, 3D Warehouse", "auto": true, "paint": ["body color"]},
    'charger-14': {"file": "models/cars/charger-14.glb", "name": "Ddoge Charger SXT 2020", "credit": "\"Ddoge Charger SXT 2020\" from Sketchfab, CC-BY-4.0, via github.com/djamelhemch/topdzmotors", "auto": true, "paint": ["Meshpart10Mtl"]},
    'civic-16': {"file": "models/cars/civic-16.glb", "name": "2020 Honda Civic 1.8 EL", "credit": "model by Cartoon, 3D Warehouse", "auto": true, "paint": ["body color"]},
    'corolla-20': {"file": "models/cars/corolla-20.glb", "name": "Toyota Corolla 2020", "credit": "model by Studio.MKS, 3D Warehouse", "auto": true, "paint": ["Mat_sultan.2.003"]},
    'crv-17': {"file": "models/cars/crv-17.glb", "name": "2020 Honda CR-V", "credit": "model by Cartoon, 3D Warehouse", "auto": true},
    'cx5-17': {"file": "models/cars/cx5-17.glb", "name": "visiōn | Mazda - CX-5 Signature 2021", "credit": "model by visionarq.mx, 3D Warehouse", "auto": true, "paint": ["_car carpaint"]},
    'durango-14': {"file": "models/cars/durango-14.glb", "name": "Dodge Durango SRT 392", "credit": "\"Dodge Durango SRT 392\" from Sketchfab, CC-BY-4.0, via github.com/sundaymoore313-tech/mygarage", "auto": true, "paint": ["Meshpart12Mtl"]},
    'elantra-21': {"file": "models/cars/elantra-21.glb", "name": "2021 Hyundai Elantra 240T (CN-Spec)", "credit": "model by Ghøst, 3D Warehouse", "auto": true, "paint": ["_CarPaint"]},
    'equinox-18': {"file": "models/cars/equinox-18.glb", "name": "Chevrolet Equinox", "credit": "model by Studio.MKS, 3D Warehouse", "auto": true, "paint": ["cromado"]},
    'escalade-21': {"file": "models/cars/escalade-21.glb", "name": "2021 Cadillac escalade premium luxury", "credit": "\"2021 Cadillac escalade premium luxury\" from Sketchfab, CC-BY-4.0, via github.com/ritesh-kumar289/cars-landing-page", "auto": true, "paint": ["car_body"]},
    'explorer-20': {"file": "models/cars/explorer-20.glb", "name": "2023 Ford Explorer -  Limited", "credit": "model by 3DModels by Vehi3d Project, 3D Warehouse", "auto": true, "paint": ["Explorer white"]},
    'f150-15': {"file": "models/cars/f150-15.glb", "name": "2015 Ford F150 King Ranch Edition", "credit": "model by ☆PETERBILT1993☆, 3D Warehouse", "auto": true, "paint": ["beige ford"]},
    'f150-21': {"file": "models/cars/f150-21.glb", "name": "2024 Ford F-150 - XLT", "credit": "model by 3DModels by Vehi3d Project, 3D Warehouse", "auto": true, "paint": ["Carro Pintura"]},
    'f250-17': {"file": "models/cars/f250-17.glb", "name": "2018 Ford F-250 - XLT - Blue Jeans Metallic", "credit": "model by 3DModels by Vehi3d Project, 3D Warehouse", "auto": true, "paint": ["Ford Body Color"]},
    'golf-15': {"file": "models/cars/golf-15.glb", "name": "2015 Volkswagen Golf 7 Highline TSI", "credit": "model by Daly, 3D Warehouse", "auto": true, "paint": ["body"]},
    'grandcherokee-14': {"file": "models/cars/grandcherokee-14.glb", "name": "Jeep Grand Cherokee Trackhawk", "credit": "\"Jeep Grand Cherokee Trackhawk\" from Sketchfab, CC-BY-4.0, via github.com/kavinda9210/3Dmodels", "auto": true, "paint": ["Body"]},
    'gti-15': {"file": "models/cars/gti-15.glb", "name": "volkswagen golf gti 2016", "credit": "model by Firas Somai, 3D Warehouse", "auto": true, "paint": ["body1"]},
    'highlander-20': {"file": "models/cars/highlander-20.glb", "name": "2021 Toyota Highlander Platinum AWD", "credit": "model by Ghøst, 3D Warehouse", "auto": true, "paint": ["Blizzard Pearl"]},
    'kona-18': {"file": "models/cars/kona-18.glb", "name": "Hyundai Kona", "credit": "\"Hyundai Kona\" from Sketchfab, CC-BY-4.0, via github.com/amitpatharkar/gtb", "auto": true, "paint": ["CeramicBlue"]},
    'model3-17': {"file": "models/cars/model3-17.glb", "name": "2018 Tesla Model 3", "credit": "model by Ghøst, 3D Warehouse", "auto": true, "paint": ["Model 3_Body"]},
    'modely-20': {"file": "models/cars/modely-20.glb", "name": "2020 Tesla Model Y", "credit": "model by Ghøst, 3D Warehouse", "auto": true, "paint": ["Model Y_body"]},
    'mustang-15': {"file": "models/cars/mustang-15.glb", "name": "Ford Mustang 2022", "credit": "model by Gesan Arhosmunt, 3D Warehouse", "auto": true, "paint": ["CSR2_CarPaint"]},
    'outback-20': {"file": "models/cars/outback-20.glb", "name": "2022 Subaru Outback", "credit": "\"2022 Subaru Outback\" from Sketchfab, CC-BY-4.0, via github.com/ibasin/FSCSharp", "auto": true, "paint": ["Autumn_Green_Metallic"]},
    'r1t-22': {"file": "models/cars/r1t-22.glb", "name": "Rivian R1T 2022 [Free!]", "credit": "\"Rivian R1T 2022 [Free!]\" from Sketchfab, CC-BY-4.0, via github.com/vinayanand3/jeep-threejs-3d", "auto": true, "paint": ["Material.008"]},
    'ram2500-14': {"file": "models/cars/ram2500-14.glb", "name": "2020 New RAM 2500", "credit": "model by Studio.MKS, 3D Warehouse", "auto": true, "paint": ["[Color A05]"]},
    'rav4-19': {"file": "models/cars/rav4-19.glb", "name": "2021 Toyota RAV4 Hybrid", "credit": "model by Ghøst, 3D Warehouse", "auto": true, "paint": ["Silver Sky Metallic"]},
    'rogue-21': {"file": "models/cars/rogue-21.glb", "name": "2022 Nissan Rogue", "credit": "model by Ghøst, 3D Warehouse", "auto": true, "paint": ["Pearl_White_Tricoat"]},
    'silverado-19': {"file": "models/cars/silverado-19.glb", "name": "2020 Chevrolet Silverado 1500 RST", "credit": "\"2020 Chevrolet Silverado 1500 RST\" from Sketchfab, CC-BY-4.0, via github.com/Jhan-ux/lanzamiento_suvs", "auto": true, "paint": ["B4W_carpaint"]},
    'sportage-23': {"file": "models/cars/sportage-23.glb", "name": "Kia Sportage", "credit": "\"Kia Sportage\" from Sketchfab, CC-BY-4.0, via github.com/adi-Git-Hub/final-3d-road-car-application", "auto": true, "paint": ["Wolf_Gray.001"]},
    'suburban-15': {"file": "models/cars/suburban-15.glb", "name": "2015 Chevy Suburban", "credit": "\"2015 Chevy Suburban\" from Sketchfab, CC-BY-4.0, via github.com/Jhan-ux/lanzamiento_suvs", "auto": true, "paint": ["default"]},
    'tacoma-16': {"file": "models/cars/tacoma-16.glb", "name": "Toyota Tacoma 2017", "credit": "model by Studio.MKS, 3D Warehouse", "auto": true, "paint": ["Mat_rancher..012"]},
    'tahoe-21': {"file": "models/cars/tahoe-21.glb", "name": "2021 Chevrolet Tahoe RST", "credit": "model by Ghøst, 3D Warehouse", "auto": true, "paint": ["_PAINT_1_"]},
    'telluride-20': {"file": "models/cars/telluride-20.glb", "name": "2022 Kia Telluride", "credit": "model by Ghøst, 3D Warehouse", "auto": true, "paint": ["Gravity_Gray"]},
    'tundra-22': {"file": "models/cars/tundra-22.glb", "name": "2023 Toyota Tundra  (CrewMax) - 1794 Edition", "credit": "model by 3DModels by Vehi3d Project, 3D Warehouse", "auto": true, "paint": ["paint-glossy_primary"]},
    'wrangler-18': {"file": "models/cars/wrangler-18.glb", "name": "Jeep Wrangler Sahara - 2021", "credit": "model by Heng Hout, 3D Warehouse", "auto": true, "paint": ["_carpaint"]},
    'wrx-15': {"file": "models/cars/wrx-15.glb", "name": "2015 Subaru Impreza WRX STI", "credit": "model by Kavinash, 3D Warehouse", "auto": true, "paint": ["Matte: FFFFFFFF1"]},
    // </auto>
    'ferrari458-10': { file: 'models/cars/ferrari.glb', name: 'Ferrari 458 Italia', credit: 'model by vicent091036, from the three.js examples (licence not verified — in-store preview only)',
      front: '-z', wheels: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'], paint: ['Body_Color'], glass: ['Glass_Gray'] },
  };
})(window);
