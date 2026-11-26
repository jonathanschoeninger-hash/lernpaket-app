import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalisiere, punkteVorschlag, punkteAendern } from '../js/logic/freitext.js';

const frage = {
  typ: 'freitext',
  maxPunkte: 2,
  bewertungspunkte: [
    { text: 'kein Sauerstoff', woerter: ['ohne sauerstoff', 'kein sauerstoff', 'anaerob'] },
    { text: 'NAD+ zurück', woerter: ['nad', 'regeneriert', 'zurückgewonnen'] },
  ],
};

describe('normalisiere', () => {
  test('klein, Umlaute = ae/oe/ue, ß = ss, Satzzeichen weg, Leerraum zusammengefasst', () => {
    assert.equal(normalisiere('Größe  der ÄRA, über-all!'), 'groesse der aera ueber all');
    assert.equal(normalisiere('NAD+ wird zurückgewonnen.'), 'nad wird zurueckgewonnen');
    assert.equal(normalisiere(undefined), '');
  });
});

describe('punkteVorschlag', () => {
  test('erkennt Bewertungspunkte über die Wörter, auch mit ae statt ä', () => {
    const v = punkteVorschlag(frage, 'Die Glykolyse läuft OHNE Sauerstoff. NAD+ wird zurueckgewonnen.');
    assert.equal(v.punkte, 2);
    assert.deepEqual(v.erfuellt, [true, true]);
  });

  test('nur ein Punkt erkannt', () => {
    const v = punkteVorschlag(frage, 'Das läuft anaerob.');
    assert.equal(v.punkte, 1);
    assert.deepEqual(v.erfuellt, [true, false]);
  });

  test('Wort darf Teil eines längeren Wortes sein (zusammengesetzte Wörter)', () => {
    const v = punkteVorschlag(frage, 'Sie ist anaerobisch und das NADH …');
    assert.deepEqual(v.erfuellt, [true, true]);
  });

  test('sehr kurze Wörter (unter 3 Zeichen) zählen nur als ganzes Wort', () => {
    const kurz = { maxPunkte: 1, bewertungspunkte: [{ text: 'H+', woerter: ['h+', 'protonen'] }] };
    assert.equal(punkteVorschlag(kurz, 'Die ATP-Synthase hat eine Achse.').punkte, 0);
    assert.equal(punkteVorschlag(kurz, 'Es strömen H+ zurück.').punkte, 1);
  });

  test('leere Antwort = 0', () => {
    assert.deepEqual(punkteVorschlag(frage, '   '), { punkte: 0, erfuellt: [false, false] });
  });

  test('Vorschlag nie über maxPunkte', () => {
    const mehr = { ...frage, maxPunkte: 1 };
    assert.equal(punkteVorschlag(mehr, 'ohne sauerstoff, nad').punkte, 1);
  });
});

describe('punkteAendern', () => {
  test('½-Schritte, zwischen 0 und maxPunkte', () => {
    assert.equal(punkteAendern(1, +0.5, 2), 1.5);
    assert.equal(punkteAendern(1, -0.5, 2), 0.5);
    assert.equal(punkteAendern(2, +0.5, 2), 2);
    assert.equal(punkteAendern(0, -0.5, 2), 0);
  });
});
