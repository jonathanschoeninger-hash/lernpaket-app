// Freitext ohne KI bewerten (DESIGN.md 4.2): Bewertungspunkte über Schlüsselwörter erkennen,
// Punkte vorschlagen – der Nutzer bestätigt oder korrigiert in ½-Schritten.

const UMLAUTE = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** klein, ä→ae usw., Satzzeichen zu Leerzeichen, Leerraum zusammengefasst. */
export function normalisiere(text) {
  return String(text ?? '')
    .toLocaleLowerCase('de')
    .replace(/[äöüß]/g, (z) => UMLAUTE[z])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // é → e
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Punktevorschlag: Ein Bewertungspunkt gilt als erfüllt, wenn eines seiner Wörter vorkommt –
 * auch als Teil eines längeren Wortes („anaerob“ in „anaerobisch“, „gärung“ in „milchsäuregärung“).
 * Ausnahme: Wörter unter 3 Zeichen zählen nur als ganzes Wort.
 */
export function punkteVorschlag(frage, antwort) {
  const text = ` ${normalisiere(antwort)} `;
  const erfuellt = frage.bewertungspunkte.map((bp) =>
    text.trim() !== '' && bp.woerter.some((w) => {
      const wort = normalisiere(w);
      if (wort === '') return false;
      // Sehr kurze Wörter (z. B. „h+“ → „h“) nur als ganzes Wort, sonst passen sie fast immer.
      return wort.length < 3 ? text.includes(` ${wort} `) : text.includes(wort);
    }),
  );
  const punkte = Math.min(erfuellt.filter(Boolean).length, frage.maxPunkte);
  return { punkte, erfuellt };
}

/** „½ Punkt mehr/weniger“, begrenzt auf 0 bis maxPunkte. */
export function punkteAendern(punkte, aenderung, max) {
  const neu = Math.round((punkte + aenderung) * 2) / 2;
  return Math.min(Math.max(neu, 0), max);
}
