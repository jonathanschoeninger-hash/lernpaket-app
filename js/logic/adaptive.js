// Adaptiver Übungsmodus (DESIGN.md 5.5) – reine Logik ohne DOM.
// Der Zufallsgenerator wird übergeben, damit Tests reproduzierbar sind.

export const START_GEWICHT = 1;
const SPERRE_ZUEGE = 2;          // gerade gestellte Frage ist 2 Züge gesperrt
const WIEDER_NACH = 3;           // falsche Frage kommt spätestens nach 3 anderen wieder

const zahlOder = (wert, ersatz, gueltig) => (typeof wert === 'number' && Number.isFinite(wert) && gueltig(wert) ? wert : ersatz);

/** Übungsstand einer Frage, fehlende oder kaputte Werte durch Startwerte ersetzt. */
export function standVon(uebungsstand, frageId) {
  const s = uebungsstand?.[frageId] ?? {};
  return {
    gewicht: zahlOder(s.gewicht, START_GEWICHT, (x) => x > 0),
    serie: zahlOder(s.serie, 0, (x) => x >= 0 && Number.isInteger(x)),
    gemeistert: s.gemeistert === true,
    richtig: zahlOder(s.richtig, 0, (x) => x >= 0),
    falsch: zahlOder(s.falsch, 0, (x) => x >= 0),
    zuletzt: typeof s.zuletzt === 'number' ? s.zuletzt : null,
  };
}

/** Neuer Stand nach einer Antwort. Teilpunkte zählen vorher schon als falsch. */
export function bewerte(stand, richtig, zeitpunkt) {
  const neu = richtig
    ? { ...stand, gewicht: stand.gewicht * 0.4, serie: stand.serie + 1, richtig: stand.richtig + 1 }
    : { ...stand, gewicht: stand.gewicht * 2 + 1, serie: 0, falsch: stand.falsch + 1 };
  neu.zuletzt = zeitpunkt;
  const noetig = neu.falsch > 0 ? 3 : 2;
  neu.gemeistert = neu.serie >= noetig;
  return neu;
}

/** Übungsfragen (nurTest = false), die noch nicht gemeistert sind. */
export function uebungsPool(fragen, uebungsstand, { unterthema = null, nurIds = null } = {}) {
  const ids = nurIds ? new Set(nurIds) : null;
  return fragen.filter(
    (f) =>
      f.nurTest === false &&
      (!unterthema || f.unterthema === unterthema) &&
      (!ids || ids.has(f.id)) &&
      !standVon(uebungsstand, f.id).gemeistert,
  );
}

/** „Neue Runde“: gemeistert und Serie zurücksetzen – Gewichte und Zähler bleiben. */
export function neueRunde(uebungsstand, frageIds) {
  const neu = { ...uebungsstand };
  for (const id of frageIds) {
    if (neu[id]) neu[id] = { ...neu[id], gemeistert: false, serie: 0 };
  }
  return neu;
}

/** Zustand einer laufenden Runde (nur im Speicher). */
export function leereRunde() {
  return { letzte: [], offen: {}, zuege: [] };
}

/** Nach jeder Antwort aufrufen. */
export function merkeZug(runde, frageId, richtig) {
  const offen = {};
  for (const [id, anzahl] of Object.entries(runde.offen)) {
    if (id !== frageId) offen[id] = anzahl + 1;
  }
  if (!richtig) offen[frageId] = 0;
  return {
    letzte: [frageId, ...runde.letzte].slice(0, SPERRE_ZUEGE),
    offen,
    zuege: [...runde.zuege, { frageId, richtig }],
  };
}

export function gewichteteAuswahl(liste, gewichte, zufall) {
  const summe = gewichte.reduce((a, b) => a + b, 0);
  let ziel = zufall() * summe;
  for (let i = 0; i < liste.length; i++) {
    ziel -= gewichte[i];
    if (ziel < 0) return liste[i];
  }
  return liste[liste.length - 1];
}

/** Nächste Frage aus dem Pool, oder null wenn der Pool leer ist. */
export function naechsteFrage(pool, uebungsstand, runde, zufall) {
  if (pool.length === 0) return null;

  // 1. Falsch beantwortete Frage, die schon 3 andere abgewartet hat, kommt jetzt dran.
  const faellig = pool
    .filter((f) => (runde.offen[f.id] ?? -1) >= WIEDER_NACH && f.id !== runde.letzte[0])
    .sort((a, b) => runde.offen[b.id] - runde.offen[a.id]);
  if (faellig.length > 0) return faellig[0];

  // 2. Gesperrte Fragen auslassen – bei kleinem Pool die Sperre lockern.
  let kandidaten = pool;
  for (let sperre = SPERRE_ZUEGE; sperre >= 0; sperre--) {
    const gesperrt = new Set(runde.letzte.slice(0, sperre));
    kandidaten = pool.filter((f) => !gesperrt.has(f.id));
    if (kandidaten.length > 0) break;
  }

  // 3. Gewichtet zufällig.
  const gewichte = kandidaten.map((f) => standVon(uebungsstand, f.id).gewicht);
  return gewichteteAuswahl(kandidaten, gewichte, zufall);
}

/** Bericht am Ende einer Runde. zuege: [{ frageId, richtig }] */
export function rundenBericht(zuege, fragen) {
  if (zuege.length === 0) return { antworten: 0, richtig: 0, trefferquote: null, schwierigste: [] };
  const richtig = zuege.filter((z) => z.richtig).length;
  const falsch = new Map();
  for (const z of zuege) if (!z.richtig) falsch.set(z.frageId, (falsch.get(z.frageId) ?? 0) + 1);
  const nachId = new Map(fragen.map((f) => [f.id, f]));
  const schwierigste = [...falsch.entries()]
    .filter(([id]) => nachId.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, anzahl]) => ({ frage: nachId.get(id), falsch: anzahl }));
  return { antworten: zuege.length, richtig, trefferquote: richtig / zuege.length, schwierigste };
}
