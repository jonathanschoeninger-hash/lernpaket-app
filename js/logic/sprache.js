// Hilfen fürs Vorlesen – reine Logik ohne DOM (die Browser-Anbindung steckt in js/video/speech.js).

/** Längere Stücke stocken in Chrome (Vorlesen bricht nach ~15 s ab) – darum kurze Stücke. */
export const MAX_SATZ = 180;

const ABKUERZUNGEN = new Set([
  'bzw', 'ca', 'usw', 'etc', 'vgl', 'evtl', 'ggf', 'inkl', 'exkl', 'max', 'min', 'nr', 'abb', 'tab',
  'bsp', 'dr', 'prof', 'mag', 'ing', 'str', 'jh', 'jhdt', 'mio', 'mrd', 'sog', 'u.a', 'z.b', 'd.h',
]);

function istAbkuerzung(wort) {
  const ohnePunkt = wort.replace(/[.]+$/, '');
  if (/^\d+$/.test(ohnePunkt)) return true; // „3. Tag“
  if (/^\p{L}$/u.test(ohnePunkt)) return true; // „z. B.“, „S. 4“
  return ABKUERZUNGEN.has(ohnePunkt.toLocaleLowerCase('de'));
}

function teileLang(satz) {
  if (satz.length <= MAX_SATZ) return [satz];
  const stuecke = [];
  let aktuell = '';
  const anhaengen = (teil, trenner) => {
    if (!aktuell) aktuell = teil;
    else if ((aktuell + trenner + teil).length <= MAX_SATZ) aktuell += trenner + teil;
    else {
      stuecke.push(aktuell);
      aktuell = teil;
    }
  };
  for (const teil of satz.split(/(?<=[,;:])\s+/)) {
    if (teil.length <= MAX_SATZ) {
      anhaengen(teil, ' ');
      continue;
    }
    // Zu langer Teil ohne Komma: an Leerzeichen, notfalls hart teilen.
    for (const wort of teil.split(' ')) {
      if (wort.length <= MAX_SATZ) anhaengen(wort, ' ');
      else {
        if (aktuell) stuecke.push(aktuell);
        aktuell = '';
        for (let i = 0; i < wort.length; i += MAX_SATZ) stuecke.push(wort.slice(i, i + MAX_SATZ));
      }
    }
  }
  if (aktuell) stuecke.push(aktuell);
  return stuecke;
}

/** Text in Sätze (bzw. kurze Stücke) teilen – fürs Vorlesen und die Untertitel. */
export function saetze(text) {
  const woerter = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  const ergebnis = [];
  let satz = [];
  woerter.forEach((wort, i) => {
    satz.push(wort);
    const naechstes = woerter[i + 1];
    const endet = /[.!?…]["“”»)]*$/.test(wort);
    const neuerSatz = naechstes && /^["„»(]?[\p{Lu}\d]/u.test(naechstes);
    const nurPunkt = /[.]["“”»)]*$/.test(wort);
    if (!naechstes || (endet && neuerSatz && !(nurPunkt && istAbkuerzung(wort)))) {
      ergebnis.push(...teileLang(satz.join(' ')));
      satz = [];
    }
  });
  return ergebnis;
}

function normLang(lang) {
  return String(lang ?? '').replace('_', '-').toLowerCase();
}

function rang(stimme) {
  const lang = normLang(stimme.lang);
  const sprache = lang === 'de-at' ? 0 : lang === 'de-de' ? 1 : 2;
  return (stimme.localService === false ? 10 : 0) + sprache;
}

/** Alle deutschen Stimmen, beste zuerst (offline vor online, de-AT vor de-DE vor anderem Deutsch). */
export function deutscheStimmen(stimmen) {
  return (stimmen ?? [])
    .filter((s) => normLang(s.lang).startsWith('de'))
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rang(a.s) - rang(b.s) || a.i - b.i)
    .map(({ s }) => s);
}

/** Beste deutsche Stimme; eine gewünschte (voiceURI oder Name) gewinnt, wenn sie deutsch ist. Keine → null. */
export function waehleStimme(stimmen, gewuenscht = null) {
  const deutsch = deutscheStimmen(stimmen);
  if (gewuenscht) {
    const treffer = deutsch.find((s) => s.voiceURI === gewuenscht || s.name === gewuenscht);
    if (treffer) return treffer;
  }
  return deutsch[0] ?? null;
}

/** Lesezeit für den Untertitel-Modus (ohne Stimme) in Millisekunden. */
export function lesezeit(text, tempo = 1) {
  const woerter = String(text ?? '').split(/\s+/).filter(Boolean).length;
  return Math.max(2000, (woerter * 60000) / (160 * tempo)) + 300;
}
