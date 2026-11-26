// Karteikarten nach dem Leitner-System (DESIGN.md 5.4).
// Reine Logik ohne DOM – Daten als JJJJ-MM-TT-Text, damit Vergleiche einfach bleiben.

/** Tage bis zur nächsten Wiederholung pro Fach. */
export const INTERVALLE = Object.freeze({ 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 });

const DATUM_MUSTER = /^\d{4}-\d{2}-\d{2}$/;

/** Kalendertage zu einem Datum (JJJJ-MM-TT) addieren. */
export function datumPlusTage(datum, tage) {
  const [j, m, t] = datum.split('-').map(Number);
  const d = new Date(Date.UTC(j, m - 1, t + tage));
  return d.toISOString().slice(0, 10);
}

/** Heutiges Datum in der lokalen Zeitzone. */
export function heutigesDatum(jetzt = new Date()) {
  const zwei = (n) => String(n).padStart(2, '0');
  return `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}`;
}

function gueltig(eintrag) {
  return (
    eintrag &&
    Number.isInteger(eintrag.fach) &&
    eintrag.fach >= 1 &&
    eintrag.fach <= 5 &&
    typeof eintrag.faelligAm === 'string' &&
    DATUM_MUSTER.test(eintrag.faelligAm)
  );
}

/** Gespeicherter Stand einer Karte – neue oder kaputte Einträge: Fach 1, heute fällig. */
export function kartenEintrag(stand, karteId, heute) {
  const e = stand?.[karteId];
  return gueltig(e) ? { fach: e.fach, faelligAm: e.faelligAm } : { fach: 1, faelligAm: heute };
}

/** Neuer Stand nach einer Antwort: gewusst → ein Fach weiter, sonst zurück in Fach 1. */
export function beantworte(eintrag, gewusst, heute) {
  const altesFach = gueltig(eintrag) ? eintrag.fach : 1;
  const fach = gewusst ? Math.min(altesFach + 1, 5) : 1;
  return { fach, faelligAm: datumPlusTage(heute, INTERVALLE[fach]) };
}

export function istFaellig(eintrag, heute) {
  return !gueltig(eintrag) || eintrag.faelligAm <= heute;
}

/** Fällige Karten, optional nur eines Unterthemas; am längsten überfällige zuerst. */
export function faelligeKarten(karten, stand, heute, unterthema = null) {
  return karten
    .filter((k) => !unterthema || k.unterthema === unterthema)
    .filter((k) => istFaellig(stand?.[k.id], heute))
    .map((k, i) => ({ k, i, datum: kartenEintrag(stand, k.id, heute).faelligAm }))
    .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.i - b.i))
    .map(({ k }) => k);
}

/** Wann ist die nächste Karte fällig? Überfälliges zählt als heute; keine Karten → null. */
export function naechsteFaelligkeit(karten, stand, heute) {
  let frueheste = null;
  for (const k of karten) {
    const d = kartenEintrag(stand, k.id, heute).faelligAm;
    if (frueheste === null || d < frueheste) frueheste = d;
  }
  if (frueheste === null) return null;
  return frueheste < heute ? heute : frueheste;
}

/** Anzahl Karten in Fach 1 bis 5 (Index 0 = Fach 1). */
export function fachVerteilung(karten, stand) {
  const anzahl = [0, 0, 0, 0, 0];
  for (const k of karten) anzahl[kartenEintrag(stand, k.id, '0000-00-00').fach - 1]++;
  return anzahl;
}

/** Anteil der Karten in Fach 3–5 (0 bis 1), für „Was kann ich?“; keine Karten → null. */
export function kartenWissen(karten, stand) {
  if (karten.length === 0) return null;
  const [, , f3, f4, f5] = fachVerteilung(karten, stand);
  return (f3 + f4 + f5) / karten.length;
}

function csvFeld(text) {
  return `"${String(text).replaceAll('"', '""')}"`;
}

function tag(text) {
  return String(text).trim().replace(/\s+/g, '_');
}

/** Karten als CSV für den Anki-Import (Semikolon, Tags „Paket::Unterthema“). */
export function ankiCsv(paket) {
  const namen = new Map(paket.unterthemen.map((u) => [u.id, u.name]));
  const zeilen = ['#separator:Semicolon', '#html:false', '#tags column:3'];
  for (const k of paket.karten) {
    const tags = `${tag(paket.titel)}::${tag(namen.get(k.unterthema) ?? k.unterthema)}`;
    zeilen.push([csvFeld(k.vorne), csvFeld(k.hinten), csvFeld(tags)].join(';'));
  }
  return zeilen.join('\n') + '\n';
}
