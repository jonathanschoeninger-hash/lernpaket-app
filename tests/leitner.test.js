import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INTERVALLE,
  datumPlusTage,
  heutigesDatum,
  kartenEintrag,
  beantworte,
  istFaellig,
  faelligeKarten,
  naechsteFaelligkeit,
  fachVerteilung,
  kartenWissen,
  ankiCsv,
} from '../js/logic/leitner.js';

const BEISPIEL = JSON.parse(
  readFileSync(new URL('../beispiele/zellatmung.lernpaket.json', import.meta.url), 'utf8'),
);
const HEUTE = '2026-11-26';

describe('Datum', () => {
  test('datumPlusTage zählt Kalendertage, auch über Monats- und Jahresgrenzen', () => {
    assert.equal(datumPlusTage('2026-11-26', 0), '2026-11-26');
    assert.equal(datumPlusTage('2026-11-26', 7), '2026-12-03');
    assert.equal(datumPlusTage('2026-12-25', 14), '2027-01-08');
    assert.equal(datumPlusTage('2028-02-28', 1), '2028-02-29');
  });

  test('heutigesDatum liefert das lokale Datum als JJJJ-MM-TT', () => {
    assert.equal(heutigesDatum(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  });
});

describe('Leitner-Fächer', () => {
  test('Intervalle laut DESIGN.md 5.4', () => {
    assert.deepEqual(INTERVALLE, { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 });
  });

  test('neue Karte: Fach 1, heute fällig', () => {
    assert.deepEqual(kartenEintrag({}, 'k1', HEUTE), { fach: 1, faelligAm: HEUTE });
  });

  test('kaputter gespeicherter Eintrag wird wie neu behandelt', () => {
    assert.deepEqual(kartenEintrag({ k1: { fach: 9, faelligAm: 'x' } }, 'k1', HEUTE), {
      fach: 1,
      faelligAm: HEUTE,
    });
  });

  test('gewusst: ein Fach weiter, fällig nach dem Intervall des neuen Fachs', () => {
    assert.deepEqual(beantworte(undefined, true, HEUTE), { fach: 2, faelligAm: '2026-11-27' });
    assert.deepEqual(beantworte({ fach: 2, faelligAm: HEUTE }, true, HEUTE), {
      fach: 3,
      faelligAm: '2026-11-29',
    });
    assert.deepEqual(beantworte({ fach: 3, faelligAm: HEUTE }, true, HEUTE), {
      fach: 4,
      faelligAm: '2026-12-03',
    });
    assert.deepEqual(beantworte({ fach: 4, faelligAm: HEUTE }, true, HEUTE), {
      fach: 5,
      faelligAm: '2026-12-10',
    });
  });

  test('gewusst in Fach 5: bleibt in Fach 5, wieder nach 14 Tagen', () => {
    assert.deepEqual(beantworte({ fach: 5, faelligAm: HEUTE }, true, HEUTE), {
      fach: 5,
      faelligAm: '2026-12-10',
    });
  });

  test('nicht gewusst: zurück in Fach 1, heute noch einmal fällig', () => {
    assert.deepEqual(beantworte({ fach: 4, faelligAm: HEUTE }, false, HEUTE), {
      fach: 1,
      faelligAm: HEUTE,
    });
  });

  test('istFaellig: ohne Eintrag, heute oder überfällig ja – in der Zukunft nein', () => {
    assert.equal(istFaellig(undefined, HEUTE), true);
    assert.equal(istFaellig({ fach: 2, faelligAm: HEUTE }, HEUTE), true);
    assert.equal(istFaellig({ fach: 2, faelligAm: '2026-11-01' }, HEUTE), true);
    assert.equal(istFaellig({ fach: 2, faelligAm: '2026-11-27' }, HEUTE), false);
  });
});

describe('Auswahl und Statistik', () => {
  const stand = {
    k1: { fach: 3, faelligAm: '2026-11-29' },
    k2: { fach: 2, faelligAm: '2026-11-20' },
    k9: { fach: 5, faelligAm: '2026-12-10' },
  };

  test('faelligeKarten: alle Unterthemen', () => {
    const f = faelligeKarten(BEISPIEL.karten, stand, HEUTE);
    assert.equal(f.length, 22);
    assert.ok(!f.some((k) => k.id === 'k1' || k.id === 'k9'));
  });

  test('faelligeKarten: nur ein Unterthema, überfällige zuerst', () => {
    const f = faelligeKarten(BEISPIEL.karten, stand, HEUTE, 'u1');
    assert.equal(f.length, 7);
    assert.ok(f.every((k) => k.unterthema === 'u1'));
    assert.equal(f[0].id, 'k2');
  });

  test('naechsteFaelligkeit: frühestes Datum in der Zukunft oder null', () => {
    const nur = BEISPIEL.karten.filter((k) => k.id === 'k1' || k.id === 'k9');
    assert.equal(naechsteFaelligkeit(nur, stand, HEUTE), '2026-11-29');
    assert.equal(naechsteFaelligkeit(BEISPIEL.karten, stand, HEUTE), HEUTE);
    assert.equal(naechsteFaelligkeit([], stand, HEUTE), null);
  });

  test('fachVerteilung zählt Karten pro Fach 1–5', () => {
    assert.deepEqual(fachVerteilung(BEISPIEL.karten, stand), [21, 1, 1, 0, 1]);
  });

  test('kartenWissen = Anteil der Karten in Fach 3–5', () => {
    assert.equal(kartenWissen(BEISPIEL.karten, stand), 2 / 24);
    assert.equal(kartenWissen([], stand), null);
  });
});

describe('Anki-CSV', () => {
  test('Kopfzeilen, Trennzeichen und eine Zeile pro Karte', () => {
    const csv = ankiCsv(BEISPIEL);
    const zeilen = csv.trimEnd().split('\n');
    assert.equal(zeilen[0], '#separator:Semicolon');
    assert.equal(zeilen[1], '#html:false');
    assert.equal(zeilen[2], '#tags column:3');
    assert.equal(zeilen.length, 3 + 24);
    assert.equal(zeilen[3], '"Glykolyse – Ort?";"Zellplasma (Cytoplasma)";"Zellatmung::Glykolyse"');
  });

  test('Anführungszeichen werden verdoppelt, Zeilenumbrüche bleiben im Feld', () => {
    const paket = {
      titel: 'Test Paket',
      unterthemen: [{ id: 'u1', name: 'Teil A' }],
      karten: [{ id: 'k1', unterthema: 'u1', vorne: 'Was heißt "Hallo"?', hinten: 'Zeile 1\nZeile 2' }],
    };
    const zeilen = ankiCsv(paket).split('\n');
    assert.equal(zeilen[3], '"Was heißt ""Hallo""?";"Zeile 1');
    assert.equal(zeilen[4], 'Zeile 2";"Test_Paket::Teil_A"');
  });
});
