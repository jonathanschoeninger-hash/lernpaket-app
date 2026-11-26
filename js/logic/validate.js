// Prüft Lernpakete nach .claude/skills/lernpaket-erstellen/SKILL.md.
//   Fehler   = Formatregeln (SKILL.md Abschnitt 3 + Checkliste Abschnitt 4) → Paket wird abgelehnt
//   Hinweise = Mengen- und Stilregeln (SKILL.md Abschnitt 2/4)            → Paket bleibt ok
// Ohne DOM und ohne Abhängigkeiten – läuft im Browser und in Node.

export const MAX_TEXT = 2000;
export const MAX_AUSFUEHRLICH = 4000;
export const MAX_DATEI_BYTES = 5 * 1024 * 1024;

export const SCHULTYPEN = ['VS', 'MS', 'AHS', 'BHS', 'BMS', 'PTS', 'BS', 'BRP'];
export const PRUEFUNGSARTEN = ['Schularbeit', 'Test', 'Matura', 'Muendlich', 'LAP', 'Sonstiges'];
export const FRAGETYPEN = ['mc', 'mehrfach', 'wahrfalsch', 'lueckentext', 'zuordnen', 'reihenfolge', 'zahl', 'freitext'];
export const LAYOUTS = ['titel', 'stichpunkte', 'begriff', 'ablauf', 'vergleich', 'formel', 'zahl', 'merke', 'quiz'];

