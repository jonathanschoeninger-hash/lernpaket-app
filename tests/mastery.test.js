import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beherrschung, ampel, alleBeherrschungen, schwacheUnterthemen, paketBeherrschung } from '../js/logic/mastery.js';
import { leererFortschritt } from '../js/logic/fortschritt.js';

const BEISPIEL = JSON.parse(
  readFileSync(new URL('../beispiele/zellatmung.lernpaket.json', import.meta.url), 'utf8'),
);
const G = [89, 76, 63, 50];
const nah = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

function mit(teile) {
  return { ...leererFortschritt(BEISPIEL.id), ...teile };
}

describe('beherrschung', () => {
  test('ohne Daten: null', () => {
    assert.equal(beherrschung(BEISPIEL, mit({}), 'u1').wert, null);
  });

  test('alle drei Teile: 0,6 Test + 0,3 Übung + 0,1 Karten', () => {
    const f = mit({
      tests: [{ datum: 1, proUnterthema: { u1: { punkte: 3, max: 4 } } }],
      antworten: [
        { frageId: 'f1', richtig: true, zeitpunkt: 1 },
        { frageId: 'f2', richtig: false, zeitpunkt: 2 },
      ],
      karten: { k1: { fach: 3, faelligAm: '2026-12-01' }, k2: { fach: 5, faelligAm: '2026-12-01' } },
    });
    const b = beherrschung(BEISPIEL, f, 'u1');
    nah(b.test, 75);
    nah(b.uebung, 50);
    nah(b.karten, 25); // 2 von 8 Karten
    nah(b.wert, 0.6 * 75 + 0.3 * 50 + 0.1 * 25);
  });

  test('fehlt ein Teil, werden die anderen hochgerechnet', () => {
    const f = mit({ antworten: [{ frageId: 'f1', richtig: true, zeitpunkt: 1 }] });
    const b = beherrschung(BEISPIEL, f, 'u1');
    // kein Test, Übung 100 %, Karten nie gelernt → nur die Übung zählt
    assert.equal(b.test, null);
    assert.equal(b.karten, null);
    nah(b.wert, 100);
  });

  test('letzter Test zählt, der dieses Unterthema enthielt', () => {
    const f = mit({
      tests: [
        { datum: 1, proUnterthema: { u1: { punkte: 1, max: 4 } } },
        { datum: 3, proUnterthema: { u1: { punkte: 4, max: 4 } } },
        { datum: 5, proUnterthema: { u2: { punkte: 0, max: 4 } } },
      ],
    });
    nah(beherrschung(BEISPIEL, f, 'u1').test, 100);
  });

  test('Übung: nur die letzten 20 Antworten dieses Unterthemas', () => {
    const antworten = [];
    for (let i = 0; i < 20; i++) antworten.push({ frageId: 'f1', richtig: false, zeitpunkt: i });
    for (let i = 20; i < 40; i++) antworten.push({ frageId: 'f2', richtig: true, zeitpunkt: i });
    antworten.push({ frageId: 'f11', richtig: false, zeitpunkt: 50 }); // anderes Unterthema
    nah(beherrschung(BEISPIEL, mit({ antworten }), 'u1').uebung, 100);
  });
});

describe('ampel', () => {
  test('grün ab Gut, gelb ab Genügend, sonst rot, ohne Daten grau', () => {
    assert.equal(ampel(76, G), 'gruen');
    assert.equal(ampel(75.9, G), 'gelb');
    assert.equal(ampel(50, G), 'gelb');
    assert.equal(ampel(49.9, G), 'rot');
    assert.equal(ampel(null, G), 'grau');
  });

  test('richtet sich nach dem Schlüssel', () => {
    assert.equal(ampel(75, [85, 75, 60, 50]), 'gruen');
  });
});

describe('Paket', () => {
  const f = mit({
    tests: [{ datum: 1, proUnterthema: { u1: { punkte: 0, max: 4 }, u2: { punkte: 4, max: 4 } } }],
  });

  test('alleBeherrschungen und schwache (rote) Unterthemen', () => {
    const alle = alleBeherrschungen(BEISPIEL, f, G);
    assert.deepEqual(alle.map((b) => [b.unterthema.id, b.farbe]), [['u1', 'rot'], ['u2', 'gruen'], ['u3', 'grau']]);
    assert.deepEqual(schwacheUnterthemen(BEISPIEL, f, G), ['u1']);
  });

  test('paketBeherrschung: Durchschnitt, Unterthemen ohne Daten zählen 0', () => {
    // u1: 0 %, u2: 100 %, u3: keine Daten → 0
    assert.equal(paketBeherrschung(BEISPIEL, f), 33);
    assert.equal(paketBeherrschung(BEISPIEL, mit({})), 0);
  });
});
