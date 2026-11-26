// Start der App: Hash-Router, Kopfzeile und Tab-Leiste.

import { leseRoute, baueRoute } from './logic/route.js';
import { el, leeren, ansage } from './ui/dom.js';
import { ladePaket } from './store/db.js';
import * as start from './ui/start.js';
import * as paketSeite from './ui/paket.js';
import * as zusammenfassung from './ui/zusammenfassung.js';
import * as karten from './ui/karten.js';
import * as ueben from './ui/ueben.js';
import * as fehlerheft from './ui/fehlerheft.js';
import * as test from './ui/testen.js';
import * as fortschrittSeite from './ui/fortschritt.js';
import * as einstellungen from './ui/einstellungen.js';

const SEITEN = {
  start,
  einstellungen,
  paket: paketSeite,
  zusammenfassung,
  karten,
  ueben,
  fehlerheft,
  test,
  fortschritt: fortschrittSeite,
};

const haupt = document.getElementById('haupt');
const tabs = document.getElementById('tabs');
const kopfTitel = document.getElementById('kopf-titel');

let aufraeumen = null;
let renderNummer = 0;

function tabLeiste(route) {
  const eintraege = [
    { text: 'Lesen', seite: 'zusammenfassung' },
    { text: 'Karten', seite: 'karten' },
    { text: 'Videos' },
    { text: 'Üben', seite: 'ueben' },
    { text: 'Test', seite: 'test' },
  ];
  leeren(tabs).append(
    el(
      'ul',
      {},
      eintraege.map((t) =>
        el(
          'li',
          {},
          t.seite
            ? el('a', {
                href: baueRoute(t.seite, route.paketId),
                'aria-current': route.seite === t.seite ? 'page' : null,
                text: t.text,
              })
            : el('button', {
                type: 'button',
                'aria-disabled': 'true',
                text: t.text,
                on: { click: () => ansage(`${t.text}: kommt in einer späteren Version.`) },
              }),
        ),
      ),
    ),
  );
}

async function zeigen() {
  const nummer = ++renderNummer;
  const route = leseRoute(location.hash);
  if (typeof aufraeumen === 'function') aufraeumen();
  aufraeumen = null;

  let eintrag = null;
  if (route.paketId) {
    eintrag = await ladePaket(route.paketId).catch(() => null);
    if (nummer !== renderNummer) return;
  }

  if (route.paketId && !eintrag) {
    tabs.hidden = true;
    kopfTitel.textContent = '';
    leeren(haupt).append(
      el('h1', { tabindex: '-1', text: 'Paket nicht gefunden' }),
      el('p', { text: 'Dieses Lernpaket ist auf diesem Gerät nicht gespeichert. Öffne die Datei bitte noch einmal.' }),
      el('p', {}, el('a', { class: 'knopf haupt', href: '#/start', text: 'Zur Startseite' })),
    );
    haupt.querySelector('h1').focus();
    return;
  }

  tabs.hidden = !eintrag;
  kopfTitel.textContent = eintrag ? eintrag.paket.titel : '';
  if (eintrag) tabLeiste(route);
  document.title = eintrag ? `${eintrag.paket.titel} – Lernpaket` : 'Lernpaket';

  const inhalt = el('div', { class: `seite seite-${route.seite}` });
  leeren(haupt).append(inhalt);
  try {
    aufraeumen = await SEITEN[route.seite].zeige(inhalt, route, eintrag?.paket ?? null);
  } catch (fehler) {
    console.error(fehler);
    leeren(inhalt).append(
      el('h1', { tabindex: '-1', text: 'Etwas ist schiefgegangen' }),
      el('p', { text: `Die Seite konnte nicht angezeigt werden (${fehler?.message ?? fehler}).` }),
      el('p', {}, el('a', { class: 'knopf', href: '#/start', text: 'Zur Startseite' })),
    );
  }
  if (nummer !== renderNummer) return;
  // Fokus auf die Überschrift, damit Screenreader den Seitenwechsel ansagen.
  const h1 = inhalt.querySelector('h1');
  if (h1 && !inhalt.contains(document.activeElement)) {
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

document.getElementById('springen').addEventListener('click', () => haupt.focus());

// Reingezogene Dateien sollen nie den Browser wegnavigieren.
for (const ereignis of ['dragover', 'drop']) {
  window.addEventListener(ereignis, (e) => e.preventDefault());
}

if (!('indexedDB' in window)) {
  haupt.append(el('p', { class: 'fehler', text: 'Dieser Browser kann keine Daten speichern (IndexedDB fehlt). Bitte einen aktuellen Browser verwenden.' }));
} else {
  window.addEventListener('hashchange', zeigen);
  if (!location.hash) history.replaceState(null, '', '#/start');
  zeigen();
}
