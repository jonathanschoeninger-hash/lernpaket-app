// Fortschritt pro Paket (Aufbau nach DESIGN.md 8) – reine Logik ohne DOM.

import { kartenWissen } from './leitner.js';

export function leererFortschritt(paketId) {
  return {
    paketId,
    uebungsstand: {},
    antworten: [],
    tests: [],
    karten: {},
    videos: {},
    notenschluessel: null,
  };
}

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

function nurBekannte(eintraege, ids) {
  if (!istObjekt(eintraege)) return {};
  return Object.fromEntries(Object.entries(eintraege).filter(([id]) => ids.has(id)));
}

/**
 * Fortschritt beim Ersetzen eines Pakets mit gleicher id übernehmen (DESIGN.md 10, Punkt 5):
 * Einträge zu Fragen, Karten und Videos bleiben nur, wenn es die ID im neuen Paket noch gibt.
 * Testverlauf und eigener Notenschlüssel gehören zum ganzen Paket und bleiben.
 */
export function fortschrittUebernehmen(alt, neuesPaket) {
  const neu = leererFortschritt(neuesPaket.id);
  if (!istObjekt(alt)) return neu;

  const fragen = new Set(neuesPaket.fragen.map((f) => f.id));
  const karten = new Set(neuesPaket.karten.map((k) => k.id));
  const videos = new Set(neuesPaket.videos.map((v) => v.id));

  neu.uebungsstand = nurBekannte(alt.uebungsstand, fragen);
  neu.karten = nurBekannte(alt.karten, karten);
  neu.videos = nurBekannte(alt.videos, videos);
  neu.antworten = Array.isArray(alt.antworten)
    ? alt.antworten.filter((a) => istObjekt(a) && fragen.has(a.frageId))
    : [];
  neu.tests = Array.isArray(alt.tests) ? alt.tests : [];
  neu.notenschluessel = istObjekt(alt.notenschluessel) ? alt.notenschluessel : null;
  return neu;
}

/**
 * Fortschritt in Prozent für die Liste „Meine Pakete“.
 * Bis Üben und Test fertig sind (Phase 3/4): Anteil der Karten in Fach 3–5.
 */
export function paketFortschritt(paket, fortschritt) {
  const anteil = kartenWissen(paket.karten, fortschritt?.karten ?? {});
  return anteil === null ? 0 : Math.round(anteil * 100);
}
