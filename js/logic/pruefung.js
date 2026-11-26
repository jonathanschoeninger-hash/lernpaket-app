// Tests zusammenstellen (DESIGN.md 6 und 6.2) – reine Logik ohne DOM.

export const MODI = Object.freeze({
  schularbeit: {
    name: 'Schularbeit-Simulation',
    beschreibung: '15–20 Fragen aus allen Unterthemen, mit Zeitlimit.',
    anzahl: 20,
    minuten: 50,
  },
  kurztest: {
    name: 'Kurztest',
    beschreibung: 'Stundenwiederholung mit bis zu 10 Fragen.',
    anzahl: 10,
    minuten: 15,
  },
  matura: {
    name: 'Matura schriftlich',
    beschreibung: 'Teil 1 (Grundkompetenzen) oder Teil 2 (vernetzte Aufgaben) getrennt.',
    anzahl: 24,
    minuten: 120,
  },
  kompensation: {
    name: 'Kompensationsprüfung',
    beschreibung: 'Nur die Unterthemen, die gerade rot (negativ) sind.',
    anzahl: 10,
    minuten: 25,
  },
});

/** Welche Matura-Teile gibt es im Paket? → z. B. ['1', '2'] */
export function maturaTeile(fragen) {
  return [...new Set(fragen.map((f) => f.teil).filter((t) => t === '1' || t === '2'))].sort();
}

/**
 * Fragen für einen Test auswählen:
 * - Immer das Unterthema mit den bisher wenigsten Fragen auffüllen (gleichmäßig).
 * - Darin zuerst Fragen mit nurTest, dann Übungsfragen, die am längsten nicht dran waren.
 * - Am Ende gemischt, damit die Fragetypen abwechseln.
 */
export function stelleTestZusammen(
  fragen,
  { anzahl, unterthemen = null, teil = null, uebungsstand = {}, zufall = Math.random } = {},
) {
  const erlaubt = unterthemen ? new Set(unterthemen) : null;
  const kandidaten = fragen
    .filter((f) => (!erlaubt || erlaubt.has(f.unterthema)) && (!teil || f.teil === teil))
    .map((f) => ({ f, los: zufall(), zuletzt: uebungsstand?.[f.id]?.zuletzt ?? -Infinity }));

  // Rangfolge: nurTest zuerst, dann am längsten nicht dran, dann Zufall.
  const besser = (a, b) =>
    (a.f.nurTest === b.f.nurTest ? 0 : a.f.nurTest ? -1 : 1) || a.zuletzt - b.zuletzt || a.los - b.los;

  const gruppen = new Map();
  for (const k of kandidaten) {
    if (!gruppen.has(k.f.unterthema)) gruppen.set(k.f.unterthema, { anzahl: 0, rest: [] });
    gruppen.get(k.f.unterthema).rest.push(k);
  }
  for (const g of gruppen.values()) g.rest.sort(besser);

  const gewaehlt = [];
  while (gewaehlt.length < anzahl) {
    const offen = [...gruppen.values()].filter((g) => g.rest.length > 0);
    if (offen.length === 0) break;
    const wenigste = Math.min(...offen.map((g) => g.anzahl));
    const ziel = offen.filter((g) => g.anzahl === wenigste).sort((a, b) => besser(a.rest[0], b.rest[0]))[0];
    gewaehlt.push(ziel.rest.shift());
    ziel.anzahl++;
  }

  // Mischen (Fisher-Yates mit dem übergebenen Zufall).
  for (let i = gewaehlt.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [gewaehlt[i], gewaehlt[j]] = [gewaehlt[j], gewaehlt[i]];
  }
  return gewaehlt.map((k) => k.f);
}

/** Sekunden → "12:05" */
export function zeitText(sekunden) {
  const s = Math.max(0, Math.ceil(sekunden));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
