# Lernpaket-App

Eine **kostenlose Lern-App im Browser**. Sie öffnet *Lernpakete* (`*.lernpaket.json`) mit

- **Zusammenfassung** in drei Längen (kurz, normal, ausführlich),
- **Karteikarten** nach dem Leitner-System (5 Fächer),
- **Erklärvideos** aus Folien mit Vorlese-Stimme,
- **Üben** mit einem Modus, der sich an deine Fehler anpasst, und Fehlerheft,
- **Test** mit Note nach österreichischem Schulsystem (1–5), auch Schularbeit-Simulation, Matura und mündliche Prüfung,
- **Fortschritt**: Was kann ich schon – grün, gelb, rot pro Unterthema.

Kein Konto, keine Werbung, kein Server. Die App läuft auch offline.

## Ein Lernpaket öffnen

1. App öffnen (z. B. `https://<dein-name>.github.io/lernpaket-app/`).
2. Auf der Startseite **„Datei auswählen“** oder die `.lernpaket.json`-Datei ins Fenster ziehen.
3. Die App prüft das Paket. Ist etwas kaputt, steht genau da, was – das Paket wird dann nicht gespeichert.

Zum Ausprobieren liegt ein Beispielpaket in [`beispiele/zellatmung.lernpaket.json`](beispiele/zellatmung.lernpaket.json).

**Per Link:** Pakete im Ordner `pakete/` (oder `beispiele/`) dieses Repos lassen sich direkt verlinken:

```
https://<dein-name>.github.io/lernpaket-app/#/oeffnen/pakete/mein-paket.lernpaket.json
```

Aus Sicherheitsgründen öffnet die App per Link **nur** Dateien aus diesen beiden Ordnern derselben Seite – keine fremden Adressen.

## Lernpakete mit Claude erstellen

Lernpakete erstellt man mit Claude aus eigenem Material (Skript, Mitschrift, Fotos, PDF). Das verbindliche Format und alle Regeln stehen in
[`.claude/skills/lernpaket-erstellen/SKILL.md`](.claude/skills/lernpaket-erstellen/SKILL.md).

- **In Claude Code** (im Projektordner):
  ```
  Erstelle ein Lernpaket aus material/zellatmung.pdf, AHS 10. Stufe, Biologie, Schularbeit.
  ```
  Claude Code nutzt den Skill `lernpaket-erstellen` und prüft das Ergebnis selbst.
  Tipp: Leg einen Ordner `material/` an und trag ihn in `.gitignore` ein, damit deine Unterlagen nicht auf GitHub landen.
- **Im Claude-Chat (claude.ai):** den Inhalt von `SKILL.md` als Skill speichern – dann reicht „Mach daraus ein Lernpaket“ und die Datei hochladen.

Ein Paket selbst prüfen:

```
node tools/pruefen.js pakete/mein-paket.lernpaket.json
```

**Urheberrecht:** Pakete aus eigenen Mitschriften darfst du frei teilen. Pakete aus Schulbüchern oder Unterlagen deiner Lehrkräfte nur in der eigenen Klasse teilen, nicht öffentlich ins Internet stellen.

## Datenschutz

- **Alles bleibt auf deinem Gerät.** Pakete und Fortschritt liegen im Browser (IndexedDB). Es gibt keinen Server, kein Konto, keine Tracker.
- Die App lädt nur ihre eigenen Dateien – keine fremden Seiten, keine CDNs.
- **Sicherung:** Unter *Einstellungen → Sicherung* kannst du alles in eine Datei sichern und auf einem anderen Gerät wieder laden. Wer Browserdaten löscht, löscht auch die Pakete – vorher sichern!
- **Vorlese-Stimme:** Die App verwendet die Stimmen deines Geräts. Stimmen mit dem Hinweis „online“ schicken den vorzulesenden Text an ihren Anbieter; die App bevorzugt Stimmen, die offline laufen.
- **Spracheingabe** (mündliche Prüfung) gibt es nur auf Knopfdruck. Manche Browser (z. B. Chrome) schicken die Aufnahme dafür an ihren Anbieter. Tippen geht immer.

## Lokal starten

ES-Module brauchen einen kleinen Webserver – Doppelklick auf `index.html` reicht nicht.

```
python -m http.server 8080
```

oder

```
npx --yes serve .
```

Dann <http://localhost:8080> öffnen.

**Tests** (Node 20 oder neuer, keine Pakete nötig):

```
node --test
```

## Auf GitHub Pages veröffentlichen (gratis)

1. Auf [github.com](https://github.com) ein Konto anlegen (falls noch keines da ist).
2. Ein neues, **öffentliches** Repository mit dem Namen `lernpaket-app` anlegen – **ohne** README, `.gitignore` oder Lizenz (die gibt es schon).
3. Im Projektordner die Adresse eintragen und hochladen (die Adresse zeigt GitHub nach dem Anlegen an):
   ```
   git remote add origin https://github.com/<dein-name>/lernpaket-app.git
   git push -u origin main
   ```
4. Auf GitHub im Repository: **Settings → Pages**. Bei *Build and deployment* als *Source* „Deploy from a branch“ wählen, *Branch* `main` und Ordner `/ (root)`, dann **Save**.
5. Nach ein bis zwei Minuten läuft die App unter `https://<dein-name>.github.io/lernpaket-app/`. Diesen Link kannst du allen schicken.

**Updates:** Änderungen committen und `git push` – GitHub Pages aktualisiert sich von selbst. Wenn sich App-Dateien geändert haben, in `sw.js` die `VERSION` um eins erhöhen, damit installierte Apps die neue Version laden.

**Am Handy installieren:** Seite öffnen → im Browser-Menü „Zum Startbildschirm hinzufügen“ (Android: „App installieren“).

## Aufbau

| Ordner / Datei | Inhalt |
|---|---|
| `index.html`, `css/app.css` | Seite und Gestaltung |
| `js/main.js` | Start und Adressen (`#/…`) |
| `js/logic/` | Logik ohne Browser – in Node getestet (Prüfung, Leitner, Üben, Noten, Beherrschung …) |
| `js/ui/` | Bildschirme |
| `js/video/` | Folien, Player, Stimme |
| `js/store/db.js` | Speicher im Browser (IndexedDB) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-App |
| `tools/pruefen.js` | Paket auf der Kommandozeile prüfen |
| `tools/icons.js` | Icons neu erzeugen |
| `tests/` | Tests (`node --test`) |
| `DESIGN.md` | Vollständige Spezifikation |

## Lizenz

[MIT](LICENSE) – jeder darf die App nutzen, verändern und weitergeben.
