// Service Worker: macht die App offline nutzbar.
// Strategie: zuerst übers Netz (immer aktuell), ohne Internet aus dem Zwischenspeicher.
// Bei jeder Änderung an den App-Dateien VERSION erhöhen – dann wird der alte Speicher gelöscht.

const VERSION = '5';
const SPEICHER = `lernpaket-app-v${VERSION}`;

// Alle App-Dateien (tests/offline.test.js prüft, dass keine fehlt).
const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskierbar-512.png',
  './icons/icon.svg',
  './js/main.js',
  './js/logic/adaptive.js',
  './js/logic/backup.js',
  './js/logic/fortschritt.js',
  './js/logic/freitext.js',
  './js/logic/grading.js',
  './js/logic/leitner.js',
  './js/logic/mastery.js',
  './js/logic/paketliste.js',
  './js/logic/pruefung.js',
  './js/logic/route.js',
  './js/logic/sprache.js',
  './js/logic/text.js',
  './js/logic/validate.js',
  './js/logic/vertonung.js',
  './js/logic/video.js',
  './js/store/db.js',
  './js/ui/dom.js',
  './js/ui/einstellungen.js',
  './js/ui/fehlerheft.js',
  './js/ui/fortschritt.js',
  './js/ui/fragen.js',
  './js/ui/karten.js',
  './js/ui/notenschluessel.js',
  './js/ui/oeffnen.js',
  './js/ui/paket.js',
  './js/ui/start.js',
  './js/ui/testen.js',
  './js/ui/ueben.js',
  './js/ui/videos.js',
  './js/ui/zusammenfassung.js',
  './js/video/layouts.js',
  './js/video/player.js',
  './js/video/speech.js',
  './beispiele/zellatmung.lernpaket.json',
  './pakete/liste.json',
  './pakete/staedte.lernpaket.json',
];

self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil(
    caches
      .open(SPEICHER)
      .then((speicher) => speicher.addAll(DATEIEN.map((d) => new Request(d, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil(
    caches
      .keys()
      .then((namen) => Promise.all(namen.filter((n) => n.startsWith('lernpaket-app-') && n !== SPEICHER).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  // Nur eigene Dateien – fremde Adressen fasst der Service Worker nicht an.
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== self.location.origin) return;

  ereignis.respondWith(
    // 'no-cache' = beim Server nachfragen, ob die Datei noch aktuell ist (sonst bleibt nach Updates Altes hängen).
    // Seitenaufrufe (mode navigate) dürfen nicht mit Zusatz-Optionen weitergereicht werden – dann nur die Adresse.
    fetch(anfrage.mode === 'navigate' ? anfrage.url : anfrage, { cache: 'no-cache' })
      .then((antwort) => {
        // Nur vollständige Antworten speichern (Audio kommt teils in Stücken, Status 206).
        if (antwort.status === 200) {
          const kopie = antwort.clone();
          caches.open(SPEICHER).then((speicher) => speicher.put(anfrage, kopie));
        }
        return antwort;
      })
      .catch(async () => {
        const treffer = await caches.match(anfrage, { ignoreSearch: true });
        if (treffer) return treffer;
        if (anfrage.mode === 'navigate') return caches.match('./index.html');
        return new Response('Offline – diese Datei ist nicht gespeichert.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }),
  );
});
