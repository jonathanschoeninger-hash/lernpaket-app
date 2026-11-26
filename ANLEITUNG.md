# Anleitung: Lernpaket-App mit Claude Code bauen

Diese Anleitung führt dich Schritt für Schritt durch den Bau. Du kopierst pro Phase einen fertigen Auftrag in Claude Code, Claude Code programmiert, du testest kurz im Browser, dann kommt die nächste Phase.

**Dateien in diesem Paket:**
| Datei | Wofür |
|-------|-------|
| `ANLEITUNG.md` | diese Anleitung |
| `DESIGN.md` | die vollständige Spezifikation (was die App können soll) |
| `CLAUDE.md` | Projektregeln – Claude Code liest sie automatisch bei jedem Start |
| `.claude/skills/lernpaket-erstellen/SKILL.md` | das verbindliche Lernpaket-Format + Anleitung zum Erstellen von Paketen |

---

## 0. Was du brauchst (alles gratis, außer deinem Claude-Abo)

- **Claude Code** (Installation siehe https://docs.claude.com → Claude Code). Läuft über dein Claude-Konto und zählt zu deinem normalen Nutzungslimit.
- **Node.js 20 oder neuer** (https://nodejs.org) – nur für Tests, nicht für die App selbst.
- **Git** (https://git-scm.com).
- Ein **GitHub-Konto** (gratis) – zum Veröffentlichen am Ende.
- Chrome oder Edge zum Testen (dort sind deutsche Vorlese-Stimmen meist vorhanden).

---

## 1. Projekt anlegen

1. Einen neuen Ordner anlegen, z. B. `lernpaket-app`.
2. Alle Dateien aus diesem Paket hineinkopieren – **inklusive des Ordners `.claude`** (versteckter Ordner, ggf. „versteckte Dateien anzeigen“ einschalten).
3. Terminal in dem Ordner öffnen und eingeben:
   ```
   git init
   claude
   ```
4. Erste Nachricht an Claude Code:
   ```
   Lies CLAUDE.md, DESIGN.md und .claude/skills/lernpaket-erstellen/SKILL.md.
   Fasse in 5 Sätzen zusammen, was wir bauen, und liste Unklarheiten oder
   Widersprüche zwischen den Dateien auf. Noch nichts programmieren.
   ```
   → Unklarheiten beantworten, bevor es losgeht.

**Tipps für die ganze Zeit:**
- Vor jeder Phase `/clear` eingeben (spart Nutzung, Claude Code liest `CLAUDE.md` neu).
- Wenn Claude Code einen Plan zeigt: lesen, ggf. ändern lassen, dann freigeben.
- Nach jeder Phase prüft Claude Code mit `node --test`. Zusätzlich testest du kurz selbst (Liste steht bei jeder Phase).
- Etwas kaputt? Schreib genau, was du gemacht hast und was passiert ist, z. B.: *„Ich klicke im Übungsmodus auf ‚Weiter‘, dann bleibt die Seite weiß. In der Konsole steht: …“*

---

## 2. Die Phasen (Aufträge zum Kopieren)

### Phase 1 – Format, Prüfprogramm, Beispielpaket

```
Phase 1 aus DESIGN.md, Abschnitt 12.

Ziel: Das Lernpaket-Format aus .claude/skills/lernpaket-erstellen/SKILL.md
wird maschinell prüfbar.

1. js/logic/validate.js: Funktion validatePaket(obj)
   → { ok, fehler: [ {pfad, meldung} ], hinweise: [ {pfad, meldung} ] }.
   Zwei Stufen nach SKILL.md Abschnitt 4:
   FEHLER (ok = false) = alles aus SKILL.md Abschnitt 3 und die Checkliste
   aus Abschnitt 4 (Pflichtfelder inkl. Paket-id, Typen, ID-Muster,
   eindeutige IDs, erstellt als JJJJ-MM-TT, Verweise auf unterthemen und
   quellen, Indizes in richtig, jeder Platzhalter {{1}}…{{n}} genau einmal
   und n = Anzahl luecken, bewertungspunkte = maxPunkte, teil nur "1"/"2",
   optionales Feld begriffe, je Unterthema genau eine Zusammenfassung,
   mind. ein Video, mind. 3 Fragen mit nurTest, keine leeren Texte,
   Textlängen max. 2000 Zeichen bzw. 4000 bei ausfuehrlich, Datei max. 5 MB).
   HINWEISE (ok bleibt true) = Mengen- und Stilregeln aus SKILL.md
   Abschnitt 2 (Liste in Abschnitt 4).
   Meldungen auf Deutsch und verständlich,
   z. B. "fragen[4].richtig: Index 5 gibt es nicht (nur 4 Optionen)".
   Ohne DOM, ohne Abhängigkeiten, als ES-Modul – läuft im Browser und in Node.
2. tools/pruefen.js: node tools/pruefen.js <datei> → "OK – 4 Unterthemen,
   40 Karten, 4 Videos, 40 Fragen (12 nur Test)", darunter ggf. die Hinweise
   (Exit-Code 0) – oder Liste der Fehler, Exit-Code 1.
3. beispiele/zellatmung.lernpaket.json: vollständiges Beispielpaket nach
   SKILL.md (Thema Zellatmung, AHS 10. Stufe, 3 Unterthemen). Jeder Fragetyp
   und jedes Folien-Layout kommt mindestens einmal vor, ebenso begriffe.
   Ziel: OK ohne Hinweise.
4. tests/validate.test.js: Beispielpaket ist gültig; mindestens 20 kaputte
   Varianten (je ein Fehler) werden mit passender Meldung abgelehnt;
   mindestens 3 Varianten lösen nur einen Hinweis aus und bleiben ok.

Zuerst Plan zeigen, dann Tests, dann Umsetzung. Am Ende: node --test und
node tools/pruefen.js beispiele/zellatmung.lernpaket.json ausführen, Commit.
```
**Du prüfst:** `node tools/pruefen.js beispiele/zellatmung.lernpaket.json` meldet OK. Öffne das Beispielpaket und lies 3–4 Fragen – passt der Stil?

---

### Phase 2 – App-Gerüst, Paket öffnen, Zusammenfassung, Karteikarten

```
Phase 2 aus DESIGN.md, Abschnitt 12.

1. index.html, css/app.css, js/main.js: App-Gerüst mit Hash-Router
   (#/start, #/paket/<id>, #/paket/<id>/zusammenfassung usw. – mit /
   getrennt, weil IDs - enthalten dürfen).
   Handy zuerst, Tab-Leiste unten auf schmalen Bildschirmen, Hell/Dunkel
   nach Systemeinstellung. Gestaltung: ruhig, gut lesbar, eine Akzentfarbe.
2. js/store/db.js: IndexedDB-Wrapper (Pakete, Fortschritt pro Paket,
   globale Einstellungen; Aufbau nach DESIGN.md 8).
3. Start-Bildschirm: Lernpaket öffnen per Dateiauswahl UND Drag & Drop.
   Jedes Paket mit validatePaket prüfen; Fehler verständlich anzeigen
   (max. 10, Rest als "… und 7 weitere"), Hinweise nur dezent.
   Gleiche Paket-id schon vorhanden → fragen: ersetzen (Fortschritt zu
   weiter vorhandenen IDs behalten, Rest verwerfen) oder abbrechen.
   Liste "Meine Pakete" mit Fach, Titel, Fortschritt, Löschen (mit Rückfrage
   im eigenen Dialog, kein confirm()).
4. Zusammenfassung (DESIGN.md 5.3): pro Unterthema, Umschalter kurz/normal/
   ausführlich, Fachbegriffe aus begriffe hervorheben (DOM-Elemente, kein
   innerHTML), Merke-Kästen, Quellen, Knöpfe zu Video/Karten/Üben (was es
   noch nicht gibt: deaktiviert mit Hinweis), Druckansicht per CSS @media print.
5. Karteikarten (DESIGN.md 5.4): js/logic/leitner.js mit Tests (Fächer 1–5,
   Fälligkeit 0/1/3/7/14 Tage, gewusst/nicht gewusst). Karte umdrehen per
   Klick, Leertaste und Wischen. Anzeige "Heute fällig: n". Auswahl nach
   Unterthema. CSV-Export für Anki (als Download über Blob-Link).

Paketinhalt NIE per innerHTML einsetzen. Plan zeigen, Tests zuerst, Commit.
```
**Du prüfst:** Beispielpaket öffnen (auch per Reinziehen) · eine kaputte Datei öffnen → verständliche Fehlermeldung · Zusammenfassung in allen 3 Längen · 5 Karten durchgehen, Seite neu laden → Fortschritt ist noch da · am Handy (oder Browser auf schmal stellen) ansehen.

---

### Phase 3 – Übungsmodus & Fehlerheft

```
Phase 3: Übungsmodus nach DESIGN.md 5.5 und Fehlerheft.

1. js/logic/adaptive.js mit Tests ZUERST:
   - Gewichte: Start 1,0; richtig ×0,4 und serie+1; falsch ×2+1 und serie=0
   - gewichtete Zufallsauswahl mit austauschbarem Zufallsgenerator (für Tests)
   - gerade gestellte Frage 2 Züge gesperrt
   - falsche Frage kommt spätestens nach 3 anderen wieder
   - gemeistert: 2× hintereinander richtig, 3× wenn sie schon einmal falsch war
   - nur Fragen mit nurTest=false; ganzes Paket oder ein Unterthema
   - "gemeistert" bleibt gespeichert; "Neue Runde" setzt es zurück,
     Gewichte und Fehlerheft bleiben
   Test: Simulation mit 30 Fragen und festem Zufall endet immer, wenn man
   immer richtig antwortet; falsche Fragen kommen nachweislich öfter.
2. Eingabe-Bausteine für ALLE Fragetypen (mc, mehrfach, wahrfalsch,
   lueckentext, zuordnen, reihenfolge, zahl, freitext) – mit Tastatur und
   Touch bedienbar (reihenfolge/zuordnen: auch ohne Drag & Drop mit Knöpfen).
   Auswertung je Typ in js/logic/grading.js (mit Tests): Lückentext
   ohne Groß/Klein und mit getrimmten Leerzeichen, zahl mit Toleranz und
   Komma ODER Punkt, mehrfach/zuordnen mit halben Punkten nach DESIGN.md 4.2.
3. js/logic/freitext.js mit Tests: Bewertungspunkte über woerter erkennen
   (Kleinschreibung, Umlaute ä/ae usw. gleich behandeln), Punktevorschlag,
   danach Musterlösung zeigen und Nutzer bestätigt/korrigiert in ½-Schritten.
4. Nach jeder Antwort: richtig/falsch, Erklärung, Quelle, Knopf "Weiter"
   (auch Enter). Bei Teilpunkten zählt nur die volle Punktzahl als richtig.
   Fortschrittsbalken gemeistert/alle. Rundenbericht am Ende mit Knopf
   "Neue Runde". Knopf "Nur meine Schwächen üben" vorbereiten (wird in
   Phase 4 befüllt).
5. Fehlerheft: alle jemals falsch beantworteten Fragen (ab Phase 4 auch aus
   Tests), gruppiert nach Unterthema, inzwischen gemeisterte mit Hinweis
   "inzwischen gemeistert", mit "Diese Fragen üben".

Plan zeigen, Tests zuerst, Commit.
```
**Du prüfst:** eine Runde absichtlich mit 2–3 Fehlern spielen → die falschen kommen bald wieder · jeden Fragetyp einmal beantworten · Freitext: Punkte-Vorschlag sinnvoll? · Fehlerheft zeigt die Fehler.

---

### Phase 4 – Test, Notenschlüssel, Auswertung

```
Phase 4: Test & Benotung nach DESIGN.md Abschnitt 6 und Auswertung nach Abschnitt 7.

1. js/logic/grading.js erweitern (Tests zuerst):
   - Notenschlüssel-Vorlagen aus DESIGN.md 6.1 (Standard 89/76/63/50,
     Mathe 85/75/60/50, Matura mit Punktegrenzen – in Prozent der
     Höchstpunkte umgerechnet –, eigener Schlüssel)
   - Grenzen gelten "ab" (≥). Randfälle testen: genau 50 % = Genügend,
     49,9 % = Nicht genügend, 0 Punkte, volle Punkte.
   - Text wie "Befriedigend (3) – 68 %. Noch 8 % bis Gut."
2. Testzusammenstellung: Fragen mit nurTest=true zuerst, gleichmäßig über
   Unterthemen; zu wenige → Übungsfragen ergänzen, die am längsten nicht
   dran waren.
3. Modi aus DESIGN.md 6.2: Schularbeit-Simulation (15–20 Fragen, Zeitlimit
   einstellbar, Standard 50 Min), Kurztest (5–10, 15 Min), Matura schriftlich
   (Teil 1 und Teil 2 getrennt, nur wenn Fragen ein Feld teil haben),
   Kompensationsprüfung (nur zuletzt negative Unterthemen).
   Die mündliche Prüfung kommt erst in Phase 5.
   Während des Tests keine Lösungen. Zeit abgelaufen → automatisch abgeben.
   Seite neu laden während des Tests → Test geht weiter.
4. Ergebnis: Freitext-Fragen zuerst selbst bewerten (Punktevorschlag +
   Musterlösung), dann Note groß, Punkte, Prozent, pro Unterthema, alle
   Fragen mit Lösung und Erklärung. Bei Note 5 Hinweis, welche Unterthemen
   fehlen. Falsche Antworten kommen ins Fehlerheft.
5. js/logic/mastery.js (Tests zuerst) nach DESIGN.md 7, Farben passend zum
   gewählten Notenschlüssel. Bildschirm "Fortschritt": Balken pro Unterthema,
   Empfehlung, Notenverlauf als einfache Linie (SVG, selbst gezeichnet).
   Knopf "Nur meine Schwächen üben" jetzt befüllen.
6. Einstellungen: Notenschlüssel wählen/eingeben (Prüfung: Grenzen absteigend)
   als Voreinstellung für alle Pakete; pro Paket änderbar.

Plan zeigen, Tests zuerst, Commit.
```
**Du prüfst:** Kurztest absichtlich mit ca. 50 % → stimmt die Note? · eigenen Notenschlüssel eingeben · Schularbeit mit 1 Minute Zeitlimit → gibt automatisch ab · Fortschritt zeigt grün/gelb/rot.

---

### Phase 5 – Erklärvideos

```
Phase 5: Video-Player nach DESIGN.md 4.1 und 5.2, dazu die mündliche Prüfung (6.2).

1. js/video/layouts.js: alle 9 Layouts (titel, stichpunkte, begriff, ablauf,
   vergleich, formel, zahl, merke, quiz) als DOM-Bausteine, 16:9-Bühne,
   skaliert sauber von 360 px bis Vollbild, gut lesbar. Ruhige Übergänge,
   bei prefers-reduced-motion ohne Animation.
2. js/video/speech.js: Wrapper um speechSynthesis – deutsche Stimme wählen
   (de-AT bevorzugt, sonst de-DE, sonst erste deutsche), Tempo 0,75–1,5,
   Pause/Weiter/Stopp, Satz-Ereignisse. Chrome-Eigenheit beachten: lange
   Texte in Sätze teilen. Keine Stimme vorhanden → Untertitel-Modus mit
   automatischem Weiterblättern nach Lesezeit.
3. js/video/player.js: Stichpunkte erscheinen nacheinander passend zum
   Sprechertext, Play/Pause (Leertaste), Folie vor/zurück (Pfeiltasten),
   Tempo, Untertitel an/aus, Vollbild. quiz-Folie: kurz pausieren, Antwort
   wählen oder nach 5 s Lösung zeigen. "Gesehen" ab 80 % der Folien.
   Nach dem Video: Knopf "Fragen zu diesem Unterthema üben".
4. Videoliste pro Paket mit Haken für gesehene Videos.
5. Mündliche Prüfung als weiterer Prüfungsmodus (aus Phase 4 verschoben):
   Frage wird mit speech.js vorgelesen, Antwort tippen oder – wenn der
   Browser SpeechRecognition hat – sprechen, dann Musterlösung +
   Selbstbewertung. Ergebnis und Note wie bei den anderen Modi.

Plan zeigen, Commit.
```
**Du prüfst:** ein Video in Chrome mit Ton · Tempo ändern · Pfeiltasten · Quiz-Folie · am Handy · in einem Browser ohne deutsche Stimme (falls vorhanden) → Untertitel-Modus · mündliche Prüfung: Frage wird vorgelesen, Antwort sprechen oder tippen.

---

### Phase 6 – Offline, Backup, Feinschliff, Veröffentlichen

```
Phase 6: Feinschliff nach DESIGN.md Abschnitt 8 und 12.

1. PWA: manifest.webmanifest (Name, Icons als SVG/PNG im Repo, Farben),
   sw.js (alle App-Dateien offline verfügbar, Versionsnummer, alter Cache
   wird gelöscht). App funktioniert nach dem ersten Laden ohne Internet.
2. Backup: Einstellungen → "Alles sichern" (eine JSON-Datei mit Paketen +
   Fortschritt) und "Sicherung laden" (mit Prüfung und Rückfrage).
3. Durchgang Barrierefreiheit: alle Bildschirme nur mit Tastatur bedienbar,
   Fokus sichtbar, Kontraste, aria-Labels, Überschriften-Reihenfolge.
4. Durchgang Handy: 360 px, 390 px, 768 px, Querformat – nichts ragt raus.
5. Leere Zustände überall (kein Paket, keine Fehler im Fehlerheft, noch kein Test).
6. Paket per Link öffnen: nur Dateien von derselben Adresse wie die App
   (Ordner pakete/ im Repo), z. B. #/oeffnen/pakete/zellatmung.lernpaket.json.
   Andere Adressen ablehnen. Danach normale Prüfung wie beim Datei-Öffnen.
7. README.md auf Deutsch: was die App ist, wie man ein Lernpaket öffnet,
   wie man Pakete mit Claude erstellt (Verweis auf SKILL.md), Datenschutz
   (alles bleibt am Gerät), Lizenz MIT (LICENSE-Datei anlegen).
8. Anleitung im README, wie man die App auf GitHub Pages veröffentlicht.

Plan zeigen, Commit.
```
**Du prüfst:** App einmal laden, WLAN aus, neu laden → läuft · Backup machen, Browserdaten löschen, Backup laden → alles wieder da · am Handy „Zum Startbildschirm hinzufügen“.

---

## 3. Veröffentlichen (gratis, GitHub Pages)

Sag Claude Code:
```
Hilf mir, das Projekt auf GitHub zu veröffentlichen und GitHub Pages
einzuschalten. Erkläre jeden Schritt, den ich selbst im Browser machen muss.
```
Danach ist die App unter `https://<dein-name>.github.io/lernpaket-app/` erreichbar. Den Link kannst du allen schicken.

---

## 4. Lernpakete erstellen

- **In Claude Code:** im Projektordner z. B. schreiben:
  ```
  Erstelle ein Lernpaket aus material/zellatmung.pdf, AHS 10. Stufe,
  Biologie, Schularbeit.
  ```
  Claude Code nutzt automatisch den Skill `lernpaket-erstellen` und prüft das Paket mit `tools/pruefen.js`.
  Tipp: Lege einen Ordner `material/` an und trag ihn in `.gitignore` ein, damit deine Unterlagen nicht auf GitHub landen.
- **Im Claude-Chat (claude.ai):** den Inhalt von `SKILL.md` als Skill in deinem Konto speichern – dann reicht dort „Mach daraus ein Lernpaket“ + Datei hochladen.

---

## 5. Wenn etwas schiefgeht

| Problem | Was du Claude Code schreibst |
|---------|------------------------------|
| Seite bleibt weiß | „Die Seite bleibt weiß. Öffne die App, lies die Konsolenfehler und behebe sie.“ (oder Fehlertext aus F12 → Konsole hineinkopieren) |
| Tests schlagen fehl | „node --test schlägt fehl. Finde die Ursache, bevor du etwas änderst.“ |
| Claude Code ändert zu viel | „Mach nur X. Ändere keine anderen Dateien.“ |
| Ergebnis gefällt nicht | `git log` zeigt die Commits; „Setz auf den Stand vor Phase 4 zurück“ |
| Nutzungslimit erreicht | warten bis zur Zurücksetzung, dann mit `/clear` und dem Phasen-Auftrag weitermachen – der Stand ist dank Commits gesichert |
