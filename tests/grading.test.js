import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { bewerteAntwort, leseZahl, normalisiereLuecke, loesungAlsText, maxPunkte } from '../js/logic/grading.js';

const mc = { typ: 'mc', optionen: ['A', 'B', 'C', 'D'], richtig: [2] };
const mehrfach = { typ: 'mehrfach', optionen: ['A', 'B', 'C', 'D', 'E'], richtig: [0, 1, 3] };
const wf = { typ: 'wahrfalsch', richtig: false };
const lt = {
  typ: 'lueckentext',
  text: 'Glucose hat {{1}} C-Atome und wird zu {{2}}.',
  luecken: [['6', 'sechs'], ['Pyruvat', 'Brenztraubensäure']],
};
const zuordnen = {
  typ: 'zuordnen',
  paare: [
    { links: 'a', rechts: '1' },
    { links: 'b', rechts: '2' },
    { links: 'c', rechts: '3' },
    { links: 'd', rechts: '4' },
  ],
};
const reihe = { typ: 'reihenfolge', schritte: ['x', 'y', 'z'] };
const zahl = { typ: 'zahl', loesung: 2.5, toleranz: 0.1, einheit: 'ATP' };
const frei = { typ: 'freitext', maxPunkte: 2 };

const p = (frage, antwort) => {
  const e = bewerteAntwort(frage, antwort);
  return [e.punkte, e.max, e.richtig];
};

describe('maxPunkte', () => {
  test('1 Punkt, pro Lücke 1, Freitext maxPunkte', () => {
    assert.equal(maxPunkte(mc), 1);
    assert.equal(maxPunkte(lt), 2);
    assert.equal(maxPunkte(frei), 2);
  });
});

describe('mc und wahrfalsch', () => {
  test('mc: Index der gewählten Option', () => {
    assert.deepEqual(p(mc, 2), [1, 1, true]);
    assert.deepEqual(p(mc, 0), [0, 1, false]);
    assert.deepEqual(p(mc, null), [0, 1, false]);
  });

  test('wahrfalsch: true/false', () => {
    assert.deepEqual(p(wf, false), [1, 1, true]);
    assert.deepEqual(p(wf, true), [0, 1, false]);
    assert.deepEqual(p(wf, null), [0, 1, false]);
  });
});

describe('mehrfach', () => {
  test('alles richtig = 1', () => assert.deepEqual(p(mehrfach, [3, 1, 0]), [1, 1, true]));
  test('eine richtige fehlt = ½', () => assert.deepEqual(p(mehrfach, [0, 1]), [0.5, 1, false]));
  test('eine falsche zu viel = ½', () => assert.deepEqual(p(mehrfach, [0, 1, 3, 4]), [0.5, 1, false]));
  test('zwei Fehler = 0', () => {
    assert.deepEqual(p(mehrfach, [0, 1, 4]), [0, 1, false]);
    assert.deepEqual(p(mehrfach, [0]), [0, 1, false]);
  });
  test('nichts gewählt = 0', () => assert.deepEqual(p(mehrfach, []), [0, 1, false]));
});

describe('lueckentext', () => {
  test('Groß/Klein egal, Leerzeichen getrimmt, jede erlaubte Schreibweise', () => {
    assert.deepEqual(p(lt, ['  Sechs ', 'pyruvat']), [2, 2, true]);
    assert.deepEqual(p(lt, ['6', 'BRENZTRAUBENSÄURE']), [2, 2, true]);
  });
  test('1 Punkt pro Lücke', () => {
    const e = bewerteAntwort(lt, ['7', 'Pyruvat']);
    assert.equal(e.punkte, 1);
    assert.equal(e.richtig, false);
    assert.deepEqual(e.teile, [false, true]);
  });
  test('mehrere Leerzeichen im Wort zählen wie eines', () => {
    assert.equal(normalisiereLuecke('  Acetyl   CoA '), 'acetyl coa');
  });
  test('fehlende Antworten = 0', () => assert.deepEqual(p(lt, undefined), [0, 2, false]));
});

