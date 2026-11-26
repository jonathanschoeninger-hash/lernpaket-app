// Karteikarten (DESIGN.md 5.4): Übersicht mit Fächern, Lernrunde, Anki-Export.

import { el, leeren, ansage, herunterladen } from './dom.js';
import {
  faelligeKarten,
  fachVerteilung,
  naechsteFaelligkeit,
  beantworte,
  heutigesDatum,
  ankiCsv,
  INTERVALLE,
} from '../logic/leitner.js';
import { datumLesbar } from '../logic/text.js';
import { baueRoute } from '../logic/route.js';
import { ladeFortschritt, speichereFortschritt } from '../store/db.js';

const WISCH_SCHWELLE = 60; // Pixel

export async function zeige(wurzel, route, paket) {
  const fortschritt = await ladeFortschritt(paket.id);
  const unterthema = paket.unterthemen.find((u) => u.id === route.unterthema) ?? null;
  const karten = unterthema ? paket.karten.filter((k) => k.unterthema === unterthema.id) : paket.karten;

  let ende = null;
  const uebersichtZeigen = () => {
    ende?.();
    ende = null;
    leeren(wurzel);
    uebersicht(wurzel, paket, unterthema, karten, fortschritt, (stapel) => {
      leeren(wurzel);
      ende = lernrunde(wurzel, paket, stapel, fortschritt, uebersichtZeigen);
    });
  };
  uebersichtZeigen();
  return () => ende?.();
}

function uebersicht(wurzel, paket, unterthema, karten, fortschritt, starten) {
  const heute = heutigesDatum();
  const faellig = faelligeKarten(karten, fortschritt.karten, heute);
  const verteilung = fachVerteilung(karten, fortschritt.karten);
  const naechste = naechsteFaelligkeit(karten, fortschritt.karten, heute);

  wurzel.append(
    el('h1', { text: unterthema ? `Karten: ${unterthema.name}` : 'Karteikarten' }),
    el(
      'nav',
      { class: 'chips', 'aria-label': 'Unterthema wählen' },
      el('a', { href: baueRoute('karten', paket.id), 'aria-current': unterthema ? null : 'page', text: 'Alle' }),
      paket.unterthemen.map((u) =>
        el('a', {
          href: baueRoute('karten', paket.id, u.id),
          'aria-current': unterthema?.id === u.id ? 'page' : null,
          text: u.name,
        }),
      ),
    ),
    el('p', { class: 'faellig-gross' }, el('strong', { text: String(faellig.length) }), ` heute fällig von ${karten.length} Karten`),
    faellig.length > 0
      ? el('button', {
          type: 'button',
          class: 'knopf haupt gross',
          text: 'Lernen starten',
          on: { click: () => starten(faellig) },
        })
      : el(
          'p',
          { class: 'meldung erfolg' },
          `Für heute ist alles erledigt. Nächste Karte fällig: ${naechste ? datumLesbar(naechste, heute) : '–'}.`,
        ),
    faecher(verteilung),
    el(
      'section',
      { class: 'export', 'aria-labelledby': 'export-titel' },
      el('h2', { id: 'export-titel', text: 'Für Anki exportieren' }),
      el('p', { class: 'klein', text: 'Alle Karten des Pakets als CSV-Datei. In Anki: Datei → Importieren.' }),
      el('button', {
        type: 'button',
        class: 'knopf',
        text: 'CSV-Datei speichern',
        on: {
          click: () => {
            herunterladen(`${paket.id}-karten.csv`, ankiCsv(paket), 'text/csv;charset=utf-8');
            ansage('CSV-Datei wird gespeichert.');
          },
        },
      }),
    ),
  );
}

