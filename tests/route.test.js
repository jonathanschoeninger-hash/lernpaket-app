import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { leseRoute, baueRoute, erlaubterPaketPfad } from '../js/logic/route.js';

describe('leseRoute', () => {
  test('leer oder unbekannt → Start', () => {
    assert.deepEqual(leseRoute(''), { seite: 'start' });
    assert.deepEqual(leseRoute('#'), { seite: 'start' });
    assert.deepEqual(leseRoute('#/start'), { seite: 'start' });
    assert.deepEqual(leseRoute('#/gibtsnicht'), { seite: 'start' });
    assert.deepEqual(leseRoute('#/paket'), { seite: 'start' });
  });

  test('Paket-Übersicht, IDs mit Bindestrich', () => {
    assert.deepEqual(leseRoute('#/paket/bio-zellatmung-ahs10'), {
      seite: 'paket',
      paketId: 'bio-zellatmung-ahs10',
    });
  });

  test('Unterseiten mit und ohne Unterthema', () => {
    assert.deepEqual(leseRoute('#/paket/p-1/zusammenfassung'), {
      seite: 'zusammenfassung',
      paketId: 'p-1',
      unterthema: null,
    });
    assert.deepEqual(leseRoute('#/paket/p-1/karten/u2'), {
      seite: 'karten',
      paketId: 'p-1',
      unterthema: 'u2',
    });
  });

  test('unbekannte Unterseite → Paket-Übersicht', () => {
    assert.deepEqual(leseRoute('#/paket/p-1/quatsch'), { seite: 'paket', paketId: 'p-1' });
  });

  test('kaputte Kodierung → Start statt Absturz', () => {
    assert.deepEqual(leseRoute('#/paket/%E0%A4%A'), { seite: 'start' });
  });
});

describe('Üben und Fehlerheft', () => {
  test('ueben mit Unterthema und Filter', () => {
    assert.deepEqual(leseRoute('#/paket/p-1/ueben'), { seite: 'ueben', paketId: 'p-1', unterthema: null });
    assert.deepEqual(leseRoute('#/paket/p-1/ueben/u2?nur=fehler'), {
      seite: 'ueben',
      paketId: 'p-1',
      unterthema: 'u2',
      nur: 'fehler',
    });
    assert.deepEqual(leseRoute('#/paket/p-1/ueben?nur=fehler'), {
      seite: 'ueben',
      paketId: 'p-1',
      unterthema: null,
      nur: 'fehler',
    });
    assert.deepEqual(leseRoute('#/paket/p-1/fehlerheft'), { seite: 'fehlerheft', paketId: 'p-1', unterthema: null });
  });

  test('unbekannter Filter wird ignoriert', () => {
    assert.deepEqual(leseRoute('#/paket/p-1/ueben?nur=quatsch'), { seite: 'ueben', paketId: 'p-1', unterthema: null });
  });

  test('baueRoute mit Filter', () => {
    assert.equal(baueRoute('ueben', 'p-1', 'u2', { nur: 'fehler' }), '#/paket/p-1/ueben/u2?nur=fehler');
    assert.equal(baueRoute('ueben', 'p-1', null, { nur: 'fehler' }), '#/paket/p-1/ueben?nur=fehler');
  });
});

describe('Phase 4: Test, Fortschritt, Einstellungen', () => {
  test('Test, Ergebnis und Fortschritt', () => {
    assert.deepEqual(leseRoute('#/paket/p-1/test'), { seite: 'test', paketId: 'p-1', unterthema: null });
    assert.deepEqual(leseRoute('#/paket/p-1/test/ergebnis'), { seite: 'test', paketId: 'p-1', unterthema: 'ergebnis' });
    assert.deepEqual(leseRoute('#/paket/p-1/fortschritt'), { seite: 'fortschritt', paketId: 'p-1', unterthema: null });
  });

  test('Schwächen-Filter beim Üben', () => {
    assert.deepEqual(leseRoute('#/paket/p-1/ueben?nur=schwaechen'), {
      seite: 'ueben',
      paketId: 'p-1',
      unterthema: null,
      nur: 'schwaechen',
    });
  });

  test('Einstellungen (ohne Paket)', () => {
    assert.deepEqual(leseRoute('#/einstellungen'), { seite: 'einstellungen' });
    assert.equal(baueRoute('einstellungen'), '#/einstellungen');
  });
});

describe('Phase 5: Videos', () => {
  test('Videoliste und einzelnes Video', () => {
    assert.deepEqual(leseRoute('#/paket/p-1/videos'), { seite: 'videos', paketId: 'p-1', unterthema: null });
    assert.deepEqual(leseRoute('#/paket/p-1/videos/v2'), { seite: 'videos', paketId: 'p-1', unterthema: 'v2' });
  });
});

describe('Phase 6: Paket per Link', () => {
  test('#/oeffnen/<pfad> liest den ganzen Pfad', () => {
    assert.deepEqual(leseRoute('#/oeffnen/pakete/zellatmung.lernpaket.json'), {
      seite: 'oeffnen',
      pfad: 'pakete/zellatmung.lernpaket.json',
    });
    assert.deepEqual(leseRoute('#/oeffnen'), { seite: 'oeffnen', pfad: '' });
  });

  test('erlaubt: nur pakete/ und beispiele/, nur .lernpaket.json, keine Unterordner', () => {
    assert.equal(erlaubterPaketPfad('pakete/zellatmung.lernpaket.json'), true);
    assert.equal(erlaubterPaketPfad('beispiele/zellatmung.lernpaket.json'), true);
    assert.equal(erlaubterPaketPfad('pakete/Mathe_3-Klasse.lernpaket.json'), true);
  });

  test('abgelehnt: fremde Adressen, Ausbrüche, andere Ordner und Endungen', () => {
    for (const pfad of [
      '',
      'https://boese.example/x.lernpaket.json',
      '//boese.example/pakete/x.lernpaket.json',
      '/pakete/x.lernpaket.json',
      'pakete/../index.html',
      'pakete/../../x.lernpaket.json',
      'pakete/unter/x.lernpaket.json',
      'js/x.lernpaket.json',
      'pakete/x.json',
      'pakete/x.lernpaket.json?y=1',
      'pakete\\x.lernpaket.json',
      'javascript:alert(1)',
    ]) {
      assert.equal(erlaubterPaketPfad(pfad), false, pfad);
    }
  });
});

describe('baueRoute', () => {
  test('baut die Adressen, Rundweg mit leseRoute', () => {
    assert.equal(baueRoute('start'), '#/start');
    assert.equal(baueRoute('paket', 'p-1'), '#/paket/p-1');
    assert.equal(baueRoute('karten', 'p-1', 'u2'), '#/paket/p-1/karten/u2');
    assert.equal(baueRoute('zusammenfassung', 'p-1'), '#/paket/p-1/zusammenfassung');
    assert.deepEqual(leseRoute(baueRoute('karten', 'p 1', 'u/2')), {
      seite: 'karten',
      paketId: 'p 1',
      unterthema: 'u/2',
    });
  });
});
