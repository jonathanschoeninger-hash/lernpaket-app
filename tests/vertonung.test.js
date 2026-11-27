import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { textPruefwert, leseVertonung, audioFuerFolie, satzZeitpunkte, satzBeiZeit } from '../js/logic/vertonung.js';

describe('textPruefwert', () => {
  test('gleicher Text → gleicher Wert, anderer Text → anderer Wert, Leerraum egal', () => {
    assert.equal(textPruefwert('Hallo Welt.'), textPruefwert('  Hallo   Welt. '));
    assert.notEqual(textPruefwert('Hallo Welt.'), textPruefwert('Hallo Welt!'));
    assert.match(textPruefwert('Ä'), /^[0-9a-f]{8}$/);
  });
});

describe('leseVertonung', () => {
  const gut = {
    stimme: 'Adrian (ElevenLabs)',
    videos: { v1: [{ datei: 'v1-0.mp3', text: 'abcdef12' }, null, { datei: '../boese.mp3', text: '12345678' }] },
  };

  test('nur sichere Dateinamen, Lücken bleiben als null', () => {
    const v = leseVertonung(gut);
    assert.equal(v.stimme, 'Adrian (ElevenLabs)');
    assert.deepEqual(v.videos.v1, [{ datei: 'v1-0.mp3', text: 'abcdef12' }, null, null]);
  });

  test('kaputt → null', () => {
    assert.equal(leseVertonung(null), null);
    assert.equal(leseVertonung({ videos: 'x' }), null);
  });
});

describe('audioFuerFolie', () => {
  const v = leseVertonung({ stimme: 'X', videos: { v1: [{ datei: 'v1-0.mp3', text: textPruefwert('Erster Satz.') }] } });

  test('passender Text → Datei', () => {
    assert.equal(audioFuerFolie(v, 'v1', 0, 'Erster Satz.'), 'v1-0.mp3');
  });

  test('Text geändert, Folie oder Video fehlt → null (dann liest die Browser-Stimme)', () => {
    assert.equal(audioFuerFolie(v, 'v1', 0, 'Geänderter Satz.'), null);
    assert.equal(audioFuerFolie(v, 'v1', 1, 'Erster Satz.'), null);
    assert.equal(audioFuerFolie(v, 'v9', 0, 'Erster Satz.'), null);
    assert.equal(audioFuerFolie(null, 'v1', 0, 'Erster Satz.'), null);
  });
});

describe('Zeitpunkte der Sätze in einer Aufnahme', () => {
  test('nach Textlänge verteilt, erster Satz bei 0', () => {
    const z = satzZeitpunkte(['aaaa', 'aaaaaaaaaaaa', 'aaaa'], 20);
    assert.deepEqual(z, [0, 4, 16]);
  });

  test('ohne Dauer oder Sätze: alles bei 0', () => {
    assert.deepEqual(satzZeitpunkte(['a', 'b'], NaN), [0, 0]);
    assert.deepEqual(satzZeitpunkte([], 10), []);
  });

  test('satzBeiZeit: letzter Satz, der schon begonnen hat', () => {
    const z = [0, 4, 16];
    assert.equal(satzBeiZeit(z, 0), 0);
    assert.equal(satzBeiZeit(z, 3.9), 0);
    assert.equal(satzBeiZeit(z, 4), 1);
    assert.equal(satzBeiZeit(z, 30), 2);
  });
});

describe('Aufnahmen im Repo (pakete/audio)', () => {
  test('jede Aufnahme passt zum aktuellen Sprechertext und die Datei existiert', async () => {
    const { readdirSync, readFileSync, existsSync } = await import('node:fs');
    const ordner = new URL('../pakete/audio/', import.meta.url);
    if (!existsSync(ordner)) return;
    const liste = JSON.parse(readFileSync(new URL('../pakete/liste.json', import.meta.url), 'utf8')).pakete;
    for (const paketId of readdirSync(ordner)) {
      const eintrag = liste.find((e) => e.id === paketId);
      assert.ok(eintrag, `Aufnahmen für unbekanntes Paket ${paketId}`);
      const paket = JSON.parse(readFileSync(new URL(`../${eintrag.datei}`, import.meta.url), 'utf8'));
      const v = leseVertonung(JSON.parse(readFileSync(new URL(`${paketId}/stimme.json`, ordner), 'utf8')));
      for (const video of paket.videos) {
        video.folien.forEach((folie, i) => {
          const datei = audioFuerFolie(v, video.id, i, folie.sprechertext);
          assert.ok(datei, `${paketId} ${video.id} Folie ${i + 1}: Aufnahme fehlt oder passt nicht mehr zum Text – neu vertonen`);
          assert.ok(existsSync(new URL(`${paketId}/${datei}`, ordner)), `${datei} fehlt`);
        });
      }
    }
  });
});
