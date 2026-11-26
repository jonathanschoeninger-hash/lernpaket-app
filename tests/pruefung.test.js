import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODI, stelleTestZusammen, stelleMuendlichZusammen, maturaTeile, zeitText } from '../js/logic/pruefung.js';

const BEISPIEL = JSON.parse(
  readFileSync(new URL('../beispiele/zellatmung.lernpaket.json', import.meta.url), 'utf8'),
);

/** Fester Zufall (mulberry32). */
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

const zaehle = (liste, schluessel) =>
  liste.reduce((z, f) => ({ ...z, [f[schluessel]]: (z[f[schluessel]] ?? 0) + 1 }), {});

describe('Modi', () => {
  test('Anzahl und Zeit laut DESIGN.md 6.2', () => {
    assert.equal(MODI.schularbeit.anzahl, 20);
    assert.equal(MODI.schularbeit.minuten, 50);
    assert.equal(MODI.kurztest.anzahl, 10);
    assert.equal(MODI.kurztest.minuten, 15);
    assert.ok(MODI.matura && MODI.kompensation);
  });
});

describe('stelleTestZusammen', () => {
  test('Kurztest: alle nurTest-Fragen zuerst, gleichmäßig über Unterthemen', () => {
    const t = stelleTestZusammen(BEISPIEL.fragen, { anzahl: 10, zufall: zufallMitSamen(1) });
    assert.equal(t.length, 10);
    assert.equal(new Set(t.map((f) => f.id)).size, 10);
    assert.equal(t.filter((f) => f.nurTest).length, 9);
    const proU = Object.values(zaehle(t, 'unterthema'));
    assert.ok(Math.max(...proU) - Math.min(...proU) <= 1, JSON.stringify(proU));
  });

  test('zu wenige nurTest-Fragen: Übungsfragen, die am längsten nicht dran waren', () => {
    const stand = {};
    // Alle Übungsfragen waren kürzlich dran – außer f2 (nie) und f11 (lange her).
    for (const f of BEISPIEL.fragen) if (!f.nurTest) stand[f.id] = { zuletzt: 1000 };
    delete stand.f2;
    stand.f11 = { zuletzt: 5 };
    const t = stelleTestZusammen(BEISPIEL.fragen, { anzahl: 11, uebungsstand: stand, zufall: zufallMitSamen(2) });
    const uebung = t.filter((f) => !f.nurTest).map((f) => f.id).sort();
    assert.deepEqual(uebung, ['f11', 'f2']);
  });

  test('Schularbeit: 20 Fragen, gleichmäßig', () => {
    const t = stelleTestZusammen(BEISPIEL.fragen, { anzahl: 20, zufall: zufallMitSamen(3) });
    assert.equal(t.length, 20);
    const proU = Object.values(zaehle(t, 'unterthema'));
    assert.ok(Math.max(...proU) - Math.min(...proU) <= 1);
  });

  test('nur bestimmte Unterthemen (Kompensation)', () => {
    const t = stelleTestZusammen(BEISPIEL.fragen, { anzahl: 10, unterthemen: ['u2'], zufall: zufallMitSamen(4) });
    assert.equal(t.length, 10);
    assert.ok(t.every((f) => f.unterthema === 'u2'));
  });

  test('mehr verlangt als da: alle vorhandenen', () => {
    const t = stelleTestZusammen(BEISPIEL.fragen, { anzahl: 99, unterthemen: ['u1'], zufall: zufallMitSamen(5) });
    assert.equal(t.length, 10);
  });

  test('Matura-Teil: nur Fragen mit diesem teil', () => {
    const fragen = BEISPIEL.fragen.map((f, i) => ({ ...f, teil: i % 3 === 0 ? '2' : '1' }));
    const t = stelleTestZusammen(fragen, { anzahl: 99, teil: '2', zufall: zufallMitSamen(6) });
    assert.equal(t.length, 10);
    assert.ok(t.every((f) => f.teil === '2'));
    assert.deepEqual(maturaTeile(fragen), ['1', '2']);
    assert.deepEqual(maturaTeile(BEISPIEL.fragen), []);
  });

  test('gleicher Zufall → gleicher Test, anderer Zufall → andere Reihenfolge', () => {
    const a = stelleTestZusammen(BEISPIEL.fragen, { anzahl: 10, zufall: zufallMitSamen(7) }).map((f) => f.id);
    const b = stelleTestZusammen(BEISPIEL.fragen, { anzahl: 10, zufall: zufallMitSamen(7) }).map((f) => f.id);
    const c = stelleTestZusammen(BEISPIEL.fragen, { anzahl: 10, zufall: zufallMitSamen(8) }).map((f) => f.id);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
  });
});

describe('stelleMuendlichZusammen', () => {
  test('bis zu 6 Fragen, zuerst alle Freitext-Fragen, dann andere Typen', () => {
    const t = stelleMuendlichZusammen(BEISPIEL.fragen, { zufall: zufallMitSamen(9) });
    assert.equal(MODI.muendlich.anzahl, 6);
    assert.equal(t.length, 6);
    assert.deepEqual(t.slice(0, 3).map((f) => f.typ), ['freitext', 'freitext', 'freitext']);
    assert.ok(t.slice(3).every((f) => f.typ !== 'freitext'));
    assert.equal(new Set(t.map((f) => f.id)).size, 6);
  });

  test('mehr Freitext als Platz: nur Freitext', () => {
    const viele = Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i, unterthema: 'u1', typ: 'freitext', nurTest: false }));
    const t = stelleMuendlichZusammen([...viele, ...BEISPIEL.fragen.filter((f) => f.typ !== 'freitext')], { zufall: zufallMitSamen(1) });
    assert.equal(t.length, 6);
    assert.ok(t.every((f) => f.typ === 'freitext'));
  });
});

describe('zeitText', () => {
  test('Minuten:Sekunden, nie negativ', () => {
    assert.equal(zeitText(0), '0:00');
    assert.equal(zeitText(65), '1:05');
    assert.equal(zeitText(50 * 60), '50:00');
    assert.equal(zeitText(-3), '0:00');
  });
});
