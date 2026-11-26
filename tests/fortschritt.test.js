import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  leererFortschritt,
  fortschrittUebernehmen,
  antwortMerken,
  MAX_ANTWORTEN,
} from '../js/logic/fortschritt.js';

const BEISPIEL = JSON.parse(
  readFileSync(new URL('../beispiele/zellatmung.lernpaket.json', import.meta.url), 'utf8'),
);

describe('Fortschritt', () => {
  test('leerer Fortschritt hat alle Bereiche aus DESIGN.md 8', () => {
    assert.deepEqual(leererFortschritt('p1'), {
      paketId: 'p1',
      uebungsstand: {},
      antworten: [],
      tests: [],
      karten: {},
      videos: {},
      fehlerheft: {},
      notenschluessel: null,
      laufenderTest: null,
    });
  });

  test('beim Ersetzen bleibt nur Fortschritt zu IDs, die es weiter gibt', () => {
    const alt = {
      ...leererFortschritt(BEISPIEL.id),
      karten: { k1: { fach: 3, faelligAm: '2026-12-01' }, k99: { fach: 5, faelligAm: '2026-12-01' } },
      videos: { v1: { gesehen: true }, v77: { gesehen: true } },
      uebungsstand: { f1: { gewicht: 0.4, serie: 1 }, f50: { gewicht: 3, serie: 0 } },
      antworten: [
        { frageId: 'f1', richtig: true, zeitpunkt: 1 },
        { frageId: 'f50', richtig: false, zeitpunkt: 2 },
      ],
      tests: [{ datum: '2026-11-20', note: 2 }],
      fehlerheft: { f1: { anzahl: 1, zuletzt: 1, ueben: 1, test: 0 }, f50: { anzahl: 2, zuletzt: 2, ueben: 2, test: 0 } },
      notenschluessel: { gut: 80 },
    };
    const neu = fortschrittUebernehmen(alt, BEISPIEL);
    assert.deepEqual(Object.keys(neu.karten), ['k1']);
    assert.deepEqual(Object.keys(neu.videos), ['v1']);
    assert.deepEqual(Object.keys(neu.uebungsstand), ['f1']);
    assert.deepEqual(neu.antworten, [{ frageId: 'f1', richtig: true, zeitpunkt: 1 }]);
    assert.deepEqual(neu.tests, alt.tests);
    assert.deepEqual(Object.keys(neu.fehlerheft), ['f1']);
    assert.deepEqual(neu.notenschluessel, { gut: 80 });
    assert.equal(neu.laufenderTest, null); // Paket geändert → laufender Test verworfen
    assert.equal(neu.paketId, BEISPIEL.id);
  });

  test('fehlender oder kaputter alter Fortschritt ergibt leeren Fortschritt', () => {
    assert.deepEqual(fortschrittUebernehmen(undefined, BEISPIEL), leererFortschritt(BEISPIEL.id));
    assert.deepEqual(
      fortschrittUebernehmen({ karten: 'kaputt', antworten: null }, BEISPIEL),
      leererFortschritt(BEISPIEL.id),
    );
  });

});

describe('antwortMerken', () => {
  test('richtige Antwort: nur in antworten', () => {
    const f = antwortMerken(leererFortschritt('p'), { frageId: 'f1', richtig: true, zeitpunkt: 5, herkunft: 'ueben' });
    assert.deepEqual(f.antworten, [{ frageId: 'f1', richtig: true, zeitpunkt: 5 }]);
    assert.deepEqual(f.fehlerheft, {});
  });

  test('falsche Antwort: zusätzlich ins Fehlerheft, Zähler nach Herkunft', () => {
    let f = antwortMerken(leererFortschritt('p'), { frageId: 'f1', richtig: false, zeitpunkt: 5, herkunft: 'ueben' });
    f = antwortMerken(f, { frageId: 'f1', richtig: false, zeitpunkt: 9, herkunft: 'test' });
    assert.deepEqual(f.fehlerheft.f1, { anzahl: 2, zuletzt: 9, ueben: 1, test: 1 });
    // Testantworten zählen nicht zur Übungs-Trefferquote
    assert.equal(f.antworten.length, 1);
  });

  test('antworten werden auf die neuesten MAX_ANTWORTEN gekürzt', () => {
    let f = leererFortschritt('p');
    for (let i = 0; i < MAX_ANTWORTEN + 5; i++) f = antwortMerken(f, { frageId: 'f1', richtig: true, zeitpunkt: i, herkunft: 'ueben' });
    assert.equal(f.antworten.length, MAX_ANTWORTEN);
    assert.equal(f.antworten[0].zeitpunkt, 5);
  });
});
