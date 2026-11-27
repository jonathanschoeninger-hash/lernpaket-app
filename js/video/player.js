// Video-Player (DESIGN.md 5.2): Folien + Vorlese-Stimme, Stichpunkte erscheinen passend zum Text.
// Ohne deutsche Stimme: Untertitel-Modus mit automatischem Weiterblättern nach Lesezeit.

import { el, leeren, ansage } from '../ui/dom.js';
import { zeichneFolie } from './layouts.js';
import { saetze, lesezeit } from '../logic/sprache.js';
import { aufdeckSchritte, sichtbarBis } from '../logic/video.js';
import { satzZeitpunkte, satzBeiZeit } from '../logic/vertonung.js';

const TEMPI = [0.75, 1, 1.25, 1.5];
const QUIZ_WARTEN = 5000;
const NACH_QUIZ = 2500;
const ZWISCHEN_FOLIEN = 700;

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * erstellePlayer({ video, sprecher, aufnahme(i) → URL|null, tempo, untertitel, beiFolieGelaufen(i), beiEinstellung(name, wert), endeInhalt() })
 * aufnahme: vorab erzeugte MP3 pro Folie (z. B. ElevenLabs); ohne Aufnahme liest die Browser-Stimme.
 * → { element, aufraeumen }
 */
export function erstellePlayer({ video, sprecher, aufnahme = () => null, tempo = 1, untertitel = false, beiFolieGelaufen, beiEinstellung, endeInhalt }) {
  const folien = video.folien;
  const satzListen = folien.map((f) => saetze(f.sprechertext));
  const mitAufnahmen = folien.some((_, i) => aufnahme(i));
  const mitStimme = Boolean(sprecher?.stimme) || mitAufnahmen;
  let audio = null; // Aufnahme der aktuellen Folie
  let audioAbbruch = null; // beendet das Warten auf das Ende der Aufnahme
  let untertitelAn = untertitel || !mitStimme;
  let index = 0;
  let satz = 0;
  let spielt = false;
  let lauf = 0; // jede Pause/jeder Sprung beendet den laufenden Durchgang
  let aktuell = null; // gezeichnete Folie
  let gestartet = false; // großer Start-Knopf nur vor dem ersten Abspielen

  const buehne = el('div', { class: 'buehne', role: 'group', 'aria-roledescription': 'Folie', 'aria-label': video.titel });
  const foliePlatz = el('div', { class: 'folie-platz' });
  const untertitelZeile = el('p', { class: 'untertitel', 'aria-hidden': 'true' });
  const startSchicht = el(
    'button',
    { type: 'button', class: 'start-schicht', 'aria-label': 'Video abspielen', on: { click: () => abspielen() } },
    el('span', { class: 'start-symbol', 'aria-hidden': 'true', text: '▶' }),
  );
  buehne.append(foliePlatz, untertitelZeile, startSchicht);

  const spielKnopf = el('button', { type: 'button', class: 'knopf player-knopf haupt', on: { click: () => (spielt ? pause() : abspielen()) } });
  const zurueck = el('button', { type: 'button', class: 'knopf player-knopf', 'aria-label': 'Vorige Folie', text: '⏮', on: { click: () => gehe(index - 1) } });
  const vor = el('button', { type: 'button', class: 'knopf player-knopf', 'aria-label': 'Nächste Folie', text: '⏭', on: { click: () => gehe(index + 1) } });
  const zaehler = el('span', { class: 'folien-zaehler' });
  const tempoWahl = el(
    'select',
    {
      class: 'tempo-wahl',
      'aria-label': 'Tempo',
      on: {
        change: () => {
          tempo = Number(tempoWahl.value);
          if (audio) audio.playbackRate = tempo;
          beiEinstellung?.('tempo', tempo);
        },
      },
    },
    TEMPI.map((t) => el('option', { value: String(t), text: `${String(t).replace('.', ',')}×`, selected: t === tempo })),
  );
  const untertitelKnopf = el('button', {
    type: 'button',
    class: 'knopf player-knopf',
    text: 'UT',
    'aria-label': 'Untertitel',
    disabled: !mitStimme,
    on: {
      click: () => {
        untertitelAn = !untertitelAn;
        untertitelStellen();
        beiEinstellung?.('untertitel', untertitelAn);
      },
    },
  });
  const vollbildKnopf = el('button', {
    type: 'button',
    class: 'knopf player-knopf',
    'aria-label': 'Vollbild',
    text: '⛶',
    hidden: !document.fullscreenEnabled,
    on: { click: () => (document.fullscreenElement ? document.exitFullscreen() : element.requestFullscreen?.()) },
  });
  const punkte = el('ol', { class: 'folien-punkte', 'aria-label': 'Folien' });

  const element = el(
    'div',
    { class: 'player', tabindex: '-1' },
    buehne,
    el('div', { class: 'player-leiste' }, zurueck, spielKnopf, vor, zaehler, tempoWahl, untertitelKnopf, vollbildKnopf),
    punkte,
    mitStimme
      ? ''
      : el('p', {
          class: 'klein player-hinweis',
          text: 'Dein Browser hat keine deutsche Vorlese-Stimme. Das Video läuft im Untertitel-Modus und blättert nach der Lesezeit weiter.',
        }),
  );

  function untertitelStellen() {
    untertitelZeile.hidden = !untertitelAn;
    untertitelKnopf.setAttribute('aria-pressed', String(untertitelAn));
  }

  function knoepfeStellen() {
    spielKnopf.textContent = spielt ? '⏸' : '▶';
    spielKnopf.setAttribute('aria-label', spielt ? 'Pause' : 'Abspielen');
    zurueck.disabled = index === 0;
    vor.disabled = index >= folien.length - 1;
    zaehler.textContent = `Folie ${index + 1} von ${folien.length}`;
    startSchicht.hidden = gestartet;
    [...punkte.children].forEach((li, i) => li.firstChild.setAttribute('aria-current', i === index ? 'step' : 'false'));
  }

  function punkteZeichnen() {
    leeren(punkte).append(
      ...folien.map((_, i) =>
        el('li', {}, el('button', { type: 'button', class: 'folien-punkt', 'aria-label': `Folie ${i + 1}`, on: { click: () => gehe(i) } })),
      ),
    );
  }

  function folieZeichnen() {
    aktuell = zeichneFolie(folien[index]);
    leeren(foliePlatz).append(aktuell.element);
    zeigeBis(0);
    untertitelZeile.textContent = '';
    knoepfeStellen();
  }

  /** Teile der Folie aufdecken, passend zum Satz. */
  function zeigeBis(anzahl) {
    aktuell.teile.forEach((t, i) => t.classList.toggle('sichtbar', i < anzahl));
  }

  function allesZeigen() {
    zeigeBis(aktuell.teile.length);
  }

  async function sprechen(text, meinLauf) {
    if (mitStimme) {
      const ergebnis = await sprecher.sprich(text, tempo);
      if (ergebnis === 'fehler' && meinLauf === lauf) await warte(lesezeit(text, tempo));
    } else {
      await warte(lesezeit(text, tempo));
    }
  }

  async function quizPause(meinLauf) {
    const q = aktuell.quiz;
    if (!q) return;
    const gewaehlt = await new Promise((resolve) => {
      const zeit = setTimeout(() => resolve(null), QUIZ_WARTEN);
      q.freigeben((i) => {
        clearTimeout(zeit);
        resolve(i);
      });
    });
    if (meinLauf !== lauf) return;
    q.zeigeLoesung(gewaehlt);
    await warte(NACH_QUIZ);
  }

/** Aufnahme der Folie abspielen. → 'fertig' | 'abgebrochen' | 'fehler' */
  function aufnahmeAbspielen(url, liste, schritte) {
    if (!audio || audio.dataset.url !== url) {
      audio = new Audio(url);
      audio.dataset.url = url;
      audio.preload = 'auto';
    }
    const a = audio;
    a.playbackRate = tempo;
    return new Promise((resolve) => {
      let zeitpunkte = satzZeitpunkte(liste, a.duration);
      const ende = (ergebnis) => {
        a.onended = a.onerror = a.ontimeupdate = a.onloadedmetadata = null;
        audioAbbruch = null;
        resolve(ergebnis);
      };
      const zeigen = () => {
        const i = satzBeiZeit(zeitpunkte, a.currentTime);
        satz = i;
        zeigeBis(sichtbarBis(i, liste.length, schritte));
        untertitelZeile.textContent = liste[i] ?? '';
      };
      a.onloadedmetadata = () => {
        zeitpunkte = satzZeitpunkte(liste, a.duration);
        zeigen();
      };
      a.ontimeupdate = zeigen;
      a.onended = () => ende('fertig');
      a.onerror = () => ende('fehler');
      audioAbbruch = () => ende('abgebrochen');
      zeigen();
      a.play().catch(() => ende('fehler'));
    });
  }

  async function abspielen() {
    if (index >= folien.length) index = 0;
    const meinLauf = ++lauf;
    spielt = true;
    gestartet = true;
    knoepfeStellen();
    element.focus({ preventScroll: true });

    while (meinLauf === lauf) {
      const liste = satzListen[index];
      const schritte = aufdeckSchritte(folien[index]);
      const url = aufnahme(index);
      let ergebnis = 'keine';
      if (url) {
        ergebnis = await aufnahmeAbspielen(url, liste, schritte);
        if (meinLauf !== lauf) return;
        if (ergebnis === 'fehler') satz = 0; // Aufnahme kaputt oder offline → Browser-Stimme
      }
      if (ergebnis !== 'fertig') {
        for (; satz < liste.length; satz++) {
          zeigeBis(sichtbarBis(satz, liste.length, schritte));
          untertitelZeile.textContent = liste[satz];
          await sprechen(liste[satz], meinLauf);
          if (meinLauf !== lauf) return;
        }
      }
      audio = null;
      allesZeigen();
      beiFolieGelaufen?.(index);
      if (folien[index].layout === 'quiz') {
        await quizPause(meinLauf);
        if (meinLauf !== lauf) return;
      }
      if (index >= folien.length - 1) return fertig();
      await warte(ZWISCHEN_FOLIEN);
      if (meinLauf !== lauf) return;
      index++;
      satz = 0;
      folieZeichnen();
    }
  }

  function pause() {
    lauf++;
    sprecher?.stopp();
    audio?.pause(); // Position bleibt – „Abspielen“ macht an derselben Stelle weiter
    audioAbbruch?.();
    spielt = false;
    knoepfeStellen();
  }

  function gehe(neu) {
    if (neu < 0 || neu >= folien.length) return;
    const weiter = spielt;
    pause();
    audio = null;
    index = neu;
    satz = 0;
    folieZeichnen();
    if (weiter) abspielen();
    else {
      allesZeigen();
      untertitelZeile.textContent = satzListen[index][0] ?? '';
    }
  }

  function fertig() {
    spielt = false;
    lauf++;
    knoepfeStellen();
    startSchicht.hidden = true;
    const ende = el('div', { class: 'ende-schicht' }, el('p', { class: 'ende-titel', text: 'Video fertig' }), endeInhalt?.() ?? '');
    ende.append(
      el('button', {
        type: 'button',
        class: 'knopf',
        text: 'Nochmal ansehen',
        on: {
          click: () => {
            ende.remove();
            index = 0;
            satz = 0;
            folieZeichnen();
            abspielen();
          },
        },
      }),
    );
    buehne.append(ende);
    ende.querySelector('a, button')?.focus();
    ansage('Video fertig.');
  }

  // Tastatur: Leertaste = Play/Pause, Pfeile = Folie zurück/vor (nicht in Eingabefeldern).
  const tasten = (e) => {
    const ziel = e.target;
    if (ziel instanceof HTMLInputElement || ziel instanceof HTMLSelectElement || ziel instanceof HTMLTextAreaElement) return;
    if (e.key === ' ' && !(ziel instanceof HTMLButtonElement) && !(ziel instanceof HTMLAnchorElement)) {
      e.preventDefault();
      spielt ? pause() : abspielen();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      gehe(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      gehe(index - 1);
    }
  };
  document.addEventListener('keydown', tasten);

  punkteZeichnen();
  folieZeichnen();
  allesZeigen();
  untertitelZeile.textContent = satzListen[0][0] ?? '';
  untertitelStellen();

  return {
    element,
    aufraeumen() {
      lauf++;
      sprecher?.stopp();
      audio?.pause();
      audio = null;
      document.removeEventListener('keydown', tasten);
      if (document.fullscreenElement === element) document.exitFullscreen?.();
    },
  };
}
