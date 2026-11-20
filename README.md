# CWT — Car · Wheel · Tire Fitment Studio

A counter tool for a wheel and tire shop: pick the customer's vehicle, see which wheels and tires fit and why, and preview the build on a 3D car in their paint color.

## Run it

Double-click `Start CWT.bat`. It serves the folder to this PC only and opens CWT in the browser; this is what lets it load real 3D model files. Opening `index.html` directly still works, but only with the stylized cars. VIN decode needs internet; everything else is offline.

## Real 3D models

Every vehicle in the database (41) has a real 3D body. Thirty-four were found on SketchUp 3D Warehouse and Objaverse and are fitted automatically when they load: CWT scales the model to the real wheelbase, finds its wheels, removes them and mounts the selected wheels in their place. Six trucks and SUVs plus thirteen wheel styles and three tire treads come from the 4x4builder project; real wheels and treads are marked "Real 3D" in the lists.

None of these models ships with a licence for this use, so treat them as an in-store preview, not something to publish. Sources and authors are listed in `models/SOURCES.md`. `tools/README.md` explains how to add more vehicles.

## What it checks

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

## Data: what is real and what is not

- `js/data/vehicles.js` — 37 vehicle generations. Specs were cross-checked against published fitment tables in November 2026. Where sources disagreed, the row carries a flag that shows in the app as "Confirm before ordering".
- `js/data/tires.js` — 14 real tire lines with sizes, load index and speed rating, cross-checked the same way. The 1–10 bars are guide scores for comparing tire types, not lab data.
- `js/data/wheels.js` — **demo wheels**. The styles are made up so the tool has something to show; the specs are realistic. Replace them with what you stock.

Add your own wheels and tires with the **Inventory** button (saved in the browser, with JSON export and import), or edit the data files. Add vehicles that are missing with **+ Custom vehicle**.

The 3D car is a stylized body per body type, sized to the real wheelbase, length, width and height. The wheels and tires are true to scale: diameter, width, sidewall, offset, lug count and ride height.

## Tests

```
node tests/fitment.test.js
```

Covers the fitment rules, and checks that every factory package passes on its own vehicle.

## Upgrade roadmap

Ranked by value for the effort.

1. **License real fitment data.** Wheel-Size.com's API covers 60,000+ vehicle variants with bolt pattern, bore, thread, torque and OE sizes. Plans start around $450–750 a year, with a free sandbox. Its terms require live calls rather than a stored copy. This replaces the 37-vehicle database.
2. **Load distributor inventory and pricing.** Wheel Pros offers dealer data feeds with bolt pattern, bore and offset; Tireweb and TireConnect offer live inventory and pricing. All need a dealer account, so ask your rep. This replaces the demo wheels and adds prices to the quote.
3. **Real car models.** Swap the stylized bodies for licensed glTF models of your top-selling vehicles. Budget for paid models and check each licence.
4. **Staggered setups.** Separate front and rear wheel and tire, for Mustang, Camaro and BMW customers.
5. **Rub-level labels.** Record what actually happened on each install ("slight rub at full lock") and show it the next time that combination comes up.
6. **Wet stopping distance, new versus worn.** Needs test data from the tire makers.
7. **TPMS relearn procedure per vehicle** on the install sheet (auto, stationary or OBD).
8. **Customer quote with pricing**, saved builds, and a link you can text to the customer. The address bar already holds a link to the current build.
