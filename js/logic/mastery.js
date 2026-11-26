// Beherrschung pro Unterthema (DESIGN.md 7) – reine Logik ohne DOM.
//
// Beherrschung = 0,6 × letzter Test + 0,3 × Übungs-Trefferquote (letzte 20 Antworten)
//              + 0,1 × Karteikarten-Wissen (Anteil der Karten in Fach 3–5)
// Fehlt ein Teil, werden die anderen hochgerechnet. Karten, die man noch nie gelernt hat,
// zählen als „fehlt“ (sonst käme jemand, der nur übt, nie über 90 %).

import { kartenWissen } from './leitner.js';

const GEWICHT = { test: 0.6, uebung: 0.3, karten: 0.1 };
const LETZTE_ANTWORTEN = 20;

function letzterTest(tests, unterthemaId) {
  let bester = null;
  for (const t of Array.isArray(tests) ? tests : []) {
    const u = t?.proUnterthema?.[unterthemaId];
    if (!u || !(u.max > 0)) continue;
    if (!bester || t.datum > bester.datum) bester = { datum: t.datum, wert: (u.punkte / u.max) * 100 };
  }
  return bester ? bester.wert : null;
}

function uebungsQuote(paket, antworten, unterthemaId) {
  const ids = new Set(paket.fragen.filter((f) => f.unterthema === unterthemaId).map((f) => f.id));
  const eigene = (Array.isArray(antworten) ? antworten : []).filter((a) => ids.has(a?.frageId));
  if (eigene.length === 0) return null;
  const letzte = [...eigene].sort((a, b) => a.zeitpunkt - b.zeitpunkt).slice(-LETZTE_ANTWORTEN);
  return (letzte.filter((a) => a.richtig).length / letzte.length) * 100;
}

function kartenTeil(paket, kartenStand, unterthemaId) {
  const karten = paket.karten.filter((k) => k.unterthema === unterthemaId);
  if (!karten.some((k) => kartenStand?.[k.id])) return null;
  const w = kartenWissen(karten, kartenStand);
  return w === null ? null : w * 100;
}

/** { test, uebung, karten, wert } – jeweils 0–100 oder null. */
export function beherrschung(paket, fortschritt, unterthemaId) {
  const teile = {
    test: letzterTest(fortschritt?.tests, unterthemaId),
    uebung: uebungsQuote(paket, fortschritt?.antworten, unterthemaId),
    karten: kartenTeil(paket, fortschritt?.karten, unterthemaId),
  };
  let summe = 0;
  let gewichte = 0;
  for (const [name, wert] of Object.entries(teile)) {
    if (wert === null) continue;
    summe += GEWICHT[name] * wert;
    gewichte += GEWICHT[name];
  }
  return { ...teile, wert: gewichte > 0 ? summe / gewichte : null };
}

/** 'gruen' ab Gut-Grenze, 'gelb' ab Genügend-Grenze, sonst 'rot'; ohne Daten 'grau'. */
export function ampel(wert, grenzen) {
  if (wert === null || wert === undefined) return 'grau';
  if (wert >= grenzen[1] - 1e-9) return 'gruen';
  if (wert >= grenzen[3] - 1e-9) return 'gelb';
  return 'rot';
}

export function alleBeherrschungen(paket, fortschritt, grenzen) {
  return paket.unterthemen.map((u) => {
    const b = beherrschung(paket, fortschritt, u.id);
    return { unterthema: u, ...b, farbe: ampel(b.wert, grenzen) };
  });
}

/** IDs der roten Unterthemen (für „Nur meine Schwächen üben“ und Kompensationsprüfung). */
export function schwacheUnterthemen(paket, fortschritt, grenzen) {
  return alleBeherrschungen(paket, fortschritt, grenzen)
    .filter((b) => b.farbe === 'rot')
    .map((b) => b.unterthema.id);
}

/** Durchschnittliche Beherrschung des Pakets in ganzen Prozent; ohne Daten zählt ein Unterthema 0. */
export function paketBeherrschung(paket, fortschritt) {
  if (paket.unterthemen.length === 0) return 0;
  const summe = paket.unterthemen.reduce((s, u) => s + (beherrschung(paket, fortschritt, u.id).wert ?? 0), 0);
  return Math.round(summe / paket.unterthemen.length);
}
