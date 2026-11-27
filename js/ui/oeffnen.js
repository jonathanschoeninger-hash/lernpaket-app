// Paket per Link: #/oeffnen/pakete/<datei>.lernpaket.json (DESIGN.md 10, Punkt 24).
// Nur Dateien von derselben Adresse wie die App, nur aus pakete/ oder beispiele/.

import { el } from './dom.js';
import { paketTextImportieren } from './start.js';
import { erlaubterPaketPfad } from '../logic/route.js';
import { MAX_DATEI_BYTES } from '../logic/validate.js';

export async function zeige(wurzel, route) {
  const pfad = route.pfad ?? '';
  const status = el('p', { role: 'status', text: 'Paket wird geladen …' });
  const ergebnis = el('div', { class: 'meldungen' });
  wurzel.append(el('h1', { text: 'Paket öffnen' }), status, ergebnis);

  const ablehnen = (text) => {
    status.textContent = '';
    ergebnis.append(
      el('div', { class: 'meldung fehler', role: 'alert' }, el('p', { class: 'meldung-titel', text: 'Dieser Link kann nicht geöffnet werden.' }), el('p', { text })),
      el('p', {}, el('a', { class: 'knopf', href: '#/start', text: 'Zur Startseite' })),
    );
  };

  if (!erlaubterPaketPfad(pfad)) {
    return ablehnen(
      'Per Link öffnet die App nur Pakete aus den Ordnern „pakete/“ oder „beispiele/“ derselben Seite, z. B. #/oeffnen/pakete/zellatmung.lernpaket.json. Andere Adressen werden aus Sicherheitsgründen abgelehnt.',
    );
  }

  // Doppelt absichern: Die fertige Adresse muss zur selben Seite gehören wie die App.
  const adresse = new URL(pfad, location.href);
  if (adresse.origin !== location.origin) return ablehnen('Die Adresse gehört nicht zu dieser Seite.');

  let text;
  try {
    const antwort = await fetch(adresse, { credentials: 'same-origin', redirect: 'error' });
    if (!antwort.ok) {
      return ablehnen(antwort.status === 404 ? `Die Datei „${pfad}“ gibt es nicht.` : `Die Datei konnte nicht geladen werden (Fehler ${antwort.status}).`);
    }
    const groesse = Number(antwort.headers.get('content-length'));
    if (groesse > MAX_DATEI_BYTES) return ablehnen('Die Datei ist größer als 5 MB.');
    text = await antwort.text();
  } catch {
    return ablehnen('Die Datei konnte nicht geladen werden. Bist du offline? Dann geht es nur mit Paketen, die schon einmal geladen wurden.');
  }

  status.textContent = '';
  const dateiname = pfad.split('/').pop();
  const meldung = await paketTextImportieren(text, dateiname);
  // Geklappt und keine Hinweise → gleich ins Paket, ein Klick weniger.
  const zumPaket = meldung.classList?.contains('erfolg') && !meldung.querySelector('.hinweise') ? meldung.querySelector('a[href^="#/paket/"]') : null;
  if (zumPaket) {
    location.replace(zumPaket.getAttribute('href'));
    return;
  }
  ergebnis.append(meldung);
  ergebnis.append(el('p', {}, el('a', { class: 'knopf', href: '#/start', text: 'Zu meinen Paketen' })));
}
