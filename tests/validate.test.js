import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validatePaket,
  pruefeDateiText,
  paketStatistik,
  MAX_DATEI_BYTES,
} from '../js/logic/validate.js';

const BEISPIEL_TEXT = readFileSync(
  new URL('../beispiele/zellatmung.lernpaket.json', import.meta.url),
  'utf8',
);
const BEISPIEL = JSON.parse(BEISPIEL_TEXT);

/** Kopie des Beispielpakets, verändert durch `aendern`, dann geprüft. */
function pruefeVariante(aendern) {
  const paket = structuredClone(BEISPIEL);
  aendern(paket);
  return validatePaket(paket);
}

const frage = (paket, id) => paket.fragen.find((f) => f.id === id);
const ersteFrageVomTyp = (paket, typ) => paket.fragen.find((f) => f.typ === typ);
const folieVomLayout = (paket, layout) => {
  for (const v of paket.videos) {
    const folie = v.folien.find((f) => f.layout === layout);
    if (folie) return folie;
  }
  throw new Error(`Layout ${layout} kommt im Beispiel nicht vor`);
};

/** Erwartet: Paket abgelehnt, mit einem Fehler an `pfad`, dessen Meldung zu `muster` passt. */
function erwarteFehler(ergebnis, pfad, muster) {
  assert.equal(ergebnis.ok, false, 'Paket hätte abgelehnt werden müssen');
  const treffer = ergebnis.fehler.find(
    (f) => (pfad instanceof RegExp ? pfad.test(f.pfad) : f.pfad === pfad) && muster.test(f.meldung),
  );
  assert.ok(
    treffer,
    `Kein passender Fehler für ${pfad} / ${muster}. Gefunden:\n` +
      ergebnis.fehler.map((f) => `  ${f.pfad}: ${f.meldung}`).join('\n'),
  );
}

/** Erwartet: Paket bleibt ok, mit einem Hinweis an `pfad`, dessen Meldung zu `muster` passt. */
function erwarteHinweis(ergebnis, pfad, muster) {
  assert.equal(
    ergebnis.ok,
    true,
    'Paket hätte ok bleiben müssen. Fehler:\n' +
      ergebnis.fehler.map((f) => `  ${f.pfad}: ${f.meldung}`).join('\n'),
  );
  const treffer = ergebnis.hinweise.find(
    (h) => (pfad instanceof RegExp ? pfad.test(h.pfad) : h.pfad === pfad) && muster.test(h.meldung),
  );
  assert.ok(
    treffer,
    `Kein passender Hinweis für ${pfad} / ${muster}. Gefunden:\n` +
      ergebnis.hinweise.map((h) => `  ${h.pfad}: ${h.meldung}`).join('\n'),
  );
}

describe('Beispielpaket', () => {
  test('ist gültig und ohne Hinweise', () => {
    const ergebnis = validatePaket(structuredClone(BEISPIEL));
    assert.deepEqual(ergebnis.fehler, []);
    assert.deepEqual(ergebnis.hinweise, []);
    assert.equal(ergebnis.ok, true);
  });

  test('enthält jeden Fragetyp, jedes Folien-Layout und begriffe', () => {
    const typen = new Set(BEISPIEL.fragen.map((f) => f.typ));
    for (const typ of ['mc', 'mehrfach', 'wahrfalsch', 'lueckentext', 'zuordnen', 'reihenfolge', 'zahl', 'freitext']) {
      assert.ok(typen.has(typ), `Fragetyp ${typ} fehlt`);
    }
    const layouts = new Set(BEISPIEL.videos.flatMap((v) => v.folien.map((f) => f.layout)));
    for (const layout of ['titel', 'stichpunkte', 'begriff', 'ablauf', 'vergleich', 'formel', 'zahl', 'merke', 'quiz']) {
      assert.ok(layouts.has(layout), `Layout ${layout} fehlt`);
    }
    assert.ok(BEISPIEL.zusammenfassung.some((z) => Array.isArray(z.begriffe) && z.begriffe.length > 0));
    assert.equal(BEISPIEL.unterthemen.length, 3);
  });

  test('paketStatistik zählt richtig', () => {
    const s = paketStatistik(BEISPIEL);
    assert.equal(s.unterthemen, BEISPIEL.unterthemen.length);
    assert.equal(s.karten, BEISPIEL.karten.length);
    assert.equal(s.videos, BEISPIEL.videos.length);
    assert.equal(s.fragen, BEISPIEL.fragen.length);
    assert.equal(s.nurTest, BEISPIEL.fragen.filter((f) => f.nurTest === true).length);
  });
});

