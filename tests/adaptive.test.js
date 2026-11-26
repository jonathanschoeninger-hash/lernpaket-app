import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  START_GEWICHT,
  standVon,
  bewerte,
  uebungsPool,
  neueRunde,
  leereRunde,
  merkeZug,
  naechsteFrage,
  gewichteteAuswahl,
  rundenBericht,
} from '../js/logic/adaptive.js';

/** Fester Zufall für Tests (mulberry32). */
function zufallMitSamen(samen) {
  let a = samen >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fragen = (n, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({ id: `f${i + 1}`, unterthema: i % 2 ? 'u2' : 'u1', nurTest: false, ...extra }));

describe('Gewichte und Serie', () => {
  test('Startwerte', () => {
    assert.equal(START_GEWICHT, 1);
    assert.deepEqual(standVon({}, 'f1'), {
      gewicht: 1, serie: 0, gemeistert: false, richtig: 0, falsch: 0, zuletzt: null,
    });
  });

  test('richtig: Gewicht × 0,4, Serie + 1', () => {
    const s = bewerte(standVon({}, 'f1'), true, 100);
    assert.equal(s.gewicht, 0.4);
    assert.equal(s.serie, 1);
    assert.equal(s.richtig, 1);
    assert.equal(s.zuletzt, 100);
    assert.equal(s.gemeistert, false);
  });

  test('falsch: Gewicht × 2 + 1, Serie = 0', () => {
    const s = bewerte({ ...standVon({}, 'f1'), gewicht: 0.4, serie: 1 }, false, 5);
    assert.ok(Math.abs(s.gewicht - 1.8) < 1e-9);
    assert.equal(s.serie, 0);
    assert.equal(s.falsch, 1);
  });

  test('gemeistert nach 2× richtig in Folge', () => {
    let s = standVon({}, 'f1');
    s = bewerte(s, true, 1);
    s = bewerte(s, true, 2);
    assert.equal(s.gemeistert, true);
  });

  test('war sie schon einmal falsch: erst nach 3× richtig gemeistert', () => {
    let s = bewerte(standVon({}, 'f1'), false, 1);
    s = bewerte(s, true, 2);
    s = bewerte(s, true, 3);
    assert.equal(s.gemeistert, false);
    s = bewerte(s, true, 4);
    assert.equal(s.gemeistert, true);
  });

  test('kaputte gespeicherte Werte werden durch Startwerte ersetzt', () => {
    assert.deepEqual(standVon({ f1: { gewicht: -3, serie: 'x' } }, 'f1').gewicht, 1);
    assert.deepEqual(standVon({ f1: { gewicht: -3, serie: 'x' } }, 'f1').serie, 0);
  });
});

describe('Pool', () => {
  test('nur Übungsfragen, nicht gemeistert, optional ein Unterthema oder bestimmte IDs', () => {
    const liste = [...fragen(4), { id: 't1', unterthema: 'u1', nurTest: true }];
    const stand = { f1: { ...standVon({}, 'f1'), gemeistert: true } };
    assert.deepEqual(uebungsPool(liste, stand).map((f) => f.id), ['f2', 'f3', 'f4']);
    assert.deepEqual(uebungsPool(liste, stand, { unterthema: 'u1' }).map((f) => f.id), ['f3']);
    assert.deepEqual(uebungsPool(liste, stand, { nurIds: ['f1', 'f2', 't1'] }).map((f) => f.id), ['f2']);
  });

  test('Neue Runde: gemeistert und Serie zurück, Gewichte und Zähler bleiben', () => {
    const stand = {
      f1: { gewicht: 0.16, serie: 2, gemeistert: true, richtig: 2, falsch: 0, zuletzt: 9 },
      f2: { gewicht: 3, serie: 3, gemeistert: true, richtig: 3, falsch: 1, zuletzt: 9 },
      f3: { gewicht: 1, serie: 2, gemeistert: true, richtig: 2, falsch: 0, zuletzt: 9 },
    };
    const neu = neueRunde(stand, ['f1', 'f2']);
    assert.deepEqual(neu.f1, { ...stand.f1, gemeistert: false, serie: 0 });
    assert.deepEqual(neu.f2, { ...stand.f2, gemeistert: false, serie: 0 });
    assert.deepEqual(neu.f3, stand.f3);
  });
});

describe('Auswahl', () => {
  test('gewichteteAuswahl folgt den Gewichten', () => {
    const liste = ['a', 'b', 'c'];
    const gewichte = [1, 2, 7];
    assert.equal(gewichteteAuswahl(liste, gewichte, () => 0), 'a');
    assert.equal(gewichteteAuswahl(liste, gewichte, () => 0.15), 'b');
    assert.equal(gewichteteAuswahl(liste, gewichte, () => 0.31), 'c');
    assert.equal(gewichteteAuswahl(liste, gewichte, () => 0.9999), 'c');
  });

  test('gerade gestellte Frage ist 2 Züge gesperrt', () => {
    const pool = fragen(4);
    let runde = leereRunde();
    runde = merkeZug(runde, 'f1', true);
    // Zufall 0 würde immer die erste wählbare Frage nehmen.
    assert.notEqual(naechsteFrage(pool, {}, runde, () => 0).id, 'f1');
    runde = merkeZug(runde, 'f2', true);
    const dritte = naechsteFrage(pool, {}, runde, () => 0).id;
    assert.ok(!['f1', 'f2'].includes(dritte));
    runde = merkeZug(runde, dritte, true);
    assert.equal(naechsteFrage(pool, {}, runde, () => 0).id, 'f1');
  });

  test('kleiner Pool: Sperre wird gelockert statt hängenzubleiben', () => {
    const pool = fragen(1);
    const runde = merkeZug(leereRunde(), 'f1', true);
    assert.equal(naechsteFrage(pool, {}, runde, () => 0).id, 'f1');
    const zwei = fragen(2);
    let r = merkeZug(leereRunde(), 'f1', true);
    r = merkeZug(r, 'f2', true);
    assert.equal(naechsteFrage(zwei, {}, r, () => 0).id, 'f1');
  });

  test('falsche Frage kommt spätestens nach 3 anderen wieder', () => {
    const pool = fragen(10);
    // f1 bekommt ein winziges Gewicht, damit sie zufällig nie gezogen würde.
    const stand = { f1: { ...standVon({}, 'f1'), gewicht: 1e-9 } };
    let runde = merkeZug(leereRunde(), 'f1', false);
    const gezogen = [];
    for (let i = 0; i < 4; i++) {
      const f = naechsteFrage(pool, stand, runde, () => 0.5);
      gezogen.push(f.id);
      runde = merkeZug(runde, f.id, true);
    }
    assert.equal(gezogen.indexOf('f1'), 3);
  });

  test('Pool leer → null', () => {
    assert.equal(naechsteFrage([], {}, leereRunde(), Math.random), null);
  });
});

describe('Simulation', () => {
  function spiele(alle, antworte, zufall, maxZuege = 10000) {
    let stand = {};
    let runde = leereRunde();
    const zaehler = {};
    for (let zug = 0; zug < maxZuege; zug++) {
      const pool = uebungsPool(alle, stand);
      const frage = naechsteFrage(pool, stand, runde, zufall);
      if (!frage) return { zuege: zug, zaehler, stand };
      const richtig = antworte(frage, zaehler[frage.id] ?? 0);
      zaehler[frage.id] = (zaehler[frage.id] ?? 0) + 1;
      stand = { ...stand, [frage.id]: bewerte(standVon(stand, frage.id), richtig, zug) };
      runde = merkeZug(runde, frage.id, richtig);
    }
    return { zuege: Infinity, zaehler, stand };
  }

  test('30 Fragen, immer richtig: endet nach genau 60 Zügen (jede Frage 2×)', () => {
    for (const samen of [1, 2, 3, 42, 2026]) {
      const { zuege, zaehler } = spiele(fragen(30), () => true, zufallMitSamen(samen));
      assert.equal(zuege, 60);
      assert.ok(Object.values(zaehler).every((n) => n === 2));
    }
  });

  test('falsch beantwortete Fragen kommen nachweislich öfter', () => {
    const alle = fragen(30);
    const schwer = new Set(['f1', 'f2', 'f3']);
    // Schwere Fragen: die ersten 2 Versuche falsch, danach richtig.
    const { zuege, zaehler } = spiele(
      alle,
      (f, bisher) => !(schwer.has(f.id) && bisher < 2),
      zufallMitSamen(7),
    );
    assert.ok(Number.isFinite(zuege));
    for (const id of schwer) assert.equal(zaehler[id], 5); // 2× falsch + 3× richtig
    const leicht = alle.filter((f) => !schwer.has(f.id)).map((f) => zaehler[f.id]);
    assert.ok(leicht.every((n) => n === 2));
  });

  test('mit Gewichten: eine falsche Frage wird bevorzugt gezogen', () => {
    const pool = fragen(10);
    const zufall = zufallMitSamen(99);
    let stand = {};
    for (const f of pool) stand[f.id] = bewerte(standVon(stand, f.id), true, 0); // alle 0,4
    stand.f5 = bewerte(standVon(stand, 'f5'), false, 0); // 1,8
    let runde = leereRunde();
    const zaehler = {};
    for (let i = 0; i < 1000; i++) {
      const f = naechsteFrage(pool, stand, runde, zufall);
      zaehler[f.id] = (zaehler[f.id] ?? 0) + 1;
      runde = merkeZug(runde, f.id, true); // Gewichte bleiben gleich: nur Sperre wirkt
    }
    const andere = Object.entries(zaehler).filter(([id]) => id !== 'f5').map(([, n]) => n);
    assert.ok(zaehler.f5 > Math.max(...andere) * 1.5, JSON.stringify(zaehler));
  });
});

describe('Rundenbericht', () => {
  test('Trefferquote und schwierigste Fragen der Runde', () => {
    const liste = fragen(4);
    const zuege = [
      { frageId: 'f1', richtig: false },
      { frageId: 'f2', richtig: true },
      { frageId: 'f1', richtig: false },
      { frageId: 'f3', richtig: false },
      { frageId: 'f1', richtig: true },
    ];
    const b = rundenBericht(zuege, liste);
    assert.equal(b.antworten, 5);
    assert.equal(b.richtig, 2);
    assert.equal(b.trefferquote, 0.4);
    assert.deepEqual(b.schwierigste.map((s) => [s.frage.id, s.falsch]), [['f1', 2], ['f3', 1]]);
  });

  test('leere Runde', () => {
    assert.deepEqual(rundenBericht([], fragen(2)), { antworten: 0, richtig: 0, trefferquote: null, schwierigste: [] });
  });
});
