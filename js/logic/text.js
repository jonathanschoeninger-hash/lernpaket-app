import { datumPlusTage } from './leitner.js';

// Text-Hilfen für die Anzeige – liefern Datenstücke, die UI baut daraus DOM-Elemente.

/** Text an Leerzeilen in Absätze teilen. */
export function absaetze(text) {
  if (typeof text !== 'string') return [];
  return text
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

/**
 * Text in Stücke teilen und Fachbegriffe markieren: [{ text, begriff }].
 * Groß-/Kleinschreibung egal, längere Begriffe zuerst, keine Überlappungen.
 */
export function markiereBegriffe(text, begriffe) {
  const liste = (Array.isArray(begriffe) ? begriffe : [])
    .filter((b) => typeof b === 'string' && b.trim() !== '')
    .map((b) => b.trim().toLocaleLowerCase('de'))
    .sort((a, b) => b.length - a.length);

  if (liste.length === 0) return [{ text, begriff: false }];

  const klein = text.toLocaleLowerCase('de');
  // Nur wenn die Kleinschreibung die Länge nicht ändert, stimmen die Positionen überein.
  if (klein.length !== text.length) return [{ text, begriff: false }];

  const teile = [];
  let normalStart = 0;
  let i = 0;
  while (i < text.length) {
    const treffer = liste.find((b) => klein.startsWith(b, i));
    if (treffer) {
      if (i > normalStart) teile.push({ text: text.slice(normalStart, i), begriff: false });
      teile.push({ text: text.slice(i, i + treffer.length), begriff: true });
      i += treffer.length;
      normalStart = i;
    } else {
      i++;
    }
  }
  if (normalStart < text.length) teile.push({ text: text.slice(normalStart), begriff: false });
  return teile;
}

const MONATE = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

/** "2026-11-29" → "29. November" (heuer) bzw. "3. Jänner 2027"; heute/morgen als Wort. */
export function datumLesbar(datum, heute) {
  if (datum === heute) return 'heute';
  const [j, m, t] = datum.split('-').map(Number);
  const morgen = datumPlusTage(heute, 1);
  if (datum === morgen) return 'morgen';
  const jahr = j === Number(heute.slice(0, 4)) ? '' : ` ${j}`;
  return `${t}. ${MONATE[m - 1]}${jahr}`;
}
