// Z-LINE engine: taut strings made of straight segments between choreographed nodes.
// Nodes chase their targets through under-damped springs (overshoot = elastic snap), segments stay
// straight, and every length change "plucks" the segment so it vibrates and settles back to a line.
// Each string is drawn as a bundle of filaments that fan apart when the string is stretched.
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const FLOATS = 16; // per drawn segment instance

  class ZString {
    constructor(o) {
      const n = o.nodes.length;
      this.n = n; this.closed = !!o.closed; this.m = this.closed ? n : n - 1;
      const F64 = k => new Float64Array(k);
      this.px = F64(n); this.py = F64(n); this.vx = F64(n); this.vy = F64(n); this.tx = F64(n); this.ty = F64(n);
      this.kn = F64(n).fill(1);
      if (o.kNode) for (let i = 0; i < n; i++) this.kn[i] = o.kNode[i] ?? 1;
      for (let i = 0; i < n; i++) { this.px[i] = this.tx[i] = o.nodes[i][0]; this.py[i] = this.ty[i] = o.nodes[i][1]; }
      this.k = o.k ?? 45; this.zeta = o.zeta ?? .22; this.tension = o.tension ?? .12;
      this.F = Math.max(1, o.filaments ?? 3); this.spread = o.spread ?? .015; this.stretchGain = o.stretchGain ?? .22;
      this.width = o.width ?? 1.6; this.bright = o.bright ?? 1; this.color = (o.color || [.92, .95, 1]).slice();
      this.alpha = o.alpha ?? 1; this.pluck = o.pluck ?? 1; this.vibDecay = o.vibDecay ?? 4.5; this.freq = o.freq ?? 7;
      this.maxAmp = o.maxAmp ?? .012; this.seed = o.seed ?? Math.random() * 1000;
      const m = this.m;
      this.L0 = F64(m); this.Lp = F64(m); this.amp = F64(m); this.ph = F64(m);
      for (let j = 0; j < m; j++) { const L = this.len(j); this.L0[j] = o.restLen ?? Math.max(L, .05); this.Lp[j] = L; this.ph[j] = hash(this.seed * 13 + j) * TAU; }
    }
    j1(j) { return this.closed ? (j + 1) % this.n : j + 1; }
    len(j) { const b = this.j1(j); return Math.hypot(this.px[b] - this.px[j], this.py[b] - this.py[j]); }
    set(i, x, y) { this.tx[i] = x; this.ty[i] = y; }
    // Make the current targets the resting shape (no snap, no pluck).
    settle() {
      for (let i = 0; i < this.n; i++) { this.px[i] = this.tx[i]; this.py[i] = this.ty[i]; this.vx[i] = this.vy[i] = 0; }
      for (let j = 0; j < this.m; j++) { this.Lp[j] = this.len(j); this.amp[j] = 0; }
    }
    rest() { for (let j = 0; j < this.m; j++) this.L0[j] = Math.max(this.len(j), .05); }
    step(dt) {
      const n = this.n, w = Math.sqrt(this.k);
      for (let i = 0; i < n; i++) {
        const k = this.k * this.kn[i], c = 2 * this.zeta * Math.sqrt(k);
        let ax = k * (this.tx[i] - this.px[i]) - c * this.vx[i];
        let ay = k * (this.ty[i] - this.py[i]) - c * this.vy[i];
        const inner = this.closed || (i > 0 && i < n - 1);
        if (inner && this.tension > 0) {               // string tension resists folding: pulls corners toward the chord
          const a = (i - 1 + n) % n, b = (i + 1) % n;
          ax += this.tension * k * ((this.px[a] + this.px[b]) * .5 - this.px[i]);
          ay += this.tension * k * ((this.py[a] + this.py[b]) * .5 - this.py[i]);
        }
        this.vx[i] += ax * dt; this.vy[i] += ay * dt;
        this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt;
      }
      void w;
      const dec = Math.exp(-this.vibDecay * dt);
      for (let j = 0; j < this.m; j++) {
        const L = this.len(j), dL = Math.abs(L - this.Lp[j]);
        this.amp[j] = Math.min(this.amp[j] * dec + this.pluck * .25 * dL, this.maxAmp * Math.max(L, .3) * this.pluck);
        this.ph[j] += TAU * this.freq * Math.sqrt(Math.max(.3, L / this.L0[j])) * dt;
        this.Lp[j] = L;
      }
    }
    // Writes one instance per (filament, segment). Returns the new float offset.
    emit(out, off, gain) {
      const n = this.n, m = this.m, F = this.F, A = this.alpha * gain;
      if (A <= .002) return off;
      const nx = new Float64Array(n), ny = new Float64Array(n), sp = new Float64Array(n);
      const sx = new Float64Array(m), sy = new Float64Array(m), st = new Float64Array(m);
      for (let j = 0; j < m; j++) {
        const b = this.j1(j), dx = this.px[b] - this.px[j], dy = this.py[b] - this.py[j], L = Math.hypot(dx, dy);
        sx[j] = L > 1e-6 ? -dy / L : 0; sy[j] = L > 1e-6 ? dx / L : 1; st[j] = Math.max(0, L / this.L0[j] - 1);
      }
      for (let i = 0; i < n; i++) {   // mitred offset direction so the bundle keeps sharp corners
        const a = this.closed ? (i - 1 + m) % m : i - 1, b = this.closed ? i % m : i;
        const ha = a >= 0, hb = b < m;
        let mx = (ha ? sx[a] : 0) + (hb ? sx[b] : 0), my = (ha ? sy[a] : 0) + (hb ? sy[b] : 0);
        const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
        const ref = hb ? b : a, cs = Math.max(.35, mx * sx[ref] + my * sy[ref]);
        nx[i] = mx / cs; ny[i] = my / cs;
        sp[i] = this.spread + this.stretchGain * Math.max(ha ? st[a] : 0, hb ? st[b] : 0);
      }
      const bF = this.bright / Math.pow(F, .35), [r, g, bl] = this.color;
      for (let f = 0; f < F; f++) {
        const h = hash(this.seed * 7.13 + f * 3.7);
        const c = (F > 1 ? (f / (F - 1) - .5) * 2 : 0) + (h - .5) * .5 / F;
        const fa = .55 + .9 * hash(this.seed + f * 7.3), fb = bF * (.6 + .4 * h);
        let s0 = 0;
        for (let j = 0; j < m; j++) {
          const b = this.j1(j);
          const x0 = this.px[j] + nx[j] * sp[j] * c, y0 = this.py[j] + ny[j] * sp[j] * c;
          const x1 = this.px[b] + nx[b] * sp[b] * c, y1 = this.py[b] + ny[b] * sp[b] * c;
          const L = Math.hypot(x1 - x0, y1 - y0);
          if (L > 1e-4) {
            out[off] = x0; out[off + 1] = y0; out[off + 2] = x1; out[off + 3] = y1;
            out[off + 4] = this.amp[j] * fa; out[off + 5] = this.ph[j] + f * .9 + h * 2; out[off + 6] = this.seed * .01 + f * .173; out[off + 7] = s0;
            out[off + 8] = r; out[off + 9] = g; out[off + 10] = bl; out[off + 11] = fb * A;
            out[off + 12] = this.width; out[off + 13] = 0; out[off + 14] = 0; out[off + 15] = 0;
            off += FLOATS;
          }
          s0 += L;
        }
      }
      return off;
    }
  }

  class World {
    constructor() { this.strings = []; this.buf = new Float32Array(FLOATS * 4096); this.count = 0; }
    add(o) { const s = o instanceof ZString ? o : new ZString(o); this.strings.push(s); return s; }
    step(dt, sub = 4) { const h = dt / sub; for (let k = 0; k < sub; k++) for (const s of this.strings) s.step(h); }
    emit(gain = 1) {
      let need = 0;
      for (const s of this.strings) need += s.F * s.m * FLOATS;
      if (need > this.buf.length) this.buf = new Float32Array(need * 1.5 | 0);
      let off = 0;
      for (const s of this.strings) off = s.emit(this.buf, off, gain);
      this.count = off / FLOATS;
      return this.count;
    }
  }

  // ---- choreography helpers ----
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const snap = x => { x = clamp01(x); return 1 - Math.pow(1 - x, 4); };            // fast attack, the spring does the rest
  const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, f) => a + (b - a) * f;
  // Sequence of poses held for `hold` seconds each; transition takes `move` seconds with a snap ease.
  function poseAt(poses, t, hold, move = .35) {
    const i = Math.floor(t / hold), f = snap((t - i * hold) / move);
    const A = poses[(i - 1 + poses.length * 64) % poses.length], B = poses[i % poses.length];
    if (i <= 0) return B;
    return B.map((p, k) => [lerp(A[k][0], p[0], f), lerp(A[k][1], p[1], f)]);
  }
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  const api = { ZString, World, FLOATS, hash, rng, snap, smooth, lerp, clamp01, poseAt, TAU };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ZLine = api;
})(typeof self !== 'undefined' ? self : this);
