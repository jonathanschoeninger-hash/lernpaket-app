import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { erstelleBackup, pruefeBackupText, backupDateiname, MAX_BACKUP_BYTES } from '../js/logic/backup.js';
import { leererFortschritt } from '../js/logic/fortschritt.js';

const BEISPIEL = JSON.parse(
  readFileSync(new URL('../beispiele/zellatmung.lernpaket.json', import.meta.url), 'utf8'),
);

const fortschritt = {
  ...leererFortschritt(BEISPIEL.id),
  karten: { k1: { fach: 3, faelligAm: '2026-12-01' } },
  tests: [{ datum: 1, note: 2, prozent: 80, proUnterthema: {} }],
};

const einstellungen = {
  notenschluessel: { art: 'mathe' },
  stimme: 'Microsoft Hedda',
  tempo: 1.25,
  untertitel: true,
  zusammenfassungLaenge: 'kurz',
};

function backupText(aendern = (b) => b) {
  const b = erstelleBackup({
    pakete: [{ paket: BEISPIEL, importiertAm: '2026-11-26T10:00:00.000Z' }],
    fortschritte: [fortschritt],
    einstellungen,
    jetzt: new Date('2026-11-27T09:00:00Z'),
  });
  return JSON.stringify(aendern(structuredClone(b)));
}

describe('erstelleBackup', () => {
  test('Aufbau: Format, Version, Pakete mit ihrem Fortschritt, Einstellungen', () => {
    const b = JSON.parse(backupText());
    assert.equal(b.format, 'lernpaket-sicherung');
    assert.equal(b.version, 1);
    assert.equal(b.erstellt, '2026-11-27T09:00:00.000Z');
    assert.equal(b.pakete.length, 1);
    assert.equal(b.pakete[0].paket.id, BEISPIEL.id);
    assert.deepEqual(b.pakete[0].fortschritt.karten, fortschritt.karten);
    assert.deepEqual(b.einstellungen, einstellungen);
  });

  test('Paket ohne Fortschritt bekommt einen leeren', () => {
    const b = erstelleBackup({ pakete: [{ paket: BEISPIEL }], fortschritte: [], einstellungen: {}, jetzt: new Date(0) });
    assert.deepEqual(b.pakete[0].fortschritt, leererFortschritt(BEISPIEL.id));
  });

  test('Dateiname mit Datum', () => {
    assert.equal(backupDateiname(new Date(2026, 10, 27)), 'lernpaket-sicherung-2026-11-27.json');
  });
});

describe('pruefeBackupText', () => {
  test('gültige Sicherung: ok, Pakete und Einstellungen kommen zurück', () => {
    const e = pruefeBackupText(backupText());
    assert.equal(e.ok, true);
    assert.deepEqual(e.fehler, []);
    assert.equal(e.pakete.length, 1);
    assert.deepEqual(e.pakete[0].fortschritt.karten, fortschritt.karten);
    assert.deepEqual(e.pakete[0].fortschritt.tests, fortschritt.tests);
    assert.deepEqual(e.einstellungen, einstellungen);
  });

  test('kein JSON / falsches Format / zu neue Version', () => {
    assert.match(pruefeBackupText('kein json').fehler[0], /keine gültige JSON-Datei/);
    assert.match(pruefeBackupText(JSON.stringify(BEISPIEL)).fehler[0], /Lernpaket, keine Sicherung/);
    assert.match(pruefeBackupText('{"format":"etwas"}').fehler[0], /keine Sicherung/);
    assert.match(pruefeBackupText(backupText((b) => ({ ...b, version: 2 }))).fehler[0], /neueren Version/);
  });

  test('kaputtes Paket wird gemeldet und ausgelassen, die anderen bleiben', () => {
    const text = backupText((b) => {
      const kaputt = structuredClone(b.pakete[0]);
      kaputt.paket.id = 'anderes-paket';
      kaputt.paket.fragen[0].richtig = [9];
      b.pakete.push(kaputt);
      return b;
    });
    const e = pruefeBackupText(text);
    assert.equal(e.ok, true);
    assert.equal(e.pakete.length, 1);
    assert.equal(e.uebersprungen.length, 1);
    assert.match(e.uebersprungen[0], /Zellatmung.*fragen\[0\]\.richtig/s);
  });

  test('nur kaputte Pakete → nicht ok', () => {
    const e = pruefeBackupText(backupText((b) => {
      b.pakete[0].paket.format = 'falsch';
      return b;
    }));
    assert.equal(e.ok, false);
    assert.match(e.fehler[0], /kein gültiges Paket/);
  });

  test('doppelte Paket-ID: nur das erste zählt', () => {
    const e = pruefeBackupText(backupText((b) => {
      b.pakete.push(structuredClone(b.pakete[0]));
      return b;
    }));
    assert.equal(e.pakete.length, 1);
    assert.match(e.uebersprungen[0], /doppelt/);
  });

  test('Fortschritt wird bereinigt (unbekannte IDs fallen weg, falsche paketId korrigiert)', () => {
    const e = pruefeBackupText(backupText((b) => {
      b.pakete[0].fortschritt.karten.k999 = { fach: 5, faelligAm: '2026-12-01' };
      b.pakete[0].fortschritt.paketId = 'falsch';
      b.pakete[0].fortschritt.laufenderTest = { modus: 'kurztest' };
      return b;
    }));
    assert.deepEqual(Object.keys(e.pakete[0].fortschritt.karten), ['k1']);
    assert.equal(e.pakete[0].fortschritt.paketId, BEISPIEL.id);
    assert.equal(e.pakete[0].fortschritt.laufenderTest, null);
  });

  test('Einstellungen: nur bekannte, gültige Werte', () => {
    const e = pruefeBackupText(backupText((b) => {
      b.einstellungen = {
        notenschluessel: { art: 'eigen', grenzen: [10, 20, 30, 40] },
        tempo: 9,
        stimme: 42,
        untertitel: 'ja',
        zusammenfassungLaenge: 'riesig',
        boese: '<script>',
      };
      return b;
    }));
    assert.deepEqual(e.einstellungen, {});
  });

  test(`zu große Datei (über ${MAX_BACKUP_BYTES / 1024 / 1024} MB)`, () => {
    const riesig = ' '.repeat(MAX_BACKUP_BYTES + 1);
    assert.match(pruefeBackupText(riesig).fehler[0], /zu groß/);
  });
});
