// Eingabe-Bausteine für alle Fragetypen – Tastatur und Touch, ohne Drag & Drop.
// Jeder Baustein liefert: { element, antwort(), beantwortet(), sperren(), zeigeAuswertung(ergebnis), fokus() }

import { el, leeren, ansage } from './dom.js';
import { lueckenTeile } from '../logic/text.js';
import { punkteVorschlag, punkteAendern } from '../logic/freitext.js';

let zaehler = 0;
const neueId = (name) => `${name}-${++zaehler}`;

/** Fisher-Yates mit Math.random (Anzeige-Reihenfolge, keine Bewertung). */
function gemischt(liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TYP_HINWEIS = {
  mc: 'Eine Antwort ist richtig.',
  mehrfach: 'Mehrere Antworten sind richtig.',
  wahrfalsch: 'Stimmt die Aussage?',
  lueckentext: 'Fülle die Lücken aus.',
  zuordnen: 'Ordne jedem Begriff das Passende zu.',
  reihenfolge: 'Bring die Schritte mit den Pfeil-Knöpfen in die richtige Reihenfolge.',
  zahl: 'Gib eine Zahl ein (Komma oder Punkt).',
  freitext: 'Antworte in eigenen Worten.',
};

export function typHinweis(frage) {
  return TYP_HINWEIS[frage.typ] ?? '';
}

export function frageEingabe(frage) {
  switch (frage.typ) {
    case 'mc':
      return auswahl(frage, frage.optionen.map((text, i) => ({ text, wert: i })), false);
    case 'mehrfach':
      return auswahl(frage, frage.optionen.map((text, i) => ({ text, wert: i })), true);
    case 'wahrfalsch':
      return auswahl(frage, [{ text: 'Richtig', wert: true }, { text: 'Falsch', wert: false }], false, false);
    case 'lueckentext':
      return lueckentext(frage);
    case 'zuordnen':
      return zuordnen(frage);
    case 'reihenfolge':
      return reihenfolge(frage);
    case 'zahl':
      return zahl(frage);
    case 'freitext':
      return freitext(frage);
    default:
      throw new Error(`Unbekannter Fragetyp ${frage.typ}`);
  }
}

// ---------- mc, mehrfach, wahrfalsch ----------

function auswahl(frage, optionen, mehrere, mischen = true) {
  const name = neueId('opt');
  const reihe = mischen ? gemischt(optionen) : optionen;
  const felder = reihe.map((o) => {
    const input = el('input', { type: mehrere ? 'checkbox' : 'radio', name });
    return { o, input, label: el('label', { class: 'option' }, input, el('span', { text: o.text })) };
  });
  const element = el(
    'fieldset',
    { class: 'optionen' },
    el('legend', { class: 'nur-sr', text: 'Antwort' }),
    felder.map((f) => f.label),
  );

  const richtigeWerte = () =>
    frage.typ === 'wahrfalsch' ? [frage.richtig] : frage.richtig;

  return {
    element,
    antwort: () => {
      const gewaehlt = felder.filter((f) => f.input.checked).map((f) => f.o.wert);
      return mehrere ? gewaehlt : (gewaehlt[0] ?? null);
    },
    beantwortet: () => felder.some((f) => f.input.checked),
    sperren: () => felder.forEach((f) => (f.input.disabled = true)),
    zeigeAuswertung: () => {
      const richtig = new Set(richtigeWerte());
      for (const f of felder) {
        if (richtig.has(f.o.wert)) f.label.classList.add('ist-richtig');
        else if (f.input.checked) f.label.classList.add('ist-falsch');
      }
    },
    fokus: () => felder[0]?.input.focus(),
  };
}

// ---------- Lückentext ----------

function lueckentext(frage) {
  const eingaben = frage.luecken.map((erlaubt, i) =>
    el('input', {
      type: 'text',
      class: 'luecke',
      'aria-label': `Lücke ${i + 1}`,
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      size: String(Math.min(Math.max(...erlaubt.map((e) => e.length), 6) + 2, 24)),
    }),
  );
  const element = el(
    'p',
    { class: 'lueckentext' },
    lueckenTeile(frage.text).map((t) => ('luecke' in t ? eingaben[t.luecke] : t.text)),
  );
  return {
    element,
    antwort: () => eingaben.map((e) => e.value),
    beantwortet: () => eingaben.some((e) => e.value.trim() !== ''),
    sperren: () => eingaben.forEach((e) => (e.readOnly = true)),
    zeigeAuswertung: (ergebnis) =>
      eingaben.forEach((e, i) => e.classList.add(ergebnis.teile?.[i] ? 'ist-richtig' : 'ist-falsch')),
    fokus: () => eingaben[0]?.focus(),
  };
}

// ---------- Zuordnen (Auswahllisten statt Ziehen) ----------

function zuordnen(frage) {
  const rechts = gemischt(frage.paare.map((p) => p.rechts));
  const zeilen = frage.paare.map((p) => {
    const id = neueId('zuord');
    const select = el(
      'select',
      { id },
      el('option', { value: '', text: '– bitte wählen –' }),
      rechts.map((r) => el('option', { value: r, text: r })),
    );
    return { select, zeile: el('div', { class: 'zuordnen-zeile' }, el('label', { for: id, text: p.links }), select) };
  });
  return {
    element: el('div', { class: 'zuordnen' }, zeilen.map((z) => z.zeile)),
    antwort: () => zeilen.map((z) => z.select.value),
    beantwortet: () => zeilen.some((z) => z.select.value !== ''),
    sperren: () => zeilen.forEach((z) => (z.select.disabled = true)),
    zeigeAuswertung: (ergebnis) =>
      zeilen.forEach((z, i) => z.zeile.classList.add(ergebnis.teile?.[i] ? 'ist-richtig' : 'ist-falsch')),
    fokus: () => zeilen[0]?.select.focus(),
  };
}

// ---------- Reihenfolge (Pfeil-Knöpfe) ----------

function reihenfolge(frage) {
  let reihe = gemischt(frage.schritte);
  // Nicht schon richtig anfangen lassen.
  for (let i = 0; i < 10 && reihe.every((s, j) => s === frage.schritte[j]); i++) reihe = gemischt(frage.schritte);
  let gesperrt = false;
  const liste = el('ol', { class: 'reihenfolge' });

  function zeichnen(fokusText, richtung) {
    leeren(liste).append(
      ...reihe.map((schritt, i) =>
        el(
          'li',
          { class: 'schritt' },
          el('span', { class: 'schritt-text', text: schritt }),
          el(
            'span',
            { class: 'schritt-knoepfe' },
            el('button', {
              type: 'button',
              class: 'knopf klein-knopf',
              'data-richtung': 'hoch',
              'aria-label': `„${schritt}“ nach oben`,
              disabled: gesperrt || i === 0,
              text: '↑',
              on: { click: () => verschieben(i, -1) },
            }),
            el('button', {
              type: 'button',
              class: 'knopf klein-knopf',
              'data-richtung': 'runter',
              'aria-label': `„${schritt}“ nach unten`,
              disabled: gesperrt || i === reihe.length - 1,
              text: '↓',
              on: { click: () => verschieben(i, 1) },
            }),
          ),
        ),
      ),
    );
    if (fokusText !== undefined) {
      const index = reihe.indexOf(fokusText);
      const knoepfe = liste.children[index]?.querySelectorAll('button');
      const zeilenKnoepfe = [...(knoepfe ?? [])];
      const ziel = zeilenKnoepfe.find((k) => k.dataset.richtung === richtung && !k.disabled) ?? zeilenKnoepfe.find((k) => !k.disabled);
      ziel?.focus();
    }
  }

  function verschieben(i, d) {
    const j = i + d;
    if (j < 0 || j >= reihe.length) return;
    const schritt = reihe[i];
    [reihe[i], reihe[j]] = [reihe[j], reihe[i]];
    zeichnen(schritt, d < 0 ? 'hoch' : 'runter');
    ansage(`„${schritt}“ ist jetzt an Stelle ${j + 1}.`);
  }

  zeichnen();
  return {
    element: liste,
    antwort: () => [...reihe],
    beantwortet: () => true,
    sperren: () => {
      gesperrt = true;
      zeichnen();
    },
    zeigeAuswertung: () =>
      [...liste.children].forEach((li, i) =>
        li.classList.add(reihe[i] === frage.schritte[i] ? 'ist-richtig' : 'ist-falsch'),
      ),
    fokus: () => liste.querySelector('button:not([disabled])')?.focus(),
  };
}

// ---------- Zahl ----------

function zahl(frage) {
  const id = neueId('zahl');
  const input = el('input', { type: 'text', id, inputmode: 'decimal', autocomplete: 'off', class: 'zahl-eingabe' });
  return {
    element: el(
      'div',
      { class: 'zahl-feld' },
      el('label', { for: id, class: 'nur-sr', text: 'Deine Zahl' }),
      input,
      frage.einheit ? el('span', { class: 'einheit', text: frage.einheit }) : '',
    ),
    antwort: () => input.value,
    beantwortet: () => input.value.trim() !== '',
    sperren: () => (input.readOnly = true),
    zeigeAuswertung: (ergebnis) => input.classList.add(ergebnis.richtig ? 'ist-richtig' : 'ist-falsch'),
    fokus: () => input.focus(),
  };
}

// ---------- Freitext ----------

function freitext() {
  const id = neueId('frei');
  const feld = el('textarea', { id, rows: '5', class: 'freitext-feld' });
  return {
    element: el('div', {}, el('label', { for: id, class: 'nur-sr', text: 'Deine Antwort' }), feld),
    antwort: () => feld.value,
    beantwortet: () => feld.value.trim() !== '',
    sperren: () => (feld.readOnly = true),
    zeigeAuswertung: () => {},
    fokus: () => feld.focus(),
  };
}

function punkteText(p) {
  const ganz = Math.floor(p);
  const halb = p - ganz >= 0.5;
  if (ganz === 0 && halb) return '½';
  return `${ganz}${halb ? '½' : ''}`;
}

export { punkteText };

/**
 * Freitext-Bewertung: Vorschlag aus Bewertungspunkten, Musterlösung, dann „passt“ / ½ weniger / ½ mehr.
 * Ruft bestaetigt(punkte) auf.
 */
export function freitextBewertung(frage, antwortText, bestaetigt) {
  const vorschlag = punkteVorschlag(frage, antwortText);
  let punkte = vorschlag.punkte;
  const anzeige = el('strong', { class: 'punkte-zahl' });
  const zeigen = () => {
    anzeige.textContent = `${punkteText(punkte)} von ${frage.maxPunkte} ${frage.maxPunkte === 1 ? 'Punkt' : 'Punkten'}`;
    weniger.disabled = punkte <= 0;
    mehr.disabled = punkte >= frage.maxPunkte;
  };
  const weniger = el('button', {
    type: 'button',
    class: 'knopf',
    text: '½ Punkt weniger',
    on: { click: () => { punkte = punkteAendern(punkte, -0.5, frage.maxPunkte); zeigen(); ansage(anzeige.textContent); } },
  });
  const mehr = el('button', {
    type: 'button',
    class: 'knopf',
    text: '½ Punkt mehr',
    on: { click: () => { punkte = punkteAendern(punkte, 0.5, frage.maxPunkte); zeigen(); ansage(anzeige.textContent); } },
  });
  const passt = el('button', {
    type: 'button',
    class: 'knopf haupt',
    text: 'Passt',
    on: {
      click: () => {
        element.querySelectorAll('button').forEach((b) => (b.disabled = true));
        bestaetigt(punkte);
      },
    },
  });

  const element = el(
    'section',
    { class: 'freitext-bewertung', 'aria-labelledby': 'fb-titel' },
    el('h2', { id: 'fb-titel', text: 'Selbst bewerten' }),
    el('p', { class: 'klein', text: 'Vergleiche deine Antwort mit der Musterlösung. Die App schlägt Punkte vor – du entscheidest.' }),
    el('p', { class: 'loesung-titel', text: 'Musterlösung' }),
    el('p', { class: 'musterloesung', text: frage.musterloesung }),
    el('p', { class: 'loesung-titel', text: 'Bewertungspunkte' }),
    el(
      'ul',
      { class: 'bewertungspunkte' },
      frage.bewertungspunkte.map((bp, i) =>
        el(
          'li',
          { class: vorschlag.erfuellt[i] ? 'erkannt' : 'nicht-erkannt' },
          el('span', { class: 'marke-symbol', 'aria-hidden': 'true', text: vorschlag.erfuellt[i] ? '✓' : '–' }),
          el('span', { class: 'nur-sr', text: vorschlag.erfuellt[i] ? 'In deiner Antwort erkannt: ' : 'Nicht erkannt: ' }),
          bp.text,
        ),
      ),
    ),
    el('p', {}, 'Vorschlag: ', anzeige),
    el('div', { class: 'aktionen' }, weniger, passt, mehr),
  );
  zeigen();
  return { element, fokus: () => passt.focus() };
}
