// Prüft, dass der Service Worker alle App-Dateien kennt – sonst fehlt offline etwas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = fileURLToPath(new URL('..', import.meta.url));

function dateien(ordner) {
  return readdirSync(join(wurzel, ordner)).flatMap((name) => {
    const pfad = join(ordner, name);
    return statSync(join(wurzel, pfad)).isDirectory() ? dateien(pfad) : [pfad.replaceAll('\\', '/')];
  });
}

const sw = readFileSync(join(wurzel, 'sw.js'), 'utf8');
const liste = JSON.parse(sw.match(/const DATEIEN = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));

test('sw.js hat eine Versionsnummer', () => {
  assert.match(sw, /const VERSION = '\d+'/);
});

test('alle App-Dateien stehen in der Liste des Service Workers', () => {
  const noetig = [
    './',
    './index.html',
    './manifest.webmanifest',
    ...['css', 'js', 'icons'].flatMap(dateien).map((d) => `./${d}`),
  ];
  const fehlen = noetig.filter((d) => !liste.includes(d));
  assert.deepEqual(fehlen, []);
});

test('jede Datei in der Liste gibt es wirklich', () => {
  for (const d of liste) {
    if (d === './') continue;
    assert.ok(statSync(join(wurzel, d)).isFile(), d);
  }
});

test('manifest.webmanifest ist gültiges JSON mit Icons', () => {
  const m = JSON.parse(readFileSync(join(wurzel, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.lang, 'de-AT');
  assert.ok(m.icons.some((i) => i.sizes === '192x192'));
  assert.ok(m.icons.some((i) => i.sizes === '512x512'));
  for (const i of m.icons) assert.ok(statSync(join(wurzel, i.src)).isFile(), i.src);
});

test('relative Pfade, damit es unter /lernpaket-app/ auf GitHub Pages läuft', () => {
  assert.ok(liste.every((d) => d.startsWith('./')));
  assert.equal(relative(wurzel, wurzel), '');
});
