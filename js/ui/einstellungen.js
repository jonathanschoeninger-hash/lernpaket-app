// Einstellungen: Notenschlüssel (Voreinstellung für alle Pakete), Stimme & Tempo.
// (Backup kommt mit Phase 6.)

import { el, ansage } from './dom.js';
import { schluesselEditor } from './notenschluessel.js';
import { deutscheStimmenLaden, erstelleSprecher, sprachausgabeVorhanden } from '../video/speech.js';
import { waehleStimme } from '../logic/sprache.js';
import { ladeEinstellungen, speichereEinstellung } from '../store/db.js';

const TEMPI = [0.75, 1, 1.25, 1.5];

export async function zeige(wurzel) {
  const einstellungen = await ladeEinstellungen();
  wurzel.append(
    el('h1', { text: 'Einstellungen' }),
    el(
      'section',
      { 'aria-labelledby': 'schluessel-titel' },
      el('h2', { id: 'schluessel-titel', text: 'Notenschlüssel' }),
      el('p', {
        class: 'klein',
        text: 'Gilt als Voreinstellung für alle Pakete. Pro Paket kannst du ihn unter „Fortschritt“ ändern – z. B. ein Mathe-Paket mit dem Mathe-Schlüssel.',
      }),
      schluesselEditor({
        wert: einstellungen.notenschluessel,
        speichern: (s) => speichereEinstellung('notenschluessel', s),
      }),
    ),
    await stimmeAbschnitt(einstellungen),
  );
}

async function stimmeAbschnitt(einstellungen) {
  const abschnitt = el(
    'section',
    { 'aria-labelledby': 'stimme-titel' },
    el('h2', { id: 'stimme-titel', text: 'Stimme & Tempo' }),
  );
  if (!sprachausgabeVorhanden()) {
    abschnitt.append(el('p', { text: 'Dieser Browser kann nicht vorlesen. Videos laufen im Untertitel-Modus.' }));
    return abschnitt;
  }

  const stimmen = await deutscheStimmenLaden();
  if (stimmen.length === 0) {
    abschnitt.append(el('p', { text: 'Auf diesem Gerät gibt es keine deutsche Vorlese-Stimme. Videos laufen im Untertitel-Modus.' }));
    return abschnitt;
  }

  const aktuell = waehleStimme(stimmen, einstellungen.stimme);
  const stimmeWahl = el(
    'select',
    { id: 'stimme-wahl', on: { change: () => speichereEinstellung('stimme', stimmeWahl.value).then(() => ansage('Stimme gespeichert.')) } },
    stimmen.map((s) =>
      el('option', {
        value: s.voiceURI,
        selected: s === aktuell,
        text: `${s.name} (${s.lang})${s.localService === false ? ' – online' : ''}`,
      }),
    ),
  );
  const tempoWahl = el(
    'select',
    { id: 'tempo-wahl', on: { change: () => speichereEinstellung('tempo', Number(tempoWahl.value)).then(() => ansage('Tempo gespeichert.')) } },
    TEMPI.map((t) => el('option', { value: String(t), selected: t === (einstellungen.tempo ?? 1), text: `${String(t).replace('.', ',')}×` })),
  );

  abschnitt.append(
    el('p', { class: 'feld' }, el('label', { for: 'stimme-wahl', text: 'Stimme' }), stimmeWahl),
    el('p', { class: 'feld' }, el('label', { for: 'tempo-wahl', text: 'Tempo' }), tempoWahl),
    el('p', {
      class: 'klein',
      text: 'Stimmen mit „online“ schicken den Text zum Vorlesen an den Anbieter der Stimme. Stimmen ohne diesen Hinweis laufen auf deinem Gerät.',
    }),
    el('button', {
      type: 'button',
      class: 'knopf',
      text: 'Probe hören',
      on: {
        click: async () => {
          const sprecher = await erstelleSprecher(stimmeWahl.value);
          sprecher.stopp();
          sprecher.sprich('Servus! So klingt die Stimme für deine Lernvideos.', Number(tempoWahl.value));
        },
      },
    }),
  );
  return abschnitt;
}
