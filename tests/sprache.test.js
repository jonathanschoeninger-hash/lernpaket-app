import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { saetze, waehleStimme, lesezeit, deutscheStimmen, MAX_SATZ } from '../js/logic/sprache.js';

describe('saetze', () => {
  test('teilt an Satzenden', () => {
    assert.deepEqual(saetze('Erster Satz. Zweiter Satz! Dritter? Vierter.'), [
      'Erster Satz.',
      'Zweiter Satz!',
      'Dritter?',
      'Vierter.',
    ]);
  });

  test('Abkürzungen und Zahlen beenden keinen Satz', () => {
    assert.deepEqual(saetze('Das gilt z. B. für Glucose. Am 3. Tag ist es bzw. ca. so. Ende.'), [
      'Das gilt z. B. für Glucose.',
      'Am 3. Tag ist es bzw. ca. so.',
      'Ende.',
    ]);
  });

  test('Leerraum und leere Texte', () => {
    assert.deepEqual(saetze('  Eins.\n\nZwei.  '), ['Eins.', 'Zwei.']);
    assert.deepEqual(saetze(''), []);
    assert.deepEqual(saetze(undefined), []);
    assert.deepEqual(saetze('Ohne Punkt am Ende'), ['Ohne Punkt am Ende']);
  });

  test(`lange Sätze werden an Kommas geteilt (höchstens ${MAX_SATZ} Zeichen pro Stück)`, () => {
    const lang = Array.from({ length: 12 }, (_, i) => `Teil Nummer ${i + 1} mit etwas Text`).join(', ') + '.';
    const stuecke = saetze(lang);
    assert.ok(stuecke.length > 1);
    assert.ok(stuecke.every((s) => s.length <= MAX_SATZ), JSON.stringify(stuecke.map((s) => s.length)));
    assert.equal(stuecke.join(' ').replace(/\s+/g, ' '), lang);
  });

  test('sehr langes Wort ohne Komma wird hart geteilt', () => {
    const wurst = 'a'.repeat(MAX_SATZ * 2 + 5);
    const stuecke = saetze(wurst);
    assert.ok(stuecke.every((s) => s.length <= MAX_SATZ));
    assert.equal(stuecke.join(''), wurst);
  });
});

describe('waehleStimme', () => {
  const s = (name, lang, localService = true) => ({ name, lang, localService, voiceURI: name });

  test('de-AT vor de-DE vor anderem Deutsch; offline bevorzugt', () => {
    assert.equal(waehleStimme([s('en', 'en-US'), s('DE', 'de-DE'), s('AT', 'de-AT')]).name, 'AT');
    assert.equal(waehleStimme([s('CH', 'de-CH'), s('DE', 'de_DE')]).name, 'DE');
    assert.equal(waehleStimme([s('CH', 'de-CH'), s('en', 'en-GB')]).name, 'CH');
    assert.equal(waehleStimme([s('AT online', 'de-AT', false), s('DE offline', 'de-DE')]).name, 'DE offline');
    assert.equal(waehleStimme([s('Google Deutsch', 'de-DE', false)]).name, 'Google Deutsch');
  });

  test('gewünschte Stimme gewinnt, wenn sie deutsch ist', () => {
    const liste = [s('AT', 'de-AT'), s('DE', 'de-DE'), s('en', 'en-US')];
    assert.equal(waehleStimme(liste, 'DE').name, 'DE');
    assert.equal(waehleStimme(liste, 'en').name, 'AT');
    assert.equal(waehleStimme(liste, 'gibtsnicht').name, 'AT');
  });

  test('keine deutsche Stimme → null', () => {
    assert.equal(waehleStimme([s('en', 'en-US')]), null);
    assert.equal(waehleStimme([]), null);
  });

  test('deutscheStimmen: sortiert wie die Auswahl', () => {
    const liste = [s('en', 'en-US'), s('DE online', 'de-DE', false), s('DE', 'de-DE'), s('AT', 'de-AT')];
    assert.deepEqual(deutscheStimmen(liste).map((v) => v.name), ['AT', 'DE', 'DE online']);
  });
});

describe('lesezeit', () => {
  test('mehr Wörter → länger, schnelleres Tempo → kürzer, mindestens 2 s', () => {
    const kurz = lesezeit('Hallo.', 1);
    const lang = lesezeit('Das ist ein deutlich längerer Satz mit vielen einzelnen Wörtern darin.', 1);
    assert.ok(kurz >= 2000);
    assert.ok(lang > kurz);
    assert.ok(lesezeit('Das ist ein deutlich längerer Satz mit vielen einzelnen Wörtern darin.', 1.5) < lang);
  });
});
