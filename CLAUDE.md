# Lernpaket-App – Projektregeln für Claude Code

## Was wir bauen
Eine kostenlose Lern-App im Browser. Sie öffnet **Lernpakete** (`*.lernpaket.json`) mit Zusammenfassung, Karteikarten, Erklärvideos und Prüfungsfragen. Benotung nach österreichischem Schulsystem (1–5).
**Die vollständige Spezifikation steht in `DESIGN.md`. Lies sie vor jeder Phase. Das Paketformat steht verbindlich in `.claude/skills/lernpaket-erstellen/SKILL.md`.**

## Harte Regeln
1. **Keine Kosten:** kein Server, keine Datenbank im Netz, keine bezahlten APIs, keine API-Schlüssel, kein Login, keine Tracker/Analytics.
2. **Keine Netzwerkanfragen** außer dem Laden der App-Dateien selbst. Keine CDNs – alles liegt im Repo.
3. **Kein Framework, kein Build-Schritt:** reines HTML, CSS und JavaScript (ES-Module). Läuft direkt über GitHub Pages.
4. **Keine Laufzeit-Abhängigkeiten.** Tests laufen mit Node 20+ (`node --test`), ohne npm-Pakete.
5. **Sicherheit:** Inhalte aus Lernpaketen sind fremde Daten. Nie `innerHTML` mit Paketinhalt – immer `textContent` oder DOM-Elemente bauen. Nie `eval`/`new Function`. Jedes Paket wird vor dem Speichern mit `js/logic/validate.js` geprüft.
6. **Sprache:** Alle Texte in der App auf österreichischem Deutsch (Jänner, Schularbeit, Matura, heuer …). Code-Namen dürfen deutsch oder englisch sein, aber einheitlich.
7. **Daten bleiben lokal:** IndexedDB für Pakete und Fortschritt, Export/Import als Datei.
8. **Barrierefrei & Handy zuerst:** Bedienung mit Tastatur, sichtbarer Fokus, Knöpfe mind. 44 px, funktioniert ab 360 px Breite, Hell- und Dunkelmodus.

## Ordnerstruktur
```
index.html
manifest.webmanifest
sw.js                      Service Worker (offline)
css/app.css
js/main.js                 Start, Router (#hash)
js/store/db.js             IndexedDB-Wrapper
js/logic/validate.js       Paket-Prüfung (Browser + Node)
js/logic/adaptive.js       Übungsmodus-Algorithmus
js/logic/leitner.js        Karteikarten-Fächer
js/logic/grading.js        Punkte, Notenschlüssel, Note 1–5
js/logic/freitext.js       Freitext-Bewertung über Bewertungspunkte
js/logic/mastery.js        Beherrschung pro Unterthema
js/ui/*.js                 Bildschirme (start, paket, zusammenfassung, karten, ueben, test, fortschritt, fehlerheft, einstellungen)
js/video/layouts.js        Folien-Layouts (DOM, kein HTML-String aus Paketdaten)
js/video/player.js         Abspielen, Steuerung
js/video/speech.js         speechSynthesis-Wrapper
beispiele/zellatmung.lernpaket.json
tools/pruefen.js           CLI: node tools/pruefen.js <datei>
tests/*.test.js
.claude/skills/lernpaket-erstellen/SKILL.md
```
Die Logik in `js/logic/` darf **nichts** vom DOM oder Browser benutzen, damit sie in Node testbar ist.

## Arbeitsweise
- Arbeite **phasenweise** (Phasen in `DESIGN.md`, Abschnitt 12). Beginne keine neue Phase ohne Auftrag.
- Vor dem Programmieren: kurzen Plan zeigen (Dateien, Schritte).
- Für jede Logik-Funktion zuerst Tests schreiben, dann umsetzen.
- Nach jeder Phase: `node --test` muss grün sein, `node tools/pruefen.js beispiele/zellatmung.lernpaket.json` muss „OK“ melden.
- Am Ende jeder Phase: kurze Zusammenfassung auf Deutsch + Liste, was ich im Browser von Hand testen soll. Dann einen Git-Commit machen.
- Wenn etwas in `DESIGN.md` unklar oder widersprüchlich ist: nachfragen statt raten.

## Befehle
- Tests: `node --test`
- Paket prüfen: `node tools/pruefen.js <datei.json>`
- Lokal ansehen: `npx --yes serve .` **oder** `python3 -m http.server 8080` → http://localhost:8080
