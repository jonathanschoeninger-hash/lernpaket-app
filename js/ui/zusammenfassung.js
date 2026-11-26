// Zusammenfassung (DESIGN.md 5.3): pro Unterthema, Länge umschaltbar, Begriffe markiert.

import { el, leeren } from './dom.js';
import { absaetze, markiereBegriffe } from '../logic/text.js';
import { baueRoute } from '../logic/route.js';
import { ladeEinstellungen, speichereEinstellung } from '../store/db.js';

const LAENGEN = [
  { wert: 'kurz', text: 'Kurz' },
  { wert: 'normal', text: 'Normal' },
  { wert: 'ausfuehrlich', text: 'Ausführlich' },
];

export async function zeige(wurzel, route, paket) {
  const einstellungen = await ladeEinstellungen();
  let laenge = LAENGEN.some((l) => l.wert === einstellungen.zusammenfassungLaenge)
    ? einstellungen.zusammenfassungLaenge
    : 'normal';

  const gewaehlt = paket.unterthemen.find((u) => u.id === route.unterthema) ?? null;
  const unterthemen = gewaehlt ? [gewaehlt] : paket.unterthemen;
  const inhalt = el('div', { class: 'zf-inhalt' });

  const zeichnen = () => {
    leeren(inhalt).append(...unterthemen.map((u) => abschnitt(paket, u, laenge, unterthemen.length > 1)));
  };

  const umschalter = el(
    'fieldset',
    { class: 'umschalter' },
    el('legend', { text: 'Länge' }),
    LAENGEN.map((l) =>
      el(
        'label',
        {},
        el('input', {
          type: 'radio',
          name: 'laenge',
          value: l.wert,
          checked: l.wert === laenge,
          on: {
            change: () => {
              laenge = l.wert;
              zeichnen();
              speichereEinstellung('zusammenfassungLaenge', laenge).catch(() => {});
            },
          },
        }),
        el('span', { text: l.text }),
      ),
    ),
  );

  wurzel.append(
    el('h1', { text: gewaehlt ? gewaehlt.name : 'Zusammenfassung' }),
    el(
      'nav',
      { class: 'chips', 'aria-label': 'Unterthema wählen' },
      el('a', { href: baueRoute('zusammenfassung', paket.id), 'aria-current': gewaehlt ? null : 'page', text: 'Alle' }),
      paket.unterthemen.map((u) =>
        el('a', {
          href: baueRoute('zusammenfassung', paket.id, u.id),
          'aria-current': gewaehlt?.id === u.id ? 'page' : null,
          text: u.name,
        }),
      ),
    ),
    el(
      'div',
      { class: 'werkzeuge' },
      umschalter,
      el('button', { type: 'button', class: 'knopf leise', text: 'Drucken / als PDF', on: { click: () => window.print() } }),
    ),
    inhalt,
  );
  zeichnen();
}

function abschnitt(paket, unterthema, laenge, mitUeberschrift) {
  const zf = paket.zusammenfassung.find((z) => z.unterthema === unterthema.id);
  const quelle = zf.quelle ? paket.quellen.find((q) => q.id === zf.quelle.id) : null;

  return el(
    'article',
    { class: 'zf-abschnitt' },
    mitUeberschrift ? el('h2', { text: unterthema.name }) : null,
    absaetze(zf[laenge]).map((absatz) =>
      el(
        'p',
        { class: 'lesetext' },
        markiereBegriffe(absatz, zf.begriffe).map((teil) =>
          teil.begriff ? el('mark', { class: 'begriff', text: teil.text }) : teil.text,
        ),
      ),
    ),
    el(
      'aside',
      { class: 'merke', 'aria-label': 'Merke' },
      el('p', { class: 'merke-titel', text: 'Merke' }),
      el('ul', {}, zf.merke.map((m) => el('li', { text: m }))),
    ),
    quelle
      ? el('p', { class: 'quelle' }, 'Quelle: ', quelle.name, zf.quelle.stelle ? `, ${zf.quelle.stelle}` : '')
      : null,
    el(
      'div',
      { class: 'aktionen nicht-drucken' },
      videoLink(paket, unterthema),
      el('a', { class: 'knopf', href: baueRoute('karten', paket.id, unterthema.id), text: 'Karten lernen' }),
      el('a', { class: 'knopf', href: baueRoute('ueben', paket.id, unterthema.id), text: 'Fragen üben' }),
    ),
  );
}

function videoLink(paket, unterthema) {
  const video = paket.videos.find((v) => v.unterthema === unterthema.id);
  return video ? el('a', { class: 'knopf', href: baueRoute('videos', paket.id, video.id), text: 'Video ansehen' }) : '';
}