describe('zuordnen', () => {
  test('alle Paare richtig = 1', () => assert.deepEqual(p(zuordnen, ['1', '2', '3', '4']), [1, 1, true]));
  test('mindestens die Hälfte = ½', () => assert.deepEqual(p(zuordnen, ['1', '2', '4', '3']), [0.5, 1, false]));
  test('weniger als die Hälfte = 0', () => assert.deepEqual(p(zuordnen, ['1', '3', '4', '2']), [0, 1, false]));
  test('bei 3 Paaren: 2 richtig = ½, 1 richtig = 0', () => {
    const drei = { typ: 'zuordnen', paare: zuordnen.paare.slice(0, 3) };
    assert.deepEqual(p(drei, ['1', '2', '']), [0.5, 1, false]);
    assert.deepEqual(p(drei, ['1', '3', '2']), [0, 1, false]);
  });
  test('teile zeigt, welche Paare stimmen', () => {
    assert.deepEqual(bewerteAntwort(zuordnen, ['1', '2', '4', '3']).teile, [true, true, false, false]);
  });
});

describe('reihenfolge', () => {
  test('nur die ganz richtige Reihenfolge zählt', () => {
    assert.deepEqual(p(reihe, ['x', 'y', 'z']), [1, 1, true]);
    assert.deepEqual(p(reihe, ['x', 'z', 'y']), [0, 1, false]);
  });
});

describe('zahl', () => {
  test('Komma oder Punkt, Toleranz', () => {
    assert.deepEqual(p(zahl, '2,5'), [1, 1, true]);
    assert.deepEqual(p(zahl, '2.6'), [1, 1, true]);
    assert.deepEqual(p(zahl, '2,4'), [1, 1, true]);
    assert.deepEqual(p(zahl, '2,7'), [0, 1, false]);
  });
  test('Einheit und Leerzeichen dürfen dabei sein', () => {
    assert.deepEqual(p(zahl, ' 2,5 ATP '), [1, 1, true]);
    assert.deepEqual(p({ typ: 'zahl', loesung: 1000, toleranz: 0 }, '1 000'), [1, 1, true]);
  });
  test('leseZahl: ungültig → null', () => {
    assert.equal(leseZahl(''), null);
    assert.equal(leseZahl('abc'), null);
    assert.equal(leseZahl('2,5,1'), null);
    assert.equal(leseZahl('-3,5'), -3.5);
    assert.equal(leseZahl('−3,5'), -3.5);
    assert.equal(leseZahl(',5'), 0.5);
  });
  test('Toleranz 0 auch bei Kommazahlen exakt (kein Rundungsfehler)', () => {
    assert.deepEqual(p({ typ: 'zahl', loesung: 0.3, toleranz: 0 }, '0,3'), [1, 1, true]);
    assert.deepEqual(p({ typ: 'zahl', loesung: 0.3, toleranz: 0.1 }, '0,2'), [1, 1, true]);
  });
});

describe('freitext', () => {
  test('bestätigte Punkte zählen, nur volle Punktzahl ist richtig', () => {
    assert.deepEqual(p(frei, { punkte: 2 }), [2, 2, true]);
    assert.deepEqual(p(frei, { punkte: 1.5 }), [1.5, 2, false]);
    assert.deepEqual(p(frei, { punkte: 9 }), [2, 2, true]);
    assert.deepEqual(p(frei, null), [0, 2, false]);
  });
});

describe('loesungAlsText', () => {
  test('je Typ eine lesbare Lösung', () => {
    assert.deepEqual(loesungAlsText(mc), ['C']);
    assert.deepEqual(loesungAlsText(mehrfach), ['A', 'B', 'D']);
    assert.deepEqual(loesungAlsText(wf), ['Falsch']);
    assert.deepEqual(loesungAlsText(lt), ['Glucose hat 6 C-Atome und wird zu Pyruvat.']);
    assert.deepEqual(loesungAlsText(zuordnen), ['a → 1', 'b → 2', 'c → 3', 'd → 4']);
    assert.deepEqual(loesungAlsText(reihe), ['1. x', '2. y', '3. z']);
    assert.deepEqual(loesungAlsText(zahl), ['2,5 ATP (± 0,1)']);
    assert.deepEqual(loesungAlsText({ typ: 'zahl', loesung: 38, toleranz: 0 }), ['38']);
    assert.deepEqual(loesungAlsText({ typ: 'freitext', musterloesung: 'M' }), ['M']);
  });
});
