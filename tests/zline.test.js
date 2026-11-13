'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Z = require('../zline-engine.js');
global.ZLine = Z;
const { SCENES } = require('../zline-scenes.js');

test('springs overshoot then settle on the target (elastic snap)', () => {
  const s = new Z.ZString({ nodes: [[0, 0], [1, 0]], k: 42, zeta: .2, tension: 0 });
  s.set(1, 1, .5);
  let peak = 0;
  for (let i = 0; i < 1200; i++) { s.step(1 / 240); peak = Math.max(peak, s.py[1]); }
  assert.ok(peak > .55, 'overshoots past the target');
  assert.ok(Math.abs(s.py[1] - .5) < .01, 'settles at the target');
});

test('pluck vibration decays back to a straight line', () => {
  const s = new Z.ZString({ nodes: [[0, .5], [1, .5]] });
  s.set(1, 1.6, .5);
  for (let i = 0; i < 60; i++) s.step(1 / 240);
  assert.ok(s.amp[0] > 0, 'length change plucks the segment');
  for (let i = 0; i < 240 * 4; i++) s.step(1 / 240);
  assert.ok(s.amp[0] < 1e-3, 'vibration dies out');
});

test('every scene runs its full duration without NaN on both surfaces', () => {
  for (const sc of SCENES) {
    const c = { W: new Z.World(), F: new Z.World() };
    sc.build(c); sc.update(c, 0);
    for (const s of [...c.W.strings, ...c.F.strings]) s.settle();
    for (let t = 0; t < sc.dur; t += 1 / 30) {
      sc.update(c, t); c.W.step(1 / 30, 8); c.F.step(1 / 30, 8);
      for (const w of [c.W, c.F]) {
        const n = w.emit(1);
        for (let k = 0; k < n * Z.FLOATS; k++) assert.ok(Number.isFinite(w.buf[k]), `${sc.name} t=${t.toFixed(2)}`);
      }
    }
  }
});
