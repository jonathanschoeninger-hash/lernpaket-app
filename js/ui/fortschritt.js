// Fortschritt „Was kann ich?“ (DESIGN.md 7): Ampel pro Unterthema, Empfehlung, Notenverlauf.

import { el, leeren } from './dom.js';
import { aktiverSchluessel, schluesselEditor } from './notenschluessel.js';
import { alleBeherrschungen } from '../logic/mastery.js';
import { schluesselGrenzen, schluesselName, prozentText, NOTEN } from '../logic/grading.js';
import { heutigesDatum } from '../logic/leitner.js';
import { datumLesbar } from '../logic/text.js';
import { baueRoute } from '../logic/route.js';
import { ladeFortschritt, speichereFortschritt, ladeEinstellungen } from '../store/db.js';

const SVG = 'http://www.w3.org/2000/svg';

const FARBE_TEXT = {
  gruen: 'sitzt',
  gelb: 'positiv, aber wackelig',
  rot: 'negativ',
  grau: 'noch keine Daten',
};

export async function zeige(wurzel, route, paket) {
  let fortschritt = await ladeFortschritt(paket.id);
  const einstellungen = await ladeEinstellungen();

  function zeichnen() {
    const schluessel = aktiverSchluessel(fortschritt, einstellungen);
    const grenzen = schluesselGrenzen(schluessel);
    const alle = alleBeherrschungen(paket, fortschritt, grenzen);
    const rot = alle.filter((b) => b.farbe === 'rot');

    leeren(wurzel).append(
      el('h1', { text: 'Fortschritt' }),
      el('p', { class: 'klein', text: `Grün ab ${prozentText(grenzen[1])} (Gut), gelb ab ${prozentText(grenzen[3])} (Genügend) – nach ${schluesselName(schluessel)}.` }),
      el(
        'div',
        { class: 'aktionen' },
        rot.length
          ? el('a', { class: 'knopf haupt', href: baueRoute('ueben', paket.id, null, { nur: 'schwaechen' }), text: `Nur meine Schwächen üben (${rot.length})` })
          : el(
              'span',
              { class: 'kommt-bald' },
              el('button', { type: 'button', class: 'knopf', disabled: true, text: 'Nur meine Schwächen üben' }),
              el('small', { text: 'gerade ist kein Unterthema rot' }),
            ),
        el('a', { class: 'knopf', href: baueRoute('test', paket.id), text: 'Test machen' }),
      ),
      el('ul', { class: 'beherrschung-liste' }, alle.map((b) => unterthemaZeile(paket, b))),
      notenverlauf(fortschritt.tests),
      el(
        'details',
        { class: 'schluessel-details' },
        el('summary', { text: 'Notenschlüssel für dieses Paket ändern' }),
        schluesselEditor({
          wert: fortschritt.notenschluessel,
          voreinstellung: aktiverSchluessel(null, einstellungen),
          speichern: async (s) => {
            fortschritt = { ...fortschritt, notenschluessel: s };
            await speichereFortschritt(fortschritt);
            zeichnen();
          },
        }),
      ),
    );
  }

  zeichnen();
}

function unterthemaZeile(paket, b) {
  const u = b.unterthema;
  const wert = b.wert;
  const fuellung = el('span', { class: 'balken-fuellung' });
  fuellung.style.setProperty('width', `${wert ?? 0}%`);

  const teile = [
    b.test !== null ? `letzter Test ${prozentText(b.test)}` : null,
    b.uebung !== null ? `Übung ${prozentText(b.uebung)}` : null,
    b.karten !== null ? `Karten ${prozentText(b.karten)}` : null,
  ].filter(Boolean);

  const link = (seite, text) => el('a', { href: baueRoute(seite, paket.id, u.id), text });
  const video = paket.videos.find((v) => v.unterthema === u.id);
  const videoLink = video ? el('a', { href: baueRoute('videos', paket.id, video.id), text: 'Video ansehen' }) : null;
  const empfehlung = {
    gruen: ['Nur wiederholen: ', link('karten', 'Karten')],
    gelb: ['Empfehlung: ', link('zusammenfassung', 'Zusammenfassung lesen'), ', dann ', link('ueben', 'gezielt üben'), '.'],
    rot: [
      'Empfehlung: ',
      videoLink ?? 'Video',
      ' → ',
      link('zusammenfassung', 'Zusammenfassung'),
      ' → ',
      link('karten', 'Karten'),
      ' → ',
      link('ueben', 'Übungsrunde nur zu diesem Unterthema'),
      '.',
    ],
    grau: ['Noch nichts geübt. ', link('ueben', 'Jetzt üben'), ' oder einen Test machen.'],
  }[b.farbe];

  return el(
    'li',
    { class: `beherrschung farbe-${b.farbe}` },
    el(
      'div',
      { class: 'beherrschung-kopf' },
      el('span', { class: 'ut-name', text: u.name }),
      el('span', { class: 'ampel-text' }, el('span', { class: 'ampel-punkt', 'aria-hidden': 'true' }), FARBE_TEXT[b.farbe]),
    ),
    el(
      'span',
      {
        class: 'balken',
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(Math.round(wert ?? 0)),
        'aria-label': `Beherrschung ${u.name}`,
      },
      fuellung,
    ),
    el('p', { class: 'klein' }, wert === null ? '' : `${prozentText(wert)} beherrscht${teile.length ? ` (${teile.join(', ')})` : ''}`),
    el('p', { class: 'empfehlung' }, empfehlung),
  );
}

