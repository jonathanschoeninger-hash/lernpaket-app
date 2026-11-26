// Wrapper um speechSynthesis (Vorlese-Stimme des Browsers, gratis).
// Pausieren = abbrechen und den Satz später neu sprechen – das ist robuster als pause()/resume(),
// die in Chrome oft hängen bleiben. Lange Texte vorher mit saetze() teilen.

import { waehleStimme, deutscheStimmen, lesezeit } from '../logic/sprache.js';

export function sprachausgabeVorhanden() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Stimmen laden – manche Browser liefern sie erst nach dem Ereignis „voiceschanged“. */
export async function stimmenLaden(warteMs = 1500) {
  if (!sprachausgabeVorhanden()) return [];
  let stimmen = speechSynthesis.getVoices();
  if (stimmen.length > 0) return stimmen;
  await new Promise((resolve) => {
    const zeit = setTimeout(resolve, warteMs);
    speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(zeit);
        resolve();
      },
      { once: true },
    );
  });
  stimmen = speechSynthesis.getVoices();
  return stimmen;
}

export async function deutscheStimmenLaden() {
  return deutscheStimmen(await stimmenLaden());
}

// Chrome räumt Äußerungen manchmal zu früh weg – dann kommt nie „end“. Darum Referenzen halten.
const laufend = new Set();

/**
 * Sprecher mit der besten (oder gewünschten) deutschen Stimme.
 * sprich(text, tempo) → Promise mit 'fertig' | 'abgebrochen' | 'keineStimme' | 'fehler'
 */
export async function erstelleSprecher(gewuenscht = null) {
  const stimme = waehleStimme(await stimmenLaden(), gewuenscht);

  function stopp() {
    if (sprachausgabeVorhanden()) speechSynthesis.cancel();
  }

  function sprich(text, tempo = 1) {
    if (!stimme) return Promise.resolve('keineStimme');
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = stimme;
      u.lang = stimme.lang;
      u.rate = Math.min(Math.max(tempo, 0.5), 2);
      let erledigt = false;
      const fertig = (ergebnis) => {
        if (erledigt) return;
        erledigt = true;
        laufend.delete(u);
        clearTimeout(notbremse);
        resolve(ergebnis);
      };
      u.onend = () => fertig('fertig');
      u.onerror = (e) => fertig(e.error === 'interrupted' || e.error === 'canceled' ? 'abgebrochen' : 'fehler');
      // Falls „end“ nie kommt (bekannter Browser-Fehler): nach großzügiger Zeit trotzdem weiter.
      const notbremse = setTimeout(() => fertig('fertig'), lesezeit(text, tempo) * 3 + 5000);
      laufend.add(u);
      speechSynthesis.speak(u);
    });
  }

  return { stimme, sprich, stopp };
}
