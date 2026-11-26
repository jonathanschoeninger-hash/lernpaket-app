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
