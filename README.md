# CWT — Car · Wheel · Tire Fitment Studio

A browser-based counter tool for a wheel and tire shop: pick the customer's vehicle, see which wheels and tires fit and why, and preview the build on a 3D car in their paint color. It is a static site with no backend and no build step.

**Live demo:** https://dbrokenai.github.io/cwt/

## What it does

- **Vehicle lookup.** Search by year, make and model (with aliases), or paste a 17-character VIN to decode it through the free NHTSA vPIC API. Vehicles that are not in the database can be added by hand.
- **Fitment report.** Every wheel and tire in the catalog is checked against the selected vehicle and badged as direct fit, fits with notes, or does not fit. Selecting one shows each check with a plain-language reason.
- **3D preview.** The car is shown with the selected wheel, finish, tire, paint color and ride height. Wheels and tires are drawn to scale: diameter, width, sidewall, offset, lug count and lift.
- **Numbers the salesperson needs.** Overall diameter change, speedometer error at 60 mph, ride height change, revs per mile, how far the wheel moves in or out versus factory, and a cross-section diagram of the wheel position relative to the hub face.
- **Install sheet and print-out.** Lug hardware, hub-centric ring size, TPMS steps and torque, plus a printable fitment sheet with a snapshot of the 3D view and signature lines.
- **Shop inventory.** Add your own wheels and tires in the app; they are saved in the browser and can be exported and imported as JSON.
- **Shareable builds.** The address bar always holds a link to the current vehicle, wheel, tire and suspension choice.
- **Counter tools.** A DOT date-code decoder for tire age, and an AWD tread-depth match check.

### Fitment checks

| Check | Rule |
|---|---|
| Bolt pattern | Must match exactly. Near-misses such as 5x114.3 on 5x115 are called out as not interchangeable. |
| Center bore | Smaller than the hub fails; larger asks for hub-centric rings and gives the ring size. |
| Brake clearance | Wheel diameter must be at least the vehicle's minimum. |
| Wheel load rating | Compared with the factory tire's capacity (the database has no GAWR). |
| Rim width | Wheel must be inside the tire's approved rim-width range (estimated to ±0.5"). |
| Overall diameter | ±3% of factory, plus a per-vehicle maximum at the chosen ride height. Shows speedometer error. |
| Load index | Never below factory. LT-for-P-metric and P-metric-for-LT swaps get the ÷1.1 truck derate. HD trucks require LT. |
| Speed rating | Below factory is a warning; dedicated winter tires get the usual allowance. |
| Inner / fender clearance | Position of the wheel and tire versus the factory package, in mm, from width and offset. |

A red result means do not sell it. Amber means it can work but needs a test-fit, a part, or customer sign-off.

## How it is built

Plain HTML, CSS and JavaScript with three.js r160 (vendored, including the glTF and Draco loaders). No framework, no bundler, no npm dependencies at runtime.

- **Fitment engine as pure functions** (`js/fitment.js`). No DOM access, so the same file runs in the browser and under Node for tests. It parses metric, LT and flotation tire sizes (`225/65R17 102H`, `LT285/70R17 121/118S E`, `35x12.50R17LT 121Q E`), estimates approved rim-width ranges by aspect ratio, and models the wheel and tire as an envelope measured from the hub face to compare against the vehicle's factory packages.
- **Automatic fitting of arbitrary car models** (`js/viewer.js`, `_autoFit`). Community car models arrive with different scales, orientations and their own wheels baked in (10 are bundled). At load time the viewer samples the vertices, finds the length axis, scales to the real vehicle length, locates the axles as the two clusters of ground-contact points (then fine-scales to the true wheelbase), measures the model's own tire radius from connected mesh components using union-find, guesses which end is the front from tail-light-colored materials, and identifies the body-paint material by surface area and name. Per-model overrides live in the manifest for the cases where a guess is wrong.
- **Shader-level wheel removal.** The model's original wheels are cut out with a fragment-shader `discard` injected through `onBeforeCompile` (two cylinders around the axle lines), so the selected wheels can be drawn in the same place without editing the model files.
- **Procedural car, wheels and tires.** A vehicle with no model (36 of the 47), or one whose model fails to load, gets a stylized body per body type sized to the real wheelbase, length, width and height. Wheels are generated from spoke-design parameters; tires are lathe geometry with canvas-generated tread textures and instanced tread blocks for all-terrain and mud-terrain types. The viewer can also load rim and tire GLB models (tire models are re-mapped vertex by vertex so the bead sits on the chosen rim and the tread lands on the true overall diameter), but none are bundled.
- **Works from `file://` or over HTTP.** Opened as a file, the page loads the global three.js build and uses the stylized cars. Served over HTTP, it loads the ES-module build and the glTF loader for the real models.
- **Zero-dependency local server** (`server.js`). About 40 lines of Node `http`, bound to 127.0.0.1, with a path-traversal guard.
- **Model pipeline** (`tools/`). Python and Node scripts that search for candidate models, download and compress them with gltf-transform (Draco geometry, WebP textures), list materials by surface area to find the paint, and generate the manifest entries in `models/models.js`.

