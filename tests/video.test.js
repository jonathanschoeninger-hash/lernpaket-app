import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aufdeckSchritte, sichtbarBis, gesehenGrenze, folieGelaufen, videoStand } from '../js/logic/video.js';

const BEISPIEL = JSON.parse(
  readFileSync(new URL('../beispiele/zellatmung.lernpaket.json', import.meta.url), 'utf8'),
);

describe('aufdeckSchritte', () => {
  test('pro Layout', () => {
    assert.equal(aufdeckSchritte({ layout: 'stichpunkte', punkte: ['a', 'b', 'c'] }), 3);
    assert.equal(aufdeckSchritte({ layout: 'ablauf', schritte: ['a', 'b', 'c', 'd'] }), 4);
    assert.equal(aufdeckSchritte({ layout: 'vergleich' }), 2);
    assert.equal(aufdeckSchritte({ layout: 'formel', teile: [{}, {}] }), 2);
    assert.equal(aufdeckSchritte({ layout: 'begriff' }), 1);
    for (const layout of ['titel', 'zahl', 'merke', 'quiz']) assert.equal(aufdeckSchritte({ layout }), 0);
  });
});

describe('sichtbarBis', () => {
  test('Stichpunkte verteilen sich auf die Sätze, am Ende ist alles sichtbar', () => {
    assert.deepEqual([0, 1, 2].map((s) => sichtbarBis(s, 3, 3)), [1, 2, 3]);
    assert.deepEqual([0].map((s) => sichtbarBis(s, 1, 3)), [3]);
    assert.deepEqual([0, 1, 2, 3, 4].map((s) => sichtbarBis(s, 5, 3)), [1, 2, 2, 3, 3]);
    assert.deepEqual([0, 1].map((s) => sichtbarBis(s, 2, 0)), [0, 0]);
  });

  test('ohne Sprechertext-Sätze: alles sichtbar', () => {
    assert.equal(sichtbarBis(0, 0, 4), 4);
  });
});

describe('gesehen', () => {
  test('ab 80 % der Folien', () => {
    assert.equal(gesehenGrenze(5), 4);
    assert.equal(gesehenGrenze(4), 4); // 3,2 → 4
    assert.equal(gesehenGrenze(10), 8);
    assert.equal(gesehenGrenze(1), 1);
  });

  test('folieGelaufen merkt Folien (ohne Doppelte) und setzt gesehen', () => {
    let s = videoStand(undefined);
    assert.deepEqual(s, { gesehen: false, gelaufen: [] });
    for (const i of [0, 1, 1, 2]) s = folieGelaufen(s, i, 5);
    assert.deepEqual(s, { gesehen: false, gelaufen: [0, 1, 2] });
    s = folieGelaufen(s, 4, 5);
    assert.deepEqual(s, { gesehen: true, gelaufen: [0, 1, 2, 4] });
  });

  test('einmal gesehen bleibt gesehen', () => {
    const s = folieGelaufen({ gesehen: true, gelaufen: [] }, 0, 5);
    assert.equal(s.gesehen, true);
  });

  test('alle Beispielvideos haben Folien mit Sprechertext', () => {
    for (const v of BEISPIEL.videos) assert.ok(v.folien.every((f) => f.sprechertext.trim().length > 0));
  });
});
