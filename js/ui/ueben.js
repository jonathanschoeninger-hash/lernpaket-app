// Übungsmodus (DESIGN.md 5.5): adaptiv, sofortige Rückmeldung, Rundenbericht.

import { el, leeren, ansage } from './dom.js';
import { frageEingabe, freitextBewertung, typHinweis, punkteText } from './fragen.js';
import { fortschrittsBalken } from './start.js';
import { bewerteAntwort, loesungAlsText } from '../logic/grading.js';
import {
  standVon,
  bewerte,
  uebungsPool,
  neueRunde,
  leereRunde,
  merkeZug,
  naechsteFrage,
  rundenBericht,
} from '../logic/adaptive.js';
import { antwortMerken } from '../logic/fortschritt.js';
import { baueRoute } from '../logic/route.js';
import { ladeFortschritt, speichereFortschritt, ladeEinstellungen } from '../store/db.js';
import { schwacheUnterthemen } from '../logic/mastery.js';
import { schluesselGrenzen } from '../logic/grading.js';
import { aktiverSchluessel } from './notenschluessel.js';

export async function zeige(wurzel, route, paket) {
  let fortschritt = await ladeFortschritt(paket.id);
  const unterthema = paket.unterthemen.find((u) => u.id === route.unterthema) ?? null;
  const nurFehler = route.nur === 'fehler';
  const nurSchwaechen = route.nur === 'schwaechen';
  const grenzen = schluesselGrenzen(aktiverSchluessel(fortschritt, await ladeEinstellungen()));
  // Schwächen = rote Unterthemen; sie werden beim Start festgelegt und bleiben für diese Runde gleich.
  const schwach = nurSchwaechen ? new Set(schwacheUnterthemen(paket, fortschritt, grenzen)) : null;
  const nurIds = nurFehler
    ? Object.keys(fortschritt.fehlerheft ?? {})
    : nurSchwaechen
      ? paket.fragen.filter((f) => schwach.has(f.unterthema)).map((f) => f.id)
      : null;
  const auswahl = { unterthema: unterthema?.id ?? null, nurIds };

  // Alle Übungsfragen im gewählten Bereich (gemeistert oder nicht) – für Balken und „Neue Runde“.
  const bereich = paket.fragen.filter(
    (f) => !f.nurTest && (!unterthema || f.unterthema === unterthema.id) && (!nurIds || nurIds.includes(f.id)),
  );
  const namen = new Map(paket.unterthemen.map((u) => [u.id, u.name]));
  const quellen = new Map(paket.quellen.map((q) => [q.id, q.name]));

  let runde = leereRunde();
  const balkenPlatz = el('div', { class: 'ueben-balken' });
  const flaeche = el('div', { class: 'ueben-flaeche' });

  function balkenZeichnen() {
    const gemeistert = bereich.filter((f) => standVon(fortschritt.uebungsstand, f.id).gemeistert).length;
    const prozent = bereich.length ? Math.round((gemeistert / bereich.length) * 100) : 0;
    leeren(balkenPlatz).append(fortschrittsBalken(prozent, `${gemeistert} von ${bereich.length} Fragen gemeistert`));
  }

  async function speichern() {
    try {
      await speichereFortschritt(fortschritt);
    } catch {
      ansage('Speichern ging nicht – der Fortschritt ist eventuell verloren.');
    }
  }

  function naechste() {
    const pool = uebungsPool(paket.fragen, fortschritt.uebungsstand, auswahl);
    const frage = naechsteFrage(pool, fortschritt.uebungsstand, runde, Math.random);
    if (!frage) return bericht();
    frageZeigen(frage);
  }

  function frageZeigen(frage) {
    const eingabe = frageEingabe(frage);
    const pruefKnopf = el('button', { type: 'submit', class: 'knopf haupt', text: 'Prüfen' });
    const weissNicht = el('button', {
      type: 'button',
      class: 'knopf leise',
      text: 'Weiß ich nicht',
      on: { click: () => abschliessen(frage.typ === 'freitext' ? { punkte: 0 } : null) },
    });
    const knoepfe = el('div', { class: 'aktionen' }, pruefKnopf, weissNicht);
    const rueckmeldung = el('div', { class: 'rueckmeldung-platz' });

    const formular = el(
      'form',
      {
        class: 'frage-karte',
        'aria-labelledby': 'frage-text',
        on: {
          submit: (e) => {
            e.preventDefault();
            pruefen();
          },
        },
      },
      el('p', { class: 'frage-meta', text: `${namen.get(frage.unterthema) ?? ''}: ${typHinweis(frage)}` }),
      el('h2', { id: 'frage-text', class: 'frage-text', text: frage.frage }),
      eingabe.element,
      knoepfe,
    );

    leeren(flaeche).append(formular, rueckmeldung);
    eingabe.fokus();

    let fertig = false;

    function pruefen() {
      if (fertig) return;
      if (!eingabe.beantwortet()) {
        ansage('Bitte zuerst antworten – oder „Weiß ich nicht“ wählen.');
        eingabe.fokus();
        return;
      }
      if (frage.typ === 'freitext') {
        eingabe.sperren();
        knoepfe.hidden = true;
        const bewertung = freitextBewertung(frage, eingabe.antwort(), (punkte) => abschliessen({ punkte }));
        leeren(rueckmeldung).append(bewertung.element);
        bewertung.fokus();
        return;
      }
      abschliessen(eingabe.antwort());
    }

    async function abschliessen(antwort) {
      if (fertig) return;
      fertig = true;
      eingabe.sperren();
      knoepfe.hidden = true;
      const ergebnis = bewerteAntwort(frage, antwort);
      eingabe.zeigeAuswertung(ergebnis);

      const jetzt = Date.now();
      const stand = bewerte(standVon(fortschritt.uebungsstand, frage.id), ergebnis.richtig, jetzt);
      fortschritt = { ...fortschritt, uebungsstand: { ...fortschritt.uebungsstand, [frage.id]: stand } };
      fortschritt = antwortMerken(fortschritt, { frageId: frage.id, richtig: ergebnis.richtig, zeitpunkt: jetzt, herkunft: 'ueben' });
      runde = merkeZug(runde, frage.id, ergebnis.richtig);
      await speichern();
      balkenZeichnen();

      const weiter = el('button', { type: 'button', class: 'knopf haupt gross', text: 'Weiter', on: { click: naechste } });
      leeren(rueckmeldung).append(rueckmeldungKasten(frage, ergebnis, stand, quellen), weiter);
      weiter.focus();
    }
  }

  function bericht() {
    const b = rundenBericht(runde.zuege, paket.fragen);
    const neueRundeKnopf = el('button', {
      type: 'button',
      class: 'knopf haupt gross',
      text: 'Neue Runde',
      on: {
        click: async () => {
          fortschritt = { ...fortschritt, uebungsstand: neueRunde(fortschritt.uebungsstand, bereich.map((f) => f.id)) };
          await speichern();
          runde = leereRunde();
          balkenZeichnen();
          ansage('Neue Runde gestartet.');
          naechste();
        },
      },
    });

    if (bereich.length === 0) {
      leeren(flaeche).append(
        el('p', {
          class: 'meldung',
          text: nurFehler
            ? 'Im Fehlerheft gibt es hier keine Übungsfragen. Falsch beantwortete Fragen landen automatisch dort.'
            : nurSchwaechen
              ? 'Gerade ist hier kein Unterthema rot – keine Schwächen zum Üben.'
              : 'Hier gibt es keine Übungsfragen.',
        }),
      );
      return;
    }

    leeren(flaeche).append(
      el(
        'section',
        { class: 'bericht', 'aria-labelledby': 'bericht-titel' },
        el('h2', { id: 'bericht-titel', tabindex: '-1', text: b.antworten ? 'Runde geschafft!' : 'Alles gemeistert!' }),
        b.antworten
          ? el(
              'p',
              { class: 'bericht-zahl' },
              el('strong', { text: `${Math.round(b.trefferquote * 100)} %` }),
              ` richtig (${b.richtig} von ${b.antworten} Antworten)`,
            )
          : el('p', { text: `Du hast alle ${bereich.length} Fragen hier gemeistert. Mit „Neue Runde“ übst du sie noch einmal – deine Gewichte bleiben.` }),
        b.schwierigste.length
          ? [
              el('h3', { text: 'Am schwierigsten waren' }),
              el(
                'ol',
                { class: 'schwierigste' },
                b.schwierigste.map((s) =>
                  el('li', {}, s.frage.frage, el('span', { class: 'klein', text: ` – ${s.falsch}× falsch` })),
                ),
              ),
            ]
          : null,
        neueRundeKnopf,
        el(
          'p',
          { class: 'aktionen' },
          el('a', { class: 'knopf', href: baueRoute('fehlerheft', paket.id), text: 'Zum Fehlerheft' }),
          el('a', { class: 'knopf', href: baueRoute('paket', paket.id), text: 'Zum Paket' }),
        ),
      ),
    );
    flaeche.querySelector('h2').focus();
  }

  // ---------- Kopf ----------
  wurzel.append(
    el('h1', { text: nurFehler ? 'Fehler üben' : nurSchwaechen ? 'Schwächen üben' : unterthema ? `Üben: ${unterthema.name}` : 'Üben' }),
    el(
      'nav',
      { class: 'chips', 'aria-label': 'Unterthema wählen' },
      el('a', { href: baueRoute('ueben', paket.id, null, { nur: route.nur }), 'aria-current': unterthema ? null : 'page', text: 'Alle' }),
      paket.unterthemen.map((u) =>
        el('a', {
          href: baueRoute('ueben', paket.id, u.id, { nur: route.nur }),
          'aria-current': unterthema?.id === u.id ? 'page' : null,
          text: u.name,
        }),
      ),
    ),
    nurFehler
      ? el('p', { class: 'klein' }, 'Nur Fragen aus deinem Fehlerheft, die noch nicht gemeistert sind. ',
          el('a', { href: baueRoute('ueben', paket.id, unterthema?.id), text: 'Alle Fragen üben' }))
      : nurSchwaechen
        ? el('p', { class: 'klein' }, `Nur Fragen aus deinen roten Unterthemen: ${paket.unterthemen.filter((u) => schwach.has(u.id)).map((u) => u.name).join(', ') || 'keine'}. `,
            el('a', { href: baueRoute('ueben', paket.id, unterthema?.id), text: 'Alle Fragen üben' }))
        : '',
    balkenPlatz,
    el(
      'div',
      { class: 'aktionen' },
      nurSchwaechen
        ? ''
        : el('a', { class: 'knopf', href: baueRoute('ueben', paket.id, null, { nur: 'schwaechen' }), text: 'Nur meine Schwächen üben' }),
      el('a', { class: 'knopf leise', href: baueRoute('fehlerheft', paket.id), text: 'Fehlerheft' }),
    ),
    flaeche,
  );
  balkenZeichnen();
  naechste();
}

