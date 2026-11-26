// Fehlerheft: alle jemals falsch beantworteten Fragen, nach Unterthema gruppiert.

import { el } from './dom.js';
import { loesungAlsText } from '../logic/grading.js';
import { standVon } from '../logic/adaptive.js';
import { heutigesDatum } from '../logic/leitner.js';
import { datumLesbar } from '../logic/text.js';
import { baueRoute } from '../logic/route.js';
import { ladeFortschritt } from '../store/db.js';

export async function zeige(wurzel, route, paket) {
  const fortschritt = await ladeFortschritt(paket.id);
  const heft = fortschritt.fehlerheft ?? {};
  const heute = heutigesDatum();
  const quellen = new Map(paket.quellen.map((q) => [q.id, q.name]));

  const eintraege = paket.fragen
    .filter((f) => heft[f.id])
    .map((f) => ({ frage: f, eintrag: heft[f.id], gemeistert: standVon(fortschritt.uebungsstand, f.id).gemeistert }));

  // „offen“ = kann im Übungsmodus noch geübt werden
  const istOffen = (e) => !e.frage.nurTest && !e.gemeistert;
  const offenGesamt = eintraege.filter(istOffen).length;

  wurzel.append(el('h1', { text: 'Fehlerheft' }));

  if (eintraege.length === 0) {
    wurzel.append(
      el('p', { class: 'leer', text: 'Noch keine Fehler. Fragen, die du beim Üben falsch beantwortest, landen automatisch hier.' }),
      el('p', {}, el('a', { class: 'knopf haupt', href: baueRoute('ueben', paket.id), text: 'Üben' })),
    );
    return;
  }

  wurzel.append(
    el('p', {
      text: `${eintraege.length} ${eintraege.length === 1 ? 'Frage' : 'Fragen'} hast du schon einmal falsch beantwortet, ${offenGesamt} davon ${offenGesamt === 1 ? 'ist' : 'sind'} noch nicht gemeistert.`,
    }),
    uebenKnopf(paket.id, null, offenGesamt, 'Alle offenen Fehler üben'),
  );

  for (const u of paket.unterthemen) {
    const gruppe = eintraege
      .filter((e) => e.frage.unterthema === u.id)
      .sort((a, b) => b.eintrag.anzahl - a.eintrag.anzahl);
    if (gruppe.length === 0) continue;
    const offen = gruppe.filter(istOffen).length;

    wurzel.append(
      el(
        'section',
        { class: 'fehler-gruppe', 'aria-labelledby': `fg-${u.id}` },
        el('h2', { id: `fg-${u.id}`, text: u.name }),
        uebenKnopf(paket.id, u.id, offen, 'Diese Fragen üben'),
        el(
          'ul',
          { class: 'fehler-liste' },
          gruppe.map((e) => eintragElement(e, heute, quellen)),
        ),
      ),
    );
  }
}

function uebenKnopf(paketId, unterthema, offen, text) {
  if (offen === 0) {
    return el(
      'span',
      { class: 'kommt-bald' },
      el('button', { type: 'button', class: 'knopf', disabled: true, text }),
      el('small', { text: 'alle inzwischen gemeistert' }),
    );
  }
  return el('a', { class: 'knopf haupt', href: baueRoute('ueben', paketId, unterthema, { nur: 'fehler' }), text: `${text} (${offen})` });
}

function eintragElement({ frage, eintrag, gemeistert }, heute, quellen) {
  const wann = typeof eintrag.zuletzt === 'number' ? datumLesbar(heutigesDatum(new Date(eintrag.zuletzt)), heute) : null;
  const quelle = frage.quelle ? quellen.get(frage.quelle.id) : null;
  return el(
    'li',
    { class: 'fehler-eintrag' },
    el(
      'details',
      {},
      el(
        'summary',
        {},
        el('span', { class: 'fehler-frage', text: frage.frage }),
        el(
          'span',
          { class: 'fehler-meta' },
          `${eintrag.anzahl}× falsch${wann ? `, zuletzt ${wann === 'heute' || wann === 'morgen' ? wann : `am ${wann}`}` : ''}`,
          gemeistert ? el('span', { class: 'abzeichen gut', text: 'inzwischen gemeistert' }) : '',
          frage.nurTest ? el('span', { class: 'abzeichen', text: 'nur im Test' }) : '',
        ),
      ),
      el('p', { class: 'loesung-titel', text: 'Richtige Lösung' }),
      el('ul', { class: 'loesung' }, loesungAlsText(frage).map((z) => el('li', { text: z }))),
      el('p', { class: 'erklaerung', text: frage.erklaerung }),
      quelle ? el('p', { class: 'quelle', text: `Quelle: ${quelle}${frage.quelle.stelle ? `, ${frage.quelle.stelle}` : ''}` }) : '',
    ),
  );
}
