import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leseInhaltsliste } from '../js/logic/paketliste.js';
import { validatePaket } from '../js/logic/validate.js';

describe('leseInhaltsliste', () => {
  test('gültige Einträge kommen zurück, Texte getrimmt', () => {
    const liste = leseInhaltsliste({
      pakete: [{ datei: 'pakete/a.lernpaket.json', id: 'gw-a', titel: ' Städte ', fach: 'GW', beschreibung: 'Test' }],
    });
    assert.deepEqual(liste, [{ datei: 'pakete/a.lernpaket.json', id: 'gw-a', titel: 'Städte', fach: 'GW', beschreibung: 'Test' }]);
  });

  test('unerlaubte Pfade, fehlende Titel und kaputte Einträge fallen weg', () => {
    const liste = leseInhaltsliste({
      pakete: [
        { datei: 'https://boese.example/x.lernpaket.json', id: 'x', titel: 'Böse' },
        { datei: 'pakete/../x.lernpaket.json', id: 'x', titel: 'Böse' },
        { datei: 'pakete/ohne-titel.lernpaket.json', id: 'y' },
        { datei: 'pakete/ok.lernpaket.json', id: 'ok', titel: 'OK', beschreibung: 42 },
        null,
        'quatsch',
      ],
    });
    assert.deepEqual(liste, [{ datei: 'pakete/ok.lernpaket.json', id: 'ok', titel: 'OK', fach: '', beschreibung: '' }]);
  });

  test('kein Objekt oder keine Liste → leer', () => {
    assert.deepEqual(leseInhaltsliste(null), []);
    assert.deepEqual(leseInhaltsliste({ pakete: 'x' }), []);
    assert.deepEqual(leseInhaltsliste([]), []);
  });
});

describe('pakete/liste.json im Repo', () => {
  const roh = JSON.parse(readFileSync(new URL('../pakete/liste.json', import.meta.url), 'utf8'));

  test('jeder Eintrag ist gültig und zeigt auf ein gültiges Paket mit gleicher ID und gleichem Titel', () => {
    const liste = leseInhaltsliste(roh);
    assert.equal(liste.length, roh.pakete.length, 'kein Eintrag darf beim Lesen wegfallen');
    assert.ok(liste.length > 0);
    for (const e of liste) {
      const paket = JSON.parse(readFileSync(new URL(`../${e.datei}`, import.meta.url), 'utf8'));
      assert.equal(validatePaket(paket).ok, true, e.datei);
      assert.equal(paket.id, e.id, e.datei);
      assert.equal(paket.titel, e.titel, e.datei);
    }
  });
});
