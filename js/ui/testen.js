// Test & Benotung (DESIGN.md 6): Modus wählen, Fragen ohne Lösungen, Zeitlimit,
// Freitext selbst bewerten, Ergebnis mit Note. Ein laufender Test überlebt das Neuladen.

import { el, leeren, ansage, frageDialog } from './dom.js';
import { frageEingabe, freitextBewertung, typHinweis, punkteText } from './fragen.js';
import { aktiverSchluessel } from './notenschluessel.js';
import {
  testAuswerten,
  noteAus,
  ergebnisText,
  fehlendeUnterthemen,
  schluesselGrenzen,
  schluesselName,
  loesungAlsText,
  antwortAlsText,
  prozentText,
  NOTEN,
} from '../logic/grading.js';
import { MODI, stelleTestZusammen, maturaTeile, zeitText } from '../logic/pruefung.js';
import { schwacheUnterthemen, ampel } from '../logic/mastery.js';
import { antwortMerken } from '../logic/fortschritt.js';
import { standVon } from '../logic/adaptive.js';
import { heutigesDatum } from '../logic/leitner.js';
import { datumLesbar } from '../logic/text.js';
import { baueRoute } from '../logic/route.js';
import { ladeFortschritt, speichereFortschritt, ladeEinstellungen } from '../store/db.js';

const SPEICHER_VERZOEGERUNG = 400; // ms

