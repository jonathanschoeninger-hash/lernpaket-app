// Inhaltsliste der Website (pakete/liste.json): welche Pakete die Startseite zum Anklicken zeigt.
// Die Datei kommt von derselben Seite, wird aber trotzdem wie fremde Daten geprüft.

import { erlaubterPaketPfad } from './route.js';

const text = (x, max = 300) => (typeof x === 'string' ? x.trim().slice(0, max) : '');

/** { pakete: [{ datei, id, titel, fach?, beschreibung? }] } → nur gültige Einträge */
export function leseInhaltsliste(daten) {
  if (!daten || typeof daten !== 'object' || !Array.isArray(daten.pakete)) return [];
  return daten.pakete
    .filter((e) => e && typeof e === 'object' && erlaubterPaketPfad(e.datei) && text(e.titel) && text(e.id, 40))
    .map((e) => ({
      datei: e.datei,
      id: text(e.id, 40),
      titel: text(e.titel),
      fach: text(e.fach),
      beschreibung: text(e.beschreibung, 500),
    }));
}
