// IndexedDB-Wrapper: Pakete, Fortschritt pro Paket, globale Einstellungen (DESIGN.md 8).
// Alles bleibt lokal im Browser.

import { leererFortschritt } from '../logic/fortschritt.js';

const DB_NAME = 'lernpaket-app';
const DB_VERSION = 1;

let verbindung = null;

function oeffnen() {
  if (verbindung) return verbindung;
  verbindung = new Promise((resolve, reject) => {
    const anfrage = indexedDB.open(DB_NAME, DB_VERSION);
    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      if (!db.objectStoreNames.contains('pakete')) db.createObjectStore('pakete', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('fortschritt')) db.createObjectStore('fortschritt', { keyPath: 'paketId' });
      if (!db.objectStoreNames.contains('einstellungen')) db.createObjectStore('einstellungen', { keyPath: 'schluessel' });
    };
    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () => {
      verbindung = null;
      reject(anfrage.error);
    };
    anfrage.onblocked = () => reject(new Error('Die Datenbank ist in einem anderen Tab blockiert.'));
  });
  return verbindung;
}

function alsPromise(anfrage) {
  return new Promise((resolve, reject) => {
    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () => reject(anfrage.error);
  });
}

async function mitSpeicher(namen, modus, arbeit) {
  const db = await oeffnen();
  const tx = db.transaction(namen, modus);
  const fertig = new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Speichern abgebrochen.'));
  });
  const ergebnis = await arbeit(...[namen].flat().map((n) => tx.objectStore(n)));
  await fertig;
  return ergebnis;
}

// ---------- Pakete ----------

/** Alle Pakete: [{ id, paket, importiertAm }] */
export function allePakete() {
  return mitSpeicher('pakete', 'readonly', (s) => alsPromise(s.getAll()));
}

/** Ein Paket-Eintrag oder undefined. */
export function ladePaket(id) {
  return mitSpeicher('pakete', 'readonly', (s) => alsPromise(s.get(id)));
}

/**
 * Paket speichern (vorher mit validatePaket geprüft!) – zusammen mit dem Fortschritt,
 * damit Paket und Fortschritt nie auseinanderlaufen.
 */
export function speicherePaket(paket, fortschritt) {
  return mitSpeicher(['pakete', 'fortschritt'], 'readwrite', (pakete, fortschrittSpeicher) => {
    pakete.put({ id: paket.id, paket, importiertAm: new Date().toISOString() });
    fortschrittSpeicher.put(fortschritt ?? leererFortschritt(paket.id));
  });
}

export function loeschePaket(id) {
  return mitSpeicher(['pakete', 'fortschritt'], 'readwrite', (pakete, fortschritt) => {
    pakete.delete(id);
    fortschritt.delete(id);
  });
}

// ---------- Fortschritt ----------

export async function ladeFortschritt(paketId) {
  const f = await mitSpeicher('fortschritt', 'readonly', (s) => alsPromise(s.get(paketId)));
  return { ...leererFortschritt(paketId), ...(f ?? {}) };
}

export function speichereFortschritt(fortschritt) {
  return mitSpeicher('fortschritt', 'readwrite', (s) => alsPromise(s.put(fortschritt)));
}

// ---------- Einstellungen ----------

const STANDARD_EINSTELLUNGEN = {
  notenschluessel: null,
  stimme: null,
  tempo: 1,
  zusammenfassungLaenge: 'normal',
  untertitel: false,
};

export async function ladeEinstellungen() {
  const e = await mitSpeicher('einstellungen', 'readonly', (s) => alsPromise(s.get('global')));
  return { ...STANDARD_EINSTELLUNGEN, ...(e?.werte ?? {}) };
}

export async function speichereEinstellung(name, wert) {
  const werte = await ladeEinstellungen();
  werte[name] = wert;
  return mitSpeicher('einstellungen', 'readwrite', (s) => alsPromise(s.put({ schluessel: 'global', werte })));
}
