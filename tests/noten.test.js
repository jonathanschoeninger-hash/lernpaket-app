import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOTEN,
  MATURA_BEISPIEL,
  schluesselGrenzen,
  schluesselName,
  pruefeSchluessel,
  noteAus,
  prozentText,
  ergebnisText,
  testAuswerten,
  fehlendeUnterthemen,
  antwortAlsText,
} from '../js/logic/grading.js';

describe('Notenschlüssel', () => {
  test('Vorlagen aus DESIGN.md 6.1', () => {
    assert.deepEqual(schluesselGrenzen({ art: 'standard' }), [89, 76, 63, 50]);
    assert.deepEqual(schluesselGrenzen({ art: 'mathe' }), [85, 75, 60, 50]);
  });

  test('fehlender oder kaputter Schlüssel → Standard', () => {
    assert.deepEqual(schluesselGrenzen(null), [89, 76, 63, 50]);
    assert.deepEqual(schluesselGrenzen({ art: 'eigen', grenzen: [10, 20, 30, 40] }), [89, 76, 63, 50]);
    assert.deepEqual(schluesselGrenzen({ art: 'quatsch' }), [89, 76, 63, 50]);
  });

  test('eigener Schlüssel', () => {
    assert.deepEqual(schluesselGrenzen({ art: 'eigen', grenzen: [90, 80, 65, 51] }), [90, 80, 65, 51]);
  });

  test('Matura: Punktegrenzen in Prozent der Höchstpunkte', () => {
    const g = schluesselGrenzen({ art: 'matura', ...MATURA_BEISPIEL });
    assert.deepEqual(MATURA_BEISPIEL, { hoechstpunkte: 36, punkte: [32, 27, 22, 17] });
    assert.deepEqual(g.map((x) => Math.round(x * 10) / 10), [88.9, 75, 61.1, 47.2]);
  });

  test('Namen', () => {
    assert.equal(schluesselName({ art: 'standard' }), 'Standard (Schularbeit)');
    assert.equal(schluesselName({ art: 'mathe' }), 'Mathematik-Empfehlung');
    assert.equal(schluesselName({ art: 'matura', ...MATURA_BEISPIEL }), 'Matura (32/27/22/17 von 36 Punkten)');
    assert.equal(schluesselName({ art: 'eigen', grenzen: [90, 80, 65, 51] }), 'Eigener Schlüssel (90/80/65/51 %)');
  });

  test('Prüfung eigener Schlüssel: Grenzen absteigend, zwischen 1 und 100', () => {
    assert.deepEqual(pruefeSchluessel({ art: 'eigen', grenzen: [90, 80, 65, 51] }), []);
    assert.match(pruefeSchluessel({ art: 'eigen', grenzen: [90, 80, 80, 51] })[0], /absteigend/);
    assert.match(pruefeSchluessel({ art: 'eigen', grenzen: [101, 80, 65, 51] })[0], /zwischen 1 und 100/);
    assert.match(pruefeSchluessel({ art: 'eigen', grenzen: [90, 80, 65] })[0], /4 Grenzen/);
    assert.match(pruefeSchluessel({ art: 'eigen', grenzen: [90, 80, 'x', 50] })[0], /Zahl/);
  });

  test('Prüfung Matura-Schlüssel', () => {
    assert.deepEqual(pruefeSchluessel({ art: 'matura', ...MATURA_BEISPIEL }), []);
    assert.match(pruefeSchluessel({ art: 'matura', hoechstpunkte: 0, punkte: [4, 3, 2, 1] })[0], /Höchstpunkte/);
    assert.match(pruefeSchluessel({ art: 'matura', hoechstpunkte: 30, punkte: [32, 27, 22, 17] })[0], /höchstens 30/);
    assert.match(pruefeSchluessel({ art: 'matura', hoechstpunkte: 36, punkte: [27, 32, 22, 17] })[0], /absteigend/);
  });
});

