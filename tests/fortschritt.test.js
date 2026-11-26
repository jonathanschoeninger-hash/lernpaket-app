import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  leererFortschritt,
  fortschrittUebernehmen,
  paketFortschritt,
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
      notenschluessel: null,
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
      notenschluessel: { gut: 80 },
    };
    const neu = fortschrittUebernehmen(alt, BEISPIEL);
    assert.deepEqual(Object.keys(neu.karten), ['k1']);
    assert.deepEqual(Object.keys(neu.videos), ['v1']);
    assert.deepEqual(Object.keys(neu.uebungsstand), ['f1']);
    assert.deepEqual(neu.antworten, [{ frageId: 'f1', richtig: true, zeitpunkt: 1 }]);
    assert.deepEqual(neu.tests, alt.tests);
    assert.deepEqual(neu.notenschluessel, { gut: 80 });
    assert.equal(neu.paketId, BEISPIEL.id);
  });

  test('fehlender oder kaputter alter Fortschritt ergibt leeren Fortschritt', () => {
    assert.deepEqual(fortschrittUebernehmen(undefined, BEISPIEL), leererFortschritt(BEISPIEL.id));
    assert.deepEqual(
      fortschrittUebernehmen({ karten: 'kaputt', antworten: null }, BEISPIEL),
      leererFortschritt(BEISPIEL.id),
    );
  });

  test('paketFortschritt: gerundeter Prozentsatz der Karten in Fach 3–5', () => {
    const f = {
      ...leererFortschritt(BEISPIEL.id),
      karten: {
        k1: { fach: 3, faelligAm: '2026-12-01' },
        k2: { fach: 4, faelligAm: '2026-12-01' },
        k3: { fach: 5, faelligAm: '2026-12-01' },
        k4: { fach: 2, faelligAm: '2026-12-01' },
      },
    };
    assert.equal(paketFortschritt(BEISPIEL, f), 13); // 3 von 24 = 12,5 %
    assert.equal(paketFortschritt(BEISPIEL, undefined), 0);
  });
});