describe('Fehler: Paket wird abgelehnt', () => {
  test('kein Objekt', () => {
    for (const wert of [null, 42, 'text', [1, 2]]) {
      erwarteFehler(validatePaket(wert), '', /JSON-Objekt/);
    }
  });

  test('format falsch', () => {
    erwarteFehler(pruefeVariante((p) => { p.format = 'quiz'; }), 'format', /"lernpaket"/);
  });

  test('version nicht 1', () => {
    erwarteFehler(pruefeVariante((p) => { p.version = 2; }), 'version', /nur Version 1/);
  });

  test('Paket-id fehlt', () => {
    erwarteFehler(pruefeVariante((p) => { delete p.id; }), 'id', /Pflichtfeld fehlt/);
  });

  test('Paket-id mit ungültigen Zeichen', () => {
    erwarteFehler(pruefeVariante((p) => { p.id = 'Bio Zellatmung'; }), 'id', /a–z, 0–9/);
  });

  test('Pflichtfeld titel fehlt', () => {
    erwarteFehler(pruefeVariante((p) => { delete p.titel; }), 'titel', /Pflichtfeld fehlt/);
  });

  test('erstellt im falschen Format', () => {
    erwarteFehler(pruefeVariante((p) => { p.erstellt = '26.11.2026'; }), 'erstellt', /JJJJ-MM-TT/);
  });

  test('erstellt ist kein echtes Datum', () => {
    erwarteFehler(pruefeVariante((p) => { p.erstellt = '2026-02-30'; }), 'erstellt', /JJJJ-MM-TT/);
  });

  test('unbekannter schultyp', () => {
    erwarteFehler(pruefeVariante((p) => { p.schultyp = 'Gymnasium'; }), 'schultyp', /Erlaubt: VS, MS, AHS/);
  });

  test('unbekannte pruefungsart', () => {
    erwarteFehler(pruefeVariante((p) => { p.pruefungsart = 'Klausur'; }), 'pruefungsart', /Erlaubt: Schularbeit/);
  });

  test('schulstufe außerhalb 1–13', () => {
    erwarteFehler(pruefeVariante((p) => { p.schulstufe = 14; }), 'schulstufe', /1 bis 13/);
    erwarteFehler(pruefeVariante((p) => { p.schulstufe = '10'; }), 'schulstufe', /1 bis 13/);
  });

  test('Karten-ID doppelt', () => {
    erwarteFehler(pruefeVariante((p) => { p.karten[1].id = p.karten[0].id; }), 'karten[1].id', /doppelt.*karten\[0\]/);
  });

  test('Verweis auf nicht vorhandenes Unterthema', () => {
    erwarteFehler(pruefeVariante((p) => { p.fragen[0].unterthema = 'u9'; }), 'fragen[0].unterthema', /„u9“ gibt es nicht.*u1, u2, u3/);
  });

  test('Verweis auf nicht vorhandene Quelle', () => {
    erwarteFehler(pruefeVariante((p) => { p.zusammenfassung[0].quelle = { id: 'q7' }; }), 'zusammenfassung[0].quelle.id', /„q7“ gibt es nicht/);
  });

  test('mc: Index in richtig gibt es nicht', () => {
    const ergebnis = pruefeVariante((p) => { ersteFrageVomTyp(p, 'mc').richtig = [5]; });
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'mc');
    erwarteFehler(ergebnis, `fragen[${index}].richtig`, /^Index 5 gibt es nicht \(nur 4 Optionen\)/);
  });

  test('mc: nicht genau 4 Optionen', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'mc');
    erwarteFehler(pruefeVariante((p) => { p.fragen[index].optionen.pop(); }), `fragen[${index}].optionen`, /genau 4/);
  });

  test('mc: mehr als ein richtiger Index', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'mc');
    erwarteFehler(pruefeVariante((p) => { p.fragen[index].richtig = [0, 1]; }), `fragen[${index}].richtig`, /genau ein Index/);
  });

  test('mehrfach: Index doppelt', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'mehrfach');
    erwarteFehler(pruefeVariante((p) => { p.fragen[index].richtig = [0, 0]; }), `fragen[${index}].richtig`, /doppelt/);
  });

  test('wahrfalsch: richtig ist kein true/false', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'wahrfalsch');
    erwarteFehler(pruefeVariante((p) => { p.fragen[index].richtig = 'falsch'; }), `fragen[${index}].richtig`, /true oder false/);
  });

  test('lueckentext: Platzhalter doppelt', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'lueckentext');
    const ergebnis = pruefeVariante((p) => { p.fragen[index].text += ' Nochmal {{1}}.'; });
    erwarteFehler(ergebnis, `fragen[${index}].text`, /\{\{1\}\} kommt 2-mal vor/);
  });

  test('lueckentext: mehr Lücken als Platzhalter', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'lueckentext');
    const n = BEISPIEL.fragen[index].luecken.length;
    const ergebnis = pruefeVariante((p) => { p.fragen[index].luecken.push(['extra']); });
    erwarteFehler(ergebnis, `fragen[${index}].text`, new RegExp(`\\{\\{${n + 1}\\}\\} fehlt im Text`));
  });

  test('lueckentext: Platzhalter ohne passende Lücke', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'lueckentext');
    const ergebnis = pruefeVariante((p) => { p.fragen[index].text += ' Und {{9}}.'; });
    erwarteFehler(ergebnis, `fragen[${index}].text`, /\{\{9\}\} passt zu keiner Lücke/);
  });

  test('zuordnen: linke Seite doppelt', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'zuordnen');
    const ergebnis = pruefeVariante((p) => { p.fragen[index].paare[1].links = p.fragen[index].paare[0].links; });
    erwarteFehler(ergebnis, `fragen[${index}].paare[1].links`, /doppelt/);
  });

  test('reihenfolge: zu wenige Schritte', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'reihenfolge');
    const ergebnis = pruefeVariante((p) => { p.fragen[index].schritte = ['Erstens', 'Zweitens']; });
    erwarteFehler(ergebnis, `fragen[${index}].schritte`, /mindestens 3/);
  });

  test('zahl: loesung als Text', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'zahl');
    erwarteFehler(pruefeVariante((p) => { p.fragen[index].loesung = '2'; }), `fragen[${index}].loesung`, /Zahl/);
  });

  test('zahl: negative toleranz', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'zahl');
    erwarteFehler(pruefeVariante((p) => { p.fragen[index].toleranz = -1; }), `fragen[${index}].toleranz`, /≥ 0/);
  });

  test('freitext: Anzahl bewertungspunkte ≠ maxPunkte', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'freitext');
    const ergebnis = pruefeVariante((p) => { p.fragen[index].maxPunkte = 3; });
    erwarteFehler(ergebnis, `fragen[${index}].bewertungspunkte`, /maxPunkte ist 3/);
  });

  test('teil hat einen anderen Wert als "1"/"2"', () => {
    erwarteFehler(pruefeVariante((p) => { p.fragen[0].teil = '3'; }), 'fragen[0].teil', /"1" oder "2"/);
    erwarteFehler(pruefeVariante((p) => { p.fragen[0].teil = 1; }), 'fragen[0].teil', /"1" oder "2"/);
  });

  test('unbekannter Fragetyp', () => {
    erwarteFehler(pruefeVariante((p) => { p.fragen[0].typ = 'quizfrage'; }), 'fragen[0].typ', /Unbekannter Fragetyp/);
  });

  test('schwierigkeit außerhalb 1–3', () => {
    erwarteFehler(pruefeVariante((p) => { p.fragen[0].schwierigkeit = 4; }), 'fragen[0].schwierigkeit', /1, 2 oder 3/);
  });

  test('nurTest fehlt', () => {
    erwarteFehler(pruefeVariante((p) => { delete p.fragen[0].nurTest; }), 'fragen[0].nurTest', /Pflichtfeld fehlt/);
  });

  test('erklaerung fehlt', () => {
    erwarteFehler(pruefeVariante((p) => { delete p.fragen[0].erklaerung; }), 'fragen[0].erklaerung', /Pflichtfeld fehlt/);
  });

  test('Unterthema mit weniger als 3 Testfragen', () => {
    const ergebnis = pruefeVariante((p) => {
      const testfrage = p.fragen.find((f) => f.unterthema === 'u1' && f.nurTest);
      testfrage.nurTest = false;
    });
    erwarteFehler(ergebnis, 'fragen', /„u1“ hat 2 Fragen mit nurTest: true.*mindestens 3/);
  });

  test('Unterthema ohne Zusammenfassung', () => {
    const ergebnis = pruefeVariante((p) => { p.zusammenfassung = p.zusammenfassung.filter((z) => z.unterthema !== 'u2'); });
    erwarteFehler(ergebnis, 'zusammenfassung', /„u2“ hat keine Zusammenfassung/);
  });

  test('zwei Zusammenfassungen für ein Unterthema', () => {
    const ergebnis = pruefeVariante((p) => { p.zusammenfassung[1].unterthema = p.zusammenfassung[0].unterthema; });
    erwarteFehler(ergebnis, 'zusammenfassung[1].unterthema', /genau eine/);
  });

  test('Unterthema ohne Video', () => {
    const ergebnis = pruefeVariante((p) => { p.videos = p.videos.filter((v) => v.unterthema !== 'u3'); });
    erwarteFehler(ergebnis, 'videos', /„u3“ hat kein Video/);
  });

  test('leere Liste fragen', () => {
    erwarteFehler(pruefeVariante((p) => { p.fragen = []; }), 'fragen', /nicht leer/);
  });

  test('Text nur aus Leerzeichen', () => {
    erwarteFehler(pruefeVariante((p) => { p.karten[0].vorne = '   '; }), 'karten[0].vorne', /nicht leer/);
  });

  test('Text über 2000 Zeichen', () => {
    erwarteFehler(pruefeVariante((p) => { p.karten[0].hinten = 'a'.repeat(2001); }), 'karten[0].hinten', /2001 Zeichen.*2000/);
  });

  test('ausfuehrlich darf 4000 Zeichen haben, aber nicht mehr', () => {
    const lang = pruefeVariante((p) => { p.zusammenfassung[0].ausfuehrlich = 'Satz. '.repeat(600); });
    assert.equal(lang.ok, true, JSON.stringify(lang.fehler));
    erwarteFehler(
      pruefeVariante((p) => { p.zusammenfassung[0].ausfuehrlich = 'a'.repeat(4001); }),
      'zusammenfassung[0].ausfuehrlich',
      /4001 Zeichen.*4000/,
    );
  });

  test('HTML im Text', () => {
    erwarteFehler(pruefeVariante((p) => { p.karten[0].hinten = 'Im <b>Zellplasma</b>'; }), 'karten[0].hinten', /HTML.*<b>/);
  });

  test('Mathe-Text mit < ist kein HTML', () => {
    const ergebnis = pruefeVariante((p) => { p.karten[0].hinten = 'Es gilt x < 5 und y > 2.'; });
    assert.equal(ergebnis.ok, true, JSON.stringify(ergebnis.fehler));
  });

  test('begriffe ist keine Liste bzw. hat mehr als 10 Einträge', () => {
    erwarteFehler(pruefeVariante((p) => { p.zusammenfassung[0].begriffe = 'Glykolyse'; }), 'zusammenfassung[0].begriffe', /Liste/);
    erwarteFehler(
      pruefeVariante((p) => { p.zusammenfassung[0].begriffe = Array.from({ length: 11 }, () => 'Glykolyse'); }),
      'zusammenfassung[0].begriffe',
      /höchstens 10/,
    );
  });

  test('unbekanntes Folien-Layout', () => {
    erwarteFehler(pruefeVariante((p) => { p.videos[0].folien[1].layout = 'tabelle'; }), 'videos[0].folien[1].layout', /Unbekanntes Layout/);
  });

  test('quiz-Folie: richtig als Liste statt Zahl', () => {
    const ergebnis = pruefeVariante((p) => { folieVomLayout(p, 'quiz').richtig = [0]; });
    erwarteFehler(ergebnis, /^videos\[\d+\]\.folien\[\d+\]\.richtig$/, /einzelne Zahl/);
  });

  test('stichpunkte-Folie mit 6 Punkten', () => {
    const ergebnis = pruefeVariante((p) => { folieVomLayout(p, 'stichpunkte').punkte = ['a', 'b', 'c', 'd', 'e', 'f']; });
    erwarteFehler(ergebnis, /^videos\[\d+\]\.folien\[\d+\]\.punkte$/, /höchstens 5/);
  });

  test('kaputte Listeneinträge werfen keinen Programmfehler', () => {
    const ergebnis = pruefeVariante((p) => {
      p.fragen.push(null);
      p.karten.push('Karte');
      p.videos[0].folien.push(7);
      p.unterthemen.push([]);
    });
    assert.equal(ergebnis.ok, false);
    assert.ok(ergebnis.fehler.some((f) => f.pfad === `fragen[${BEISPIEL.fragen.length}]`));
  });
});

