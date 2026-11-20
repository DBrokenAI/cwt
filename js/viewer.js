/* CWT 3D viewer — procedural car body + true-to-scale wheels and tires (three.js r160, global build).
 *
 * Everything that matters for fitment is drawn to real dimensions: tire diameter, section width,
 * sidewall height, rim diameter / width, offset (how far the wheel sits in or out), lug count and
 * ride-height change. The body itself is a stylized shape per body type, sized to the real
 * wheelbase / length / width / height — it is not a scan of the specific model.
 */
(function (root) {
  const THREE = root.THREE;
  const IN = 0.0254;

  // Per-body-type proportions. Heights are fractions of overall height; x offsets in metres.
  const BODY = {
    sedan:   { gc: 0.15, belt: 0.63, hood: 0.53, pad: 0.065, gw: 0.80, fo: 0.46, cowl: 0.38, rake: 0.72, flare: false },
    coupe:   { gc: 0.13, belt: 0.63, hood: 0.54, pad: 0.060, gw: 0.78, fo: 0.44, cowl: 0.55, rake: 0.70, flare: false },
    hatch:   { gc: 0.14, belt: 0.62, hood: 0.54, pad: 0.060, gw: 0.82, fo: 0.50, cowl: 0.30, rake: 0.62, flare: false },
    cuv:     { gc: 0.19, belt: 0.60, hood: 0.53, pad: 0.075, gw: 0.84, fo: 0.48, cowl: 0.30, rake: 0.62, flare: true },
    suv:     { gc: 0.22, belt: 0.59, hood: 0.54, pad: 0.085, gw: 0.86, fo: 0.47, cowl: 0.30, rake: 0.52, flare: true },
    truck:   { gc: 0.24, belt: 0.57, hood: 0.54, pad: 0.100, gw: 0.86, fo: 0.42, cowl: 0.28, rake: 0.48, flare: true, bed: 1.72 },
    hdtruck: { gc: 0.27, belt: 0.57, hood: 0.55, pad: 0.110, gw: 0.86, fo: 0.42, cowl: 0.28, rake: 0.48, flare: true, bed: 2.05 },
    jeep:    { gc: 0.26, belt: 0.60, hood: 0.56, pad: 0.110, gw: 0.88, fo: 0.40, cowl: 0.42, rake: 0.16, flare: true },
  };

  const DESIGNS = {
    oe:       { n: 5, wi: 0.055, wo: 0.040, skew: 0 },
    five:     { n: 5, wi: 0.062, wo: 0.046, skew: 0 },
    split5:   { n: 5, wi: 0.022, wo: 0.018, skew: 0, pair: 0.105 },
    multi:    { n: 10, wi: 0.028, wo: 0.020, skew: 0 },
    mesh:     { n: 10, wi: 0.016, wo: 0.014, skew: 0.075, cross: true },
    turbine:  { n: 9, wi: 0.050, wo: 0.034, skew: 0.085 },
    six:      { n: 6, wi: 0.078, wo: 0.060, skew: 0 },
    beadlock: { n: 8, wi: 0.060, wo: 0.070, skew: 0, ring: true },
    split8:   { n: 8, wi: 0.042, wo: 0.030, skew: 0 },
  };

  function disposeTree(obj) {
    obj.traverse(o => {
      if (o.geometry && !o.userData.shared) o.geometry.dispose();
      if (o.material && o.userData.ownMaterial) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }

  class Viewer {
    constructor(container) {
      this.el = container;
      const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
      r.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.05;
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(r.domElement);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
      this.car = new THREE.Group();
      this.scene.add(this.car);
      this.bodyGroup = new THREE.Group();
      this.wheelGroup = new THREE.Group();
      this.car.add(this.bodyGroup, this.wheelGroup);

      this.paint = new THREE.MeshPhysicalMaterial({ color: 0xb8bcc2, metalness: 0.55, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.06 });
      // wheel cut-out for complete-car models, plus a copy of the paint that carries it
      this.clip = { on: false, uniforms: { uCwtAx: { value: new THREE.Vector2() }, uCwtR0: { value: 0 }, uCwtR: { value: 0 }, uCwtIn: { value: 9 }, uCwtBody: { value: 0 } } };
      this.paintClip = this._clipify(this.paint.clone());
      this.paintClip.side = THREE.DoubleSide;
      this.mats = {
        glass: new THREE.MeshPhysicalMaterial({ color: 0x0a0d12, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.4 }),
        dark: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.95, metalness: 0 }),
        trim: new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.75, metalness: 0.1 }),
        head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfeaff, emissiveIntensity: 1.6, roughness: 0.2 }),
        tail: new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1a1a, emissiveIntensity: 1.3, roughness: 0.3 }),
        disc: new THREE.MeshStandardMaterial({ color: 0x8a8d92, metalness: 0.9, roughness: 0.45 }),
        caliper: new THREE.MeshStandardMaterial({ color: 0xc41616, metalness: 0.3, roughness: 0.5 }),
        lug: new THREE.MeshStandardMaterial({ color: 0xd8dade, metalness: 1, roughness: 0.2 }),
      };

      this._buildStage();
      this.setEnvironment('studio');

      // orbit state
      this.orbit = { theta: 0.72, phi: 1.32, radius: 8.2, target: new THREE.Vector3(0, 0.62, 0) };
      this.goal = { theta: 0.72, phi: 1.32, radius: 8.2, target: new THREE.Vector3(0, 0.62, 0) };
      this.autoRotate = true;
      this._idleAt = 0;
      this._bindControls();

      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(container);
      this._resize();
      this._clock = new THREE.Clock();
      const loop = () => { this._frame(); this._raf = requestAnimationFrame(loop); };
      loop();
    }

    // ── Stage: floor, lights, environment ──────────────────
    _buildStage() {
      const s = this.scene;
      this.floor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.55, metalness: 0.2 }));
      this.floor.rotation.x = -Math.PI / 2;
      this.floor.receiveShadow = true;
      s.add(this.floor);

      // glowing ring under the car
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.6, 128), new THREE.MeshBasicMaterial({ color: 0x35d0ff, transparent: true, opacity: 0.55 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.003;
      s.add(ring);
      this.ring = ring;

      this.hemi = new THREE.HemisphereLight(0xffffff, 0x1a1d22, 0.55);
      s.add(this.hemi);
      const key = this.key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(4, 8, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
      key.shadow.bias = -0.0004; key.shadow.radius = 6;
      s.add(key);
      const rim = new THREE.DirectionalLight(0x9fd8ff, 0.9);
      rim.position.set(-6, 4, -5);
      s.add(rim);
    }

    setEnvironment(mode) {
      this.envMode = mode;
      const night = mode === 'night';
      const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, 512);
      if (night) { grad.addColorStop(0, '#05070b'); grad.addColorStop(0.5, '#0c1017'); grad.addColorStop(0.52, '#05060a'); grad.addColorStop(1, '#020203'); }
      else { grad.addColorStop(0, '#aab4c2'); grad.addColorStop(0.45, '#59626f'); grad.addColorStop(0.52, '#1c1f25'); grad.addColorStop(1, '#0a0b0d'); }
      g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
      // softboxes
      const box = (x, y, w, h, a) => { g.fillStyle = `rgba(255,255,255,${a})`; g.filter = 'blur(6px)'; g.fillRect(x, y, w, h); g.filter = 'none'; };
      const k = night ? 0.75 : 1;
      box(60, 70, 300, 46, 0.95 * k); box(480, 50, 360, 40, 0.9 * k); box(880, 120, 110, 60, 0.6 * k);
      box(0, 200, 1024, 5, night ? 0.5 : 0.25);
      if (night) { g.fillStyle = 'rgba(53,208,255,0.55)'; g.fillRect(380, 150, 60, 30); g.fillStyle = 'rgba(255,90,60,0.45)'; g.fillRect(700, 160, 70, 26); }
      const tex = new THREE.CanvasTexture(c);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      const pm = new THREE.PMREMGenerator(this.renderer);
      const env = pm.fromEquirectangular(tex).texture;
      if (this.scene.environment) this.scene.environment.dispose();
      this.scene.environment = env;
      tex.dispose(); pm.dispose();

      const bg = night ? 0x06070a : 0x0d1015;
      this.scene.background = new THREE.Color(bg);
      this.scene.fog = new THREE.Fog(bg, 11, 26);
      this.floor.material.color.set(night ? 0x0b0d10 : 0x171a20);
      this.hemi.intensity = night ? 0.3 : 0.55;
      this.key.intensity = night ? 1.5 : 2.2;
    }

    // ── Paint ──────────────────────────────────────────────
    setPaint(hex, finish) {
      this.paint.color.set(hex);
      const f = finish || 'metallic';
      if (f === 'matte') Object.assign(this.paint, { metalness: 0.15, roughness: 0.78, clearcoat: 0 });
      else if (f === 'gloss') Object.assign(this.paint, { metalness: 0.05, roughness: 0.28, clearcoat: 1 });
      else Object.assign(this.paint, { metalness: 0.6, roughness: 0.34, clearcoat: 1 });
      this.paint.needsUpdate = true;
      this.paintClip.color.copy(this.paint.color);
      Object.assign(this.paintClip, { metalness: this.paint.metalness, roughness: this.paint.roughness, clearcoat: this.paint.clearcoat });
    }

    // ── Vehicle body ───────────────────────────────────────
    // ref: { tireDia (in), tireSw (mm, mounted), et (mm) } of the factory package the body is drawn around.
    // Uses a real glTF model when models/models.js maps one to this vehicle (needs the local launcher);
    // otherwise, or if the file fails to load, falls back to the stylized procedural body.
    setVehicle(vehicle, ref) {
      this.vehicle = vehicle;
      this.ref = ref;
      this.model = null;
      const token = this._loadToken = (this._loadToken || 0) + 1;
      this._buildProcedural(vehicle, ref);
      const spec = (root.CAR_MODELS || {})[vehicle.id];
      const show = on => { this.bodyGroup.visible = this.wheelGroup.visible = on; };
      show(true);
      if (!spec) return this._status('procedural', null);
      if (!root.CWT_LOADERS) return this._status('needs-launcher', spec);
      show(false);
      this._status('loading', spec);
      this._loadModel(vehicle, spec).then(built => {
        if (token !== this._loadToken) return disposeTree(built.group);
        disposeTree(this.bodyGroup); this.bodyGroup.clear();
        this.bodyGroup.add(built.group);
        Object.assign(this.geo, built.geo);
        this.model = spec;
        this._frameCar();
        if (this.setup) this.setSetup(this.setup);
        show(true);
        this._status('model', spec);
      }).catch(err => {
        if (token !== this._loadToken) return;
        console.error('CWT: could not load ' + spec.file, err);
        show(true);
        this._status('failed', spec);
      });
    }

    // ── Auto-fit: any complete car model, wheels baked in ──
    // Finds the car's length axis, scales it to the real vehicle, locates the four tire contact patches,
    // measures the model's own tire radius, then cuts the old wheels out in the shader so CWT's wheels
    // can be drawn in the same place. spec.flip turns the car end-for-end if the nose was guessed wrong.
    _autoFit(vehicle, spec, src, pivot, group) {
      group.updateMatrixWorld(true);
      const meshes = [];
      src.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.position) meshes.push(o); });
      if (!meshes.length) throw new Error('model has no meshes');
      // drop presentation props that ship with some models: flat textured boards, ground planes, backdrops
      const whole = new THREE.Box3().setFromObject(src), wsz = whole.getSize(new THREE.Vector3()), big = Math.max(wsz.x, wsz.y, wsz.z);
      for (let i = meshes.length - 1; i >= 0; i--) {
        const sz = new THREE.Box3().setFromObject(meshes[i]).getSize(new THREE.Vector3());
        const mx = Math.max(sz.x, sz.y, sz.z), mn = Math.min(sz.x, sz.y, sz.z), mat = Array.isArray(meshes[i].material) ? meshes[i].material[0] : meshes[i].material;
        const flat = mn < mx * 0.03 && mx > big * 0.12;
        if ((flat && mat && mat.map) || (flat && sz.y === mn && mx > big * 0.6) || (spec.hide || []).some(h => mat && (mat.name || '').trim().endsWith(h))) { meshes[i].visible = false; meshes[i].parent.remove(meshes[i]); meshes.splice(i, 1); }
      }
      // Mirrored parts often arrive with normals pointing inward, which renders them black. Flip any vertex
      // normal that disagrees with the faces around it.
      meshes.forEach(m => {
        const g = m.geometry, p = g.attributes.position, nrm = g.attributes.normal, idx = g.index;
        if (!nrm) { g.computeVertexNormals(); return; }
        const vote = new Int8Array(p.count), tri = idx ? idx.count / 3 : p.count / 3;
        const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3(), fn = new THREE.Vector3();
        for (let t = 0; t < tri; t++) {
          const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          A.fromBufferAttribute(p, i0); B.fromBufferAttribute(p, i1); C.fromBufferAttribute(p, i2);
          fn.subVectors(B, A).cross(N.subVectors(C, A));
          [i0, i1, i2].forEach(i => { N.fromBufferAttribute(nrm, i); const d = N.dot(fn); if (d < 0 && vote[i] > -100) vote[i]--; else if (d > 0 && vote[i] < 100) vote[i]++; });
        }
        let flipped = 0;
        for (let i = 0; i < p.count; i++) if (vote[i] < 0) { nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i)); flipped++; }
        if (flipped) nrm.needsUpdate = true;
      });
      const total = meshes.reduce((s, m) => s + m.geometry.attributes.position.count, 0);
      const step = Math.max(1, Math.floor(total / 250000));
      const X = [], Y = [], Z = [], v = new THREE.Vector3();
      meshes.forEach(m => {
        const p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); X.push(v.x); Y.push(v.y); Z.push(v.z); }
      });
      const n = X.length;
      const pct = (arr, q) => { const s = Float64Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; };
      const ext = a => [pct(a, 0.004), pct(a, 0.996)];

      // 1. length along x
      let [x0, x1] = ext(X), [z0, z1] = ext(Z);
      let rot = 0;
      if (z1 - z0 > x1 - x0) { rot = Math.PI / 2; for (let i = 0; i < n; i++) { const x = X[i]; X[i] = Z[i]; Z[i] = -x; } [x0, x1] = ext(X); [z0, z1] = ext(Z); }
      // 2. scale to the real length, put the ground at y = 0 and the car's centre at the origin
      let s = (vehicle.dims.length / 1000) / (x1 - x0);
      const y0 = pct(Y, 0.002), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      for (let i = 0; i < n; i++) { X[i] = (X[i] - cx) * s; Y[i] = (Y[i] - y0) * s; Z[i] = (Z[i] - cz) * s; }
      let T = new THREE.Vector3(-cx * s, -y0 * s, -cz * s);   // translation applied after rotate+scale

      // 3. axles = the two clusters of points touching the ground
      const wbReal = vehicle.dims.wheelbase / 1000, L = vehicle.dims.length / 1000;
      const low = []; for (let i = 0; i < n; i++) if (Y[i] < 0.05) low.push(i);
      const BIN = 0.05, nb = Math.ceil(L / BIN) + 4, hist = new Float32Array(nb);
      low.forEach(i => { const b = Math.floor((X[i] + L / 2) / BIN) + 2; if (b >= 0 && b < nb) hist[b]++; });
      const sm = i => (hist[i - 1] || 0) + hist[i] * 2 + (hist[i + 1] || 0);
      let best = null;
      for (let a = 1; a < nb - 1; a++) for (let b = a + 1; b < nb - 1; b++) {
        const d = (b - a) * BIN; if (d < wbReal * 0.82 || d > wbReal * 1.18) continue;
        const sc = Math.min(sm(a), sm(b)) * 2 + sm(a) + sm(b);
        if (!best || sc > best.sc) best = { a, b, sc };
      }
      let axR = -wbReal / 2, axF = wbReal / 2, found = false;
      if (best && best.sc > 12) {
        const mean = bi => { const c = (bi - 2 + 0.5) * BIN - L / 2; let sx = 0, k = 0; low.forEach(i => { if (Math.abs(X[i] - c) < 0.18) { sx += X[i]; k++; } }); return k ? sx / k : c; };
        axR = mean(best.a); axF = mean(best.b); found = true;
        const k = wbReal / (axF - axR);                    // 4. fine-scale to the true wheelbase
        if (k > 0.85 && k < 1.18) { for (let i = 0; i < n; i++) { X[i] *= k; Y[i] *= k; Z[i] *= k; } s *= k; T.multiplyScalar(k); axR *= k; axF *= k; }
      }
      const mid = (axF + axR) / 2;
      for (let i = 0; i < n; i++) X[i] -= mid;
      T.x -= mid; axF -= mid; axR -= mid;

      // 5. tire lateral position and width from the contact points
      const lat = []; for (let i = 0; i < n; i++) if (Y[i] < 0.05 && (Math.abs(X[i] - axF) < 0.2 || Math.abs(X[i] - axR) < 0.2)) lat.push(Math.abs(Z[i]));
      const W = vehicle.dims.width / 1000;
      let outer = lat.length > 8 ? pct(lat, 0.97) : W / 2 - 0.03, inner = lat.length > 8 ? pct(lat, 0.03) : W / 2 - 0.3;
      if (outer - inner < 0.14 || outer - inner > 0.5) inner = outer - 0.27;

      // 6. the model's own tire radius. Straight above each axle, inside the tire's width, the wheel is
      //    solid from the ground to the top of the tread, then there is a gap before the wheel-well liner.
      //    The model is a real car at real scale, so the answer must be near the factory tire radius.
      const rOE = (this.ref.archDia || this.ref.tireDia) * IN / 2;
      let r0 = rOE;
      {
        const HB = 0.01, hb = new Uint16Array(140), li = inner + (outer - inner) * 0.2, lo = outer - (outer - inner) * 0.2;
        for (let i = 0; i < n; i++) {
          const az = Math.abs(Z[i]);
          if (az < li || az > lo || Y[i] > 1.39 || Y[i] < 0) continue;
          if (Math.abs(X[i] - axF) < 0.07 || Math.abs(X[i] - axR) < 0.07) hb[Math.floor(Y[i] / HB)]++;
        }
        let top = 0;
        for (let b = Math.floor(rOE * 2 * 0.72 / HB); b < Math.min(139, Math.ceil(rOE * 2 * 1.25 / HB)); b++) {
          if (hb[b] > 0) top = b; else if (top && b - top >= 3) break;
        }
        const r = (top + 1) * HB / 2;
        if (top && Math.abs(r - rOE) / rOE < 0.2) r0 = r;
      }

      // 7. which end is the front? red (tail-light) material sits at the back; spec.flip overrides the guess
      let redX = 0, redN = 0;
      meshes.forEach(m => {
        const c = m.material && m.material.color; if (!c || m.material.map) return;
        if (c.r > 0.45 && c.g < 0.16 && c.b < 0.16) { const b = new THREE.Box3().setFromObject(m), p = (b.min.clone().add(b.max)).multiplyScalar(0.5); const x = rot ? p.z : p.x; redX += ((x - cx) * s - mid) > 0 ? 1 : -1; redN++; }
      });
      let flip = redN > 0 && redX > 0;
      if (spec.flip) flip = !flip;
      if (flip) { const t = axF; axF = -axR; axR = -t; }

      pivot.rotation.y = rot + (flip ? Math.PI : 0);
      pivot.scale.setScalar(s);
      pivot.position.set(flip ? -T.x : T.x, T.y + (spec.drop || 0), flip ? -T.z : T.z);

      // 8. materials: find the paint, make everything double-sided, cut the wheels out
      const area = new Map(); let totalArea = 0;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      meshes.forEach(m => {
        const p = m.geometry.attributes.position, idx = m.geometry.index, tri = idx ? idx.count / 3 : p.count / 3, st = Math.max(1, Math.floor(tri / 4000));
        let sum = 0;
        for (let t = 0; t < tri; t += st) {
          const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          a.fromBufferAttribute(p, i0).applyMatrix4(m.matrixWorld); b.fromBufferAttribute(p, i1).applyMatrix4(m.matrixWorld); c.fromBufferAttribute(p, i2).applyMatrix4(m.matrixWorld);
          sum += b.sub(a).cross(c.sub(a)).length() * st;
        }
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach(mm => area.set(mm, (area.get(mm) || 0) + sum / mats.length));
        totalArea += sum;
      });
      const lum = col => 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
      const notPaint = /glass|window|windshield|tire|tyre|rubber|wheel|rim|chrome|light|lamp|interior|seat|black|plastic|grill|mirror|leather|carpet/i;
      const named = mm => !!spec.paint && spec.paint.some(nm => { const a = (mm.name || '').trim(), b = nm.trim(); return a === b || a.endsWith(b); });
      const paintish = /paint|pintura|body|carroceria|metallic|pearl|tricoat/i;
      let paintMat = null, pa = 0;
      if (!spec.noPaint) area.forEach((ar, mm) => {
        if (mm.transparent || mm.opacity < 0.9 || notPaint.test(mm.name || '') || (!mm.map && lum(mm.color) < 0.05)) return;
        const score = ar * (paintish.test(mm.name || '') ? 20 : 1);
        if (score > pa) { pa = score; paintMat = mm; }
      });
      pa = paintMat ? area.get(paintMat) : 0;
      if (spec.paint) paintMat = [...area.keys()].find(named) || paintMat;
      const single = paintMat && pa / totalArea > 0.9 && paintMat.map;        // one textured skin: repainting would paint the glass too
      const same = mm => paintMat && (!single || spec.paint) && (mm === paintMat || (spec.paint ? named(mm) : (!mm.map && !mm.transparent && mm.color.distanceTo && Math.hypot(mm.color.r - paintMat.color.r, mm.color.g - paintMat.color.g, mm.color.b - paintMat.color.b) < 0.04)));
      const clip = this.clip;
      Object.assign(clip, { on: true });
      clip.uniforms.uCwtAx.value.set(axF, axR);
      clip.uniforms.uCwtR0.value = r0;
      clip.uniforms.uCwtR.value = spec.keepWheels ? 0 : r0 * 1.035 + 0.006;
      clip.uniforms.uCwtIn.value = Math.max(inner - 0.05, 0.3);
      meshes.forEach(m => {
        m.castShadow = true;
        const fix = mm => {
          if (same(mm)) return this.paintClip;
          mm.side = THREE.DoubleSide;
          if (mm.transparent || mm.opacity < 0.9) { mm.transparent = true; mm.opacity = Math.min(mm.opacity, 0.5); mm.metalness = 0.9; mm.roughness = 0.05; mm.depthWrite = false; m.castShadow = false; m.renderOrder = 2; }
          else if (!mm.map && mm.metalness === 0 && mm.roughness > 0.9) { mm.roughness = 0.55; mm.metalness = 0.15; }
          this._clipify(mm);
          return mm;
        };
        m.material = Array.isArray(m.material) ? m.material.map(fix) : fix(m.material);
        m.userData.ownMaterial = !Array.isArray(m.material) && m.material !== this.paintClip;
      });

      const box = new THREE.Box3().setFromObject(group);
      const mats = [...area.entries()].sort((p, q) => q[1] - p[1]).slice(0, 7).map(([mm, ar]) => `${mm.name || '?'} ${Math.round(ar / totalArea * 100)}% #${mm.color ? mm.color.getHexString() : ''}${mm.map ? ' tex' : ''}${mm.transparent ? ' transp' : ''}`);
      return { group, geo: { model: true, auto: true, found, mats, paintName: paintMat ? paintMat.name : null, painted: !!paintMat && !single, wb: axF - axR, axF, axR, outer, r0,
        L: box.max.x - box.min.x, W: box.max.z - box.min.z, H: box.max.y, xF: box.max.x, xR: box.min.x } };
    }

    // Shader hook that discards the model's own wheels (two cylinders around the axle lines, outboard of uCwtIn).
    _clipify(mat) {
      const u = this.clip.uniforms;
      mat.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, u);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCwtPos;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvCwtPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCwtPos;\nuniform vec2 uCwtAx; uniform float uCwtR0, uCwtR, uCwtIn, uCwtBody;')
          .replace('void main() {', 'void main() {\n  if (uCwtR > 0.0 && abs(vCwtPos.z) > uCwtIn) { vec2 q = vec2(vCwtPos.x, vCwtPos.y - uCwtBody - uCwtR0); if (length(q - vec2(uCwtAx.x, 0.0)) < uCwtR || length(q - vec2(uCwtAx.y, 0.0)) < uCwtR) discard; }');
      };
      mat.customProgramCacheKey = () => 'cwt-clip';
      mat.needsUpdate = true;
      return mat;
    }

    _status(state, spec) { this.modelState = state; if (this.onModel) this.onModel(state, spec); }

    // Rim / tire model cache. Returns the loaded glTF, or null while it is still loading —
    // the wheels are rebuilt as soon as it arrives.
    _ready(file) {
      if (!root.CWT_LOADERS || !file) return null;
      this._assets = this._assets || new Map();
      const hit = this._assets.get(file);
      if (hit) return hit.gltf || null;
      const rec = { gltf: null };
      this._assets.set(file, rec);
      root.CWT_LOADERS.gltf.loadAsync(file).then(g => {
        g.scene.updateMatrixWorld(true);
        rec.gltf = g;
        if (this.setup && this.vehicle) this.setSetup(this.setup);
      }).catch(e => console.error('CWT: could not load ' + file, e));
      return null;
    }

    // Standard looks for the material names used by the vehicle models (body, glass, chrome, black, lights…).
    _dress(mesh, paintNames, glassNames) {
      const m = mesh.material, n = (m.name || '').replace(/\.\d+$/, '');
      if (paintNames.includes(m.name) || n === 'body') { mesh.material = this.paint; return; }
      mesh.userData.ownMaterial = true;
      const set = o => Object.assign(m, o);
      if (glassNames.includes(m.name)) { mesh.material = this._glass(0.42, 0x0b1016); mesh.castShadow = false; mesh.renderOrder = 2; return; }
      switch (n) {
        case 'chrome': case 'mirror': set({ metalness: 1, roughness: 0.05 }); m.color.set(0xffffff); break;
        case 'silver': set({ metalness: 0.9, roughness: 0.3 }); break;
        case 'headlight': case 'foglight': case 'drl': case 'light':
          set({ metalness: 1, roughness: 0.05, emissiveIntensity: 0.55 }); m.color.set(0xffffff); m.emissive = new THREE.Color(0xcfe2ff); break;
        case 'glass': case 'o_glass': case 'r_glass':
          set({ transparent: true, metalness: 1, roughness: 0, opacity: n === 'glass' ? 0.22 : 0.55, depthWrite: true });
          if (n === 'glass') m.color.set(0xcfd6dc);
          mesh.castShadow = false; mesh.renderOrder = 2; break;
        case 'glass_tint': set({ transparent: true, metalness: 1, roughness: 0, opacity: 0.55, depthWrite: true }); m.color.set(0x050607); mesh.castShadow = false; mesh.renderOrder = 2; break;
        case 'glass_dark': set({ transparent: true, metalness: 1, roughness: 0, opacity: 0.78, depthWrite: true }); m.color.set(0x050607); mesh.castShadow = false; mesh.renderOrder = 2; break;
        case 'black': set({ metalness: 0.35, roughness: 0.6 }); m.color.set(0x070708); break;
        case 'rubber': case 'gum': set({ metalness: 0, roughness: 0.9 }); break;
        default: if (m.transparent) mesh.castShadow = false;
      }
    }

    _glass(opacity, color) {
      return new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.04, transparent: true, opacity, envMapIntensity: 1.5, depthWrite: false });
    }

    // Loads a car GLB and normalizes it: front toward +x, wheels on the ground, axles centred, scaled to
    // the real wheelbase. The model's own wheels are hidden — CWT draws the selected wheels in their place.
    async _loadModel(vehicle, spec) {
      const gltf = await root.CWT_LOADERS.gltf.loadAsync(spec.file);
      const src = gltf.scene, pivot = new THREE.Group(), group = new THREE.Group();
      pivot.add(src); group.add(pivot);
      pivot.rotation.y = { '+x': 0, '-x': Math.PI, '+z': Math.PI / 2, '-z': -Math.PI / 2 }[spec.front || '+x'];
      const paintNames = spec.paint || [], glassNames = spec.glass || [];
      if (!spec.auto) src.traverse(o => { if (o.isMesh) { o.castShadow = true; this._dress(o, paintNames, glassNames); } });

      // Wheel-less body whose origin sits on the axle line, midway between the axles.
      if (spec.axle) {
        const r0 = this.ref.tireDia * IN / 2;
        pivot.scale.setScalar(spec.scale || 1);
        pivot.position.set(spec.axle.shift || 0, r0 + (spec.axle.drop || 0), 0);
        const box = new THREE.Box3().setFromObject(group), wb = spec.axle.wb;
        return { group, geo: { model: true, wb, axF: wb / 2, axR: -wb / 2, outer: spec.axle.half + this.ref.tireSw / 2000, r0,
          L: box.max.x - box.min.x, W: box.max.z - box.min.z, H: box.max.y, xF: box.max.x, xR: box.min.x } };
      }

      if (spec.auto) return this._autoFit(vehicle, spec, src, pivot, group);

      const wheels = spec.wheels.map(n => src.getObjectByName(n)).filter(Boolean);
      if (wheels.length !== 4) throw new Error(`expected 4 wheel nodes, found ${wheels.length} (${spec.wheels.join(', ')})`);
      const measure = () => { group.updateMatrixWorld(true); return wheels.map(w => new THREE.Box3().setFromObject(w)); };
      const cx = b => (b.min.x + b.max.x) / 2;
      let boxes = measure();
      let xs = boxes.map(cx).sort((a, b) => a - b);
      const modelWb = (xs[2] + xs[3]) / 2 - (xs[0] + xs[1]) / 2;
      pivot.scale.setScalar(spec.scale || (vehicle.dims.wheelbase / 1000) / modelWb);
      boxes = measure();
      xs = boxes.map(cx).sort((a, b) => a - b);
      const axR = (xs[0] + xs[1]) / 2, axF = (xs[2] + xs[3]) / 2;
      const zMid = boxes.reduce((s, b) => s + (b.min.z + b.max.z) / 2, 0) / 4;
      const yMin = Math.min(...boxes.map(b => b.min.y));
      pivot.position.set(-(axF + axR) / 2, -yMin, -zMid);
      boxes = measure();
      const r0 = boxes.reduce((s, b) => s + (b.min.y + b.max.y) / 2, 0) / 4;
      const outer = boxes.reduce((s, b) => s + Math.max(Math.abs(b.min.z), Math.abs(b.max.z)), 0) / 4;
      wheels.forEach(w => { w.visible = false; });
      const all = new THREE.Box3().setFromObject(group);
      return { group, geo: { model: true, wb: (axF - axR), axF: (axF - axR) / 2, axR: -(axF - axR) / 2, outer, r0, L: all.max.x - all.min.x, W: all.max.z - all.min.z, H: all.max.y, xF: all.max.x, xR: all.min.x } };
    }

    _buildProcedural(vehicle, ref) {
      this.clip.uniforms.uCwtR.value = 0;
      disposeTree(this.bodyGroup);
      this.bodyGroup.clear();
      this.bodyGroup.position.y = 0;

      const d = vehicle.dims;
      const L = d.length / 1000, W = d.width / 1000, H = d.height / 1000, wb = d.wheelbase / 1000;
      const P = BODY[vehicle.body] || BODY.sedan;
      const r0 = ref.tireDia * IN / 2;
      const ra = (ref.archDia || ref.tireDia) * IN / 2 + P.pad; // arches are cut for the largest factory tire
      const over = L - wb, fo = over * P.fo;
      const xF = wb / 2 + fo, xR = -wb / 2 - (over - fo);
      const gc = Math.min(P.gc, r0 - 0.06);
      const beltY = H * P.belt, hoodY = H * P.hood, roofY = H;
      const cowl = wb / 2 - P.cowl, aTop = cowl - P.rake;
      let cBase, cTop;
      const b = vehicle.body;
      if (P.bed) { cBase = xR + P.bed; cTop = cBase + 0.07; }
      else if (b === 'sedan') { cBase = -wb / 2 - 0.38; cTop = -wb / 2 + 0.35; }
      else if (b === 'coupe') { cBase = -wb / 2 - 0.46; cTop = -wb / 2 + 0.55; }
      else if (b === 'jeep') { cBase = xR + 0.10; cTop = xR + 0.14; }
      else if (b === 'suv') { cBase = xR + 0.10; cTop = xR + 0.30; }
      else { cBase = xR + 0.12; cTop = xR + 0.44; }
      this.geo = { L, W, H, wb, r0, ra, xF, xR, gc, beltY, P, model: false, axF: wb / 2, axR: -wb / 2, outer: W / 2 - 0.022 };

      // lower body side profile with wheel-arch cutouts
      const sh = new THREE.Shape();
      const arch = cx => {
        const dy = gc - r0, a = Math.sqrt(Math.max(ra * ra - dy * dy, 0.0001));
        sh.lineTo(cx - a, gc);
        sh.absarc(cx, r0, ra, Math.atan2(dy, -a), Math.atan2(dy, a), true);
      };
      sh.moveTo(xR + 0.10, gc);
      arch(-wb / 2); arch(wb / 2);
      sh.lineTo(xF - 0.10, gc);
      sh.quadraticCurveTo(xF, gc, xF, gc + 0.12);
      sh.lineTo(xF, hoodY - 0.10);
      sh.quadraticCurveTo(xF, hoodY, xF - 0.13, hoodY + 0.012);
      sh.lineTo(cowl, beltY);
      sh.lineTo(Math.max(cBase, xR + 0.14), beltY);
      sh.lineTo(xR + 0.12, beltY);
      sh.quadraticCurveTo(xR, beltY, xR, beltY - 0.11);
      sh.lineTo(xR, gc + 0.14);
      sh.quadraticCurveTo(xR, gc, xR + 0.10, gc);
      const bev = 0.07;
      const lower = new THREE.ExtrudeGeometry(sh, { depth: W - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: 0.02, bevelSegments: 6, curveSegments: 28 });
      lower.translate(0, 0, -(W - 2 * bev) / 2);
      const lowerMesh = new THREE.Mesh(lower, this.paint);
      lowerMesh.castShadow = true;
      this.bodyGroup.add(lowerMesh);

      // greenhouse
      const gw = W * P.gw, gb = 0.03;
      const gs = new THREE.Shape();
      gs.moveTo(cowl, beltY - 0.02); gs.lineTo(aTop, roofY - 0.035);
      gs.quadraticCurveTo(aTop - 0.05, roofY, aTop - 0.14, roofY);
      gs.lineTo(cTop + 0.1, roofY);
      gs.quadraticCurveTo(cTop, roofY, cTop - 0.02, roofY - 0.03);
      gs.lineTo(cBase, beltY - 0.02);
      const gh = new THREE.ExtrudeGeometry(gs, { depth: gw - 2 * gb, bevelEnabled: true, bevelThickness: gb, bevelSize: 0.012, bevelSegments: 4, curveSegments: 12 });
      gh.translate(0, 0, -(gw - 2 * gb) / 2);
      const ghMesh = new THREE.Mesh(gh, this.paint);
      ghMesh.castShadow = true;
      this.bodyGroup.add(ghMesh);

      // side glass (two panes with a B-pillar gap)
      const yb = beltY + 0.035, yt = roofY - 0.075, span = roofY - beltY;
      const xf = y => cowl + (aTop - cowl) * ((y - beltY) / span) - 0.07;
      const xr = y => cBase + (cTop - cBase) * ((y - beltY) / span) + 0.07;
      const mid = (xf(yb) + xr(yb)) / 2 + (b === 'coupe' ? -0.25 : 0.08);
      const pane = (x0b, x0t, x1t, x1b) => {
        const p = new THREE.Shape();
        p.moveTo(x0b, yb); p.lineTo(x0t, yt); p.lineTo(x1t, yt); p.lineTo(x1b, yb); p.closePath();
        return new THREE.ShapeGeometry(p);
      };
      [pane(xf(yb), xf(yt), mid + 0.035, mid + 0.035), pane(mid - 0.035, mid - 0.035, xr(yt), xr(yb))].forEach(geo => {
        [1, -1].forEach(side => {
          const m = new THREE.Mesh(geo, this.mats.glass);
          m.position.z = side * (gw / 2 + 0.0035);
          if (side < 0) m.rotation.y = Math.PI, m.scale.x = -1;
          this.bodyGroup.add(m);
        });
      });

      // windshield + rear glass, laid on the slanted faces
      const slab = (p0, p1, outward) => {
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy);
        const nx = outward * dy / len, ny = -outward * dx / len;
        const a = [p0[0] + dx * 0.10, p0[1] + dy * 0.10], c = [p0[0] + dx * 0.90, p0[1] + dy * 0.90];
        const off = 0.016, hz = gw / 2 - 0.085;
        const v = [a[0] + nx * off, a[1] + ny * off, -hz, a[0] + nx * off, a[1] + ny * off, hz, c[0] + nx * off, c[1] + ny * off, hz, c[0] + nx * off, c[1] + ny * off, -hz];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
        geo.setIndex([0, 1, 2, 0, 2, 3]);
        geo.computeVertexNormals();
        const mat = this.mats.glass.clone(); mat.side = THREE.DoubleSide;
        const m = new THREE.Mesh(geo, mat); m.userData.ownMaterial = true;
        this.bodyGroup.add(m);
      };
      slab([cowl, beltY - 0.02], [aTop, roofY - 0.035], 1);
      slab([cBase, beltY - 0.02], [cTop - 0.02, roofY - 0.03], -1);

      // dark inner structure + wheel-well liners so arches read as wells, not tunnels
      const inner = new THREE.Mesh(new THREE.BoxGeometry(L - 0.5, Math.max(beltY - gc - 0.1, 0.2), W - 0.62), this.mats.dark);
      inner.position.set((xF + xR) / 2, gc + 0.04 + (beltY - gc - 0.1) / 2, 0);
      this.bodyGroup.add(inner);
      const liner = cx => {
        const dy = gc - r0, a = Math.sqrt(ra * ra - dy * dy);
        const a0 = Math.atan2(dy, a), a1 = Math.PI - a0, N = 28, rr = ra - 0.004, hz = W / 2 - 0.02;
        const v = [], idx = [];
        for (let i = 0; i <= N; i++) {
          const t = a0 + (a1 - a0) * i / N;
          v.push(cx + rr * Math.cos(t), r0 + rr * Math.sin(t), -hz, cx + rr * Math.cos(t), r0 + rr * Math.sin(t), hz);
          if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
        geo.setIndex(idx); geo.computeVertexNormals();
        const mat = this.mats.dark.clone(); mat.side = THREE.DoubleSide;
        const m = new THREE.Mesh(geo, mat); m.userData.ownMaterial = true;
        this.bodyGroup.add(m);
      };
      liner(-wb / 2); liner(wb / 2);

      // fender flares / cladding on trucks and crossovers
      if (P.flare) {
        const dy = gc - r0, a0 = Math.asin(Math.max(dy / ra, -1));
        const tube = b === 'jeep' ? 0.045 : (P.bed ? 0.03 : 0.022);
        const fg = new THREE.TorusGeometry(ra + tube * 0.35, tube, 10, 40, Math.PI - 2 * a0);
        [-wb / 2, wb / 2].forEach(cx => [1, -1].forEach(side => {
          const m = new THREE.Mesh(fg, this.mats.trim);
          m.rotation.z = a0;
          m.position.set(cx, r0, side * (W / 2 - tube * 0.2));
          m.scale.z = 0.8;
          this.bodyGroup.add(m);
        }));
      }

      // lights, grille, mirrors
      const box = (w, h, dz, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dz), mat); m.position.set(x, y, z); this.bodyGroup.add(m); return m; };
      const tall = !!P.bed || b === 'jeep' || b === 'suv';
      [1, -1].forEach(side => {
        box(0.05, tall ? 0.14 : 0.075, 0.30, xF + 0.002, hoodY - (tall ? 0.16 : 0.09), side * (W / 2 - 0.24), this.mats.head);
        if (P.bed || b === 'jeep') box(0.05, 0.28, 0.09, xR - 0.002, beltY - 0.25, side * (W / 2 - 0.09), this.mats.tail);
        else box(0.05, 0.085, 0.36, xR - 0.002, beltY - 0.13, side * (W / 2 - 0.25), this.mats.tail);
        box(0.12, 0.075, 0.11, cowl - 0.05, beltY + 0.07, side * (W / 2 + 0.035), this.paint);
      });
      if (!(P.bed || b === 'jeep') && b !== 'truck') box(0.04, 0.03, W * 0.55, xR - 0.001, beltY - 0.115, 0, this.mats.tail);
      box(0.04, tall ? 0.30 : 0.13, W * (tall ? 0.52 : 0.46), xF + 0.003, tall ? hoodY - 0.22 : hoodY - 0.24, 0, this.mats.trim);
      box(0.06, 0.10, W * 0.7, xF - 0.004, gc + 0.11, 0, this.mats.trim);
      if (P.bed) box(P.bed - 0.14, 0.05, W - 0.15, xR + P.bed / 2 - 0.01, beltY + 0.012, 0, this.mats.trim);
      // rocker, bumpers, door cuts and handles — cheap detail that makes the slab read as a car
      const ax = Math.sqrt(Math.max(ra * ra - (gc - r0) * (gc - r0), 0.01));
      box(wb - 2 * ax - 0.06, 0.075, W + 0.006, 0, gc + 0.04, 0, this.mats.trim);
      box(0.07, 0.11, W * 0.86, xR + 0.004, gc + 0.13, 0, this.mats.trim);
      const doorX = [cowl - 0.06, mid, P.bed ? cBase + 0.1 : Math.min(xr(yb) - 0.05, -wb / 2 + ax + 0.25)];
      [1, -1].forEach(side => {
        doorX.forEach(x => box(0.008, beltY - gc - 0.14, 0.006, x, (beltY + gc) / 2 + 0.035, side * (W / 2 + 0.0005), this.mats.dark));
        [doorX[0] - 0.0, mid].forEach((x, i) => box(0.11, 0.022, 0.02, (i ? doorX[2] : mid) + 0.14, beltY - 0.075, side * (W / 2 + 0.004), this.mats.trim));
      });
      if (b === 'jeep') {
        const spare = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, 0.24, 36), this.mats.dark);
        spare.rotation.z = Math.PI / 2; spare.position.set(xR - 0.13, beltY - 0.08, 0);
        this.bodyGroup.add(spare);
      }

      this._frameCar();
    }

    _frameCar() {
      const g = this.geo;
      const r = Math.max(6.2, g.L * 1.55) * Math.max(1, 1.55 / (this.camera.aspect || 1.6));
      this.goal.radius = r; this.homeRadius = r;
      this.goal.target.set(0, g.H * 0.42, 0);
      this.ring.scale.setScalar(Math.max(1, g.L / 5.2));
    }

    // ── Wheels + tires ─────────────────────────────────────
    // setup: { wheel:{d,w,et,design,finish:{color,metalness,roughness}}, tire:{dia,sw,tread}, lift (in) }
    setSetup(setup) {
      if (!this.vehicle) return;
      this.setup = setup;
      disposeTree(this.wheelGroup);
      this.wheelGroup.clear();
      const g = this.geo, v = this.vehicle;
      const R = setup.tire.dia * IN / 2;
      const sw = setup.tire.sw / 1000;
      const liftM = (setup.lift || 0) * IN;

      // hub face position from the factory package, then apply the new offset
      const refSw = this.ref.tireSw / 1000;
      const hubFace = g.outer - refSw / 2 + this.ref.et / 1000;
      const zc = hubFace - setup.wheel.et / 1000;

      const proto = this._buildWheel(setup, v);
      [[g.axF, 1], [g.axF, -1], [g.axR, 1], [g.axR, -1]].forEach(([x, side]) => {
        const w = proto.clone();
        w.position.set(x, R, side * zc);
        if (side < 0) w.rotation.y = Math.PI;
        this.wheelGroup.add(w);
      });

      this.bodyGroup.position.y = (R - g.r0) + liftM;
      this.clip.uniforms.uCwtBody.value = this.bodyGroup.position.y;
      this.wheelPos = new THREE.Vector3(g.axF, R, zc);
      this.goal.target.y = (g.H * 0.42) + this.bodyGroup.position.y * 0.5;
    }

    _tireTexture(tread, v0, v1) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#1b1b1c'; x.fillRect(0, 0, 64, 256);
      const y0 = v0 * 256, y1 = v1 * 256, h = y1 - y0;
      // sidewall rings
      x.fillStyle = '#262627';
      [0.10, 0.115, 0.22].forEach(f => { x.fillRect(0, y0 * f / 0.0001 * 0.0001 + y0 * f, 64, 1.5); x.fillRect(0, 256 - y0 * f - 1.5, 64, 1.5); });
      x.fillStyle = '#141415'; x.fillRect(0, y0, 64, h);
      x.strokeStyle = '#020202'; x.lineCap = 'butt';
      const slash = (xa, xb, ya, yb, w) => { x.lineWidth = w; [-64, 0, 64].forEach(o => { x.beginPath(); x.moveTo(xa + o, y0 + h * ya); x.lineTo(xb + o, y0 + h * yb); x.stroke(); }); };
      if (tread === 'summer' || tread === 'performance') { slash(6, 40, 0, 0.42, 5); slash(40, 70, 0.58, 1, 5); slash(20, 34, 0.42, 0.58, 3); }
      else if (tread === 'winter') { for (let i = 0; i < 4; i++) { slash(i * 16, i * 16 + 10, 0, 0.5, 2); slash(i * 16 + 10, i * 16, 0.5, 1, 2); } slash(0, 30, 0, 0.3, 5); slash(34, 64, 0.7, 1, 5); }
      else if (tread === 'at' || tread === 'mt') { /* blocks are real geometry */ }
      else { slash(4, 26, 0, 0.3, 4); slash(36, 58, 0.7, 1, 4); slash(10, 22, 0.3, 0.7, 2.5); slash(42, 54, 0.3, 0.7, 2.5); }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return t;
    }

    _buildWheel(setup, vehicle) {
      const grp = new THREE.Group();
      const wh = setup.wheel, tr = setup.tire;
      const R = tr.dia * IN / 2, rimR = wh.d * IN / 2, wr = wh.w * IN, hs = tr.sw / 2000;
      const tread = tr.tread || 'touring';
      const chunky = tread === 'at' || tread === 'mt';
      const tw = hs * (chunky ? 0.86 : tread === 'touring' || tread === 'highway' || tread === 'allweather' ? 0.80 : 0.84);
      const blockH = chunky ? (tread === 'mt' ? 0.014 : 0.010) : 0;
      const Rt = R - blockH;

      // Real tire model: remap every vertex so the bead sits on this rim and the tread lands on the true
      // overall diameter, and scale the width to the mounted section width.
      const tAsset = this._ready(tr.model);
      let tMesh = null; if (tAsset) tAsset.scene.traverse(o => { if (o.isMesh && !tMesh) tMesh = o; });
      if (tMesh) {
        const geo = tMesh.geometry.clone().applyMatrix4(tMesh.matrixWorld);
        const p = geo.attributes.position;
        let rMin = Infinity, rMax = 0, zMin = Infinity, zMax = -Infinity;
        for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)), z = p.getZ(i); rMin = Math.min(rMin, r); rMax = Math.max(rMax, r); zMin = Math.min(zMin, z); zMax = Math.max(zMax, z); }
        const zs = (tr.sw / 1000) / (zMax - zMin), z0 = (zMax + zMin) / 2, rIn = rimR - 0.004;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y) || 1e-6;
          const k = (rIn + (r - rMin) / (rMax - rMin) * (R - rIn)) / r;
          p.setXYZ(i, x * k, y * k, (p.getZ(i) - z0) * zs);
        }
        geo.computeVertexNormals();
        const real = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x131314, roughness: 0.86, metalness: 0, flatShading: true }));
        real.castShadow = true; real.userData.ownMaterial = true;
        grp.add(real);
      }
      if (!tMesh) {
      // tire profile (radius, axial) inner bead → outer bead
      const pts = [];
      const side = [[rimR - 0.004, wr / 2 - 0.004], [rimR + 0.012, wr / 2 + 0.004], [rimR + (Rt - rimR) * 0.30, hs * 0.97], [rimR + (Rt - rimR) * 0.55, hs], [rimR + (Rt - rimR) * 0.80, hs * 0.96], [Rt - 0.012, tw + (hs - tw) * 0.45]];
      side.forEach(p => pts.push(new THREE.Vector2(p[0], -p[1])));
      const grooves = chunky ? [[-0.5, 0.05], [0, 0.05], [0.5, 0.05]]
        : tread === 'summer' || tread === 'performance' ? [[-0.42, 0.075], [0, 0.085], [0.42, 0.075]]
        : [[-0.62, 0.055], [-0.21, 0.065], [0.21, 0.065], [0.62, 0.055]];
      const gd = chunky ? 0.004 : 0.0075, NT = 56;
      const i0 = pts.length;
      for (let i = 0; i <= NT; i++) {
        const u = -1 + 2 * i / NT;
        const inGroove = grooves.some(g => Math.abs(u - g[0]) < g[1]);
        pts.push(new THREE.Vector2(Rt - 0.006 * u * u - (inGroove ? gd : 0), u * tw));
      }
      const i1 = pts.length - 1;
      side.slice().reverse().forEach(p => pts.push(new THREE.Vector2(p[0], p[1])));
      const tg = new THREE.LatheGeometry(pts, 72);
      tg.rotateX(Math.PI / 2);
      const map = this._tireTexture(tread, i0 / (pts.length - 1), i1 / (pts.length - 1));
      const pitches = Math.round(2 * Math.PI * R / (tread === 'winter' ? 0.035 : 0.045));
      map.repeat.set(pitches, 1);
      const tmat = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 2.2, roughness: 0.92, metalness: 0 });
      const tire = new THREE.Mesh(tg, tmat); tire.castShadow = true; tire.userData.ownMaterial = true;
      grp.add(tire);

      // tread blocks for all-terrain / mud-terrain
      if (chunky) {
        const pitch = tread === 'mt' ? 0.078 : 0.054;
        const n = Math.round(2 * Math.PI * R / pitch);
        const rows = tread === 'mt'
          ? [[-0.86, 0.34, 0], [0.86, 0.34, 0.5], [-0.28, 0.42, 0.5], [0.28, 0.42, 0]]
          : [[-0.84, 0.30, 0], [0.84, 0.30, 0.5], [-0.42, 0.34, 0.5], [0, 0.30, 0], [0.42, 0.34, 0.5]];
        const bg = new THREE.BoxGeometry(blockH + 0.006, pitch * (tread === 'mt' ? 0.58 : 0.66), 1);
        const bm = new THREE.MeshStandardMaterial({ color: 0x151516, roughness: 0.95 });
        const inst = new THREE.InstancedMesh(bg, bm, n * rows.length);
        inst.userData.ownMaterial = true;
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), pos = new THREE.Vector3(), sc = new THREE.Vector3();
        let k = 0;
        rows.forEach(([ax, wf, ph]) => {
          for (let i = 0; i < n; i++) {
            const ang = (i + ph) / n * Math.PI * 2;
            const rad = Rt - 0.006 * ax * ax + blockH / 2 - 0.002;
            q.setFromAxisAngle(zAxis, ang);
            pos.set(Math.cos(ang) * rad, Math.sin(ang) * rad, ax * tw);
            sc.set(1, 1, tw * wf);
            inst.setMatrixAt(k++, m.compose(pos, q, sc));
          }
        });
        inst.castShadow = true;
        grp.add(inst);
      }

      }

      const fin = wh.finish || { color: 0xc9cdd2, metalness: 1, roughness: 0.25 };
      // Real rim model: normalized to 1 unit diameter × 0.5 unit width, outboard face toward +z.
      const rAsset = this._ready(wh.model);
      if (rAsset) {
        const rim = rAsset.scene.clone(true);
        const mk = () => new THREE.MeshStandardMaterial({ color: fin.color, metalness: Math.min(fin.metalness, 0.92), roughness: fin.roughness, envMapIntensity: 1.25, side: THREE.DoubleSide });
        const m1 = mk(), m2 = mk();
        rim.traverse(o => { if (o.isMesh) { o.material = /secondary/.test(o.material.name) ? m2 : m1; o.castShadow = true; o.userData.shared = true; o.userData.ownMaterial = true; } });
        const od = wh.d * IN + 0.03175;
        const holder = new THREE.Group(); holder.add(rim); holder.scale.set(od, od, wr / 0.5);
        grp.add(holder);
      }
      if (!rAsset) {
      // rim barrel
      const rmat = new THREE.MeshStandardMaterial({ color: fin.color, metalness: fin.metalness, roughness: fin.roughness, side: THREE.DoubleSide, envMapIntensity: 1.25 });
      const lip = 0.014;
      const bp = [[rimR + lip, -wr / 2], [rimR, -wr / 2 + 0.006], [rimR - 0.006, -wr / 2 + 0.02], [rimR - 0.022, -wr / 2 + 0.05], [rimR - 0.022, wr / 2 - 0.06],
        [rimR - 0.008, wr / 2 - 0.022], [rimR, wr / 2 - 0.006], [rimR + lip, wr / 2], [rimR + lip - 0.004, wr / 2 + 0.004], [rimR - 0.004, wr / 2 + 0.002], [rimR - 0.014, wr / 2 - 0.012]];
      const barrel = new THREE.LatheGeometry(bp.map(p => new THREE.Vector2(p[0], p[1])), 64);
      barrel.rotateX(Math.PI / 2);
      const bm2 = new THREE.Mesh(barrel, rmat); bm2.userData.ownMaterial = true; bm2.castShadow = true;
      grp.add(bm2);

      // face: spokes run from the hub pad (set by offset) out to the outer lip, so low offsets look deep-dish
      const D = DESIGNS[wh.design] || DESIGNS.five;
      const pcdR = vehicle.pcdMm / 2000;
      const hubR = pcdR + 0.024;
      const zo = wr / 2 - 0.016;
      const zh = Math.max(Math.min(wh.et / 1000 + 0.022, zo), -wr / 2 + 0.05);
      const ri = hubR * 0.86, ro = rimR - 0.012, th = 0.022, N = 10;
      const spokeGeo = (skew) => {
        const s = new THREE.Shape();
        const edge = [];
        for (let k = 0; k <= N; k++) { const t = k / N; edge.push([ri + (ro - ri) * t, skew * Math.pow(t, 1.4), D.wi + (D.wo - D.wi) * t]); }
        s.moveTo(edge[0][0], edge[0][1] - edge[0][2] / 2);
        edge.forEach(e => s.lineTo(e[0], e[1] - e[2] / 2));
        edge.slice().reverse().forEach(e => s.lineTo(e[0], e[1] + e[2] / 2));
        s.closePath();
        const geo = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const t = Math.min(Math.max((p.getX(i) - ri) / (ro - ri), 0), 1);
          p.setZ(i, p.getZ(i) - th + zh + (zo - zh) * Math.pow(t, 1.5));
        }
        geo.computeVertexNormals();
        return geo;
      };
      const addSpokes = (geo, n, phase) => {
        for (let i = 0; i < n; i++) {
          const m = new THREE.Mesh(geo, rmat);
          m.rotation.z = phase + i / n * Math.PI * 2;
          m.castShadow = true;
          grp.add(m);
        }
      };
      const half = Math.PI / vehicle.lugs; // put spokes between lug holes where counts line up
      if (D.pair) { const g1 = spokeGeo(0); addSpokes(g1, D.n, half - D.pair); addSpokes(g1, D.n, half + D.pair); }
      else if (D.cross) { addSpokes(spokeGeo(D.skew), D.n, 0); addSpokes(spokeGeo(-D.skew), D.n, 0); }
      else addSpokes(spokeGeo(D.skew), D.n, half);

      if (D.ring) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rimR + 0.004, 0.013, 10, 64), rmat);
        ring.position.z = wr / 2 + 0.004; ring.scale.z = 0.6; grp.add(ring);
        const bolt = new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 6); bolt.rotateX(Math.PI / 2);
        for (let i = 0; i < 24; i++) {
          const a = i / 24 * Math.PI * 2;
          const m = new THREE.Mesh(bolt, this.mats.lug);
          m.position.set(Math.cos(a) * (rimR + 0.004), Math.sin(a) * (rimR + 0.004), wr / 2 + 0.013);
          grp.add(m);
        }
      }

      // hub pad, center cap, lug nuts on the true bolt circle
      const hub = new THREE.CylinderGeometry(hubR, hubR * 1.05, 0.03, 40); hub.rotateX(Math.PI / 2);
      const hm = new THREE.Mesh(hub, rmat); hm.position.z = zh - 0.008; grp.add(hm);
      const cap = new THREE.CylinderGeometry(pcdR * 0.5, pcdR * 0.56, 0.016, 32); cap.rotateX(Math.PI / 2);
      const cm = new THREE.Mesh(cap, this.mats.trim); cm.position.z = zh + 0.012; grp.add(cm);
      const nut = new THREE.CylinderGeometry(0.0105, 0.0105, 0.018, 6); nut.rotateX(Math.PI / 2);
      for (let i = 0; i < vehicle.lugs; i++) {
        const a = i / vehicle.lugs * Math.PI * 2 + Math.PI / 2;
        const m = new THREE.Mesh(nut, this.mats.lug);
        m.position.set(Math.cos(a) * pcdR, Math.sin(a) * pcdR, zh + 0.012);
        grp.add(m);
      }

      }

      // brake disc + caliper (fixed to the hub face)
      const et = wh.et / 1000;
      const discR = Math.min(rimR - 0.038, vehicle.minDia * IN / 2 - 0.03);
      const disc = new THREE.CylinderGeometry(discR, discR, 0.026, 48); disc.rotateX(Math.PI / 2);
      const dm = new THREE.Mesh(disc, this.mats.disc); dm.position.z = et - 0.03; grp.add(dm);
      const cal = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.07), this.mats.caliper);
      cal.position.set(-discR * 0.72, discR * 0.55, et - 0.03); cal.rotation.z = Math.atan2(discR * 0.55, -discR * 0.72) + Math.PI / 2;
      grp.add(cal);
      return grp;
    }

    // ── Camera ─────────────────────────────────────────────
    setView(name) {
      const g = this.geo; if (!g) return;
      const ty = g.H * 0.42 + this.bodyGroup.position.y * 0.5;
      const views = {
        front34: { theta: 0.72, phi: 1.32, radius: this.homeRadius, target: [0, ty, 0] },
        side: { theta: Math.PI / 2, phi: 1.46, radius: this.homeRadius * 0.95, target: [0, ty, 0] },
        rear34: { theta: Math.PI - 0.75, phi: 1.3, radius: this.homeRadius, target: [0, ty, 0] },
        front: { theta: 0.0001, phi: 1.42, radius: this.homeRadius * 0.9, target: [0, ty, 0] },
        top: { theta: 0.9, phi: 0.5, radius: this.homeRadius * 1.05, target: [0, ty, 0] },
        wheel: { theta: 1.02, phi: 1.44, radius: 2.4, target: this.wheelPos ? [this.wheelPos.x, this.wheelPos.y, this.wheelPos.z] : [0, ty, 0] },
      };
      const v = views[name] || views.front34;
      // take the short way around
      let dt = v.theta - this.orbit.theta; dt = Math.atan2(Math.sin(dt), Math.cos(dt));
      this.goal.theta = this.orbit.theta + dt; this.goal.phi = v.phi; this.goal.radius = v.radius;
      this.goal.target.set(v.target[0], v.target[1], v.target[2]);
      this._idleAt = performance.now() + (name === 'front34' ? 2500 : 1e9);
    }

    setAutoRotate(on) { this.autoRotate = on; this._idleAt = 0; }

    _bindControls() {
      const el = this.renderer.domElement;
      el.style.touchAction = 'none'; el.style.cursor = 'grab';
      const ptrs = new Map(); let pinch = 0;
      el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); el.style.cursor = 'grabbing'; this._idleAt = 1e18; });
      el.addEventListener('pointermove', e => {
        if (!ptrs.has(e.pointerId)) return;
        const p = ptrs.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1];
        ptrs.set(e.pointerId, [e.clientX, e.clientY]);
        if (ptrs.size === 1) {
          this.goal.theta -= dx * 0.0075;
          this.goal.phi = Math.min(Math.max(this.goal.phi - dy * 0.005, 0.25), 1.535);
        } else if (ptrs.size === 2) {
          const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          if (pinch) this.goal.radius = Math.min(Math.max(this.goal.radius * pinch / d, 1.6), 16);
          pinch = d;
        }
      });
      const up = e => { ptrs.delete(e.pointerId); pinch = 0; el.style.cursor = 'grab'; this._idleAt = performance.now() + 6000; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('wheel', e => { e.preventDefault(); this.goal.radius = Math.min(Math.max(this.goal.radius * (1 + Math.sign(e.deltaY) * 0.09), 1.6), 16); this._idleAt = performance.now() + 6000; }, { passive: false });
      el.addEventListener('dblclick', () => this.setView('front34'));
    }

    _resize() {
      const w = this.el.clientWidth || 800, h = this.el.clientHeight || 500;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    _frame() {
      const dt = Math.min(this._clock.getDelta(), 0.05);
      const o = this.orbit, g = this.goal;
      if (this.autoRotate && performance.now() > this._idleAt) g.theta -= dt * 0.16;
      const k = 1 - Math.pow(0.0015, dt);
      o.theta += (g.theta - o.theta) * k; o.phi += (g.phi - o.phi) * k; o.radius += (g.radius - o.radius) * k;
      o.target.lerp(g.target, k);
      const sp = Math.sin(o.phi);
      this.camera.position.set(o.target.x + o.radius * sp * Math.cos(o.theta), o.target.y + o.radius * Math.cos(o.phi), o.target.z + o.radius * sp * Math.sin(o.theta));
      this.camera.lookAt(o.target);
      this.renderer.render(this.scene, this.camera);
    }

    snapshot() { this._frame(); return this.renderer.domElement.toDataURL('image/jpeg', 0.9); }
  }

  root.CWTViewer = Viewer;
})(window);
