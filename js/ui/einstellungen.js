// Einstellungen: Notenschlüssel (Voreinstellung für alle Pakete), Stimme & Tempo.
// Sicherung: alles in eine Datei sichern und wieder laden.

import { el, ansage, leeren, herunterladen, frageDialog } from './dom.js';
import { schluesselEditor } from './notenschluessel.js';
import { deutscheStimmenLaden, erstelleSprecher, sprachausgabeVorhanden } from '../video/speech.js';
import { waehleStimme } from '../logic/sprache.js';
import { erstelleBackup, pruefeBackupText, backupDateiname, MAX_BACKUP_BYTES } from '../logic/backup.js';
import { ladeEinstellungen, speichereEinstellung, allePakete, alleFortschritte, sicherungEinspielen } from '../store/db.js';

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
    sicherungAbschnitt(),
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

function sicherungAbschnitt() {
  const meldung = el('div', { class: 'meldungen', 'aria-live': 'polite' });
  const eingabe = el('input', {
    type: 'file',
    id: 'sicherung-datei',
    accept: '.json,application/json',
    class: 'nur-sr',
    on: {
      change: async () => {
        const datei = eingabe.files[0];
        eingabe.value = '';
        if (datei) await sicherungLaden(datei, meldung);
      },
    },
  });
  const label = el('label', { for: 'sicherung-datei', class: 'knopf', tabindex: '0', text: 'Sicherung laden' });
  label.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      eingabe.click();
    }
  });

  return el(
    'section',
    { 'aria-labelledby': 'sicherung-titel' },
    el('h2', { id: 'sicherung-titel', text: 'Sicherung' }),
    el('p', {
      class: 'klein',
      text: 'Deine Pakete und dein Fortschritt liegen nur in diesem Browser. Sichere sie ab und zu in eine Datei – z. B. bevor du Browserdaten löschst oder das Gerät wechselst.',
    }),
    el(
      'div',
      { class: 'aktionen' },
      el('button', { type: 'button', class: 'knopf haupt', text: 'Alles sichern', on: { click: () => allesSichern(meldung) } }),
      label,
      eingabe,
    ),
    meldung,
  );
}

async function allesSichern(meldung) {
  const [pakete, fortschritte, einstellungen] = await Promise.all([allePakete(), alleFortschritte(), ladeEinstellungen()]);
  if (pakete.length === 0) {
    leeren(meldung).append(el('p', { class: 'meldung', text: 'Es gibt noch keine Pakete zum Sichern.' }));
    return;
  }
  const backup = erstelleBackup({ pakete, fortschritte, einstellungen });
  herunterladen(backupDateiname(), JSON.stringify(backup), 'application/json');
  leeren(meldung).append(
    el('p', {
      class: 'meldung erfolg',
      role: 'status',
      text: `Sicherung mit ${pakete.length} ${pakete.length === 1 ? 'Paket' : 'Paketen'} wird gespeichert (${backupDateiname()}).`,
    }),
  );
}

async function sicherungLaden(datei, meldung) {
  leeren(meldung);
  if (datei.size > MAX_BACKUP_BYTES) {
    meldung.append(el('p', { class: 'meldung fehler', role: 'alert', text: 'Die Datei ist zu groß für eine Sicherung.' }));
    return;
  }
  const e = pruefeBackupText(await datei.text());
  if (!e.ok) {
    meldung.append(
      el('div', { class: 'meldung fehler', role: 'alert' },
        el('p', { class: 'meldung-titel', text: `„${datei.name}“ kann nicht geladen werden.` }),
        el('p', { text: e.fehler[0] }),
        e.uebersprungen.length ? el('ul', {}, e.uebersprungen.map((u) => el('li', { text: u }))) : '',
      ),
    );
    return;
  }

  const vorhanden = new Set((await allePakete()).map((x) => x.paket.id));
  const ueberschrieben = e.pakete.filter((x) => vorhanden.has(x.paket.id)).length;
  const ja = await frageDialog({
    titel: 'Sicherung laden?',
    text: [
      `Die Sicherung enthält ${e.pakete.length} ${e.pakete.length === 1 ? 'Paket' : 'Pakete'}: ${e.pakete.map((x) => x.paket.titel).join(', ')}.`,
      ueberschrieben > 0
        ? `${ueberschrieben} davon gibt es schon auf diesem Gerät – ${ueberschrieben === 1 ? 'es wird' : 'sie werden'} samt Fortschritt durch die Sicherung ersetzt. Andere Pakete bleiben.`
        : 'Deine anderen Pakete bleiben unverändert.',
      e.uebersprungen.length
        ? e.uebersprungen.length === 1
          ? '1 fehlerhafter Eintrag wird ausgelassen.'
          : `${e.uebersprungen.length} fehlerhafte Einträge werden ausgelassen.`
        : '',
    ].filter(Boolean),
    knoepfe: [
      { text: 'Abbrechen', wert: false },
      { text: 'Sicherung laden', wert: true, art: 'haupt' },
    ],
  });
  if (!ja) return;

  try {
    await sicherungEinspielen(e.pakete, e.einstellungen);
  } catch (fehler) {
    meldung.append(el('p', { class: 'meldung fehler', role: 'alert', text: `Laden ging nicht (${fehler?.message ?? fehler}). Es wurde nichts verändert.` }));
    return;
  }
  ansage('Sicherung geladen.');
  meldung.append(
    el('div', { class: 'meldung erfolg', role: 'status' },
      el('p', {}, `${e.pakete.length} ${e.pakete.length === 1 ? 'Paket' : 'Pakete'} wiederhergestellt. `, el('a', { href: '#/start', text: 'Zu meinen Paketen' })),
      e.uebersprungen.length ? el('details', { class: 'hinweise' }, el('summary', { text: 'Ausgelassen' }), el('ul', {}, e.uebersprungen.map((u) => el('li', { text: u })))) : '',
    ),
  );
}
