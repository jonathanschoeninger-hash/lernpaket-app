// Sicherung (Backup) aller Pakete, des Fortschritts und der Einstellungen – reine Logik ohne DOM.
// Beim Laden wird alles geprüft wie beim Öffnen eines Pakets (DESIGN.md 10, Punkt 25).

import { validatePaket } from './validate.js';
import { leererFortschritt, fortschrittUebernehmen } from './fortschritt.js';
import { pruefeSchluessel } from './grading.js';

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const FORMAT = 'lernpaket-sicherung';
const VERSION = 1;

const istObjekt = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/** pakete: [{ paket }], fortschritte: [{ paketId, … }] */
export function erstelleBackup({ pakete, fortschritte, einstellungen, jetzt = new Date() }) {
  const nachId = new Map((fortschritte ?? []).map((f) => [f.paketId, f]));
  return {
    format: FORMAT,
    version: VERSION,
    erstellt: jetzt.toISOString(),
    pakete: pakete.map(({ paket }) => ({ paket, fortschritt: nachId.get(paket.id) ?? leererFortschritt(paket.id) })),
    einstellungen: einstellungen ?? {},
  };
}

export function backupDateiname(jetzt = new Date()) {
  const zwei = (n) => String(n).padStart(2, '0');
  return `lernpaket-sicherung-${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}.json`;
}

const LAENGEN = ['kurz', 'normal', 'ausfuehrlich'];
const TEMPI = [0.75, 1, 1.25, 1.5];

/** Nur bekannte Einstellungen mit gültigen Werten übernehmen. */
function einstellungenBereinigen(e) {
  if (!istObjekt(e)) return {};
  const sauber = {};
  if (e.notenschluessel === null || (istObjekt(e.notenschluessel) && pruefeSchluessel(e.notenschluessel).length === 0)) {
    sauber.notenschluessel = e.notenschluessel;
  }
  if (e.stimme === null || (typeof e.stimme === 'string' && e.stimme.length <= 300)) sauber.stimme = e.stimme;
  if (TEMPI.includes(e.tempo)) sauber.tempo = e.tempo;
  if (typeof e.untertitel === 'boolean') sauber.untertitel = e.untertitel;
  if (LAENGEN.includes(e.zusammenfassungLaenge)) sauber.zusammenfassungLaenge = e.zusammenfassungLaenge;
  return sauber;
}

function fehler(meldung) {
  return { ok: false, fehler: [meldung], pakete: [], uebersprungen: [], einstellungen: {} };
}

/**
 * Sicherungsdatei prüfen.
 * → { ok, fehler: [], pakete: [{ paket, fortschritt }], uebersprungen: [Texte], einstellungen }
 */
export function pruefeBackupText(text) {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    return fehler(`Die Datei ist zu groß – erlaubt sind höchstens ${MAX_BACKUP_BYTES / 1024 / 1024} MB.`);
  }
  let daten;
  try {
    daten = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return fehler('Das ist keine gültige JSON-Datei.');
  }
  if (daten?.format === 'lernpaket') {
    return fehler('Das ist ein Lernpaket, keine Sicherung. Öffne es auf der Startseite.');
  }
  if (!istObjekt(daten) || daten.format !== FORMAT || !Array.isArray(daten.pakete)) {
    return fehler('Das ist keine Sicherung der Lernpaket-App.');
  }
  if (daten.version !== VERSION) {
    return fehler('Diese Sicherung stammt aus einer neueren Version der App. Bitte die App aktualisieren.');
  }

  const pakete = [];
  const uebersprungen = [];
  const gesehen = new Set();
  daten.pakete.forEach((eintrag, i) => {
    const paket = eintrag?.paket;
    const name = typeof paket?.titel === 'string' ? `„${paket.titel}“` : `Paket ${i + 1}`;
    const pruefung = validatePaket(paket);
    if (!pruefung.ok) {
      const erster = pruefung.fehler[0];
      uebersprungen.push(`${name}: ${erster.pfad ? `${erster.pfad}: ` : ''}${erster.meldung}`);
      return;
    }
    if (gesehen.has(paket.id)) {
      uebersprungen.push(`${name}: kommt doppelt vor – nur das erste wird geladen.`);
      return;
    }
    gesehen.add(paket.id);
    // fortschrittUebernehmen bereinigt alles und verwirft einen laufenden Test.
    pakete.push({ paket, fortschritt: fortschrittUebernehmen(eintrag.fortschritt, paket) });
  });

  if (pakete.length === 0) {
    return {
      ...fehler(daten.pakete.length === 0 ? 'Die Sicherung enthält keine Pakete.' : 'Die Sicherung enthält kein gültiges Paket.'),
      uebersprungen,
    };
  }
  return { ok: true, fehler: [], pakete, uebersprungen, einstellungen: einstellungenBereinigen(daten.einstellungen) };
}
