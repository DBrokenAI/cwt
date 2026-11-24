# 3D model sources

Only models whose licence allows redistribution are kept in this repository.

## Vehicle bodies fitted automatically (CC BY 4.0)

| Vehicle id | File | Title | Author | Source | Obtained via | Licence |
|---|---|---|---|---|---|---|
| charger-14 | `charger-14.glb` | Ddoge Charger SXT 2020 | [Doz3](https://sketchfab.com/Doz3) | [Sketchfab](https://sketchfab.com/3d-models/ddoge-charger-sxt-2020-a2392ad37e044a50846233e0e2103d11) | [github.com/djamelhemch/topdzmotors](https://github.com/djamelhemch/topdzmotors) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| durango-14 | `durango-14.glb` | Dodge Durango SRT 392 | [Sketchfab user 890244234](https://sketchfab.com/890244234) | [Sketchfab](https://sketchfab.com/3d-models/dodge-durango-srt-392-ff66f958267b479ebe8fd0780277bcba) | [github.com/sundaymoore313-tech/mygarage](https://github.com/sundaymoore313-tech/mygarage) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| escalade-21 | `escalade-21.glb` | 2021 Cadillac escalade premium luxury | [Es-star kings](https://sketchfab.com/KINGSLEY_king) | [Sketchfab](https://sketchfab.com/3d-models/2021-cadillac-escalade-premium-luxury-3a63c01d768840aaacbd22cfc5885583) | [github.com/ritesh-kumar289/cars-landing-page](https://github.com/ritesh-kumar289/cars-landing-page) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| grandcherokee-14 | `grandcherokee-14.glb` | Jeep Grand Cherokee Trackhawk | [David_Holiday](https://sketchfab.com/David_Holiday) | [Sketchfab](https://sketchfab.com/3d-models/jeep-grand-cherokee-trackhawk-f8024595e11c48119877c9c7cc554abc) | [github.com/kavinda9210/3Dmodels](https://github.com/kavinda9210/3Dmodels) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| kona-18 | `kona-18.glb` | Hyundai Kona | [GT Cars](https://sketchfab.com/Car2022) | [Sketchfab](https://sketchfab.com/3d-models/hyundai-kona-343a128d7284471b91e7c4575910722e) | [github.com/amitpatharkar/gtb](https://github.com/amitpatharkar/gtb) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| outback-20 | `outback-20.glb` | 2022 Subaru Outback | [tonielpro520](https://sketchfab.com/tonielpro520) | [Sketchfab](https://sketchfab.com/3d-models/2022-subaru-outback-a44abee6689e429881209fc6299f505c) | [github.com/ibasin/FSCSharp](https://github.com/ibasin/FSCSharp) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| r1t-22 | `r1t-22.glb` | Rivian R1T 2022 [Free!] | [3dblender_1](https://sketchfab.com/3dblender_1) | [Sketchfab](https://sketchfab.com/3d-models/rivian-r1t-2022-free-89ec895feb8145768f93382f356affb5) | [github.com/vinayanand3/jeep-threejs-3d](https://github.com/vinayanand3/jeep-threejs-3d) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| silverado-19 | `silverado-19.glb` | 2020 Chevrolet Silverado 1500 RST | [Ddiaz Design](https://sketchfab.com/ddiaz-design) | [Sketchfab](https://sketchfab.com/3d-models/2020-chevrolet-silverado-1500-rst-6a0be94fec824513bffe48df57d0b17a) | [github.com/Jhan-ux/lanzamiento_suvs](https://github.com/Jhan-ux/lanzamiento_suvs) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| sportage-23 | `sportage-23.glb` | Kia Sportage | [karaman.arman](https://sketchfab.com/karaman.arman) | [Sketchfab](https://sketchfab.com/3d-models/kia-sportage-98a84407998a4bc6b4dee912b289f15b) | [github.com/adi-Git-Hub/final-3d-road-car-application](https://github.com/adi-Git-Hub/final-3d-road-car-application) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| suburban-15 | `suburban-15.glb` | 2015 Chevy Suburban | [mutebsheheri](https://sketchfab.com/mutebsheheri) | [Sketchfab](https://sketchfab.com/3d-models/2015-chevy-suburban-826772004d98441d814334ad2a909133) | [github.com/Jhan-ux/lanzamiento_suvs](https://github.com/Jhan-ux/lanzamiento_suvs) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

Author, title, source and licence are taken from the metadata Sketchfab embeds in each file (`asset.extras`), which is still present in the GLBs here.

Changes made: each file was compressed with gltf-transform (Draco geometry, WebP textures). At run time the viewer rescales the model to the real vehicle, hides its original wheels and repaints the body. No endorsement by the authors is implied.

## Ferrari 458 Italia

`cars/ferrari.glb` (vehicle id `ferrari458-10`) is the model shipped with the [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf), credited there as "Ferrari 458 Italia model by vicent091036". The three.js repository is MIT-licensed; the model carries no separate licence statement in this repo.

## Removed models

Models without a licence for public redistribution were removed from the repository: 30 car bodies from SketchUp 3D Warehouse, and 6 truck/SUV bodies, 15 rims and 7 tire treads from the 4x4builder project (which has no licence file). Those vehicles now use the stylized procedural body, and all wheels and tires are drawn procedurally. To add a model, commit it only if its licence allows redistribution, and record the author, source and licence here.