const ID_MUSTER = /^[a-z0-9_-]{1,40}$/;
const DATUM_MUSTER = /^\d{4}-\d{2}-\d{2}$/;
// Nur eindeutige Tags wie <b>, </p>, <br/>, <script src="…"> – nicht "x < 5".
const HTML_MUSTER = /<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^<>]*)?\/?>/;
const MARKDOWN_MUSTER = [/\*\*[^*\n]+\*\*/, /__[^_\n]+__/, /^\s{0,3}#{1,6}\s/m, /\[[^\]\n]+\]\([^)\n]+\)/];
const SATZZEICHEN = /[.,;:!?„“”"'()[\]{}]/;

const PAKET_FELDER = ['format', 'version', 'id', 'titel', 'fach', 'schultyp', 'schulstufe', 'pruefungsart',
  'erstellt', 'ersteller', 'quellen', 'unterthemen', 'zusammenfassung', 'karten', 'videos', 'fragen'];
const ZUSAMMENFASSUNG_FELDER = ['unterthema', 'kurz', 'normal', 'ausfuehrlich', 'merke', 'begriffe', 'quelle'];
const KARTE_FELDER = ['id', 'unterthema', 'vorne', 'hinten', 'quelle'];
const VIDEO_FELDER = ['id', 'unterthema', 'titel', 'folien'];
const LAYOUT_FELDER = {
  titel: ['titel', 'untertitel'],
  stichpunkte: ['titel', 'punkte'],
  begriff: ['begriff', 'definition'],
  ablauf: ['titel', 'schritte'],
  vergleich: ['titel', 'links', 'rechts'],
  formel: ['formel', 'teile'],
  zahl: ['zahl', 'einheit', 'bedeutung'],
  merke: ['text'],
  quiz: ['frage', 'optionen', 'richtig'],
};
const FRAGE_FELDER = ['id', 'unterthema', 'typ', 'schwierigkeit', 'frage', 'erklaerung', 'quelle', 'nurTest', 'teil'];
const TYP_FELDER = {
  mc: ['optionen', 'richtig'],
  mehrfach: ['optionen', 'richtig'],
  wahrfalsch: ['richtig'],
  lueckentext: ['text', 'luecken'],
  zuordnen: ['paare'],
  reihenfolge: ['schritte'],
  zahl: ['loesung', 'toleranz', 'einheit'],
  freitext: ['musterloesung', 'maxPunkte', 'bewertungspunkte'],
};

function istObjekt(wert) {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert);
}

function typName(wert) {
  if (wert === null) return 'null';
  if (Array.isArray(wert)) return 'eine Liste';
  switch (typeof wert) {
    case 'string': return 'ein Text';
    case 'number': return 'eine Zahl';
    case 'boolean': return 'true/false';
    case 'object': return 'ein Objekt';
    default: return typeof wert;
  }
}

function zeige(wert) {
  return wert === undefined ? 'nichts' : JSON.stringify(wert);
}

function feld(pfad, name) {
  return pfad ? `${pfad}.${name}` : name;
}

function datumGueltig(wert) {
  if (typeof wert !== 'string' || !DATUM_MUSTER.test(wert)) return false;
  const [jahr, monat, tag] = wert.split('-').map(Number);
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  return d.getUTCFullYear() === jahr && d.getUTCMonth() === monat - 1 && d.getUTCDate() === tag;
}

/**
 * Prüft ein Lernpaket (bereits aus JSON gelesenes Objekt).
 * @returns {{ ok: boolean, fehler: {pfad: string, meldung: string}[], hinweise: {pfad: string, meldung: string}[] }}
 */
export function validatePaket(paket) {
  const fehler = [];
  const hinweise = [];
  const F = (pfad, meldung) => fehler.push({ pfad, meldung });
  const H = (pfad, meldung) => hinweise.push({ pfad, meldung });
  const ergebnis = () => ({ ok: fehler.length === 0, fehler, hinweise });

  if (!istObjekt(paket)) {
    F('', `Das Paket muss ein JSON-Objekt sein ({ … }), ist aber ${typName(paket)}.`);
    return ergebnis();
  }

  // ---------- Bausteine ----------

  function textWert(wert, p, max = MAX_TEXT) {
    if (typeof wert !== 'string') { F(p, `Muss ein Text sein, ist aber ${typName(wert)}.`); return false; }
    if (wert.trim() === '') { F(p, 'Darf nicht leer sein.'); return false; }
    if (wert.length > max) { F(p, `Text ist zu lang: ${wert.length} Zeichen, erlaubt sind höchstens ${max}.`); return false; }
    const html = wert.match(HTML_MUSTER);
    if (html) { F(p, `Enthält HTML („${html[0]}“). Bitte nur reinen Text verwenden.`); return false; }
    if (MARKDOWN_MUSTER.some((m) => m.test(wert))) {
      H(p, 'Sieht nach Markdown aus (z. B. **fett** oder # Titel). Die App zeigt das als normalen Text an.');
    }
    return true;
  }

  function text(obj, name, pfad, { optional = false, max = MAX_TEXT } = {}) {
    const p = feld(pfad, name);
    if (obj[name] === undefined) {
      if (!optional) F(p, 'Pflichtfeld fehlt.');
      return false;
    }
    return textWert(obj[name], p, max);
  }

  /** Liste prüfen; gibt die Liste zurück (auch bei falscher Anzahl), oder null wenn keine Liste. */
  function liste(obj, name, pfad, { optional = false, leerErlaubt = false, min, max, was = 'Einträge' } = {}) {
    const p = feld(pfad, name);
    const wert = obj[name];
    if (wert === undefined) {
      if (!optional) F(p, 'Pflichtfeld fehlt.');
      return null;
    }
    if (!Array.isArray(wert)) { F(p, `Muss eine Liste sein ([ … ]), ist aber ${typName(wert)}.`); return null; }
    if (wert.length === 0 && !leerErlaubt) { F(p, 'Die Liste darf nicht leer sein.'); return wert; }
    if (min !== undefined && wert.length < min) {
      F(p, `Zu wenige ${was}: ${wert.length} – nötig sind ${min === max ? 'genau' : 'mindestens'} ${min}.`);
    } else if (max !== undefined && wert.length > max) {
      F(p, `Zu viele ${was}: ${wert.length} – erlaubt sind ${min === max ? 'genau' : 'höchstens'} ${max}.`);
    }
    return wert;
  }

  function textListe(obj, name, pfad, optionen = {}) {
    const werte = liste(obj, name, pfad, optionen);
    if (werte) werte.forEach((w, i) => textWert(w, `${feld(pfad, name)}[${i}]`));
    return werte;
  }

  function jedesObjekt(werte, pfad, pruefe) {
    werte.forEach((el, i) => {
      const p = `${pfad}[${i}]`;
      if (!istObjekt(el)) { F(p, `Muss ein Objekt sein ({ … }), ist aber ${typName(el)}.`); return; }
      pruefe(el, p, i);
    });
  }

  function unbekannteFelder(obj, pfad, erlaubt) {
    for (const name of Object.keys(obj)) {
      if (!erlaubt.includes(name)) H(feld(pfad, name), 'Unbekanntes Feld – wird ignoriert.');
    }
  }

  function idPruefen(obj, pfad, gesehen) {
    const p = feld(pfad, 'id');
    const wert = obj.id;
    if (wert === undefined) { F(p, 'Pflichtfeld fehlt.'); return null; }
    if (typeof wert !== 'string' || !ID_MUSTER.test(wert)) {
      F(p, `Ungültige ID ${zeige(wert)}: erlaubt sind nur a–z, 0–9, - und _ (1 bis 40 Zeichen).`);
      return null;
    }
    if (gesehen) {
      if (gesehen.has(wert)) { F(p, `ID „${wert}“ kommt doppelt vor (schon bei ${gesehen.get(wert)}).`); return null; }
      gesehen.set(wert, pfad);
    }
    return wert;
  }

  function erlaubterWert(name, erlaubt, bezeichnung) {
    const wert = paket[name];
    if (wert === undefined) { F(name, 'Pflichtfeld fehlt.'); return; }
    if (!erlaubt.includes(wert)) F(name, `Unbekannte${bezeichnung} ${zeige(wert)}. Erlaubt: ${erlaubt.join(', ')}.`);
  }

  // ---------- Kopfdaten ----------

  unbekannteFelder(paket, '', PAKET_FELDER);

  if (paket.format === undefined) F('format', 'Pflichtfeld fehlt.');
  else if (paket.format !== 'lernpaket') F('format', `Muss "lernpaket" sein, ist aber ${zeige(paket.format)}.`);

  if (paket.version === undefined) F('version', 'Pflichtfeld fehlt.');
  else if (paket.version !== 1) F('version', `Version ${zeige(paket.version)} wird nicht unterstützt – nur Version 1.`);

  idPruefen(paket, '', null);
  text(paket, 'titel', '');
  text(paket, 'fach', '');
  text(paket, 'ersteller', '', { optional: true });
  erlaubterWert('schultyp', SCHULTYPEN, 'r Schultyp');
  erlaubterWert('pruefungsart', PRUEFUNGSARTEN, ' Prüfungsart');

  if (paket.schulstufe === undefined) F('schulstufe', 'Pflichtfeld fehlt.');
  else if (!Number.isInteger(paket.schulstufe) || paket.schulstufe < 1 || paket.schulstufe > 13) {
    F('schulstufe', `Muss eine ganze Zahl von 1 bis 13 sein, ist aber ${zeige(paket.schulstufe)}.`);
  }

  if (paket.erstellt === undefined) F('erstellt', 'Pflichtfeld fehlt.');
  else if (!datumGueltig(paket.erstellt)) {
    F('erstellt', `Muss ein gültiges Datum im Format JJJJ-MM-TT sein (z. B. 2026-11-26), ist aber ${zeige(paket.erstellt)}.`);
  }

  // ---------- Quellen & Unterthemen ----------

  const quellenIds = new Map();
  const quellen = liste(paket, 'quellen', '', { leerErlaubt: true });
  if (quellen) {
    jedesObjekt(quellen, 'quellen', (q, p) => {
      unbekannteFelder(q, p, ['id', 'name']);
      idPruefen(q, p, quellenIds);
      text(q, 'name', p);
    });
  }

  const unterthemaIds = new Map();
  const unterthemen = liste(paket, 'unterthemen', '');
  if (unterthemen) {
    jedesObjekt(unterthemen, 'unterthemen', (u, p) => {
      unbekannteFelder(u, p, ['id', 'name']);
      idPruefen(u, p, unterthemaIds);
      text(u, 'name', p);
    });
    if (unterthemen.length > 0 && (unterthemen.length < 2 || unterthemen.length > 8)) {
      H('unterthemen', `${unterthemen.length} Unterthemen – empfohlen sind 2 bis 8.`);
    }
  }
  const utListe = [...unterthemaIds.keys()];

  function unterthemaVerweis(obj, pfad) {
    const p = feld(pfad, 'unterthema');
    const wert = obj.unterthema;
    if (wert === undefined) { F(p, 'Pflichtfeld fehlt.'); return null; }
    if (typeof wert !== 'string' || !unterthemaIds.has(wert)) {
      F(p, `Unterthema „${typeof wert === 'string' ? wert : zeige(wert)}“ gibt es nicht (vorhanden: ${utListe.join(', ') || 'keine'}).`);
      return null;
    }
    return wert;
  }

  function quellePruefen(obj, pfad) {
    if (obj.quelle === undefined) return;
    const p = feld(pfad, 'quelle');
    if (!istObjekt(obj.quelle)) { F(p, `Muss ein Objekt sein ({ "id": "q1", "stelle": "S. 3" }), ist aber ${typName(obj.quelle)}.`); return; }
    unbekannteFelder(obj.quelle, p, ['id', 'stelle']);
    const id = obj.quelle.id;
    if (id === undefined) F(feld(p, 'id'), 'Pflichtfeld fehlt.');
    else if (typeof id !== 'string' || !quellenIds.has(id)) {
      const vorhanden = quellenIds.size ? `vorhanden: ${[...quellenIds.keys()].join(', ')}` : 'die Liste quellen ist leer';
      F(feld(p, 'id'), `Quelle „${typeof id === 'string' ? id : zeige(id)}“ gibt es nicht (${vorhanden}).`);
    }
    text(obj.quelle, 'stelle', p, { optional: true });
  }

  function zaehlerProUnterthema() {
    return new Map(utListe.map((id) => [id, 0]));
  }

  // ---------- Zusammenfassung ----------

  const zusammenfassung = liste(paket, 'zusammenfassung', '');
  if (zusammenfassung) {
    const zfProUt = new Map();
    jedesObjekt(zusammenfassung, 'zusammenfassung', (z, p) => {
      unbekannteFelder(z, p, ZUSAMMENFASSUNG_FELDER);
      const ut = unterthemaVerweis(z, p);
      if (ut) {
        if (zfProUt.has(ut)) {
          F(feld(p, 'unterthema'), `Für Unterthema „${ut}“ gibt es schon eine Zusammenfassung (${zfProUt.get(ut)}) – pro Unterthema ist genau eine erlaubt.`);
        } else zfProUt.set(ut, p);
      }
      text(z, 'kurz', p);
      text(z, 'normal', p);
      text(z, 'ausfuehrlich', p, { max: MAX_AUSFUEHRLICH });

      const merke = textListe(z, 'merke', p);
      if (merke && merke.length > 0 && (merke.length < 2 || merke.length > 5)) {
        H(feld(p, 'merke'), `${merke.length} Merke-Punkte – empfohlen sind 2 bis 5.`);
      }

      const begriffe = textListe(z, 'begriffe', p, { optional: true, leerErlaubt: true, max: 10, was: 'Begriffe' });
      if (begriffe) {
        const gesamt = [z.kurz, z.normal, z.ausfuehrlich].filter((t) => typeof t === 'string').join('\n').toLowerCase();
        begriffe.forEach((b, i) => {
          if (typeof b === 'string' && b.trim() && !gesamt.includes(b.trim().toLowerCase())) {
            H(`${feld(p, 'begriffe')}[${i}]`, `Begriff „${b}“ kommt in kurz, normal und ausfuehrlich nicht vor – er kann nicht hervorgehoben werden.`);
          }
        });
      }
      quellePruefen(z, p);
    });
    if (zusammenfassung.length > 0) {
      for (const ut of utListe) {
        if (!zfProUt.has(ut)) F('zusammenfassung', `Unterthema „${ut}“ hat keine Zusammenfassung.`);
      }
    }
  }

  // ---------- Karteikarten ----------

  const karten = liste(paket, 'karten', '');
  if (karten) {
    const kartenIds = new Map();
    const proUt = zaehlerProUnterthema();
    jedesObjekt(karten, 'karten', (k, p) => {
      unbekannteFelder(k, p, KARTE_FELDER);
      idPruefen(k, p, kartenIds);
      const ut = unterthemaVerweis(k, p);
      if (ut) proUt.set(ut, proUt.get(ut) + 1);
      text(k, 'vorne', p);
      text(k, 'hinten', p);
      quellePruefen(k, p);
    });
    if (karten.length > 0) {
      for (const [ut, n] of proUt) {
        if (n < 8 || n > 15) H('karten', `Unterthema „${ut}“ hat ${n} Karteikarten – empfohlen sind 8 bis 15.`);
      }
    }
  }

  // ---------- Videos ----------

  function indexPruefen(index, anzahl, p) {
    if (index < 0 || index >= anzahl) {
      F(p, `Index ${index} gibt es nicht (nur ${anzahl} Optionen) – gezählt wird ab 0.`);
      return false;
    }
    return true;
  }

  function foliePruefen(folie, p) {
    const layout = folie.layout;
    let bekannt = false;
    if (layout === undefined) F(feld(p, 'layout'), 'Pflichtfeld fehlt.');
    else if (!LAYOUTS.includes(layout)) F(feld(p, 'layout'), `Unbekanntes Layout ${zeige(layout)}. Erlaubt: ${LAYOUTS.join(', ')}.`);
    else bekannt = true;

    text(folie, 'sprechertext', p);
    if (!bekannt) return;
    unbekannteFelder(folie, p, ['layout', 'sprechertext', ...LAYOUT_FELDER[layout]]);

    switch (layout) {
      case 'titel':
        text(folie, 'titel', p);
        text(folie, 'untertitel', p, { optional: true });
        break;
      case 'stichpunkte':
        text(folie, 'titel', p);
        textListe(folie, 'punkte', p, { min: 2, max: 5, was: 'Punkte' });
        break;
      case 'begriff':
        text(folie, 'begriff', p);
        text(folie, 'definition', p);
        break;
      case 'ablauf':
        text(folie, 'titel', p);
        textListe(folie, 'schritte', p, { min: 3, max: 6, was: 'Schritte' });
        break;
      case 'vergleich':
        text(folie, 'titel', p);
        for (const seite of ['links', 'rechts']) {
          const sp = feld(p, seite);
          const wert = folie[seite];
          if (wert === undefined) { F(sp, 'Pflichtfeld fehlt.'); continue; }
          if (!istObjekt(wert)) { F(sp, `Muss ein Objekt sein ({ "ueberschrift": …, "punkte": [ … ] }), ist aber ${typName(wert)}.`); continue; }
          unbekannteFelder(wert, sp, ['ueberschrift', 'punkte']);
          text(wert, 'ueberschrift', sp);
          textListe(wert, 'punkte', sp);
        }
        break;
      case 'formel': {
        text(folie, 'formel', p);
        const teile = liste(folie, 'teile', p);
        if (teile) {
          jedesObjekt(teile, feld(p, 'teile'), (t, tp) => {
            unbekannteFelder(t, tp, ['zeichen', 'bedeutung']);
            text(t, 'zeichen', tp);
            text(t, 'bedeutung', tp);
          });
        }
        break;
      }
      case 'zahl':
        text(folie, 'zahl', p);
        text(folie, 'einheit', p, { optional: true });
        text(folie, 'bedeutung', p);
        break;
      case 'merke':
        text(folie, 'text', p);
        break;
      case 'quiz': {
        text(folie, 'frage', p);
        const optionen = textListe(folie, 'optionen', p, { min: 2, max: 4, was: 'Optionen' });
        const rp = feld(p, 'richtig');
        const richtig = folie.richtig;
        if (richtig === undefined) F(rp, 'Pflichtfeld fehlt.');
        else if (Array.isArray(richtig)) F(rp, 'Muss bei quiz-Folien eine einzelne Zahl sein (z. B. "richtig": 0), keine Liste.');
        else if (!Number.isInteger(richtig)) F(rp, `Muss eine ganze Zahl sein (Index ab 0), ist aber ${typName(richtig)}.`);
        else if (optionen) indexPruefen(richtig, optionen.length, rp);
        break;
      }
    }
  }

  const videos = liste(paket, 'videos', '');
  if (videos) {
    const videoIds = new Map();
    const proUt = zaehlerProUnterthema();
    jedesObjekt(videos, 'videos', (v, p) => {
      unbekannteFelder(v, p, VIDEO_FELDER);
      idPruefen(v, p, videoIds);
      const ut = unterthemaVerweis(v, p);
      if (ut) proUt.set(ut, proUt.get(ut) + 1);
      text(v, 'titel', p);
      const folien = liste(v, 'folien', p);
      if (!folien || folien.length === 0) return;
      jedesObjekt(folien, feld(p, 'folien'), foliePruefen);

      const fp = feld(p, 'folien');
      if (folien.length < 3 || folien.length > 8) H(fp, `${folien.length} Folien – empfohlen sind 3 bis 8.`);
      const erste = folien[0];
      const letzte = folien[folien.length - 1];
      if (istObjekt(erste) && erste.layout !== 'titel') H(fp, 'Erste Folie sollte das Layout "titel" haben.');
      if (istObjekt(letzte) && letzte.layout !== 'merke' && letzte.layout !== 'quiz') {
        H(fp, 'Letzte Folie sollte das Layout "merke" oder "quiz" haben.');
      }
    });
    if (videos.length > 0) {
      for (const [ut, n] of proUt) {
        if (n === 0) F('videos', `Unterthema „${ut}“ hat kein Video – nötig ist mindestens eines.`);
        else if (n > 1) H('videos', `Unterthema „${ut}“ hat ${n} Videos – empfohlen ist 1.`);
      }
    }
  }

  // ---------- Fragen ----------

  function richtigIndizes(frage, p, optionen, typ) {
    const rp = feld(p, 'richtig');
    const richtig = frage.richtig;
    if (richtig === undefined) { F(rp, 'Pflichtfeld fehlt.'); return; }
    if (!Array.isArray(richtig)) { F(rp, `Muss eine Liste von Indizes sein (z. B. [0]), ist aber ${typName(richtig)}.`); return; }
    if (typ === 'mc' && richtig.length !== 1) F(rp, `Bei mc muss genau ein Index in der Liste stehen (sind ${richtig.length}).`);
    if (typ === 'mehrfach' && richtig.length < 2) F(rp, `Bei mehrfach müssen mindestens 2 Indizes in der Liste stehen (sind ${richtig.length}).`);
    const gesehen = new Set();
    richtig.forEach((index, i) => {
      if (!Number.isInteger(index)) { F(`${rp}[${i}]`, `Muss eine ganze Zahl sein (Index ab 0), ist aber ${typName(index)}.`); return; }
      if (gesehen.has(index)) { F(rp, `Index ${index} kommt doppelt vor.`); return; }
      gesehen.add(index);
      if (optionen) indexPruefen(index, optionen.length, rp);
    });
  }

  function lueckentextPruefen(frage, p) {
    const textOk = text(frage, 'text', p);
    const luecken = liste(frage, 'luecken', p, { was: 'Lücken' });
    if (luecken) {
      luecken.forEach((antworten, i) => {
        const lp = `${feld(p, 'luecken')}[${i}]`;
        if (!Array.isArray(antworten)) { F(lp, `Muss eine Liste erlaubter Antworten sein (z. B. ["Zellplasma", "Cytoplasma"]), ist aber ${typName(antworten)}.`); return; }
        if (antworten.length === 0) { F(lp, 'Die Liste darf nicht leer sein – mindestens eine erlaubte Antwort.'); return; }
        antworten.forEach((a, j) => textWert(a, `${lp}[${j}]`));
      });
    }
    if (!textOk || !luecken) return;

    const n = luecken.length;
    const tp = feld(p, 'text');
    const anzahl = new Map();
    for (const treffer of frage.text.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)) {
      const inhalt = treffer[1];
      const nummer = /^\d+$/.test(inhalt) ? Number(inhalt) : NaN;
      if (!(nummer >= 1 && nummer <= n)) {
        F(tp, `Platzhalter {{${inhalt}}} passt zu keiner Lücke (es gibt ${n} Lücken, also {{1}} bis {{${n}}}).`);
        continue;
      }
      anzahl.set(nummer, (anzahl.get(nummer) || 0) + 1);
    }
    for (let k = 1; k <= n; k++) {
      const c = anzahl.get(k) || 0;
      if (c === 0) F(tp, `Platzhalter {{${k}}} fehlt im Text (es gibt ${n} Lücken).`);
      else if (c > 1) F(tp, `Platzhalter {{${k}}} kommt ${c}-mal vor – erlaubt ist genau einmal.`);
    }
  }

  function keineDoppelten(werte, pfadVon, wo) {
    const gesehen = new Set();
    werte.forEach((w, i) => {
      if (typeof w !== 'string') return;
      const schluessel = w.trim().toLowerCase();
      if (gesehen.has(schluessel)) F(pfadVon(i), `„${w}“ kommt ${wo} doppelt vor – die Auswertung wäre nicht eindeutig.`);
      gesehen.add(schluessel);
    });
  }

  function freitextPruefen(frage, p) {
    text(frage, 'musterloesung', p);
    const mp = feld(p, 'maxPunkte');
    const max = frage.maxPunkte;
    let maxOk = false;
    if (max === undefined) F(mp, 'Pflichtfeld fehlt.');
    else if (!Number.isInteger(max) || max < 1 || max > 3) F(mp, `Muss 1, 2 oder 3 sein, ist aber ${zeige(max)}.`);
    else maxOk = true;

    const punkte = liste(frage, 'bewertungspunkte', p, { was: 'Bewertungspunkte' });
    if (!punkte) return;
    const bp = feld(p, 'bewertungspunkte');
    jedesObjekt(punkte, bp, (b, pp) => {
      unbekannteFelder(b, pp, ['text', 'woerter']);
      text(b, 'text', pp);
      const woerter = textListe(b, 'woerter', pp);
      if (!woerter || woerter.length === 0) return;
      if (woerter.length < 2 || woerter.length > 5) H(feld(pp, 'woerter'), `${woerter.length} Wörter – empfohlen sind 2 bis 5 Varianten bzw. Synonyme.`);
      woerter.forEach((w, i) => {
        if (typeof w !== 'string') return;
        if (w !== w.toLowerCase() || SATZZEICHEN.test(w)) {
          H(`${feld(pp, 'woerter')}[${i}]`, `„${w}“ bitte klein geschrieben und ohne Satzzeichen angeben.`);
        }
      });
    });
    if (maxOk && punkte.length > 0 && punkte.length !== max) {
      F(bp, `Es gibt ${punkte.length} Bewertungspunkte, aber maxPunkte ist ${max} – die Anzahl muss gleich sein.`);
    }
  }

  function zahlPruefen(frage, p) {
    const lp = feld(p, 'loesung');
    if (frage.loesung === undefined) F(lp, 'Pflichtfeld fehlt.');
    else if (typeof frage.loesung !== 'number' || !Number.isFinite(frage.loesung)) {
      F(lp, `Muss eine Zahl sein (z. B. 38 oder 2.5, ohne Anführungszeichen), ist aber ${typName(frage.loesung)}.`);
    }
    const tp = feld(p, 'toleranz');
    if (frage.toleranz === undefined) F(tp, 'Pflichtfeld fehlt.');
    else if (typeof frage.toleranz !== 'number' || !Number.isFinite(frage.toleranz) || frage.toleranz < 0) {
      F(tp, `Muss eine Zahl ≥ 0 sein, ist aber ${zeige(frage.toleranz)}.`);
    }
    text(frage, 'einheit', p, { optional: true });
  }

  const fragen = liste(paket, 'fragen', '');
  if (fragen) {
    const frageIds = new Map();
    const stat = new Map(utListe.map((id) => [id, { alle: 0, nurTest: 0, typen: new Set(), freitext: 0 }]));

    jedesObjekt(fragen, 'fragen', (frage, p) => {
      idPruefen(frage, p, frageIds);
      const ut = unterthemaVerweis(frage, p);
      const typ = frage.typ;
      let typBekannt = false;
      if (typ === undefined) F(feld(p, 'typ'), 'Pflichtfeld fehlt.');
      else if (!FRAGETYPEN.includes(typ)) F(feld(p, 'typ'), `Unbekannter Fragetyp ${zeige(typ)}. Erlaubt: ${FRAGETYPEN.join(', ')}.`);
      else typBekannt = true;

      unbekannteFelder(frage, p, typBekannt ? [...FRAGE_FELDER, ...TYP_FELDER[typ]] : [...FRAGE_FELDER, ...new Set(Object.values(TYP_FELDER).flat())]);

      const sp = feld(p, 'schwierigkeit');
      if (frage.schwierigkeit === undefined) F(sp, 'Pflichtfeld fehlt.');
      else if (![1, 2, 3].includes(frage.schwierigkeit)) F(sp, `Muss 1, 2 oder 3 sein, ist aber ${zeige(frage.schwierigkeit)}.`);

      text(frage, 'frage', p);
      text(frage, 'erklaerung', p);
      quellePruefen(frage, p);

      const np = feld(p, 'nurTest');
      if (frage.nurTest === undefined) F(np, 'Pflichtfeld fehlt (true oder false).');
      else if (typeof frage.nurTest !== 'boolean') F(np, `Muss true oder false sein, ist aber ${zeige(frage.nurTest)}.`);

      if (frage.teil !== undefined) {
        const tp = feld(p, 'teil');
        if (frage.teil !== '1' && frage.teil !== '2') F(tp, `Muss "1" oder "2" sein (als Text), ist aber ${zeige(frage.teil)}.`);
        else if (paket.pruefungsart !== 'Matura') H(tp, 'teil ist nur bei Matura-Paketen sinnvoll – wird ignoriert.');
      }

      if (ut) {
        const s = stat.get(ut);
        s.alle += 1;
        if (frage.nurTest === true) s.nurTest += 1;
        if (typBekannt) s.typen.add(typ);
        if (typ === 'freitext') s.freitext += 1;
      }

      if (!typBekannt) return;
      switch (typ) {
        case 'mc': {
          const optionen = textListe(frage, 'optionen', p, { min: 4, max: 4, was: 'Optionen' });
          richtigIndizes(frage, p, optionen, typ);
          break;
        }
        case 'mehrfach': {
          const optionen = textListe(frage, 'optionen', p, { min: 4, max: 6, was: 'Optionen' });
          richtigIndizes(frage, p, optionen, typ);
          break;
        }
        case 'wahrfalsch':
          if (frage.richtig === undefined) F(feld(p, 'richtig'), 'Pflichtfeld fehlt (true oder false).');
          else if (typeof frage.richtig !== 'boolean') F(feld(p, 'richtig'), `Muss true oder false sein, ist aber ${zeige(frage.richtig)}.`);
          break;
        case 'lueckentext':
          lueckentextPruefen(frage, p);
          break;
        case 'zuordnen': {
          const paare = liste(frage, 'paare', p, { min: 3, max: 6, was: 'Paare' });
          if (!paare) break;
          const pp = feld(p, 'paare');
          jedesObjekt(paare, pp, (paar, ep) => {
            unbekannteFelder(paar, ep, ['links', 'rechts']);
            text(paar, 'links', ep);
            text(paar, 'rechts', ep);
          });
          const objekte = paare.map((x) => (istObjekt(x) ? x : {}));
          keineDoppelten(objekte.map((x) => x.links), (i) => `${pp}[${i}].links`, 'links');
          keineDoppelten(objekte.map((x) => x.rechts), (i) => `${pp}[${i}].rechts`, 'rechts');
          break;
        }
        case 'reihenfolge': {
          const schritte = textListe(frage, 'schritte', p, { min: 3, max: 6, was: 'Schritte' });
          if (schritte) keineDoppelten(schritte, (i) => `${feld(p, 'schritte')}[${i}]`, 'in den Schritten');
          break;
        }
        case 'zahl':
          zahlPruefen(frage, p);
          break;
        case 'freitext':
          freitextPruefen(frage, p);
          break;
      }
    });

    if (fragen.length > 0) {
      for (const [ut, s] of stat) {
        if (s.nurTest < 3) F('fragen', `Unterthema „${ut}“ hat ${s.nurTest} Fragen mit nurTest: true – nötig sind mindestens 3.`);
        if (s.alle < 8 || s.alle > 15) H('fragen', `Unterthema „${ut}“ hat ${s.alle} Fragen – empfohlen sind 8 bis 15.`);
        const uebung = s.alle - s.nurTest;
        if (uebung < 5) H('fragen', `Unterthema „${ut}“ hat nur ${uebung} Übungsfragen (nurTest: false) – empfohlen sind mindestens 5, sonst wird der Übungsmodus sehr kurz.`);
        if (s.alle > 0 && s.typen.size < 3) H('fragen', `Unterthema „${ut}“ nutzt nur ${s.typen.size} Fragetyp(en) – empfohlen sind mindestens 3.`);
        if (s.freitext > 2) H('fragen', `Unterthema „${ut}“ hat ${s.freitext} Freitext-Fragen – empfohlen sind höchstens 2.`);
      }
    }
  }

  return ergebnis();
}

