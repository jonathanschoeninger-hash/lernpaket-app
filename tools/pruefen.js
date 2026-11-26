// Prüft ein Lernpaket auf der Kommandozeile.
// Aufruf: node tools/pruefen.js <datei.lernpaket.json>
// Exit-Code 0 = OK (ggf. mit Hinweisen), 1 = Fehler, 2 = falscher Aufruf.

import { readFile } from 'node:fs/promises';
import { pruefeDateiText, paketStatistik } from '../js/logic/validate.js';

function anzahl(n, einzahl, mehrzahl) {
  return `${n} ${n === 1 ? einzahl : mehrzahl}`;
}

function zeile({ pfad, meldung }) {
  return `  - ${pfad || '(Paket)'}: ${meldung}`;
}

const datei = process.argv[2];
if (!datei) {
  console.error('Aufruf: node tools/pruefen.js <datei.lernpaket.json>');
  process.exit(2);
}

let text;
try {
  text = await readFile(datei, 'utf8');
} catch (e) {
  console.error(`FEHLER – Datei „${datei}“ konnte nicht gelesen werden (${e.code || e.message}).`);
  process.exit(1);
}

const ergebnis = pruefeDateiText(text);

if (ergebnis.ok) {
  const s = paketStatistik(ergebnis.paket);
  console.log(
    `OK – ${anzahl(s.unterthemen, 'Unterthema', 'Unterthemen')}, ${anzahl(s.karten, 'Karte', 'Karten')}, ` +
      `${anzahl(s.videos, 'Video', 'Videos')}, ${anzahl(s.fragen, 'Frage', 'Fragen')} (${s.nurTest} nur Test)`,
  );
} else {
  console.log(`FEHLER – ${anzahl(ergebnis.fehler.length, 'Fehler', 'Fehler')} gefunden, das Paket wird abgelehnt:`);
  ergebnis.fehler.forEach((f) => console.log(zeile(f)));
}

if (ergebnis.hinweise.length > 0) {
  console.log(`\n${anzahl(ergebnis.hinweise.length, 'Hinweis', 'Hinweise')} (Paket bleibt gültig, aber bitte möglichst beheben):`);
  ergebnis.hinweise.forEach((h) => console.log(zeile(h)));
}

process.exit(ergebnis.ok ? 0 : 1);