## Run it

Use the live demo above, or run it locally:

```
node server.js
```

This serves the folder at `http://localhost:5178` (override with the `CWT_PORT` environment variable) and opens the browser. On Windows you can double-click `Start CWT.bat` instead; it falls back to `python -m http.server` if Node is not installed.

Opening `index.html` directly also works, but with the stylized body for every vehicle. VIN decode needs internet; everything else is offline.

## Tests

```
node tests/fitment.test.js
```

Fourteen tests using Node's built-in `assert`, no test framework. They cover tire-size parsing and each fitment rule, and run data-integrity checks over the whole database: every catalog tire size parses, every factory package passes on its own vehicle, and every vehicle has at least one clean-fitting wheel and tire.

## Project structure

```
index.html            page layout, dialogs, script loading
css/styles.css        styling, including the print sheet
js/fitment.js         fitment engine (pure functions, shared with tests)
js/viewer.js          three.js viewer: model auto-fit, procedural car, wheels, tires, camera
js/app.js             UI state, search, catalog, report, inventory, VIN decode, printing
js/data/              vehicles, tires and wheels
models/               11 car GLB files (models/cars), models.js manifest, SOURCES.md
tools/                model search / ingest / registration scripts (see tools/README.md)
tests/                fitment tests
server.js             local static server
vendor/               three.js r160, GLTFLoader, DRACOLoader, Draco decoder
```

## Data: what is real and what is not

- `js/data/vehicles.js` — 47 vehicle generations. Specs were cross-checked against published fitment tables in November 2026. Where sources disagreed, the row carries a flag that shows in the app as "Confirm before ordering".
- `js/data/tires.js` — 14 real tire lines with sizes, load index and speed rating, cross-checked the same way. The 1–10 bars are guide scores for comparing tire types, not lab data.
- `js/data/wheels.js` — 13 real aftermarket wheel styles (sizes listed are common ones for the style, not confirmed SKUs; drawn with the closest generic spoke design, not a model of the actual wheel), plus **demo wheels** with made-up styles and realistic specs. Replace them with what you stock.

## 3D models and credits

11 of the 47 vehicles have a real 3D body; the other 36 use the stylized procedural body. All wheels and tires are drawn procedurally.

- Ten bodies are CC BY 4.0 models from Sketchfab, obtained through public GitHub repos and fitted automatically at load time: Dodge Charger by Doz3, Dodge Durango SRT 392 by Sketchfab user 890244234, Cadillac Escalade by Es-star kings, Jeep Grand Cherokee Trackhawk by David_Holiday, Hyundai Kona by GT Cars, Subaru Outback by tonielpro520, Rivian R1T by 3dblender_1, Chevrolet Silverado by Ddiaz Design, Kia Sportage by karaman.arman and Chevrolet Suburban by mutebsheheri. They were compressed, and the viewer replaces their wheels and repaints them.
- The Ferrari 458 Italia is from the three.js examples (model by vicent091036).

Titles, source links and licence details are listed per model in `models/SOURCES.md`.

Earlier versions also bundled car bodies from SketchUp 3D Warehouse and truck, rim and tire models from the 4x4builder project. Those had no licence for public redistribution and have been removed. If you add models with the scripts in `tools/`, commit only ones whose licence allows redistribution.

## Status and limitations

- Fitment results are guidance. Clearance is estimated from wheel width and offset relative to the factory package, not measured on the vehicle, and rim-width ranges are approximations. Confirm against the door-jamb placard and test-fit before mounting.
- Square setups only; staggered front and rear sizes are not supported.
- Only 11 of the 47 vehicles have a real 3D body, and there are no rim or tire models; everything else is drawn procedurally.
- No pricing, distributor inventory feed or licensed fitment database. The vehicle database is a hand-built set of 47 generations.
- Inventory and custom vehicles are stored in the browser's `localStorage`, so they are per-device unless exported.