// ---------- Notenverlauf: eine Linie, Note 1 oben, Note 5 unten ----------

function notenverlauf(tests) {
  const liste = (Array.isArray(tests) ? tests : []).filter((t) => t.note >= 1 && t.note <= 5);
  const abschnitt = el('section', { class: 'notenverlauf', 'aria-labelledby': 'verlauf-titel' }, el('h2', { id: 'verlauf-titel', text: 'Notenverlauf' }));
  if (liste.length === 0) {
    abschnitt.append(el('p', { class: 'leer', text: 'Noch kein Test gemacht. Nach deinem ersten Test siehst du hier deine Noten.' }));
    return abschnitt;
  }

  const heute = heutigesDatum();
  const datum = (t) => datumLesbar(heutigesDatum(new Date(t.datum)), heute);
  const B = 640;
  const H = 220;
  const rand = { links: 112, rechts: 20, oben: 16, unten: 28 };
  const x = (i) => rand.links + (liste.length === 1 ? (B - rand.links - rand.rechts) / 2 : (i * (B - rand.links - rand.rechts)) / (liste.length - 1));
  const y = (note) => rand.oben + ((note - 1) * (H - rand.oben - rand.unten)) / 4;
  const s = (tag, attrs = {}) => {
    const e = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };

  const svg = s('svg', { viewBox: `0 0 ${B} ${H}`, class: 'verlauf-svg', role: 'img', 'aria-label': `Notenverlauf über ${liste.length} Tests, zuletzt ${NOTEN[liste.at(-1).note - 1]}` });
  for (let n = 1; n <= 5; n++) {
    svg.append(s('line', { x1: rand.links, x2: B - rand.rechts, y1: y(n), y2: y(n), class: 'raster' }));
    const t = s('text', { x: rand.links - 10, y: y(n) + 4, 'text-anchor': 'end', class: 'achse' });
    t.textContent = `${n} ${NOTEN[n - 1]}`;
    svg.append(t);
  }
  if (liste.length > 1) {
    svg.append(s('polyline', { points: liste.map((t, i) => `${x(i)},${y(t.note)}`).join(' '), class: 'linie' }));
  }

  const tipp = el('div', { class: 'tipp', hidden: true });
  liste.forEach((t, i) => {
    const text = `${datum(t)}: ${NOTEN[t.note - 1]} (${t.note}), ${prozentText(t.prozent)} – ${t.modusName ?? t.modus}`;
    const zeigen = () => {
      tipp.textContent = text;
      tipp.hidden = false;
      tipp.style.setProperty('left', `${(x(i) / B) * 100}%`);
      tipp.style.setProperty('top', `${(y(t.note) / H) * 100}%`);
    };
    const verstecken = () => (tipp.hidden = true);
    // Großes, unsichtbares Trefferfeld + sichtbarer Punkt.
    const treffer = s('circle', { cx: x(i), cy: y(t.note), r: 16, class: 'treffer', tabindex: '0', 'aria-label': text });
    treffer.addEventListener('pointerenter', zeigen);
    treffer.addEventListener('pointerleave', verstecken);
    treffer.addEventListener('focus', zeigen);
    treffer.addEventListener('blur', verstecken);
    svg.append(s('circle', { cx: x(i), cy: y(t.note), r: 5, class: 'punkt' }), treffer);
  });
  if (liste.length > 1) {
    const ende = s('text', { x: x(liste.length - 1), y: H - 8, 'text-anchor': 'end', class: 'achse' });
    ende.textContent = datum(liste.at(-1));
    const anfang = s('text', { x: x(0), y: H - 8, 'text-anchor': 'start', class: 'achse' });
    anfang.textContent = datum(liste[0]);
    svg.append(anfang, ende);
  }

  abschnitt.append(
    el('div', { class: 'verlauf-rahmen' }, svg, tipp),
    el(
      'details',
      { class: 'verlauf-tabelle' },
      el('summary', { text: 'Als Tabelle anzeigen' }),
      el(
        'table',
        {},
        el('thead', {}, el('tr', {}, el('th', { text: 'Datum' }), el('th', { text: 'Art' }), el('th', { text: 'Note' }), el('th', { text: 'Prozent' }))),
        el(
          'tbody',
          {},
          [...liste].reverse().map((t) =>
            el('tr', {}, el('td', { text: datum(t) }), el('td', { text: t.modusName ?? t.modus }), el('td', { text: `${NOTEN[t.note - 1]} (${t.note})` }), el('td', { text: prozentText(t.prozent) })),
          ),
        ),
      ),
    ),
  );
  return abschnitt;
}
