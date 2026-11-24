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
 * Only models with a licence that allows redistribution are listed here (see SOURCES.md). No rim or tire
 * models ship at the moment, so wheels and tires are drawn procedurally; oeRim is still supported.
 */
(function (root) {
  root.CAR_MODELS = {
    // <auto> complete-car models fitted automatically (generated — edit flip / paint / drop per car if one looks wrong)
    'charger-14': {"file": "models/cars/charger-14.glb", "name": "Ddoge Charger SXT 2020", "credit": "\"Ddoge Charger SXT 2020\" by Doz3, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["Meshpart10Mtl"]},
    'durango-14': {"file": "models/cars/durango-14.glb", "name": "Dodge Durango SRT 392", "credit": "\"Dodge Durango SRT 392\" by Sketchfab user 890244234, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["Meshpart12Mtl"]},
    'escalade-21': {"file": "models/cars/escalade-21.glb", "name": "2021 Cadillac escalade premium luxury", "credit": "\"2021 Cadillac escalade premium luxury\" by Es-star kings, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["car_body"]},
    'grandcherokee-14': {"file": "models/cars/grandcherokee-14.glb", "name": "Jeep Grand Cherokee Trackhawk", "credit": "\"Jeep Grand Cherokee Trackhawk\" by David_Holiday, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["Body"]},
    'kona-18': {"file": "models/cars/kona-18.glb", "name": "Hyundai Kona", "credit": "\"Hyundai Kona\" by GT Cars, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["CeramicBlue"]},
    'outback-20': {"file": "models/cars/outback-20.glb", "name": "2022 Subaru Outback", "credit": "\"2022 Subaru Outback\" by tonielpro520, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["Autumn_Green_Metallic"]},
    'r1t-22': {"file": "models/cars/r1t-22.glb", "name": "Rivian R1T 2022 [Free!]", "credit": "\"Rivian R1T 2022 [Free!]\" by 3dblender_1, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["Material.008"]},
    'silverado-19': {"file": "models/cars/silverado-19.glb", "name": "2020 Chevrolet Silverado 1500 RST", "credit": "\"2020 Chevrolet Silverado 1500 RST\" by Ddiaz Design, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["B4W_carpaint"]},
    'sportage-23': {"file": "models/cars/sportage-23.glb", "name": "Kia Sportage", "credit": "\"Kia Sportage\" by karaman.arman, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["Wolf_Gray.001"]},
    'suburban-15': {"file": "models/cars/suburban-15.glb", "name": "2015 Chevy Suburban", "credit": "\"2015 Chevy Suburban\" by mutebsheheri, Sketchfab, CC BY 4.0 (compressed; wheels replaced and body repainted at run time)", "auto": true, "paint": ["default"]},
    // </auto>
    'ferrari458-10': { file: 'models/cars/ferrari.glb', name: 'Ferrari 458 Italia', credit: 'Ferrari 458 Italia model by vicent091036, from the three.js examples',
      front: '-z', wheels: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'], paint: ['Body_Color'], glass: ['Glass_Gray'] },
  };
})(window);
