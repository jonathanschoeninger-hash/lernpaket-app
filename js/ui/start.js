// Startseite: Lernpaket öffnen (Dateiauswahl + Reinziehen) und „Meine Pakete“.

import { el, leeren, ansage, frageDialog } from './dom.js';
import { pruefeDateiText, MAX_DATEI_BYTES } from '../logic/validate.js';
import { leererFortschritt, fortschrittUebernehmen } from '../logic/fortschritt.js';
import { paketBeherrschung } from '../logic/mastery.js';
import { faelligeKarten, heutigesDatum } from '../logic/leitner.js';
import { baueRoute } from '../logic/route.js';
import { leseInhaltsliste } from '../logic/paketliste.js';
import { allePakete, ladePaket, speicherePaket, loeschePaket, ladeFortschritt } from '../store/db.js';

const MAX_FEHLER = 10;

export async function zeige(wurzel) {
  const meldungen = el('div', { class: 'meldungen' });
  const liste = el('section', { class: 'meine-pakete', 'aria-labelledby': 'meine-pakete-titel' });

  const eingabe = el('input', {
    type: 'file',
    id: 'datei',
    accept: '.json,application/json',
    multiple: true,
    class: 'nur-sr',
    on: {
      change: async () => {
        await dateienOeffnen([...eingabe.files], meldungen, liste);
        eingabe.value = '';
      },
    },
  });

  const zone = el(
    'div',
    { class: 'ablage' },
    el('p', { class: 'ablage-text', text: 'Lernpaket-Datei hierher ziehen' }),
    el('p', { class: 'ablage-oder', text: 'oder' }),
    el('label', { for: 'datei', class: 'knopf haupt' }, 'Datei auswählen'),
    eingabe,
    el('p', { class: 'klein', text: 'Dateien mit der Endung .lernpaket.json. Alles bleibt auf diesem Gerät.' }),
  );

  // Das Label soll per Tastatur wie ein Knopf funktionieren.
  const label = zone.querySelector('label');
  label.tabIndex = 0;
  label.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      eingabe.click();
    }
  });

  let tiefe = 0;
  const hinein = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    tiefe++;
    zone.classList.add('aktiv');
  };
  const hinaus = () => {
    tiefe = Math.max(0, tiefe - 1);
    if (tiefe === 0) zone.classList.remove('aktiv');
  };
  const fallen = async (e) => {
    tiefe = 0;
    zone.classList.remove('aktiv');
    const dateien = [...(e.dataTransfer?.files ?? [])];
    if (dateien.length) await dateienOeffnen(dateien, meldungen, liste);
  };
  window.addEventListener('dragenter', hinein);
  window.addEventListener('dragleave', hinaus);
  window.addEventListener('drop', fallen);

  const angebot = el('section', { class: 'angebot', 'aria-labelledby': 'angebot-titel', hidden: true });

  wurzel.append(
    el('h1', { text: 'Lernpakete' }),
    angebot,
    liste,
    el('h2', { text: 'Eigene Datei öffnen' }),
    zone,
    meldungen,
  );
  await Promise.all([listeZeigen(liste), angebotZeigen(angebot)]);

  return () => {
    window.removeEventListener('dragenter', hinein);
    window.removeEventListener('dragleave', hinaus);
    window.removeEventListener('drop', fallen);
  };
}

async function dateienOeffnen(dateien, meldungen, liste) {
  leeren(meldungen);
  for (const datei of dateien) {
    meldungen.append(await dateiOeffnen(datei));
  }
  await listeZeigen(liste);
}

/** Eine Datei prüfen und speichern; liefert das Meldungs-Element. */
async function dateiOeffnen(datei) {
  if (datei.size > MAX_DATEI_BYTES) {
    return fehlerKasten(datei.name, [
      { pfad: '', meldung: `Die Datei ist ${(datei.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB groß – erlaubt sind höchstens 5 MB.` },
    ]);
  }

  let text;
  try {
    text = await datei.text();
  } catch {
    return fehlerKasten(datei.name, [{ pfad: '', meldung: 'Die Datei konnte nicht gelesen werden.' }]);
  }
  return paketTextImportieren(text, datei.name);
}

