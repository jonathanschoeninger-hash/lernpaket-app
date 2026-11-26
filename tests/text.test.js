import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { absaetze, markiereBegriffe, datumLesbar } from '../js/logic/text.js';

describe('absaetze', () => {
  test('trennt an Leerzeilen, entfernt leere Absätze', () => {
    assert.deepEqual(absaetze('Eins.\n\nZwei.\n\n\n  Drei.  '), ['Eins.', 'Zwei.', 'Drei.']);
  });

  test('einzelner Zeilenumbruch bleibt im Absatz', () => {
    assert.deepEqual(absaetze('Zeile 1\nZeile 2'), ['Zeile 1\nZeile 2']);
  });

  test('leerer oder fehlender Text ergibt keine Absätze', () => {
    assert.deepEqual(absaetze(''), []);
    assert.deepEqual(absaetze(undefined), []);
  });
});

describe('markiereBegriffe', () => {
  const nurBegriffe = (teile) => teile.filter((t) => t.begriff).map((t) => t.text);

  test('ohne Begriffe: ein einziges Textstück', () => {
    assert.deepEqual(markiereBegriffe('Hallo Welt', []), [{ text: 'Hallo Welt', begriff: false }]);
    assert.deepEqual(markiereBegriffe('Hallo Welt', undefined), [{ text: 'Hallo Welt', begriff: false }]);
  });

  test('markiert alle Vorkommen, Groß-/Kleinschreibung egal, Originaltext bleibt', () => {
    const teile = markiereBegriffe('Glykolyse ist wichtig. Die glykolyse läuft im Plasma.', ['Glykolyse']);
    assert.deepEqual(nurBegriffe(teile), ['Glykolyse', 'glykolyse']);
    assert.equal(teile.map((t) => t.text).join(''), 'Glykolyse ist wichtig. Die glykolyse läuft im Plasma.');
  });

  test('längerer Begriff gewinnt vor kürzerem, keine Überlappung', () => {
    const teile = markiereBegriffe('Die oxidative Decarboxylierung ist eine Decarboxylierung.', [
      'Decarboxylierung',
      'oxidative Decarboxylierung',
    ]);
    assert.deepEqual(nurBegriffe(teile), ['oxidative Decarboxylierung', 'Decarboxylierung']);
  });

  test('Sonderzeichen im Begriff sind kein Regex', () => {
    const teile = markiereBegriffe('NAD+ wird zu NADH, NAD bleibt.', ['NAD+']);
    assert.deepEqual(nurBegriffe(teile), ['NAD+']);
  });

  test('leere Begriffe werden ignoriert', () => {
    assert.deepEqual(markiereBegriffe('abc', ['', '  ']), [{ text: 'abc', begriff: false }]);
  });
});

describe('datumLesbar', () => {
  test('heute, morgen, heuer ohne Jahr, sonst mit Jahr – österreichische Monatsnamen', () => {
    assert.equal(datumLesbar('2026-11-26', '2026-11-26'), 'heute');
    assert.equal(datumLesbar('2026-11-27', '2026-11-26'), 'morgen');
    assert.equal(datumLesbar('2027-01-01', '2026-12-31'), 'morgen');
    assert.equal(datumLesbar('2026-11-29', '2026-11-26'), '29. November');
    assert.equal(datumLesbar('2027-01-03', '2026-12-31'), '3. Jänner 2027');
  });
});