/**
 * Prüft den Inhalt einer Paketdatei: Größe, JSON, dann validatePaket.
 * @param {string} dateiText
 * @returns {{ ok: boolean, fehler: object[], hinweise: object[], paket: object|null }}
 */
export function pruefeDateiText(dateiText) {
  const einzelFehler = (meldung) => ({ ok: false, fehler: [{ pfad: '', meldung }], hinweise: [], paket: null });
  if (typeof dateiText !== 'string') return einzelFehler('Die Datei konnte nicht als Text gelesen werden.');

  const bytes = new TextEncoder().encode(dateiText).length;
  if (bytes > MAX_DATEI_BYTES) {
    const mb = (bytes / 1024 / 1024).toFixed(1).replace('.', ',');
    return einzelFehler(`Die Datei ist zu groß: ${mb} MB, erlaubt sind höchstens 5 MB.`);
  }

  let paket;
  try {
    paket = JSON.parse(dateiText.replace(/^﻿/, ''));
  } catch (e) {
    return einzelFehler(`Die Datei ist kein gültiges JSON (${e.message}). Häufige Ursachen: Komma am Ende einer Liste, Kommentare, fehlende Anführungszeichen.`);
  }
  const ergebnis = validatePaket(paket);
  return { ...ergebnis, paket: istObjekt(paket) ? paket : null };
}

/** Zählt die Inhalte eines (gültigen) Pakets – für Anzeige und CLI. */
export function paketStatistik(paket) {
  const anzahl = (wert) => (Array.isArray(wert) ? wert.length : 0);
  const fragen = Array.isArray(paket?.fragen) ? paket.fragen : [];
  return {
    unterthemen: anzahl(paket?.unterthemen),
    karten: anzahl(paket?.karten),
    videos: anzahl(paket?.videos),
    fragen: fragen.length,
    nurTest: fragen.filter((f) => f && f.nurTest === true).length,
  };
}