/**
 * Paket-Text prüfen (validate.js), bei gleicher ID nachfragen, speichern.
 * Gemeinsam für Datei öffnen, Reinziehen und Paket per Link. Liefert das Meldungs-Element.
 */
export async function paketTextImportieren(text, dateiname) {
  const ergebnis = pruefeDateiText(text);
  if (!ergebnis.ok) return fehlerKasten(dateiname, ergebnis.fehler, ergebnis.hinweise);

  const paket = ergebnis.paket;
  let fortschritt = leererFortschritt(paket.id);
  const vorhanden = await ladePaket(paket.id);
  if (vorhanden) {
    const ersetzen = await frageDialog({
      titel: 'Dieses Paket ist schon gespeichert',
      text: [
        `„${vorhanden.paket.titel}“ gibt es schon auf diesem Gerät. Soll es durch die neue Datei ersetzt werden?`,
        'Dein Fortschritt zu Karten, Fragen und Videos, die es im neuen Paket weiter gibt, bleibt erhalten. Der Rest wird verworfen.',
      ],
      knoepfe: [
        { text: 'Abbrechen', wert: false },
        { text: 'Ersetzen', wert: true, art: 'haupt' },
      ],
    });
    if (!ersetzen) {
      return el('p', { class: 'meldung', role: 'status', text: `„${paket.titel}“ wurde nicht ersetzt.` });
    }
    fortschritt = fortschrittUebernehmen(await ladeFortschritt(paket.id), paket);
  }

  try {
    await speicherePaket(paket, fortschritt);
  } catch (fehler) {
    return fehlerKasten(dateiname, [{ pfad: '', meldung: `Speichern ging nicht (${fehler?.message ?? fehler}). Ist der Speicher voll?` }]);
  }

  ansage(`„${paket.titel}“ ${vorhanden ? 'ersetzt' : 'geöffnet'}.`);
  return el(
    'div',
    { class: 'meldung erfolg', role: 'status' },
    el(
      'p',
      {},
      `„${paket.titel}“ ${vorhanden ? 'ersetzt' : 'gespeichert'}. `,
      el('a', { href: baueRoute('paket', paket.id), text: 'Zum Paket' }),
    ),
    hinweisListe(ergebnis.hinweise),
  );
}

function fehlerKasten(dateiname, fehler, hinweise = []) {
  const gezeigt = fehler.slice(0, MAX_FEHLER);
  const rest = fehler.length - gezeigt.length;
  return el(
    'div',
    { class: 'meldung fehler', role: 'alert' },
    el('p', { class: 'meldung-titel', text: `„${dateiname}“ kann nicht geöffnet werden.` }),
    el('p', {
      text:
        fehler.length === 1
          ? 'Ein Fehler wurde gefunden:'
          : `${fehler.length} Fehler wurden gefunden:`,
    }),
    el(
      'ul',
      {},
      gezeigt.map((f) =>
        el('li', {}, f.pfad ? el('code', { text: f.pfad }) : null, f.pfad ? ' ' : null, f.meldung),
      ),
      rest > 0 ? el('li', { class: 'rest', text: `… und ${rest} weitere` }) : null,
    ),
    el('p', { class: 'klein', text: 'Lass das Paket von der Person, die es erstellt hat, korrigieren.' }),
    hinweisListe(hinweise),
  );
}

/** Hinweise nur dezent: eingeklappt. */
function hinweisListe(hinweise) {
  if (!hinweise?.length) return null;
  return el(
    'details',
    { class: 'hinweise' },
    el('summary', { text: hinweise.length === 1 ? '1 Hinweis zum Paket' : `${hinweise.length} Hinweise zum Paket` }),
    el(
      'ul',
      {},
      hinweise.map((h) => el('li', {}, h.pfad ? el('code', { text: h.pfad }) : null, h.pfad ? ' ' : null, h.meldung)),
    ),
  );
}

