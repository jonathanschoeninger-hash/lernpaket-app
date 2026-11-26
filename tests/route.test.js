import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { leseRoute, baueRoute } from '../js/logic/route.js';

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
