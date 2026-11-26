// Einstellungen: Notenschlüssel als Voreinstellung für alle Pakete.
// (Stimme & Tempo kommen mit den Videos, Backup mit Phase 6.)

import { el } from './dom.js';
import { schluesselEditor } from './notenschluessel.js';
import { ladeEinstellungen, speichereEinstellung } from '../store/db.js';

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
  );
}