async function listeZeigen(liste) {
  const eintraege = await allePakete();
  eintraege.sort((a, b) => a.paket.fach.localeCompare(b.paket.fach, 'de') || a.paket.titel.localeCompare(b.paket.titel, 'de'));
  const heute = heutigesDatum();

  leeren(liste).append(el('h2', { id: 'meine-pakete-titel', text: 'Meine Pakete' }));
  if (eintraege.length === 0) {
    liste.append(
      el('p', { class: 'leer', text: 'Noch keine Pakete gespeichert. Starte mit einem Paket von dieser Website oder öffne unten eine eigene Lernpaket-Datei.' }),
    );
    return;
  }

  const ul = el('ul', { class: 'paket-liste' });
  for (const { paket } of eintraege) {
    const fortschritt = await ladeFortschritt(paket.id);
    const prozent = paketBeherrschung(paket, fortschritt);
    const faellig = faelligeKarten(paket.karten, fortschritt.karten, heute).length;
    ul.append(
      el(
        'li',
        { class: 'paket-eintrag' },
        el(
          'a',
          { class: 'paket-link', href: baueRoute('paket', paket.id) },
          el('span', { class: 'paket-fach', text: `${paket.fach}, ${paket.schultyp} ${paket.schulstufe}. Stufe` }),
          el('span', { class: 'paket-titel', text: paket.titel }),
          el('span', { class: 'paket-faellig', text: faellig === 1 ? 'Heute fällig: 1 Karte' : `Heute fällig: ${faellig} Karten` }),
        ),
        fortschrittsBalken(prozent, `${prozent} % beherrscht`),
        el('button', {
          type: 'button',
          class: 'knopf leise',
          text: 'Löschen',
          'aria-label': `„${paket.titel}“ löschen`,
          on: { click: () => loeschenFragen(paket, liste) },
        }),
      ),
    );
  }
  liste.append(ul);
}

export function fortschrittsBalken(prozent, beschriftung) {
  const balken = el('span', { class: 'balken-fuellung' });
  balken.style.setProperty('width', `${prozent}%`);
  return el(
    'span',
    { class: 'fortschritt' },
    el('span', {
      class: 'balken',
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': String(prozent),
      'aria-label': beschriftung,
    }, balken),
    el('span', { class: 'klein', text: beschriftung }),
  );
}

async function loeschenFragen(paket, liste) {
  const ja = await frageDialog({
    titel: 'Paket löschen?',
    text: [
      `„${paket.titel}“ und dein ganzer Fortschritt dazu werden von diesem Gerät gelöscht.`,
      'Das lässt sich nicht rückgängig machen. Die Paket-Datei selbst bleibt, wo sie ist.',
    ],
    knoepfe: [
      { text: 'Abbrechen', wert: false },
      { text: 'Löschen', wert: true, art: 'gefahr' },
    ],
  });
  if (!ja) return;
  await loeschePaket(paket.id);
  ansage(`„${paket.titel}“ gelöscht.`);
  await listeZeigen(liste);
  liste.querySelector('h2')?.setAttribute('tabindex', '-1');
  liste.querySelector('h2')?.focus();
}

/** „Auf dieser Website“: Pakete aus pakete/liste.json – der Mittelpunkt der Startseite. */
async function angebotZeigen(abschnitt) {
  let eintraege = [];
  try {
    const antwort = await fetch('pakete/liste.json', { credentials: 'same-origin' });
    if (antwort.ok) eintraege = leseInhaltsliste(await antwort.json());
  } catch {
    /* offline oder keine Liste – dann gibt es den Abschnitt eben nicht */
  }
  if (eintraege.length === 0) return;

  const gespeichert = new Set((await allePakete()).map((e) => e.paket.id));
  leeren(abschnitt).append(
    el('h2', { id: 'angebot-titel', text: 'Auf dieser Website' }),
    el(
      'ul',
      { class: 'angebot-liste' },
      eintraege.map((e) => {
        const da = gespeichert.has(e.id);
        return el(
          'li',
          { class: 'angebot-karte' },
          e.fach ? el('p', { class: 'paket-fach', text: e.fach }) : '',
          el('h3', { class: 'angebot-titel', text: e.titel }),
          e.beschreibung ? el('p', { class: 'angebot-text', text: e.beschreibung }) : '',
          el('a', {
            class: 'knopf haupt',
            href: da ? baueRoute('paket', e.id) : `#/oeffnen/${e.datei}`,
            text: da ? 'Weiterlernen' : 'Jetzt lernen',
          }),
        );
      }),
    ),
  );
  abschnitt.hidden = false;
}
