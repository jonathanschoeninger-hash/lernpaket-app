// Notenschlüssel wählen oder eingeben – für Einstellungen (Voreinstellung) und pro Paket.

import { el, leeren, ansage } from './dom.js';
import {
  VORLAGEN,
  MATURA_BEISPIEL,
  NOTEN,
  pruefeSchluessel,
  schluesselName,
  schluesselGrenzen,
  leseZahl,
} from '../logic/grading.js';

const STANDARD = { art: 'standard' };

/** Gilt für ein Paket: eigener Paket-Schlüssel, sonst Voreinstellung, sonst Standard. */
export function aktiverSchluessel(fortschritt, einstellungen) {
  for (const s of [fortschritt?.notenschluessel, einstellungen?.notenschluessel]) {
    if (s && pruefeSchluessel(s).length === 0) return s;
  }
  return STANDARD;
}

const zahlFeld = (beschriftung, wert, einheit) => {
  const input = el('input', {
    type: 'text',
    inputmode: 'decimal',
    class: 'grenze-eingabe',
    value: wert === undefined || wert === null ? '' : String(wert).replace('.', ','),
  });
  return {
    input,
    element: el('label', { class: 'grenze' }, el('span', { text: beschriftung }), el('span', { class: 'grenze-feld' }, input, einheit)),
  };
};

/**
 * Editor: { wert, voreinstellung (nur pro Paket: Schlüssel der Voreinstellung), speichern(schluessel|null) }
 * speichern(null) = „wie Voreinstellung“.
 */
export function schluesselEditor({ wert, voreinstellung = undefined, speichern }) {
  const proPaket = voreinstellung !== undefined;
  const name = `schluessel-${Math.random().toString(36).slice(2)}`;
  const start = wert?.art ?? (proPaket ? 'vor' : 'standard');

  const eigen = wert?.art === 'eigen' ? wert.grenzen : VORLAGEN.standard.grenzen;
  const eigenFelder = NOTEN.slice(0, 4).map((n, i) => zahlFeld(`${n} ab`, eigen[i], '%'));

  const matura = wert?.art === 'matura' ? wert : MATURA_BEISPIEL;
  const hoechst = zahlFeld('Höchstpunkte', matura.hoechstpunkte, 'Punkte');
  const maturaFelder = NOTEN.slice(0, 4).map((n, i) => zahlFeld(`${n} ab`, matura.punkte[i], 'Punkte'));

  const fehlerBox = el('div', { class: 'meldung fehler', role: 'alert', hidden: true });
  const vorschau = el('p', { class: 'klein schluessel-vorschau' });

  const optionen = [
    proPaket ? { art: 'vor', text: `Wie Voreinstellung: ${schluesselName(voreinstellung)}` } : null,
    { art: 'standard', text: `${VORLAGEN.standard.name} – ${VORLAGEN.standard.grenzen.join('/')} %` },
    { art: 'mathe', text: `${VORLAGEN.mathe.name} – ${VORLAGEN.mathe.grenzen.join('/')} %` },
    { art: 'matura', text: 'Matura (SRDP) – Punktegrenzen eines Prüfungstermins', zusatz: el('div', { class: 'grenzen' }, hoechst.element, maturaFelder.map((f) => f.element)) },
    { art: 'eigen', text: 'Eigener Schlüssel – z. B. der deiner Lehrkraft', zusatz: el('div', { class: 'grenzen' }, eigenFelder.map((f) => f.element)) },
  ].filter(Boolean);

  const radios = optionen.map((o) => {
    const input = el('input', { type: 'radio', name, value: o.art, checked: o.art === start });
    return { o, input };
  });

  function gewaehlt() {
    return radios.find((r) => r.input.checked)?.o.art ?? 'standard';
  }

  function lesen() {
    const art = gewaehlt();
    if (art === 'vor') return null;
    if (art === 'eigen') return { art, grenzen: eigenFelder.map((f) => leseZahl(f.input.value)) };
    if (art === 'matura') {
      return { art, hoechstpunkte: leseZahl(hoechst.input.value), punkte: maturaFelder.map((f) => leseZahl(f.input.value)) };
    }
    return { art };
  }

  function aktualisieren() {
    for (const r of radios) {
      if (r.o.zusatz) r.o.zusatz.hidden = !r.input.checked;
    }
    const s = lesen();
    const geprueft = s === null ? voreinstellung : s;
    const fehler = pruefeSchluessel(geprueft);
    if (fehler.length === 0) {
      const g = schluesselGrenzen(geprueft);
      vorschau.textContent = `Ergibt: ${NOTEN.slice(0, 4).map((n, i) => `${n} ab ${String(Math.round(g[i] * 10) / 10).replace('.', ',')} %`).join(', ')}.`;
    } else {
      vorschau.textContent = '';
    }
  }

  const formular = el(
    'form',
    {
      class: 'schluessel-editor',
      on: {
        input: aktualisieren,
        change: aktualisieren,
        submit: async (e) => {
          e.preventDefault();
          const s = lesen();
          const fehler = s === null ? [] : pruefeSchluessel(s);
          if (fehler.length > 0) {
            leeren(fehlerBox).append(el('p', { text: fehler[0] }));
            fehlerBox.hidden = false;
            fehlerBox.focus?.();
            return;
          }
          fehlerBox.hidden = true;
          await speichern(s);
          ansage('Notenschlüssel gespeichert.');
        },
      },
    },
    el(
      'fieldset',
      { class: 'schluessel-wahl' },
      el('legend', { text: 'Notenschlüssel' }),
      radios.map(({ o, input }) =>
        el('div', { class: 'schluessel-option' }, el('label', { class: 'option' }, input, el('span', { text: o.text })), o.zusatz ?? ''),
      ),
    ),
    vorschau,
    fehlerBox,
    el('button', { type: 'submit', class: 'knopf haupt', text: 'Notenschlüssel speichern' }),
  );
  aktualisieren();
  return formular;
}
