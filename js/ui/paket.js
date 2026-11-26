// Paket-Übersicht: Eckdaten, Unterthemen, Wege zu Lesen und Karten.

import { el, kommtBald } from './dom.js';
import { baueRoute } from '../logic/route.js';
import { faelligeKarten, heutigesDatum } from '../logic/leitner.js';
import { paketStatistik } from '../logic/validate.js';
import { ladeFortschritt } from '../store/db.js';

const PRUEFUNGSART_TEXT = { Muendlich: 'Mündliche Prüfung' };

export async function zeige(wurzel, route, paket) {
  const fortschritt = await ladeFortschritt(paket.id);
  const heute = heutigesDatum();
  const s = paketStatistik(paket);
  const fehlerAnzahl = Object.keys(fortschritt.fehlerheft ?? {}).length;
  const faelligGesamt = faelligeKarten(paket.karten, fortschritt.karten, heute).length;

  const pruefung = [
    PRUEFUNGSART_TEXT[paket.pruefungsart] ?? paket.pruefungsart,
    paket.teil ? `Teil ${paket.teil}` : null,
  ].filter(Boolean).join(', ');

  wurzel.append(
    el(
      'header',
      { class: 'paket-kopf' },
      el('p', { class: 'paket-fach', text: `${paket.fach}, ${paket.schultyp} ${paket.schulstufe}. Stufe` }),
      el('h1', { text: paket.titel }),
      el('p', { class: 'klein', text: `Für: ${pruefung}. Erstellt am ${datumKurz(paket.erstellt)}${paket.ersteller ? ` von ${paket.ersteller}` : ''}.` }),
    ),
    el(
      'div',
      { class: 'aktionen' },
      el('a', { class: 'knopf haupt', href: baueRoute('zusammenfassung', paket.id), text: 'Zusammenfassung lesen' }),
      el('a', {
        class: 'knopf',
        href: baueRoute('karten', paket.id),
        text: faelligGesamt > 0 ? `Karten lernen (${faelligGesamt} fällig)` : 'Karten ansehen',
      }),
      el('a', { class: 'knopf', href: baueRoute('ueben', paket.id), text: 'Üben' }),
      el('a', {
        class: 'knopf',
        href: baueRoute('test', paket.id),
        text: fortschritt.laufenderTest ? 'Test fortsetzen' : 'Test machen',
      }),
      el('a', { class: 'knopf leise', href: baueRoute('fortschritt', paket.id), text: 'Fortschritt' }),
      el('a', {
        class: 'knopf leise',
        href: baueRoute('fehlerheft', paket.id),
        text: fehlerAnzahl > 0 ? `Fehlerheft (${fehlerAnzahl})` : 'Fehlerheft',
      }),
    ),
    el(
      'section',
      { 'aria-labelledby': 'unterthemen-titel' },
      el('h2', { id: 'unterthemen-titel', text: `${s.unterthemen} Unterthemen` }),
      el(
        'ol',
        { class: 'unterthemen' },
        paket.unterthemen.map((u) => {
          const anzahl = paket.karten.filter((k) => k.unterthema === u.id).length;
          const faellig = faelligeKarten(paket.karten, fortschritt.karten, heute, u.id).length;
          return el(
            'li',
            {},
            el('span', { class: 'unterthema-name', text: u.name }),
            el(
              'span',
              { class: 'unterthema-links' },
              el('a', { href: baueRoute('zusammenfassung', paket.id, u.id), text: 'Lesen' }),
              el('a', { href: baueRoute('karten', paket.id, u.id), text: `${anzahl} Karten, ${faellig} fällig` }),
              el('a', { href: baueRoute('ueben', paket.id, u.id), text: 'Üben' }),
            ),
          );
        }),
      ),
    ),
    el(
      'section',
      { 'aria-labelledby': 'bald-titel' },
      el('h2', { id: 'bald-titel', text: 'Außerdem im Paket' }),
      el('p', { text: `${s.videos} Videos und ${s.fragen} Fragen (davon ${s.nurTest} nur im Test).` }),
      el('div', { class: 'aktionen' }, kommtBald('Videos ansehen')),
    ),
    quellenAbschnitt(paket) ?? '',
  );
}

function quellenAbschnitt(paket) {
  if (!paket.quellen.length) return null;
  return el(
    'section',
    { 'aria-labelledby': 'quellen-titel' },
    el('h2', { id: 'quellen-titel', text: 'Quellen' }),
    el('ul', { class: 'quellen' }, paket.quellen.map((q) => el('li', { text: q.name }))),
  );
}

function datumKurz(iso) {
  const [j, m, t] = iso.split('-').map(Number);
  return `${t}. ${m}. ${j}`;
}