export async function zeige(wurzel, route, paket) {
  let fortschritt = await ladeFortschritt(paket.id);
  const einstellungen = await ladeEinstellungen();
  const schluessel = aktiverSchluessel(fortschritt, einstellungen);
  const grenzen = schluesselGrenzen(schluessel);
  const nachId = new Map(paket.fragen.map((f) => [f.id, f]));
  const namen = new Map(paket.unterthemen.map((u) => [u.id, u.name]));
  let aufraeumen = null;

  async function speichern() {
    try {
      await speichereFortschritt(fortschritt);
    } catch {
      ansage('Speichern ging nicht – bitte die Seite nicht schließen.');
    }
  }

  // ---------- Startseite ----------

  function startSeite() {
    leeren(wurzel);
    const teile = maturaTeile(paket.fragen);
    const rot = schwacheUnterthemen(paket, fortschritt, grenzen);
    const verfuegbar = (optionen) => stelleTestZusammen(paket.fragen, { anzahl: Infinity, ...optionen }).length;

    const modi = [
      { id: 'schularbeit', ...MODI.schularbeit, anzahl: Math.min(MODI.schularbeit.anzahl, verfuegbar({})) },
      { id: 'kurztest', ...MODI.kurztest, anzahl: Math.min(MODI.kurztest.anzahl, verfuegbar({})) },
      ...teile.map((teil) => ({
        id: `matura-${teil}`,
        ...MODI.matura,
        name: `${MODI.matura.name} – Teil ${teil}`,
        beschreibung: teil === '1' ? 'Grundkompetenzen.' : 'Vernetzte Aufgaben.',
        teil,
        anzahl: Math.min(MODI.matura.anzahl, verfuegbar({ teil })),
      })),
      {
        id: 'kompensation',
        ...MODI.kompensation,
        unterthemen: rot,
        anzahl: rot.length ? Math.min(MODI.kompensation.anzahl, verfuegbar({ unterthemen: rot })) : 0,
        gesperrt: rot.length === 0 ? 'Gerade ist kein Unterthema rot – dafür gibt es keine Kompensationsprüfung.' : null,
      },
    ];

    const minutenFeld = el('input', { type: 'number', id: 'minuten', min: '0', max: '300', inputmode: 'numeric', class: 'minuten-eingabe' });
    const name = 'modus';
    const optionen = modi.map((m, i) =>
      el(
        'label',
        { class: `option modus-option${m.gesperrt ? ' gesperrt' : ''}` },
        el('input', {
          type: 'radio',
          name,
          value: m.id,
          disabled: Boolean(m.gesperrt),
          checked: i === 0,
          on: { change: () => (minutenFeld.value = String(m.minuten)) },
        }),
        el(
          'span',
          { class: 'modus-text' },
          el('strong', { text: m.name }),
          el('span', { class: 'klein', text: m.gesperrt ?? `${m.anzahl} Fragen. ${m.beschreibung}` }),
        ),
      ),
    );
    minutenFeld.value = String(modi[0].minuten);

    const letzter = fortschritt.tests.at(-1);
    wurzel.append(
      el('h1', { text: 'Test' }),
      letzter
        ? el(
            'p',
            { class: 'meldung' },
            `Letzter Test (${datumLesbar(heutigesDatum(new Date(letzter.datum)), heutigesDatum())}): ${NOTEN[letzter.note - 1]} (${letzter.note}), ${prozentText(letzter.prozent)}. `,
            el('a', { href: baueRoute('test', paket.id, 'ergebnis'), text: 'Ergebnis ansehen' }),
          )
        : '',
      el(
        'form',
        {
          class: 'test-start',
          on: {
            submit: async (e) => {
              e.preventDefault();
              const gewaehlt = modi.find((m) => m.id === wurzel.querySelector(`input[name=${name}]:checked`)?.value);
              if (!gewaehlt || gewaehlt.gesperrt) return;
              const minuten = Math.max(0, Math.min(300, Number.parseInt(minutenFeld.value, 10) || 0));
              await testStarten(gewaehlt, minuten);
            },
          },
        },
        el('fieldset', { class: 'optionen' }, el('legend', { text: 'Art des Tests' }), optionen),
        el(
          'p',
          { class: 'minuten' },
          el('label', { for: 'minuten', text: 'Zeitlimit in Minuten ' }),
          minutenFeld,
          el('span', { class: 'klein', text: ' (0 = ohne Zeitlimit)' }),
        ),
        el(
          'p',
          { class: 'klein' },
          `Bewertet nach: ${schluesselName(schluessel)}. `,
          el('a', { href: baueRoute('fortschritt', paket.id), text: 'Für dieses Paket ändern' }),
        ),
        el('p', { class: 'klein', text: 'Während des Tests gibt es keine Lösungen. Du kannst zwischen den Fragen hin und her springen.' }),
        el('button', { type: 'submit', class: 'knopf haupt gross', text: 'Test starten' }),
      ),
    );
  }

  async function testStarten(modus, minuten) {
    const fragen = stelleTestZusammen(paket.fragen, {
      anzahl: modus.anzahl,
      unterthemen: modus.unterthemen ?? null,
      teil: modus.teil ?? null,
      uebungsstand: fortschritt.uebungsstand,
    });
    const jetzt = Date.now();
    fortschritt = {
      ...fortschritt,
      laufenderTest: {
        modus: modus.id,
        modusName: modus.name,
        teil: modus.teil ?? null,
        fragenIds: fragen.map((f) => f.id),
        antworten: {},
        beginn: jetzt,
        ende: minuten > 0 ? jetzt + minuten * 60_000 : null,
        phase: 'antworten',
        freitextPunkte: {},
        index: 0,
      },
    };
    await speichern();
    laufen();
  }

  // ---------- Laufender Test ----------

  function testFragen() {
    return fortschritt.laufenderTest.fragenIds.map((id) => nachId.get(id)).filter(Boolean);
  }

  function laufen() {
    const lt = fortschritt.laufenderTest;
    if (lt.phase === 'bewerten') return bewerten();
    if (lt.ende && Date.now() >= lt.ende) return abgeben(true);

    const fragen = testFragen();
    if (fragen.length === 0) {
      fortschritt = { ...fortschritt, laufenderTest: null };
      speichern();
      return startSeite();
    }

    leeren(wurzel);
    const uhr = el('span', { class: 'uhr', role: 'timer', 'aria-label': 'Restzeit' });
    const nummern = el('nav', { class: 'nummern', 'aria-label': 'Fragen im Test' });
    const flaeche = el('div', { class: 'test-flaeche' });
    let speicherTimer = null;
    let uhrTimer = null;
    let angesagt = new Set();

    const speichernBald = () => {
      clearTimeout(speicherTimer);
      speicherTimer = setTimeout(speichern, SPEICHER_VERZOEGERUNG);
    };

    function istBeantwortet(frage) {
      const a = lt.antworten[frage.id];
      if (a === undefined || a === null) return false;
      if (typeof a === 'string') return a.trim() !== '';
      if (Array.isArray(a)) return frage.typ === 'reihenfolge' ? true : a.some((x) => String(x ?? '').trim() !== '');
      return true;
    }

    function nummernZeichnen() {
      leeren(nummern).append(
        el(
          'ol',
          {},
          fragen.map((f, i) =>
            el(
              'li',
              {},
              el('button', {
                type: 'button',
                class: `nummer${istBeantwortet(f) ? ' beantwortet' : ''}`,
                'aria-current': i === lt.index ? 'step' : null,
                'aria-label': `Frage ${i + 1}${istBeantwortet(f) ? ', beantwortet' : ''}`,
                text: String(i + 1),
                on: { click: () => frageZeigen(i) },
              }),
            ),
          ),
        ),
      );
    }

    function frageZeigen(index) {
      lt.index = Math.max(0, Math.min(index, fragen.length - 1));
      speichernBald();
      const frage = fragen[lt.index];
      const eingabe = frageEingabe(frage);
      if (lt.antworten[frage.id] !== undefined) eingabe.setzeAntwort(lt.antworten[frage.id]);
      else if (frage.typ === 'reihenfolge') lt.antworten[frage.id] = eingabe.antwort(); // gezeigte Reihenfolge merken
      eingabe.beiAenderung(() => {
        lt.antworten[frage.id] = eingabe.antwort();
        speichernBald();
        nummernZeichnen();
      });

      const letzte = lt.index === fragen.length - 1;
      leeren(flaeche).append(
        el(
          'div',
          { class: 'frage-karte' },
          el('p', { class: 'frage-meta', text: `Frage ${lt.index + 1} von ${fragen.length}: ${typHinweis(frage)}` }),
          el('h2', { class: 'frage-text', id: 'frage-text', tabindex: '-1', text: frage.frage }),
          eingabe.element,
        ),
        el(
          'div',
          { class: 'test-navigation' },
          el('button', { type: 'button', class: 'knopf', text: 'Zurück', disabled: lt.index === 0, on: { click: () => frageZeigen(lt.index - 1) } }),
          letzte
            ? el('button', { type: 'button', class: 'knopf haupt', text: 'Abgeben', on: { click: abgebenFragen } })
            : el('button', { type: 'button', class: 'knopf haupt', text: 'Weiter', on: { click: () => frageZeigen(lt.index + 1) } }),
        ),
      );
      nummernZeichnen();
      flaeche.querySelector('#frage-text').focus();
    }

    async function abgebenFragen() {
      const offen = fragen.filter((f) => !istBeantwortet(f)).length;
      const ja = await frageDialog({
        titel: 'Test abgeben?',
        text: offen > 0
          ? `${offen} ${offen === 1 ? 'Frage ist' : 'Fragen sind'} noch ohne Antwort. Danach kannst du nichts mehr ändern.`
          : 'Danach kannst du nichts mehr ändern.',
        knoepfe: [
          { text: 'Weiter bearbeiten', wert: false },
          { text: 'Abgeben', wert: true, art: 'haupt' },
        ],
      });
      if (ja) abgeben(false);
    }

    function uhrStellen() {
      if (!lt.ende) {
        uhr.textContent = 'ohne Zeitlimit';
        return;
      }
      const rest = (lt.ende - Date.now()) / 1000;
      uhr.textContent = `noch ${zeitText(rest)}`;
      uhr.classList.toggle('knapp', rest <= 60);
      for (const grenze of [300, 60]) {
        if (rest <= grenze && rest > 0 && !angesagt.has(grenze)) {
          angesagt.add(grenze);
          ansage(grenze === 300 ? 'Noch 5 Minuten.' : 'Noch 1 Minute.');
        }
      }
      if (rest <= 0) abgeben(true);
    }

    aufraeumen = () => {
      clearInterval(uhrTimer);
      clearTimeout(speicherTimer);
      speichern();
    };

    wurzel.append(
      el('h1', { class: 'nur-sr', text: `${lt.modusName ?? 'Test'} läuft` }),
      el(
        'div',
        { class: 'test-kopf' },
        el('strong', { text: lt.modusName ?? 'Test' }),
        uhr,
        el('button', { type: 'button', class: 'knopf leise', text: 'Abgeben', on: { click: abgebenFragen } }),
      ),
      nummern,
      flaeche,
    );
    uhrStellen();
    if (lt.ende) uhrTimer = setInterval(uhrStellen, 1000);
    frageZeigen(lt.index ?? 0);
  }

  async function abgeben(automatisch) {
    aufraeumen?.();
    aufraeumen = null;
    const lt = fortschritt.laufenderTest;
    if (!lt || lt.phase !== 'antworten') return;
    lt.phase = 'bewerten';
    lt.automatischAbgegeben = automatisch;
    await speichern();
    if (automatisch) ansage('Die Zeit ist abgelaufen – der Test wurde automatisch abgegeben.');
    bewerten();
  }

  // ---------- Freitext selbst bewerten ----------

  function bewerten() {
    const lt = fortschritt.laufenderTest;
    const offen = testFragen().filter((f) => f.typ === 'freitext' && lt.freitextPunkte[f.id] === undefined);
    if (offen.length === 0) return abschliessen();
    const alle = testFragen().filter((f) => f.typ === 'freitext');
    const frage = offen[0];
    const text = typeof lt.antworten[frage.id] === 'string' ? lt.antworten[frage.id] : '';

    leeren(wurzel).append(
      el('h1', { text: 'Freitext selbst bewerten' }),
      lt.automatischAbgegeben ? el('p', { class: 'meldung', text: 'Die Zeit ist abgelaufen – der Test wurde automatisch abgegeben.' }) : '',
      el('p', { class: 'klein', text: `Frage ${alle.indexOf(frage) + 1} von ${alle.length}. Erst danach siehst du deine Note.` }),
      el('h2', { class: 'frage-text', text: frage.frage }),
      el('p', { class: 'loesung-titel', text: 'Deine Antwort' }),
      el('p', { class: 'deine-antwort', text: text.trim() || 'keine Antwort' }),
    );
    const bewertung = freitextBewertung(frage, text, async (punkte) => {
      lt.freitextPunkte[frage.id] = punkte;
      await speichern();
      bewerten();
    });
    wurzel.append(bewertung.element);
    wurzel.querySelector('h1').setAttribute('tabindex', '-1');
    wurzel.querySelector('h1').focus();
  }

  // ---------- Abschließen und speichern ----------

  async function abschliessen() {
    const lt = fortschritt.laufenderTest;
    const fragen = testFragen();
    const e = testAuswerten(fragen, lt.antworten, lt.freitextPunkte);
    const jetzt = Date.now();
    const eintrag = {
      datum: jetzt,
      modus: lt.modus,
      modusName: lt.modusName,
      teil: lt.teil,
      punkte: e.punkte,
      max: e.max,
      prozent: e.prozent,
      note: noteAus(e.prozent, grenzen),
      schluessel: schluesselName(schluessel),
      grenzen,
      proUnterthema: e.proUnterthema,
      fragen: e.fragen,
    };

    let neu = { ...fortschritt, tests: [...fortschritt.tests, eintrag], laufenderTest: null };
    const uebungsstand = { ...neu.uebungsstand };
    for (const f of e.fragen) {
      neu = antwortMerken(neu, { frageId: f.frageId, richtig: f.punkte >= f.max, zeitpunkt: jetzt, herkunft: 'test' });
      // „zuletzt dran“ für die nächste Testzusammenstellung – Gewichte bleiben unverändert.
      uebungsstand[f.frageId] = { ...standVon(uebungsstand, f.frageId), zuletzt: jetzt };
    }
    fortschritt = { ...neu, uebungsstand };
    await speichern();
    const ziel = baueRoute('test', paket.id, 'ergebnis');
    if (location.hash === ziel) {
      leeren(wurzel);
      ergebnisSeite();
      window.scrollTo(0, 0);
    } else {
      location.hash = ziel; // der Router zeigt dann das Ergebnis
    }
  }

  // ---------- Ergebnis ----------

  function ergebnisSeite() {
    const t = fortschritt.tests.at(-1);
    if (!t) return startSeite();
    const g = Array.isArray(t.grenzen) ? t.grenzen : grenzen;
    // Reihenfolge wie im Paket, nicht wie die Fragen im Test.
    const reihenfolge = paket.unterthemen.map((u) => u.id);
    const nachPaket = (a, b) => reihenfolge.indexOf(a) - reihenfolge.indexOf(b);
    const fehlend = t.note === 5 ? fehlendeUnterthemen(t.proUnterthema, g).sort(nachPaket) : [];

    wurzel.append(
      el('h1', { text: 'Ergebnis' }),
      el(
        'section',
        { class: `note-kasten note-${t.note}` },
        el('p', { class: 'note-zahl', 'aria-hidden': 'true', text: String(t.note) }),
        el(
          'div',
          {},
          el('p', { class: 'note-text', text: ergebnisText(t.prozent, g) }),
          el('p', { class: 'klein', text: `${punkteText(t.punkte)} von ${punkteText(t.max)} Punkten. ${t.modusName ?? ''}, bewertet nach ${t.schluessel}.` }),
        ),
      ),
      fehlend.length
        ? el(
            'div',
            { class: 'meldung fehler' },
            el('p', { text: `Negativ – diese Unterthemen fehlen für ein Genügend: ${fehlend.map((id) => namen.get(id) ?? id).join(', ')}.` }),
            el(
              'p',
              { class: 'aktionen' },
              fehlend.map((id) => el('a', { class: 'knopf', href: baueRoute('ueben', paket.id, id), text: `${namen.get(id) ?? id} üben` })),
            ),
          )
        : '',
      el('h2', { text: 'Nach Unterthemen' }),
      el(
        'ul',
        { class: 'ut-ergebnis' },
        Object.entries(t.proUnterthema).sort(([a], [b]) => nachPaket(a, b)).map(([id, u]) => {
          const p = u.max > 0 ? (u.punkte / u.max) * 100 : 0;
          const fuellung = el('span', { class: 'balken-fuellung' });
          fuellung.style.setProperty('width', `${p}%`);
          return el(
            'li',
            { class: `farbe-${ampel(p, g)}` },
            el('span', { class: 'ut-name', text: namen.get(id) ?? id }),
            el('span', { class: 'balken', 'aria-hidden': 'true' }, fuellung),
            el('span', { class: 'ut-wert', text: `${prozentText(p)} (${punkteText(u.punkte)}/${punkteText(u.max)})` }),
          );
        }),
      ),
      el(
        'div',
        { class: 'aktionen' },
        el('a', { class: 'knopf haupt', href: baueRoute('test', paket.id), text: 'Neuen Test starten' }),
        el('a', { class: 'knopf', href: baueRoute('fortschritt', paket.id), text: 'Fortschritt ansehen' }),
        el('a', { class: 'knopf', href: baueRoute('fehlerheft', paket.id), text: 'Fehlerheft' }),
      ),
      el('h2', { text: 'Alle Fragen' }),
      el(
        'ol',
        { class: 'test-fragen' },
        t.fragen.map((ef) => {
          const frage = nachId.get(ef.frageId);
          if (!frage) return null;
          const voll = ef.punkte >= ef.max;
          return el(
            'li',
            { class: `test-frage ${voll ? 'gut' : ef.punkte > 0 ? 'teils' : 'schlecht'}` },
            el('p', { class: 'fehler-frage', text: frage.frage }),
            el('p', { class: 'punkte', text: `${punkteText(ef.punkte)} von ${punkteText(ef.max)} ${ef.max === 1 ? 'Punkt' : 'Punkten'}` }),
            el('p', { class: 'loesung-titel', text: 'Deine Antwort' }),
            el('ul', { class: 'loesung' }, antwortAlsText(frage, ef.antwort).map((z) => el('li', { text: z }))),
            !voll || frage.typ === 'freitext'
              ? [
                  el('p', { class: 'loesung-titel', text: frage.typ === 'freitext' ? 'Musterlösung' : 'Richtige Lösung' }),
                  el('ul', { class: 'loesung' }, loesungAlsText(frage).map((z) => el('li', { text: z }))),
                ]
              : null,
            el('p', { class: 'erklaerung', text: frage.erklaerung }),
          );
        }),
      ),
    );
  }

  // ---------- Start ----------

  if (fortschritt.laufenderTest) laufen();
  else if (route.unterthema === 'ergebnis') ergebnisSeite();
  else startSeite();

  return () => aufraeumen?.();
}
