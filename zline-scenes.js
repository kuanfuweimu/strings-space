// Z-LINE scenes, following the DENZA Z concept breakdown (Line / Z-shape / tether / tire formation / line field).
// Wall canvas: x 0..2, y 0..1 (2:1), the 90° fold of the two walls sits at x = 1.
// Floor canvas: x 0..1, y 0..1 (square), y = 1 is the edge toward the walls.
(function (root) {
  'use strict';
  const Z = root.ZLine || require('./zline-engine.js');
  const { smooth, snap, lerp, clamp01, TAU, hash } = Z;
  const SILVER = [.86, .92, 1], WHITE = [1, .98, .95], WARM = [1, .40, .09], AMBER = [1, .62, .26];

  // Steps through vals every `period` s, each change eased with a fast snap over `move` s.
  function stepper(t, period, vals, move = .3) {
    if (t < 0) return vals[0];
    const i = Math.floor(t / period), f = snap((t - i * period) / move);
    const N = vals.length, a = vals[(i - 1 + N * 1000) % N], b = vals[i % N];
    return i === 0 ? b : lerp(a, b, f);
  }
  // Monotonic step counter: 0,1,2,... with snapped transitions.
  function stepCount(t, period, move = .3) {
    if (t < 0) return 0;
    const i = Math.floor(t / period); return i + snap((t - i * period) / move);
  }
  function line(W, ax, ay, bx, by, n, o = {}) {
    const nodes = []; for (let i = 0; i <= n; i++) { const f = i / n; nodes.push([lerp(ax, bx, f), lerp(ay, by, f)]); }
    return W.add(Object.assign({ nodes }, o));
  }
  function poly(W, pts, o = {}) { return W.add(Object.assign({ nodes: pts.map(p => p.slice()) }, o)); }
  function chord(s, ax, ay, bx, by) { for (let i = 0; i < s.n; i++) { const f = i / (s.n - 1); s.set(i, lerp(ax, bx, f), lerp(ay, by, f)); } }
  const fadeIn = (t, t0, d = .5) => smooth((t - t0) / d);

  const BASE = { F: 3, width: 1.5, spread: .003, stretchGain: .05, k: 42, zeta: .2, tension: .15, color: SILVER, bright: 1, pluck: 1 };
  const o = (x = {}) => Object.assign({}, BASE, x);

  const SCENES = [
    // 1 — A single line runs through the frame; hands grip both ends and it folds into a Z.
    { name: 'ORIGIN 一线', dur: 26,
      build(c) {
        const m = o({ F: 6, width: 1.8, spread: .0035, stretchGain: .07, bright: 1.25, pluck: 1.3, k: 36, zeta: .15, tension: .22 });
        c.main = line(c.W, -.05, .5, 2.05, .5, 6, m);
        c.echo = []; for (let i = 0; i < 10; i++) c.echo.push(line(c.W, -.05, .5, 2.05, .5, 6, o({ F: 2, width: 1.1, bright: .5, alpha: 0, seed: i * 11 + 3 })));
        c.fm = line(c.F, -.22, .5, 1.22, .5, 4, m);
        c.fe = []; for (let i = 0; i < 8; i++) c.fe.push(line(c.F, -.22, .5, 1.22, .5, 4, o({ F: 2, width: 1.1, bright: .5, alpha: 0, seed: i * 7 + 1 })));
      },
      update(c, t) {
        const xs = [-.05, .3, .65, 1, 1.35, 1.7, 2.05];
        const yl = stepper(t - 2.5, 1.6, [.5, .64, .36, .72, .28, .5], .22), yr = stepper(t - 2.5, 1.6, [.5, .36, .64, .28, .72, .5], .22);
        const z = t > 7 ? stepper(t - 7, 1.4, [1, -1, 1.2, -.6, 1, -1.1], .2) : 0;
        const ys = xs.map((x, i) => {
          let y = lerp(yl, yr, (x + .05) / 2.1);
          if (i === 2) y += .3 * z; if (i === 4) y -= .3 * z; if (i === 1) y -= .1 * z; if (i === 5) y += .1 * z;
          return y;
        });
        c.main.alpha = fadeIn(t, 0, 1.5); for (let i = 0; i < 7; i++) c.main.set(i, xs[i], ys[i]);
        const open = t > 16 ? stepper(t - 16, 1.8, [1, .35, 1.25, .6, 1], .28) : 0;
        c.echo.forEach((s, k) => {
          s.alpha = fadeIn(t, 16 + k * .05, .4) * .9; const d = (k - 4.5) * .075 * open;
          for (let i = 0; i < 7; i++) s.set(i, xs[i], ys[i] + d + (i - 3) * .012 * (k - 4.5) * open);
        });
        const th = stepCount(t - 3, 3, .35) * Math.PI / 4, R = .78, ca = Math.cos(th), sa = Math.sin(th);
        c.fm.alpha = fadeIn(t, .5, 1.5);
        const kink = t > 9 ? stepper(t - 9, 1.4, [0, 1, -1, 1, 0, -1], .2) * .12 : 0;
        for (let i = 0; i < 5; i++) {
          const f = i / 4 * 2 - 1, kk = (i === 1 ? 1 : i === 3 ? -1 : 0) * kink;
          c.fm.set(i, .5 + ca * R * f - sa * kk, .5 + sa * R * f + ca * kk);
        }
        c.fe.forEach((s, k) => {
          s.alpha = fadeIn(t, 16 + k * .05, .4) * .9; const d = (k - 3.5) * .085 * open;
          for (let i = 0; i < 5; i++) { const f = i / 4 * 2 - 1; s.set(i, .5 + ca * R * f - sa * d, .5 + sa * R * f + ca * d); }
        });
      } },

    // 2 — The dancer holds both ends and rotates around an axis; five dancers form a circle with their arms.
    { name: 'AXIS 旋转', dur: 24,
      build(c) {
        c.arms = []; for (let i = 0; i < 5; i++) c.arms.push(line(c.F, .1, .5, .9, .5, 2, o({ F: 4, width: 1.6, bright: 1.1, alpha: 0, seed: 20 + i, k: 30, zeta: .18 })));
        c.ring = c.F.add(o({ nodes: Array.from({ length: 5 }, (_, i) => [.5 + .4 * Math.cos(i * TAU / 5), .5 + .4 * Math.sin(i * TAU / 5)]), closed: true, F: 3, width: 1.3, alpha: 0, seed: 40, stretchGain: .12 }));
        c.wl = []; for (let i = 0; i < 5; i++) c.wl.push(line(c.W, -.05, .5, 2.05, .5, 2, o({ F: 4, width: 1.5, alpha: 0, seed: 60 + i, k: 30, zeta: .17, stretchGain: .08 })));
      },
      update(c, t) {
        const th = stepCount(t - 1.5, 1.5, .32) * Math.PI / 8;
        const fan = t < 6 ? 0 : snap((t - 6) / 2.5);
        const R = .44 + (t > 12 ? stepper(t - 12, 1.5, [0, .04, -.03, .05, 0], .22) : 0);
        const arm = [];
        c.arms.forEach((s, i) => {
          const a = th + i * TAU / 5 * fan; arm.push(a);
          s.alpha = i === 0 ? fadeIn(t, 0, 1) : fadeIn(t, 5.5 + i * .5, .5);
          const ca = Math.cos(a), sa = Math.sin(a), pull = t > 12 ? .06 * Math.sin(t * 2.1 + i) : 0;
          s.set(0, .5 - ca * R * (fan > .5 ? .15 : 1), .5 - sa * R * (fan > .5 ? .15 : 1));
          s.set(1, .5 - sa * pull, .5 + ca * pull);
          s.set(2, .5 + ca * R, .5 + sa * R);
        });
        c.ring.alpha = fadeIn(t, 12, .8);
        for (let i = 0; i < 5; i++) c.ring.set(i, .5 + Math.cos(arm[i]) * R, .5 + Math.sin(arm[i]) * R);
        c.wl.forEach((s, i) => {
          const a = arm[i]; s.alpha = i === 0 ? fadeIn(t, 0, 1) : fadeIn(t, 5.5 + i * .5, .5);
          const lift = .36 * Math.sin(a), tilt = .3 * Math.cos(a);
          s.set(0, -.05, .5 - tilt); s.set(1, 1, .5 + lift); s.set(2, 2.05, .5 + tilt);
        });
      } },

    // 3 — More dancers join holding the line: opposite each other, parallel, staggered.
    { name: 'PARALLEL 平行·交错', dur: 24,
      build(c) {
        c.wl = []; for (let i = 0; i < 18; i++) c.wl.push(line(c.W, -.05, .5, 2.05, .5, 4, o({ F: 3, width: 1.3, alpha: 0, seed: 80 + i, stretchGain: .1 })));
        c.fl = []; for (let i = 0; i < 18; i++) c.fl.push(line(c.F, .5, -.05, .5, 1.05, 4, o({ F: 3, width: 1.3, alpha: 0, seed: 120 + i, stretchGain: .1 })));
      },
      update(c, t) {
        const P = (t < 3 ? 0 : 1 + Math.floor((t - 3) / 2.4)) % 4, f = t < 3 ? 1 : snap(((t - 3) % 2.4) / .3);
        const Pp = (P + 3) % 4;
        const xs = [-.05, .5, 1, 1.5, 2.05], N = c.wl.length;
        const pose = (p, i, x, base) => {
          const s = i % 2 ? 1 : -1, u = (x - 1);
          if (p === 0) return base;
          if (p === 1) return base + (x === .5 ? .055 : x === 1.5 ? -.055 : 0) * s;        // staggered Z
          if (p === 2) return base + u * .26 * s;                                       // opposite: crossing X
          return lerp(base, .5, x === 1 ? .85 : 0) + (x === 1 ? 0 : u * 0);            // converge to the fold
        };
        c.wl.forEach((s, i) => {
          s.alpha = fadeIn(t, i * .12, .4); const base = .07 + .86 * i / (N - 1);
          for (let k = 0; k < 5; k++) s.set(k, xs[k], lerp(pose(Pp, i, xs[k], base), pose(P, i, xs[k], base), f));
        });
        const ys = [-.05, .25, .5, .75, 1.05];
        c.fl.forEach((s, i) => {
          s.alpha = fadeIn(t, .3 + i * .12, .4); const base = .06 + .88 * i / (N - 1);
          for (let k = 0; k < 5; k++) {
            const y = ys[k], fx = x => lerp(base, .5, x);
            const pp = p => p === 0 ? base : p === 1 ? base + (k === 1 ? .04 : k === 3 ? -.04 : 0) * (i % 2 ? 1 : -1)
              : p === 2 ? base + (y - .5) * .3 * (i % 2 ? 1 : -1) : fx(k === 2 ? .8 : 0);
            s.set(k, lerp(pp(Pp), pp(P), f), y);
          }
        });
      } },

    // 4 — Orange light; lines extend from the sides toward the front, dancers pull and intertwine the midsections.
    { name: 'WEAVE 编织·橙', dur: 26,
      build(c) {
        c.wl = [];
        for (let i = 0; i < 26; i++) {
          const left = i % 2 === 0, warm = hash(i * 3.1) < .45;
          c.wl.push(line(c.W, left ? -.05 : 2.05, .5, 1, .5, 3, o({ F: 3, width: warm ? 1.7 : 1.2, color: warm ? WARM : SILVER, bright: warm ? 1.25 : .8, alpha: 0, seed: 200 + i, k: 34, zeta: .17, stretchGain: .16, spread: .002 })));
        }
        c.fl = [];
        for (let i = 0; i < 20; i++) {
          const warm = hash(i * 5.3) < .45;
          c.fl.push(line(c.F, .5, 1.05, .5, -.05, 3, o({ F: 3, width: warm ? 1.7 : 1.2, color: warm ? WARM : SILVER, bright: warm ? 1.25 : .8, alpha: 0, seed: 260 + i, k: 34, zeta: .17, stretchGain: .16 })));
        }
      },
      update(c, t) {
        const h1 = [stepper(t - 4, 2, [.55, .8, .35, .95, .6], .3), stepper(t - 4, 2, [.5, .3, .72, .4, .62], .3)];
        const h2 = [stepper(t - 5, 2, [1.45, 1.2, 1.65, 1.05, 1.4], .3), stepper(t - 5, 2, [.5, .7, .28, .6, .38], .3)];
        const pull = t < 4 ? 0 : t < 6 ? snap((t - 4) / 1.5) : 1, cross = t > 12 ? stepper(t - 12, 1.6, [1, -1, .5, -1, 1], .25) : 1;
        c.wl.forEach((s, i) => {
          const left = i % 2 === 0, j = i >> 1, y0 = .08 + .84 * (j / 12), grow = snap((t - j * .15) / .9);
          s.alpha = fadeIn(t, j * .15, .3);
          const x0 = left ? -.05 : 2.05, xe = left ? lerp(x0, 1.25, grow) : lerp(x0, .75, grow), ye = lerp(y0, 1 - y0, .5 * grow);
          const H = left ? h1 : h2, w = (j % 3 === 0 ? .9 : j % 3 === 1 ? .5 : .2) * pull;
          const m1x = lerp(x0, xe, .38), m1y = lerp(y0, ye, .38), m2x = lerp(x0, xe, .66), m2y = lerp(y0, ye, .66);
          const side = (j % 2 ? 1 : -1) * cross * .05 * pull;
          s.set(0, x0, y0); s.set(1, lerp(m1x, H[0], w), lerp(m1y, H[1], w) + side); s.set(2, lerp(m2x, H[0] + .08, w * .6), lerp(m2y, H[1], w * .6) - side); s.set(3, xe, ye);
        });
        const fh = [stepper(t - 4, 2.2, [.5, .25, .72, .35, .6], .3), stepper(t - 4.5, 2.2, [.5, .62, .38, .55, .45], .3)];
        c.fl.forEach((s, i) => {
          const x0 = .05 + .9 * i / 19, grow = snap((t - .5 - i * .12) / .9), w = (i % 3 === 0 ? .85 : i % 3 === 1 ? .45 : .15) * pull;
          s.alpha = fadeIn(t, .5 + i * .12, .3);
          const ye = lerp(1.05, -.05, grow), xe = lerp(x0, 1 - x0, .35 * grow);
          s.set(0, x0, 1.05); s.set(1, lerp(lerp(x0, xe, .4), fh[0], w), lerp(lerp(1.05, ye, .4), fh[1], w));
          s.set(2, lerp(lerp(x0, xe, .7), fh[0], w * .5) + (i % 2 ? .04 : -.04) * cross * pull, lerp(1.05, ye, .7)); s.set(3, xe, ye);
        });
      } },

    // 5 — A dancer moves through an array of lines, orange light and glitch.
    { name: 'ARRAY 阵列·故障', dur: 24,
      build(c) {
        c.wl = []; for (let i = 0; i < 72; i++) c.wl.push(line(c.W, .02 + 1.96 * i / 71, -.05, .02 + 1.96 * i / 71, 1.05, 4, o({ F: 2, width: 1.05, bright: .75, alpha: 0, seed: 300 + i, k: 55, zeta: .14, tension: .25, stretchGain: .3 })));
        c.fx = []; c.fy = [];
        for (let i = 0; i < 26; i++) {
          const v = .02 + .96 * i / 25;
          c.fx.push(line(c.F, -.03, v, 1.03, v, 8, o({ F: 2, width: 1.05, bright: .7, alpha: 0, seed: 400 + i, k: 55, zeta: .14, tension: .25, stretchGain: .3 })));
          c.fy.push(line(c.F, v, -.03, v, 1.03, 8, o({ F: 2, width: 1.05, bright: .7, alpha: 0, seed: 440 + i, k: 55, zeta: .14, tension: .25, stretchGain: .3 })));
        }
      },
      update(c, t) {
        const wx = stepper(t - 2, 1.2, [.15, .45, .7, .95, 1.2, 1.5, 1.8, 1.55, 1.1, .6], .45), wy = stepper(t - 2, 1.2, [.3, .45, .35, .55, .4, .5, .35, .6, .45, .4], .45);
        const burst = t > 4 && ((t * 1.1) % 3.2) < .35;
        c.glitch = burst ? .9 : 0;
        const push = (x, y, cx, cy, A, r2) => { const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy; return A * Math.exp(-d2 / r2) * Math.sign(dx || 1); };
        c.wl.forEach((s, i) => {
          const x = s.tx[0]; s.alpha = fadeIn(t, Math.abs(x - 1) * 1.2, .3);
          const heat = Math.exp(-((x - wx) ** 2) / .012);
          s.color = [lerp(SILVER[0], WARM[0], heat), lerp(SILVER[1], WARM[1], heat), lerp(SILVER[2], WARM[2], heat)]; s.bright = .75 + heat * .9;
          for (let k = 1; k < 4; k++) { const y = k / 4; s.set(k, x + push(x, y, wx, wy, .09, .03), y); }
        });
        const fx = .5 + .32 * Math.cos(wx * 2.4), fy = .5 + .32 * Math.sin(wx * 2.4);
        const grid = (s, horiz, v) => {
          for (let k = 1; k < 8; k++) {
            const u = -.03 + 1.06 * k / 8, x = horiz ? u : v, y = horiz ? v : u, dx = x - fx, dy = y - fy, d = Math.hypot(dx, dy) + 1e-3;
            const A = .07 * Math.exp(-d * d / .02);
            s.set(k, x + (horiz ? 0 : dx / d * A), y + (horiz ? dy / d * A : 0));
          }
        };
        c.fx.forEach((s, i) => { s.alpha = fadeIn(t, .3 + i * .03, .3); grid(s, true, s.ty[0]); });
        c.fy.forEach((s, i) => { s.alpha = fadeIn(t, .3 + i * .03, .3); grid(s, false, s.tx[0]); });
      } },

    // 6 — Ordered, intersecting Z-shaped configuration: dense carbon-fibre bands.
    { name: 'Z-FORM 折形·碳纤', dur: 24,
      build(c) {
        c.wl = []; for (let i = 0; i < 46; i++) c.wl.push(line(c.W, -.05, .5, 2.05, .5, 3, o({ F: 2, width: 1, bright: .55, alpha: 0, seed: 500 + i, k: 40, zeta: .2, stretchGain: .08 })));
        c.fl = []; for (let i = 0; i < 34; i++) c.fl.push(line(c.F, -.05, .5, 1.05, .5, 6, o({ F: 2, width: 1.05, bright: .85, alpha: 0, seed: 560 + i, k: 40, zeta: .2 })));
      },
      update(c, t) {
        // pose: [x1, x2, top, bottom]
        const poses = [[.7, 1.3, .9, .1], [1, 1, .85, .15], [.4, 1.6, .1, .9], [.85, 1.15, .95, .05], [1, 1.6, .2, .8]];
        const i0 = t < 3 ? 0 : 1 + Math.floor((t - 3) / 2.6), f = t < 3 ? 1 : snap(((t - 3) % 2.6) / .32);
        const A = poses[(i0 + poses.length - 1) % poses.length], B = poses[i0 % poses.length], P = A.map((a, k) => lerp(a, B[k], f));
        const N = c.wl.length;
        c.wl.forEach((s, i) => {
          s.alpha = fadeIn(t, i * .04, .3); const d = (i / (N - 1) - .5);
          const ya = P[2] + d * .16, yb = P[3] + d * .16, sh = d * .5;
          s.set(0, -.05, ya); s.set(1, P[0] + sh, ya); s.set(2, P[1] + sh, yb); s.set(3, 2.05, yb);
        });
        const amp = stepper(t - 3, 2.6, [.08, .14, .05, .12, .1], .32), ph = stepCount(t - 3, 2.6, .32);
        c.fl.forEach((s, i) => {
          s.alpha = fadeIn(t, .3 + i * .04, .3); const y0 = .04 + .92 * i / 33;
          for (let k = 0; k < 7; k++) s.set(k, -.05 + 1.1 * k / 6, y0 + ((k + Math.round(ph)) % 2 ? amp : -amp) * (k === 0 || k === 6 ? .3 : 1));
        });
      } },

    // 7 — The dancer leaps, aided by a tether: lines from the wall grid converge on one moving point.
    { name: 'TETHER 牵引', dur: 24,
      build(c) {
        c.grid = [];
        for (let i = 1; i < 12; i++) c.grid.push(line(c.W, i / 6, -.05, i / 6, 1.05, 1, o({ F: 1, width: 1, bright: .22, alpha: 0, pluck: 0, seed: 600 + i })));
        for (let j = 1; j < 4; j++) c.grid.push(line(c.W, -.05, j / 4, 2.05, j / 4, 1, o({ F: 1, width: 1, bright: .22, alpha: 0, pluck: 0, seed: 620 + j })));
        c.anchors = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) c.anchors.push([.18 + i * .33, .2 + j * .3]);
        c.teth = c.anchors.map((a, k) => line(c.W, a[0], a[1], a[0], a[1], 2, o({ F: 4, width: 1.25, bright: 1, alpha: 0, seed: 640 + k, k: 28, zeta: .16, stretchGain: .1, restLen: .4 })));
        c.fa = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; c.fa.push([.5 + .55 * Math.cos(a), .5 + .55 * Math.sin(a)]); }
        c.ft = c.fa.map((a, k) => line(c.F, a[0], a[1], a[0], a[1], 2, o({ F: 4, width: 1.25, alpha: 0, seed: 680 + k, k: 28, zeta: .16, stretchGain: .1, restLen: .3 })));
      },
      update(c, t) {
        c.grid.forEach(s => s.alpha = fadeIn(t, 0, 1.5));
        const px = stepper(t - 3, 1.8, [1, .55, 1.4, .8, 1.25, .35, 1.7, 1], .4), py = stepper(t - 3, 1.8, [.35, .7, .45, .85, .3, .6, .75, .5], .4);
        const jump = t > 3 ? Math.sin(Math.PI * clamp01(((t - 3) % 1.8) / .4)) * .12 : 0;
        const on = k => fadeIn(t, 1.5 + k * .1, .3), grow = k => snap((t - 1.5 - k * .1) / .6);
        c.teth.forEach((s, k) => {
          const a = c.anchors[k], g = grow(k), tx = lerp(a[0], px, g), ty = lerp(a[1], py + jump, g);
          s.alpha = on(k); s.set(0, a[0], a[1]); s.set(1, lerp(a[0], tx, .5), lerp(a[1], ty, .5)); s.set(2, tx, ty);
        });
        const fx = .5 + (px - 1) * .35, fy = .5 + (py - .5) * .5;
        c.ft.forEach((s, k) => {
          const a = c.fa[k], g = grow(k * .7), tx = lerp(a[0], fx, g), ty = lerp(a[1], fy, g);
          s.alpha = on(k * .7); s.set(0, a[0], a[1]); s.set(1, lerp(a[0], tx, .5), lerp(a[1], ty, .5)); s.set(2, tx, ty);
        });
      } },

    // 8 — Floor formation that mimics the movement of tyres: faceted rings and tread blocks.
    { name: 'TIRE 轮阵', dur: 26,
      build(c) {
        const ring = (r, n, seed, x = {}) => c.F.add(o(Object.assign({ nodes: Array.from({ length: n }, (_, i) => [.5 + r * Math.cos(i * TAU / n), .5 + r * Math.sin(i * TAU / n)]), closed: true, alpha: 0, seed, stretchGain: .1, tension: 0 }, x)));
        c.rings = []; for (let k = 0; k < 8; k++) c.rings.push(ring(.07 + k * .055, 12, 700 + k, { F: k === 7 ? 4 : 2, width: k === 7 ? 1.6 : 1.15 }));
        c.tread = []; for (let i = 0; i < 24; i++) c.tread.push(line(c.F, .5, .5, .5, .5, 1, o({ F: 2, width: 1.3, alpha: 0, seed: 740 + i, restLen: .06 })));
        c.chev = []; for (let i = 0; i < 16; i++) c.chev.push(line(c.W, 0, .2, 0, .8, 2, o({ F: 3, width: 1.3, alpha: 0, seed: 780 + i, restLen: .5 })));
        c.rail = [line(c.W, -.05, .12, 2.05, .12, 1, o({ F: 2, width: 1.2, bright: .6, alpha: 0, pluck: 0, seed: 798 })), line(c.W, -.05, .88, 2.05, .88, 1, o({ F: 2, width: 1.2, bright: .6, alpha: 0, pluck: 0, seed: 799 }))];
      },
      update(c, t) {
        const kick = t > 4 ? stepper(t - 4, 1.5, [0, .02, 0, .035, 0, .015], .18) : 0;
        c.rings.forEach((s, k) => {
          s.alpha = fadeIn(t, k * .25, .5);
          const rot = stepCount(t - 2 - k * .06, 1.5, .3) * (k % 2 ? 1 : -1) * TAU / 24, r = .07 + k * .055 + kick * (k / 7);
          for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + rot; s.set(i, .5 + r * Math.cos(a), .5 + r * Math.sin(a)); }
        });
        const rot = stepCount(t - 2, 1.5, .3) * TAU / 24, R0 = .07 + 7 * .055 + kick;
        c.tread.forEach((s, i) => {
          s.alpha = fadeIn(t, 2 + i * .04, .3); const a = i * TAU / 24 + rot + .13;
          s.set(0, .5 + (R0 - .05) * Math.cos(a), .5 + (R0 - .05) * Math.sin(a)); s.set(1, .5 + (R0 + .025) * Math.cos(a + .1), .5 + (R0 + .025) * Math.sin(a + .1));
        });
        c.rail.forEach(s => s.alpha = fadeIn(t, 1, 1));
        const scroll = stepCount(t - 2, 1.5, .3) * .125;
        c.chev.forEach((s, i) => {
          s.alpha = fadeIn(t, 1.5 + i * .05, .3);
          const x = ((i * .135 + scroll) % 2.16) - .08, d = .1 + kick * 2;
          s.set(0, x - d, .16); s.set(1, x, .5); s.set(2, x - d, .84);
        });
      } },

    // 9 — Dense line field on the floor, rippled by the formation (floor reference).
    { name: 'FIELD 力场', dur: 26,
      build(c) {
        c.fl = []; for (let i = 0; i < 64; i++) c.fl.push(line(c.F, -.03, .01 + .98 * i / 63, 1.03, .01 + .98 * i / 63, 16, o({ F: 2, width: 1, bright: .75, alpha: 0, seed: 800 + i, k: 60, zeta: .16, tension: .1 })));
        c.wl = []; for (let i = 0; i < 40; i++) c.wl.push(line(c.W, -.05, .02 + .96 * i / 39, 2.05, .02 + .96 * i / 39, 20, o({ F: 2, width: 1, bright: .75, alpha: 0, seed: 880 + i, k: 60, zeta: .16, tension: .1 })));
        c.waves = [];
      },
      update(c, t) {
        const P = [stepper(t - 1, 3, [.5, .3, .68, .45, .6], .5), stepper(t - 1, 3, [.5, .62, .4, .3, .58], .5)];
        const wi = Math.floor((t - 1) / 3);
        if (t > 1 && c.lastWave !== wi) { c.lastWave = wi; c.waves.push({ t0: t, x: P[0], y: P[1] }); if (c.waves.length > 4) c.waves.shift(); }
        const disp = (x, y) => {
          let dx = 0, dy = 0;
          const ax = x - P[0], ay = y - P[1], d0 = Math.hypot(ax, ay) + 1e-4, hole = .07 * Math.exp(-d0 * d0 / .008);   // the dancer's body pushes the field
          dx += ax / d0 * hole; dy += ay / d0 * hole;
          for (const w of c.waves) {
            const R = (t - w.t0) * .42, bx = x - w.x, by = y - w.y, d = Math.hypot(bx, by) + 1e-4;
            const A = .075 * Math.exp(-((d - R) ** 2) / .004) * Math.exp(-(t - w.t0) * .45);
            dx += bx / d * A; dy += by / d * A;
          }
          return [dx, dy];
        };
        c.fl.forEach((s, i) => {
          s.alpha = fadeIn(t, Math.abs(i - 31.5) * .02, .4);
          const y = .01 + .98 * i / 63;
          for (let k = 1; k < 16; k++) { const x = -.03 + 1.06 * k / 16, d = disp(x, y); s.set(k, x + d[0] * .3, y + d[1]); }
        });
        // wall: the same ripple seen rising from the floor edge (y = 1 on the floor meets the fold)
        c.wl.forEach((s, i) => {
          s.alpha = fadeIn(t, .4 + i * .02, .4);
          const y = .02 + .96 * i / 39;
          for (let k = 1; k < 20; k++) {
            const x = -.05 + 2.1 * k / 20, fx = x < 1 ? x * .5 : 1 - (x - 1) * .5;   // unfold the V onto the floor's back edge
            const d = disp(fx, 1 - y * .5); s.set(k, x, y - d[1] * 3);
          }
        });
      } },
  ];

  const api = { SCENES, stepper, stepCount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ZScenes = api;
})(typeof self !== 'undefined' ? self : this);
