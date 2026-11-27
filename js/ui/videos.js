// Videos: Liste pro Unterthema (mit Haken für gesehene) und Player-Seite.

import { el, ansage } from './dom.js';
import { erstellePlayer } from '../video/player.js';
import { erstelleSprecher } from '../video/speech.js';
import { videoStand, folieGelaufen } from '../logic/video.js';
import { leseVertonung, audioFuerFolie } from '../logic/vertonung.js';
import { baueRoute } from '../logic/route.js';
import { ladeFortschritt, speichereFortschritt, ladeEinstellungen, speichereEinstellung } from '../store/db.js';

export async function zeige(wurzel, route, paket) {
  let fortschritt = await ladeFortschritt(paket.id);
  const namen = new Map(paket.unterthemen.map((u) => [u.id, u.name]));
  const video = route.unterthema ? paket.videos.find((v) => v.id === route.unterthema) : null;

  if (!video) {
    listeZeigen(wurzel, paket, fortschritt, namen);
    return;
  }

  const einstellungen = await ladeEinstellungen();
  const [sprecher, vertonung] = await Promise.all([erstelleSprecher(einstellungen.stimme), vertonungLaden(paket.id)]);
  const aufnahme = (i) => {
    const datei = audioFuerFolie(vertonung, video.id, i, video.folien[i].sprechertext);
    return datei ? `pakete/audio/${encodeURIComponent(paket.id)}/${datei}` : null;
  };
  const mitAufnahmen = video.folien.some((_, i) => aufnahme(i));
  const reihe = paket.videos;
  const naechstes = reihe[reihe.indexOf(video) + 1] ?? null;

  const player = erstellePlayer({
    video,
    sprecher,
    aufnahme,
    tempo: einstellungen.tempo ?? 1,
    untertitel: einstellungen.untertitel === true,
    beiEinstellung: (name, wert) => speichereEinstellung(name, wert).catch(() => {}),
    beiFolieGelaufen: async (index) => {
      const vorher = videoStand(fortschritt.videos?.[video.id]);
      const nachher = folieGelaufen(vorher, index, video.folien.length);
      fortschritt = { ...fortschritt, videos: { ...fortschritt.videos, [video.id]: nachher } };
      try {
        await speichereFortschritt(fortschritt);
      } catch {
        /* Fortschritt beim nächsten Mal */
      }
      if (nachher.gesehen && !vorher.gesehen) ansage('Video als gesehen markiert.');
    },
    endeInhalt: () => [
      el('a', { class: 'knopf haupt', href: baueRoute('ueben', paket.id, video.unterthema), text: 'Fragen zu diesem Unterthema üben' }),
      naechstes ? el('a', { class: 'knopf', href: baueRoute('videos', paket.id, naechstes.id), text: 'Nächstes Video' }) : '',
    ],
  });

  wurzel.append(
    el('p', { class: 'paket-fach', text: namen.get(video.unterthema) ?? '' }),
    el('h1', { text: video.titel }),
    player.element,
    el(
      'p',
      { class: 'klein tasten-hinweis' },
      'Tastatur: Leertaste = Abspielen/Pause, ← → = Folie zurück/vor.',
    ),
    mitAufnahmen
      ? el('p', { class: 'klein', text: `Stimme: ${vertonung.stimme || 'Sprachaufnahme'} – vorab aufgenommen, es werden keine Daten an fremde Dienste geschickt.` })
      : sprecher.stimme
      ? el('p', { class: 'klein', text: `Stimme: ${sprecher.stimme.name}${sprecher.stimme.localService === false ? ' (online – der Text geht an den Anbieter der Stimme)' : ''}. Ändern unter Einstellungen.` })
      : '',
    el(
      'div',
      { class: 'aktionen' },
      el('a', { class: 'knopf', href: baueRoute('videos', paket.id), text: 'Alle Videos' }),
      el('a', { class: 'knopf', href: baueRoute('zusammenfassung', paket.id, video.unterthema), text: 'Zusammenfassung' }),
    ),
  );
  return () => player.aufraeumen();
}

function listeZeigen(wurzel, paket, fortschritt, namen) {
  wurzel.append(el('h1', { text: 'Videos' }));
  for (const u of paket.unterthemen) {
    const videos = paket.videos.filter((v) => v.unterthema === u.id);
    if (videos.length === 0) continue;
    wurzel.append(
      el('h2', { text: namen.get(u.id) }),
      el(
        'ul',
        { class: 'video-liste' },
        videos.map((v) => {
          const gesehen = videoStand(fortschritt.videos?.[v.id]).gesehen;
          return el(
            'li',
            {},
            el(
              'a',
              { class: `video-eintrag${gesehen ? ' gesehen' : ''}`, href: baueRoute('videos', paket.id, v.id) },
              el('span', { class: 'video-symbol', 'aria-hidden': 'true', text: gesehen ? '✓' : '▶' }),
              el('span', { class: 'video-titel', text: v.titel }),
              el('span', { class: 'klein', text: `${v.folien.length} Folien${gesehen ? ', gesehen' : ''}` }),
            ),
          );
        }),
      ),
    );
  }
}

/** Vorab erzeugte Aufnahmen zum Paket (pakete/audio/<id>/stimme.json) – fehlen sie, liest die Browser-Stimme. */
async function vertonungLaden(paketId) {
  if (!/^[a-z0-9_-]{1,40}$/.test(paketId)) return null;
  try {
    const antwort = await fetch(`pakete/audio/${paketId}/stimme.json`, { credentials: 'same-origin' });
    return antwort.ok ? leseVertonung(await antwort.json()) : null;
  } catch {
    return null;
  }
}