function rueckmeldungKasten(frage, ergebnis, stand, quellen) {
  const teilweise = !ergebnis.richtig && ergebnis.punkte > 0;
  const titel = ergebnis.richtig
    ? 'Richtig!'
    : teilweise
      ? `Teilweise richtig – ${punkteText(ergebnis.punkte)} von ${ergebnis.max} ${ergebnis.max === 1 ? 'Punkt' : 'Punkten'}`
      : 'Leider falsch.';
  const quelle = frage.quelle ? quellen.get(frage.quelle.id) : null;

  return el(
    'section',
    {
      class: `rueckmeldung ${ergebnis.richtig ? 'gut' : teilweise ? 'teils' : 'schlecht'}`,
      role: 'status',
      'aria-live': 'polite',
    },
    el('p', { class: 'rueckmeldung-titel', text: titel }),
    teilweise ? el('p', { class: 'klein', text: 'Beim Üben zählt nur die volle Punktzahl als richtig.' }) : null,
    stand.gemeistert ? el('p', { class: 'gemeistert', text: 'Gemeistert – diese Frage ist für diese Runde erledigt.' }) : null,
    !ergebnis.richtig || frage.typ === 'freitext'
      ? [
          el('p', { class: 'loesung-titel', text: frage.typ === 'freitext' ? 'Musterlösung' : 'Richtige Lösung' }),
          el('ul', { class: 'loesung' }, loesungAlsText(frage).map((z) => el('li', { text: z }))),
        ]
      : null,
    el('p', { class: 'erklaerung', text: frage.erklaerung }),
    quelle ? el('p', { class: 'quelle', text: `Quelle: ${quelle}${frage.quelle.stelle ? `, ${frage.quelle.stelle}` : ''}` }) : null,
  );
}
