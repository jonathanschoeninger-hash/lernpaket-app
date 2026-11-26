// Folien-Layouts (DESIGN.md 4.1) als DOM-Bausteine. Paketinhalt nur als Text – nie als HTML.
// zeichneFolie(folie) → { element, teile: [Elemente, die nacheinander erscheinen], quiz? }

import { el } from '../ui/dom.js';

const aufdecken = (element) => {
  element.classList.add('aufdecken');
  return element;
};

export function zeichneFolie(folie) {
  const teile = [];
  const merke = (e) => {
    teile.push(aufdecken(e));
    return e;
  };
  let inhalt;
  let quiz = null;

  switch (folie.layout) {
    case 'titel':
      inhalt = [
        el('h2', { class: 'folie-titel-gross', text: folie.titel }),
        folie.untertitel ? el('p', { class: 'folie-untertitel', text: folie.untertitel }) : '',
      ];
      break;

    case 'stichpunkte':
      inhalt = [
        el('h2', { class: 'folie-ueberschrift', text: folie.titel }),
        el('ul', { class: 'folie-punkte' }, folie.punkte.map((p) => merke(el('li', { text: p })))),
      ];
      break;

    case 'begriff':
      inhalt = [
        el('p', { class: 'folie-begriff', text: folie.begriff }),
        merke(el('p', { class: 'folie-definition', text: folie.definition })),
      ];
      break;

    case 'ablauf':
      inhalt = [
        el('h2', { class: 'folie-ueberschrift', text: folie.titel }),
        el(
          'ol',
          { class: `folie-ablauf schritte-${folie.schritte.length}` },
          folie.schritte.map((s, i) =>
            merke(el('li', {}, el('span', { class: 'ablauf-nr', 'aria-hidden': 'true', text: String(i + 1) }), el('span', { text: s }))),
          ),
        ),
      ];
      break;

    case 'vergleich': {
      const spalte = (seite) =>
        merke(
          el(
            'div',
            { class: 'vergleich-spalte' },
            el('h3', { text: seite.ueberschrift }),
            el('ul', {}, seite.punkte.map((p) => el('li', { text: p }))),
          ),
        );
      inhalt = [
        el('h2', { class: 'folie-ueberschrift', text: folie.titel }),
        el('div', { class: 'folie-vergleich' }, spalte(folie.links), spalte(folie.rechts)),
      ];
      break;
    }

    case 'formel':
      inhalt = [
        el('p', { class: 'folie-formel', text: folie.formel }),
        el(
          'ul',
          { class: 'folie-teile' },
          folie.teile.map((t) => merke(el('li', {}, el('strong', { text: t.zeichen }), el('span', { text: t.bedeutung })))),
        ),
      ];
      break;

    case 'zahl':
      inhalt = [
        el('p', { class: 'folie-zahl' }, el('span', { text: folie.zahl }), folie.einheit ? el('span', { class: 'folie-einheit', text: folie.einheit }) : ''),
        el('p', { class: 'folie-bedeutung', text: folie.bedeutung }),
      ];
      break;

    case 'merke':
      inhalt = [el('div', { class: 'folie-merke' }, el('p', { class: 'folie-merke-titel', text: 'Merke' }), el('p', { text: folie.text }))];
      break;

    case 'quiz': {
      const knoepfe = folie.optionen.map((o, i) =>
        el('button', { type: 'button', class: 'quiz-option', disabled: true, 'data-index': String(i), text: o }),
      );
      const rueck = el('p', { class: 'quiz-rueckmeldung', 'aria-live': 'polite' });
      inhalt = [
        el('p', { class: 'folie-quiz-marke', text: 'Kurze Frage' }),
        el('h2', { class: 'folie-frage', text: folie.frage }),
        el('div', { class: 'quiz-optionen' }, knoepfe),
        rueck,
      ];
      quiz = {
        /** Antworten erlauben; ruft gewaehlt(index) beim Klick auf. */
        freigeben(gewaehlt) {
          for (const k of knoepfe) {
            k.disabled = false;
            k.onclick = () => gewaehlt(Number(k.dataset.index));
          }
          knoepfe[0]?.focus({ preventScroll: true });
        },
        zeigeLoesung(gewaehlt) {
          knoepfe.forEach((k, i) => {
            k.disabled = true;
            k.onclick = null;
            if (i === folie.richtig) k.classList.add('ist-richtig');
            else if (i === gewaehlt) k.classList.add('ist-falsch');
          });
          const loesung = folie.optionen[folie.richtig];
          rueck.textContent =
            gewaehlt === null ? `Lösung: ${loesung}` : gewaehlt === folie.richtig ? 'Richtig!' : `Leider nicht – richtig ist: ${loesung}`;
        },
      };
      break;
    }

    default:
      inhalt = [el('p', { text: 'Diese Folie kann nicht angezeigt werden.' })];
  }

  return { element: el('div', { class: `folie layout-${folie.layout}` }, inhalt), teile, quiz };
}