function faecher(verteilung) {
  const max = Math.max(1, ...verteilung);
  return el(
    'section',
    { class: 'faecher', 'aria-labelledby': 'faecher-titel' },
    el('h2', { id: 'faecher-titel', text: 'Deine Karten in den Fächern' }),
    el(
      'ol',
      { class: 'fach-liste' },
      verteilung.map((n, i) => {
        const saeule = el('span', { class: 'fach-saeule' });
        saeule.style.setProperty('--hoehe', String(n / max));
        const tage = INTERVALLE[i + 1];
        return el(
          'li',
          { class: `fach fach-${i + 1}` },
          el('span', { class: 'fach-zahl', text: String(n) }),
          saeule,
          el('span', { class: 'fach-name', text: `Fach ${i + 1}` }),
          el('span', { class: 'fach-tage', text: tage === 0 ? 'täglich' : tage === 1 ? 'nach 1 Tag' : `nach ${tage} Tagen` }),
        );
      }),
    ),
  );
}

/** Eine Lernrunde; liefert eine Aufräum-Funktion. */
function lernrunde(wurzel, paket, stapel, fortschritt, zurueck) {
  const heute = heutigesDatum();
  const namen = new Map(paket.unterthemen.map((u) => [u.id, u.name]));
  const warteschlange = [...stapel];
  let erledigt = 0;
  let gewusstAnzahl = 0;
  let umgedreht = false;
  let karte = null;
  let sperre = false;

  const zaehler = el('p', { class: 'zaehler', 'aria-live': 'polite' });
  const vorne = el('div', { class: 'karte-seite karte-vorne' });
  const hinten = el('div', { class: 'karte-seite karte-hinten', 'aria-hidden': 'true' });
  const karteKnopf = el(
    'button',
    { type: 'button', class: 'karte', 'aria-label': 'Karte umdrehen' },
    el('span', { class: 'karte-innen' }, vorne, hinten),
  );
  const umdrehenHinweis = el('p', { class: 'klein mitte', text: 'Tippen, wischen oder Leertaste zum Umdrehen' });
  const antworten = el(
    'div',
    { class: 'antworten', hidden: true },
    el('button', { type: 'button', class: 'knopf nein', text: 'Nicht gewusst', on: { click: () => antworten_(false) } }),
    el('button', { type: 'button', class: 'knopf ja', text: 'Gewusst', on: { click: () => antworten_(true) } }),
  );

  function seiteFuellen(seite, titel, text, unterzeile) {
    leeren(seite).append(
      el('span', { class: 'karte-kopf', text: titel }),
      el('span', { class: 'karte-text', text }),
      unterzeile ? el('span', { class: 'karte-fuss', text: unterzeile }) : '',
    );
  }

  function naechsteKarte() {
    karte = warteschlange.shift() ?? null;
    if (!karte) return fertig();
    umgedreht = false;
    karteKnopf.classList.remove('umgedreht');
    karteKnopf.setAttribute('aria-label', 'Karte umdrehen');
    hinten.setAttribute('aria-hidden', 'true');
    vorne.removeAttribute('aria-hidden');
    antworten.hidden = true;
    umdrehenHinweis.hidden = false;
    const quelle = karte.quelle ? paket.quellen.find((q) => q.id === karte.quelle.id) : null;
    seiteFuellen(vorne, namen.get(karte.unterthema) ?? '', karte.vorne);
    seiteFuellen(
      hinten,
      'Antwort',
      karte.hinten,
      quelle ? `Quelle: ${quelle.name}${karte.quelle.stelle ? `, ${karte.quelle.stelle}` : ''}` : null,
    );
    const rest = warteschlange.length + 1;
    zaehler.textContent = rest === 1 ? 'Noch 1 Karte' : `Noch ${rest} Karten`;
  }

  function umdrehen() {
    if (!karte || umgedreht) return;
    umgedreht = true;
    karteKnopf.classList.add('umgedreht');
    karteKnopf.setAttribute('aria-label', `Antwort: ${karte.hinten}`);
    vorne.setAttribute('aria-hidden', 'true');
    hinten.removeAttribute('aria-hidden');
    antworten.hidden = false;
    umdrehenHinweis.hidden = true;
    antworten.querySelector('.ja').focus();
  }

  async function antworten_(gewusst) {
    if (!karte || !umgedreht || sperre) return;
    sperre = true;
    fortschritt.karten[karte.id] = beantworte(fortschritt.karten[karte.id], gewusst, heute);
    try {
      await speichereFortschritt(fortschritt);
    } catch {
      ansage('Speichern ging nicht – der Fortschritt dieser Karte ist eventuell verloren.');
    }
    erledigt++;
    if (gewusst) gewusstAnzahl++;
    else warteschlange.push(karte); // Fach 1 ist heute noch einmal dran.
    ansage(gewusst ? 'Gewusst – ein Fach weiter.' : 'Nicht gewusst – zurück in Fach 1, kommt heute noch einmal.');
    sperre = false;
    naechsteKarte();
    if (karte) karteKnopf.focus();
  }

  function fertig() {
    aufraeumen();
    leeren(wurzel).append(
      el('h1', { text: 'Geschafft!' }),
      el('p', { text: `Du hast ${erledigt} ${erledigt === 1 ? 'Antwort' : 'Antworten'} gegeben, davon ${gewusstAnzahl} gewusst. Für heute sind diese Karten erledigt.` }),
      el(
        'div',
        { class: 'aktionen' },
        el('button', { type: 'button', class: 'knopf haupt', text: 'Zur Kartenübersicht', on: { click: zurueck } }),
        el('a', { class: 'knopf', href: baueRoute('paket', paket.id), text: 'Zum Paket' }),
      ),
    );
    wurzel.querySelector('h1').setAttribute('tabindex', '-1');
    wurzel.querySelector('h1').focus();
  }

  // Klick und Wischen
  let startX = null;
  let gewischt = false;
  karteKnopf.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    gewischt = false;
    karteKnopf.setPointerCapture?.(e.pointerId);
  });
  karteKnopf.addEventListener('pointermove', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 8) karteKnopf.style.setProperty('--wisch', `${dx * 0.4}px`);
  });
  const wischEnde = (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    karteKnopf.style.setProperty('--wisch', '0px');
    if (Math.abs(dx) < WISCH_SCHWELLE) return;
    gewischt = true;
    if (!umgedreht) umdrehen();
    else antworten_(dx > 0);
  };
  karteKnopf.addEventListener('pointerup', wischEnde);
  karteKnopf.addEventListener('pointercancel', () => {
    startX = null;
    karteKnopf.style.setProperty('--wisch', '0px');
  });
  karteKnopf.addEventListener('click', () => {
    if (gewischt) {
      gewischt = false;
      return;
    }
    umdrehen();
  });

  // Tastatur: Leertaste/Enter dreht um (Knopf), danach 1 / ← = nicht gewusst, 2 / → = gewusst.
  const tasten = (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === ' ' && e.target === document.body) {
      e.preventDefault();
      umdrehen();
    } else if (umgedreht && (e.key === 'ArrowRight' || e.key === '2')) {
      e.preventDefault();
      antworten_(true);
    } else if (umgedreht && (e.key === 'ArrowLeft' || e.key === '1')) {
      e.preventDefault();
      antworten_(false);
    }
  };
  document.addEventListener('keydown', tasten);
  function aufraeumen() {
    document.removeEventListener('keydown', tasten);
  }

  wurzel.append(
    el('h1', { class: 'nur-sr', text: 'Karten lernen' }),
    el(
      'div',
      { class: 'runde-kopf' },
      zaehler,
      el('button', { type: 'button', class: 'knopf leise', text: 'Beenden', on: { click: () => { aufraeumen(); zurueck(); } } }),
    ),
    karteKnopf,
    umdrehenHinweis,
    antworten,
    el('p', { class: 'klein mitte tasten-hinweis', text: 'Tastatur: 1 oder ← nicht gewusst, 2 oder → gewusst' }),
  );
  naechsteKarte();
  karteKnopf.focus();
  return aufraeumen;
}
