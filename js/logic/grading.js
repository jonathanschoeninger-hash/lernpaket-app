// Auswertung der Antworten je Fragetyp (DESIGN.md 4.2) – reine Logik ohne DOM.
//
// Antwortformate:
//   mc          Index der gewählten Option (Zahl) oder null
//   mehrfach    Liste der gewählten Indizes
//   wahrfalsch  true / false / null
//   lueckentext Liste der eingetippten Texte, eine pro Lücke
//   zuordnen    Liste: pro Paar (Reihenfolge wie im Paket) der gewählte `rechts`-Text
//   reihenfolge Liste der Schritt-Texte in der gewählten Reihenfolge
//   zahl        eingetippter Text
//   freitext    { punkte } – vom Nutzer bestätigte Punkte

export function maxPunkte(frage) {
  if (frage.typ === 'lueckentext') return frage.luecken.length;
  if (frage.typ === 'freitext') return frage.maxPunkte;
  return 1;
}

export function normalisiereLuecke(text) {
  return String(text ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');
}

/** "2,5" / "2.5" / "1 000" / "−3,5 ATP" → Zahl; ungültig → null. */
export function leseZahl(text, einheit) {
  let t = String(text ?? '').trim();
  if (einheit) {
    const e = einheit.trim().toLocaleLowerCase('de');
    if (e && t.toLocaleLowerCase('de').endsWith(e)) t = t.slice(0, t.length - e.length);
  }
  t = t.replace(/\s+/g, '').replace('−', '-').replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Number(t);
}

function ergebnis(punkte, max, teile = null) {
  return { punkte, max, richtig: punkte >= max, teile };
}

export function bewerteAntwort(frage, antwort) {
  const max = maxPunkte(frage);
  switch (frage.typ) {
    case 'mc':
      return ergebnis(antwort === frage.richtig[0] ? 1 : 0, max);

    case 'wahrfalsch':
      return ergebnis(typeof antwort === 'boolean' && antwort === frage.richtig ? 1 : 0, max);

    case 'mehrfach': {
      const gewaehlt = new Set(Array.isArray(antwort) ? antwort : []);
      const richtig = new Set(frage.richtig);
      let fehler = 0;
      for (const i of richtig) if (!gewaehlt.has(i)) fehler++;
      for (const i of gewaehlt) if (!richtig.has(i)) fehler++;
      return ergebnis(fehler === 0 ? 1 : fehler === 1 ? 0.5 : 0, max);
    }

    case 'lueckentext': {
      const liste = Array.isArray(antwort) ? antwort : [];
      const teile = frage.luecken.map((erlaubt, i) =>
        erlaubt.some((e) => normalisiereLuecke(e) === normalisiereLuecke(liste[i]) && normalisiereLuecke(liste[i]) !== ''),
      );
      return ergebnis(teile.filter(Boolean).length, max, teile);
    }

    case 'zuordnen': {
      const liste = Array.isArray(antwort) ? antwort : [];
      const teile = frage.paare.map((p, i) => liste[i] === p.rechts);
      const treffer = teile.filter(Boolean).length;
      const n = frage.paare.length;
      return ergebnis(treffer === n ? 1 : treffer >= n / 2 ? 0.5 : 0, max, teile);
    }

    case 'reihenfolge': {
      const liste = Array.isArray(antwort) ? antwort : [];
      const ok = liste.length === frage.schritte.length && frage.schritte.every((s, i) => liste[i] === s);
      return ergebnis(ok ? 1 : 0, max);
    }

    case 'zahl': {
      const wert = leseZahl(antwort, frage.einheit);
      if (wert === null) return ergebnis(0, max);
      // Kleiner Spielraum gegen Rundungsfehler bei Kommazahlen (0,1 + 0,2 …).
      const ok = Math.abs(wert - frage.loesung) <= frage.toleranz + 1e-9;
      return ergebnis(ok ? 1 : 0, max);
    }

    case 'freitext': {
      const p = typeof antwort?.punkte === 'number' ? antwort.punkte : 0;
      return ergebnis(Math.min(Math.max(p, 0), max), max);
    }

    default:
      return ergebnis(0, max);
  }
}

function zahlText(z) {
  return String(z).replace('.', ',');
}

/** Richtige Lösung als Textzeilen für die Anzeige. */
export function loesungAlsText(frage) {
  switch (frage.typ) {
    case 'mc':
    case 'mehrfach':
      return frage.richtig.map((i) => frage.optionen[i]);
    case 'wahrfalsch':
      return [frage.richtig ? 'Richtig' : 'Falsch'];
    case 'lueckentext':
      return [frage.text.replace(/\{\{(\d+)\}\}/g, (_, n) => frage.luecken[Number(n) - 1]?.[0] ?? '…')];
    case 'zuordnen':
      return frage.paare.map((p) => `${p.links} → ${p.rechts}`);
    case 'reihenfolge':
      return frage.schritte.map((s, i) => `${i + 1}. ${s}`);
    case 'zahl': {
      const einheit = frage.einheit ? ` ${frage.einheit}` : '';
      const toleranz = frage.toleranz > 0 ? ` (± ${zahlText(frage.toleranz)})` : '';
      return [`${zahlText(frage.loesung)}${einheit}${toleranz}`];
    }
    case 'freitext':
      return [frage.musterloesung];
    default:
      return [];
  }
}

// ---------- Noten (DESIGN.md 6.1) ----------

export const NOTEN = ['Sehr gut', 'Gut', 'Befriedigend', 'Genügend', 'Nicht genügend'];

export const VORLAGEN = Object.freeze({
  standard: { name: 'Standard (Schularbeit)', grenzen: [89, 76, 63, 50] },
  mathe: { name: 'Mathematik-Empfehlung', grenzen: [85, 75, 60, 50] },
});

/** Beispiel: AHS Mathematik Jänner 2026 (aus DESIGN.md) – zum Vorausfüllen. */
export const MATURA_BEISPIEL = Object.freeze({ hoechstpunkte: 36, punkte: Object.freeze([32, 27, 22, 17]) });

const EPS = 1e-9;
const istZahl = (x) => typeof x === 'number' && Number.isFinite(x);

/**
 * Notenschlüssel prüfen. Formen:
 *   { art: 'standard' } · { art: 'mathe' } · { art: 'eigen', grenzen: [sg, g, b, ge] } (Prozent)
 *   { art: 'matura', hoechstpunkte, punkte: [sg, g, b, ge] }
 * Liefert eine Liste verständlicher Fehler (leer = in Ordnung).
 */
export function pruefeSchluessel(schluessel) {
  if (!schluessel || typeof schluessel !== 'object') return ['Kein Notenschlüssel angegeben.'];
  if (schluessel.art === 'standard' || schluessel.art === 'mathe') return [];

  const absteigend = (liste) => liste.every((x, i) => i === 0 || x < liste[i - 1]);

  if (schluessel.art === 'eigen') {
    const g = schluessel.grenzen;
    if (!Array.isArray(g) || g.length !== 4) return ['Bitte genau 4 Grenzen angeben (Sehr gut, Gut, Befriedigend, Genügend).'];
    if (!g.every(istZahl)) return ['Jede Grenze muss eine Zahl sein.'];
    if (!g.every((x) => x >= 1 && x <= 100)) return ['Jede Grenze muss zwischen 1 und 100 % liegen.'];
    if (!absteigend(g)) return ['Die Grenzen müssen absteigend sein: Sehr gut > Gut > Befriedigend > Genügend.'];
    return [];
  }

  if (schluessel.art === 'matura') {
    const h = schluessel.hoechstpunkte;
    const p = schluessel.punkte;
    if (!istZahl(h) || h <= 0) return ['Die Höchstpunkte müssen eine Zahl über 0 sein.'];
    if (!Array.isArray(p) || p.length !== 4) return ['Bitte genau 4 Punktegrenzen angeben (Sehr gut, Gut, Befriedigend, Genügend).'];
    if (!p.every(istZahl)) return ['Jede Punktegrenze muss eine Zahl sein.'];
    if (!p.every((x) => x > 0 && x <= h)) return [`Jede Punktegrenze muss über 0 und höchstens ${h} sein.`];
    if (!absteigend(p)) return ['Die Punktegrenzen müssen absteigend sein: Sehr gut > Gut > Befriedigend > Genügend.'];
    return [];
  }

  return ['Unbekannte Art von Notenschlüssel.'];
}

/** Grenzen in Prozent [Sehr gut, Gut, Befriedigend, Genügend]; ungültig → Standard. */
export function schluesselGrenzen(schluessel) {
  if (pruefeSchluessel(schluessel).length > 0) return [...VORLAGEN.standard.grenzen];
  if (schluessel.art === 'eigen') return [...schluessel.grenzen];
  if (schluessel.art === 'matura') return schluessel.punkte.map((p) => (p / schluessel.hoechstpunkte) * 100);
  return [...VORLAGEN[schluessel.art].grenzen];
}

export function schluesselName(schluessel) {
  if (pruefeSchluessel(schluessel).length > 0) return VORLAGEN.standard.name;
  if (schluessel.art === 'eigen') return `Eigener Schlüssel (${schluessel.grenzen.map(zahlText).join('/')} %)`;
  if (schluessel.art === 'matura') {
    return `Matura (${schluessel.punkte.map(zahlText).join('/')} von ${zahlText(schluessel.hoechstpunkte)} Punkten)`;
  }
  return VORLAGEN[schluessel.art].name;
}

/** Note 1–5; Grenzen gelten „ab“ (≥). */
export function noteAus(prozent, grenzen) {
  for (let i = 0; i < 4; i++) if (prozent >= grenzen[i] - EPS) return i + 1;
  return 5;
}

/** Prozent mit höchstens einer Kommastelle, abgerundet (49,96 → „49,9 %“). */
export function prozentText(prozent) {
  const p = Math.floor(prozent * 10 + EPS) / 10;
  return `${zahlText(p)} %`;
}

/** „Befriedigend (3) – 68 %. Noch 8 % bis Gut.“ */
export function ergebnisText(prozent, grenzen) {
  const note = noteAus(prozent, grenzen);
  const anfang = `${NOTEN[note - 1]} (${note}) – ${prozentText(prozent)}.`;
  if (note === 1) return anfang;
  const fehlt = Math.ceil((grenzen[note - 2] - prozent) * 10 - EPS) / 10;
  return `${anfang} Noch ${zahlText(fehlt)} % bis ${NOTEN[note - 2]}.`;
}

// ---------- Test auswerten ----------

/**
 * antworten: { frageId: antwort } · freitextPunkte: { frageId: bestätigte Punkte }
 * → { punkte, max, prozent, proUnterthema: { uid: { punkte, max } }, fragen: [{ frageId, antwort, punkte, max }] }
 */
export function testAuswerten(fragen, antworten, freitextPunkte = {}) {
  let punkte = 0;
  let max = 0;
  const proUnterthema = {};
  const einzeln = [];
  for (const f of fragen) {
    const antwort = antworten?.[f.id] ?? null;
    const e = f.typ === 'freitext'
      ? bewerteAntwort(f, { punkte: freitextPunkte?.[f.id] ?? 0 })
      : bewerteAntwort(f, antwort);
    punkte += e.punkte;
    max += e.max;
    const u = (proUnterthema[f.unterthema] ??= { punkte: 0, max: 0 });
    u.punkte += e.punkte;
    u.max += e.max;
    einzeln.push({ frageId: f.id, antwort, punkte: e.punkte, max: e.max });
  }
  return { punkte, max, prozent: max > 0 ? (punkte / max) * 100 : 0, proUnterthema, fragen: einzeln };
}

/** Unterthemen unter der Genügend-Grenze (für den Hinweis bei einer 5). */
export function fehlendeUnterthemen(proUnterthema, grenzen) {
  return Object.entries(proUnterthema)
    .filter(([, u]) => u.max > 0 && (u.punkte / u.max) * 100 < grenzen[3] - EPS)
    .map(([id]) => id);
}

/** Die gegebene Antwort als Textzeilen (für das Testergebnis). */
export function antwortAlsText(frage, antwort) {
  const leer = ['keine Antwort'];
  const strich = (t) => (String(t ?? '').trim() === '' ? '–' : String(t));
  switch (frage.typ) {
    case 'mc':
      return typeof antwort === 'number' ? [frage.optionen[antwort]] : leer;
    case 'mehrfach':
      return Array.isArray(antwort) && antwort.length ? [...antwort].sort((a, b) => a - b).map((i) => frage.optionen[i]) : leer;
    case 'wahrfalsch':
      return typeof antwort === 'boolean' ? [antwort ? 'Richtig' : 'Falsch'] : leer;
    case 'lueckentext':
      return Array.isArray(antwort) ? frage.luecken.map((_, i) => `Lücke ${i + 1}: ${strich(antwort[i])}`) : leer;
    case 'zuordnen':
      return Array.isArray(antwort) ? frage.paare.map((p, i) => `${p.links} → ${strich(antwort[i])}`) : leer;
    case 'reihenfolge':
      return Array.isArray(antwort) ? antwort.map((s, i) => `${i + 1}. ${s}`) : leer;
    case 'zahl':
      return String(antwort ?? '').trim() ? [`${String(antwort).trim()}${frage.einheit ? ` ${frage.einheit}` : ''}`] : leer;
    case 'freitext':
      return String(antwort ?? '').trim() ? [String(antwort).trim()] : leer;
    default:
      return leer;
  }
}
