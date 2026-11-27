// Vorab erzeugte Sprachaufnahmen (z. B. mit ElevenLabs) für die Videos – reine Logik ohne DOM.
// Die MP3s liegen neben dem Paket: pakete/audio/<paket-id>/<datei>.mp3, dazu stimme.json:
//   { "stimme": "…", "videos": { "v1": [ { "datei": "v1-0.mp3", "text": "<Prüfwert des Sprechertexts>" }, … ] } }
// Passt der Prüfwert nicht mehr zum Sprechertext (Text wurde geändert), liest wieder die Browser-Stimme.

const DATEI = /^[a-z0-9_-]{1,60}\.mp3$/;

/** Kurzer Prüfwert (FNV-1a, 32 Bit) eines Sprechertexts – Leerraum wird vereinheitlicht. */
export function textPruefwert(text) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(t)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** stimme.json prüfen; unsichere oder kaputte Einträge werden zu null. */
export function leseVertonung(daten) {
  if (!daten || typeof daten !== 'object' || !daten.videos || typeof daten.videos !== 'object' || Array.isArray(daten.videos)) {
    return null;
  }
  const videos = {};
  for (const [id, liste] of Object.entries(daten.videos)) {
    if (!Array.isArray(liste)) continue;
    videos[id] = liste.map((e) =>
      e && typeof e === 'object' && DATEI.test(e.datei) && /^[0-9a-f]{8}$/.test(e.text) ? { datei: e.datei, text: e.text } : null,
    );
  }
  return { stimme: typeof daten.stimme === 'string' ? daten.stimme.slice(0, 120) : '', videos };
}

/** Dateiname der Aufnahme für eine Folie – nur wenn sie zum aktuellen Sprechertext passt. */
export function audioFuerFolie(vertonung, videoId, index, sprechertext) {
  const e = vertonung?.videos?.[videoId]?.[index];
  return e && e.text === textPruefwert(sprechertext) ? e.datei : null;
}

/** Wann beginnt welcher Satz in einer Aufnahme der Länge `dauer` (Sekunden)? – nach Textlänge verteilt. */
export function satzZeitpunkte(saetze, dauer) {
  if (!Number.isFinite(dauer) || dauer <= 0) return saetze.map(() => 0);
  const gesamt = saetze.reduce((s, t) => s + t.length, 0) || 1;
  let bisher = 0;
  return saetze.map((t) => {
    const start = (bisher / gesamt) * dauer;
    bisher += t.length;
    return start;
  });
}

/** Index des Satzes, der zur Zeit `t` läuft. */
export function satzBeiZeit(zeitpunkte, t) {
  let i = 0;
  while (i + 1 < zeitpunkte.length && t >= zeitpunkte[i + 1]) i++;
  return i;
}