describe('Note', () => {
  const g = [89, 76, 63, 50];
  test('Grenzen gelten ab (≥)', () => {
    assert.equal(noteAus(100, g), 1);
    assert.equal(noteAus(89, g), 1);
    assert.equal(noteAus(88.9, g), 2);
    assert.equal(noteAus(76, g), 2);
    assert.equal(noteAus(63, g), 3);
    assert.equal(noteAus(50, g), 4);
    assert.equal(noteAus(49.9, g), 5);
    assert.equal(noteAus(0, g), 5);
  });

  test('Rechenungenauigkeit bei Punkten kippt keine Note', () => {
    // 29 von 100 Punkten mit Kommazahlen: 0.29 * 100 = 28.999999999999996
    assert.equal(noteAus(0.5 * 100, g), 4);
    assert.equal(noteAus(0.29 * 100, [29, 28, 27, 26]), 1);
  });

  test('Notennamen', () => {
    assert.deepEqual(NOTEN, ['Sehr gut', 'Gut', 'Befriedigend', 'Genügend', 'Nicht genügend']);
  });

  test('prozentText rundet nie über eine Grenze', () => {
    assert.equal(prozentText(68), '68 %');
    assert.equal(prozentText(49.96), '49,9 %');
    assert.equal(prozentText(47.2222), '47,2 %');
    assert.equal(prozentText(100), '100 %');
  });

  test('ergebnisText wie in DESIGN.md 6.1', () => {
    assert.equal(ergebnisText(68, g), 'Befriedigend (3) – 68 %. Noch 8 % bis Gut.');
    assert.equal(ergebnisText(95, g), 'Sehr gut (1) – 95 %.');
    assert.equal(ergebnisText(40, g), 'Nicht genügend (5) – 40 %. Noch 10 % bis Genügend.');
    assert.equal(ergebnisText(49.5, g), 'Nicht genügend (5) – 49,5 %. Noch 0,5 % bis Genügend.');
    assert.equal(ergebnisText(0, g), 'Nicht genügend (5) – 0 %. Noch 50 % bis Genügend.');
  });
});

describe('testAuswerten', () => {
  const fragen = [
    { id: 'a', unterthema: 'u1', typ: 'mc', optionen: ['x', 'y', 'z', 'w'], richtig: [1] },
    { id: 'b', unterthema: 'u1', typ: 'lueckentext', text: '{{1}} {{2}}', luecken: [['p'], ['q']] },
    { id: 'c', unterthema: 'u2', typ: 'freitext', maxPunkte: 2, musterloesung: 'M', bewertungspunkte: [] },
    { id: 'd', unterthema: 'u2', typ: 'wahrfalsch', richtig: true },
  ];

  test('Punkte, Prozent und Unterthemen; Freitext mit bestätigten Punkten', () => {
    const e = testAuswerten(fragen, { a: 1, b: ['p', 'nein'], c: 'mein Text', d: false }, { c: 1.5 });
    assert.equal(e.punkte, 1 + 1 + 1.5 + 0);
    assert.equal(e.max, 1 + 2 + 2 + 1);
    assert.equal(e.prozent, (3.5 / 6) * 100);
    assert.deepEqual(e.proUnterthema, { u1: { punkte: 2, max: 3 }, u2: { punkte: 1.5, max: 3 } });
    assert.deepEqual(e.fragen[2], { frageId: 'c', antwort: 'mein Text', punkte: 1.5, max: 2 });
  });

  test('nichts beantwortet = 0 Punkte', () => {
    const e = testAuswerten(fragen, {}, {});
    assert.equal(e.punkte, 0);
    assert.equal(e.prozent, 0);
  });

  test('alles richtig = 100 %', () => {
    const e = testAuswerten(fragen, { a: 1, b: ['P', 'q'], d: true }, { c: 2 });
    assert.equal(e.prozent, 100);
  });

  test('fehlende Unterthemen bei einer 5: unter der Genügend-Grenze', () => {
    assert.deepEqual(
      fehlendeUnterthemen({ u1: { punkte: 1, max: 3 }, u2: { punkte: 3, max: 3 }, u3: { punkte: 0, max: 0 } }, [89, 76, 63, 50]),
      ['u1'],
    );
  });
});

describe('antwortAlsText', () => {
  test('je Typ, leere Antwort = „keine Antwort“', () => {
    const mc = { typ: 'mc', optionen: ['x', 'y'], richtig: [0] };
    assert.deepEqual(antwortAlsText(mc, 1), ['y']);
    assert.deepEqual(antwortAlsText(mc, null), ['keine Antwort']);
    assert.deepEqual(antwortAlsText({ typ: 'mehrfach', optionen: ['x', 'y', 'z'] }, [0, 2]), ['x', 'z']);
    assert.deepEqual(antwortAlsText({ typ: 'wahrfalsch' }, false), ['Falsch']);
    assert.deepEqual(antwortAlsText({ typ: 'lueckentext', luecken: [[], []] }, ['a', '']), ['Lücke 1: a', 'Lücke 2: –']);
    assert.deepEqual(
      antwortAlsText({ typ: 'zuordnen', paare: [{ links: 'a', rechts: '1' }, { links: 'b', rechts: '2' }] }, ['2', '']),
      ['a → 2', 'b → –'],
    );
    assert.deepEqual(antwortAlsText({ typ: 'reihenfolge' }, ['y', 'x']), ['1. y', '2. x']);
    assert.deepEqual(antwortAlsText({ typ: 'zahl', einheit: 'ATP' }, '36'), ['36 ATP']);
    assert.deepEqual(antwortAlsText({ typ: 'freitext' }, '  '), ['keine Antwort']);
  });
});
