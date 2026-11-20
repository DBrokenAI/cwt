# Model tools

How the real car bodies were added. Needs Python 3 and Node, plus `npm i @gltf-transform/cli draco3dgltf` in a scratch folder.

1. `find_models.py` searches 3D Warehouse and the Objaverse index for each vehicle and writes `cands.json` plus thumbnail contact sheets. It expects `object-paths.json.gz` and `cars_all.json` (Objaverse metadata) beside it.
2. Look at the sheets, choose a candidate number per vehicle, and put it in `PICK` in `ingest_models.py`. That script downloads each GLB and shrinks it with gltf-transform (about 20 MB down to about 1 MB) into `models/cars/`.
3. `list_materials.mjs` prints each model's materials by surface area and colour. Use it to find the body-paint material and record it in `overrides.json` (`paint`, and optionally `flip`, `hide`, `drop`).
4. `register_models.py` writes the entries into `models/models.js`.

The viewer does the rest at load time: orientation, scale to the real wheelbase, finding the wheels, cutting them out and repainting.
