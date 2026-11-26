// Video-Logik (DESIGN.md 4.1 und 5.2) – reine Logik ohne DOM.

/** Wie viele Teile einer Folie nacheinander erscheinen. */
export function aufdeckSchritte(folie) {
  switch (folie.layout) {
    case 'stichpunkte':
      return folie.punkte?.length ?? 0;
    case 'ablauf':
      return folie.schritte?.length ?? 0;
    case 'formel':
      return folie.teile?.length ?? 0;
    case 'vergleich':
      return 2;
    case 'begriff':
      return 1;
    default:
      return 0;
  }
}

/**
 * Wie viele Teile sind sichtbar, während Satz `satz` (ab 0) von `anzahlSaetze` gesprochen wird?
 * Die Teile verteilen sich gleichmäßig auf die Sätze; beim letzten Satz ist alles sichtbar.
 */
export function sichtbarBis(satz, anzahlSaetze, schritte) {
  if (schritte === 0) return 0;
  if (anzahlSaetze <= 0) return schritte;
  return Math.min(schritte, Math.ceil(((satz + 1) * schritte) / anzahlSaetze));
}

/** „Gesehen“ ab 80 % der Folien. */
export function gesehenGrenze(anzahlFolien) {
  return Math.max(1, Math.ceil(anzahlFolien * 0.8 - 1e-9));
}

/** Gespeicherter Stand eines Videos: { gesehen, gelaufen: [Folien-Indizes] } */
export function videoStand(gespeichert) {
  return {
    gesehen: gespeichert?.gesehen === true,
    gelaufen: Array.isArray(gespeichert?.gelaufen) ? gespeichert.gelaufen.filter(Number.isInteger) : [],
  };
}

/** Folie als gelaufen merken; ab 80 % gilt das Video als gesehen (und bleibt es). */
export function folieGelaufen(gespeichert, index, anzahlFolien) {
  const stand = videoStand(gespeichert);
  const gelaufen = stand.gelaufen.includes(index) ? stand.gelaufen : [...stand.gelaufen, index].sort((a, b) => a - b);
  return { gesehen: stand.gesehen || gelaufen.length >= gesehenGrenze(anzahlFolien), gelaufen };
}