describe('Hinweise: Paket bleibt ok', () => {
  test('unbekanntes Feld', () => {
    erwarteHinweis(pruefeVariante((p) => { p.zusammenfassung[0].begrife = ['Glykolyse']; }), 'zusammenfassung[0].begrife', /Unbekanntes Feld/);
  });

  test('Markdown im Text', () => {
    erwarteHinweis(pruefeVariante((p) => { p.karten[0].hinten = 'Im **Zellplasma**'; }), 'karten[0].hinten', /Markdown/);
  });

  test('teil bei einem Paket ohne Matura', () => {
    erwarteHinweis(pruefeVariante((p) => { p.fragen[0].teil = '1'; }), 'fragen[0].teil', /nur bei Matura/);
  });

  test('teil bei Matura ergibt keinen Hinweis', () => {
    const ergebnis = pruefeVariante((p) => { p.pruefungsart = 'Matura'; p.fragen[0].teil = '2'; });
    assert.equal(ergebnis.ok, true);
    assert.deepEqual(ergebnis.hinweise, []);
  });

  test('nur 7 Karteikarten in einem Unterthema', () => {
    const ergebnis = pruefeVariante((p) => {
      const i = p.karten.findIndex((k) => k.unterthema === 'u1');
      p.karten.splice(i, 1);
    });
    erwarteHinweis(ergebnis, 'karten', /„u1“ hat 7 Karteikarten.*8 bis 15/);
  });

  test('Begriff kommt im Text nicht vor', () => {
    erwarteHinweis(pruefeVariante((p) => { p.zusammenfassung[0].begriffe = ['Photosynthese']; }), 'zusammenfassung[0].begriffe[0]', /kommt .* nicht vor/);
  });

  test('erste Folie ist nicht titel', () => {
    erwarteHinweis(pruefeVariante((p) => { p.videos[0].folien.shift(); }), 'videos[0].folien', /Erste Folie/);
  });

  test('woerter mit Großbuchstaben', () => {
    const index = BEISPIEL.fragen.findIndex((f) => f.typ === 'freitext');
    const ergebnis = pruefeVariante((p) => { p.fragen[index].bewertungspunkte[0].woerter[0] = 'Sauerstoff'; });
    erwarteHinweis(ergebnis, `fragen[${index}].bewertungspunkte[0].woerter[0]`, /klein/);
  });

  test('zu wenige Übungsfragen in einem Unterthema', () => {
    const ergebnis = pruefeVariante((p) => {
      p.fragen.filter((f) => f.unterthema === 'u2' && !f.nurTest).slice(0, 3).forEach((f) => { f.nurTest = true; });
    });
    erwarteHinweis(ergebnis, 'fragen', /„u2“ hat nur 4 Übungsfragen/);
  });
});

describe('pruefeDateiText', () => {
  test('Beispieldatei ist ok und liefert das Paket', () => {
    const ergebnis = pruefeDateiText(BEISPIEL_TEXT);
    assert.equal(ergebnis.ok, true);
    assert.equal(ergebnis.paket.id, BEISPIEL.id);
  });

  test('UTF-8-BOM am Anfang wird toleriert', () => {
    assert.equal(pruefeDateiText('﻿' + BEISPIEL_TEXT).ok, true);
  });

  test('kein gültiges JSON', () => {
    const ergebnis = pruefeDateiText('{ "format": "lernpaket", }');
    assert.equal(ergebnis.ok, false);
    assert.match(ergebnis.fehler[0].meldung, /kein gültiges JSON/);
    assert.equal(ergebnis.paket, null);
  });

  test('Datei über 5 MB', () => {
    const riesig = ' '.repeat(MAX_DATEI_BYTES + 1);
    const ergebnis = pruefeDateiText(riesig);
    assert.equal(ergebnis.ok, false);
    assert.match(ergebnis.fehler[0].meldung, /zu groß.*5 MB/);
  });
});
