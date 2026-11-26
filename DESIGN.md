# Lern-App – Design-Dokument (v7 – zweite Runde Rückfragen vor Phase 1 eingearbeitet)

> Status: **freigegeben zur Umsetzung**. Umsetzung nach `ANLEITUNG.md`.

---

## 1. Idee in einem Satz

Du erstellst mit Claude aus deinem Lernmaterial ein **Lernpaket** (Zusammenfassung, Karteikarten, Erklärvideos, Prüfungsfragen) und schickst es weiter. Alle anderen öffnen es in der **kostenlosen Lern-App**, schauen die Videos, üben die Fragen und machen einen benoteten Test nach österreichischem Notensystem.

```
  DU                                   ALLE ANDEREN
  ───────────────────────────          ─────────────────────────────────
  Material ─► Claude ─► Lernpaket ───► Lern-App (gratis, im Browser)
  (PDF, Word, Text,       (.json)        ├─ Zusammenfassung lesen
   Fotos, Mitschrift)                    ├─ Karteikarten lernen
                                         ├─ Videos ansehen
                                         ├─ Üben (adaptiv)
                                         ├─ Test mit Note 1–5
                                         └─ Auswertung: was kann ich?
```

**Kosten:**
- Für die anderen: **keine** (kein Konto, keine KI, kein Server).
- Für dich: nur dein normales Claude-Nutzungslimit beim Erstellen.

---

## 2. Was drin ist – und was nicht

| Drin | Raus (vorerst) |
|------|----------------|
| Zusammenfassung (3 Längen) | Podcast |
| Karteikarten (Leitner-System) | Bezahlte KI, Server, Login |
| Erklärvideos (Folien + Vorlese-Stimme) | Audio/Video-Transkription im Browser |
| Prüfungsfragen mit Erklärungen | Browser-KI, Texterkennung im Browser |
| Adaptiver Übungsmodus | |
| Test mit österreichischer Benotung | |
| Auswertung nach Unterthemen, Fehlerheft | |

Die rausgenommenen Teile stehen in Abschnitt 11 als „später möglich“.

---

## 3. Teil 1: Lernpaket erstellen (mit Claude)

**Ablauf:**
1. Material in Claude hochladen (PDF, Word, Text, Fotos von Mitschriften/Tafel, Transkripte).
2. Angaben machen: Fach, Thema, Schultyp, Schulstufe, ggf. Prüfungsart (Schularbeit, Matura …).
3. Claude erstellt:
   - Unterthemen
   - Zusammenfassung pro Unterthema in 3 Längen (kurz / normal / ausführlich)
   - 8–15 Karteikarten pro Unterthema
   - 1 Erklärvideo pro Unterthema (3–8 Folien)
   - 8–15 Fragen pro Unterthema (davon ca. ⅓ nur für den Test)
4. Claude prüft das Paket gegen das Format (Abschnitt 4) und liefert die Datei `thema.lernpaket.json`.
5. Du schickst die Datei weiter oder stellst sie online.

**Regeln für Claude beim Erstellen:**
- Nur Inhalte aus dem hochgeladenen Material, nichts erfinden.
- Jede Frage hat eine Erklärung und – wenn bekannt – eine Quelle (Datei + Seite).
- Falsche Antwortmöglichkeiten müssen plausibel sein.
- Freitext-Fragen bekommen eine Musterlösung **und Bewertungspunkte** (was in der Antwort vorkommen muss), damit die App ohne KI bewerten kann.
- Sprache und Schwierigkeit passend zu Schultyp und Stufe, österreichisches Deutsch.

---

## 4. Lernpaket-Format (`.lernpaket.json`)

```json
{
  "format": "lernpaket",
  "version": 1,
  "id": "bio-zellatmung-ahs10",
  "titel": "Zellatmung",
  "fach": "Biologie",
  "schultyp": "AHS",
  "schulstufe": 10,
  "pruefungsart": "Schularbeit",
  "erstellt": "2026-11-26",
  "ersteller": "Jonas",
  "quellen": [
    { "id": "q1", "name": "Skript Zellatmung.pdf" }
  ],
  "unterthemen": [
    { "id": "u1", "name": "Glykolyse" },
    { "id": "u2", "name": "Citratzyklus" }
  ],
  "zusammenfassung": [
    {
      "unterthema": "u1",
      "kurz": "Die Glykolyse spaltet Glucose im Zellplasma in 2 Pyruvat.",
      "normal": "…",
      "ausfuehrlich": "…",
      "merke": ["Ort: Zellplasma", "Bilanz: 2 ATP, 2 NADH"],
      "begriffe": ["Glykolyse", "Pyruvat"],
      "quelle": { "id": "q1", "stelle": "S. 2–4" }
    }
  ],
  "karten": [
    {
      "id": "k1",
      "unterthema": "u1",
      "vorne": "Glykolyse – Ort?",
      "hinten": "Zellplasma (Cytoplasma)",
      "quelle": { "id": "q1", "stelle": "S. 3" }
    }
  ],
  "videos": [
    {
      "id": "v1",
      "unterthema": "u1",
      "titel": "Was passiert bei der Glykolyse?",
      "folien": [
        {
          "layout": "stichpunkte",
          "titel": "Glykolyse im Überblick",
          "punkte": ["findet im Zellplasma statt", "Glucose → 2 Pyruvat", "Gewinn: 2 ATP"],
          "sprechertext": "Die Glykolyse ist der erste Schritt der Zellatmung …"
        }
      ]
    }
  ],
  "fragen": [
    {
      "id": "f1",
      "unterthema": "u1",
      "typ": "mc",
      "schwierigkeit": 2,
      "frage": "Wo findet die Glykolyse statt?",
      "optionen": ["Im Zellplasma", "In der Mitochondrienmatrix", "Im Zellkern", "An der Zellmembran"],
      "richtig": [0],
      "erklaerung": "Die Glykolyse läuft im Zellplasma ab, erst danach geht es in die Mitochondrien.",
      "quelle": { "id": "q1", "stelle": "S. 3" },
      "nurTest": false
    }
  ]
}
```

### 4.1 Folien-Layouts (Video)

Die App zeichnet die Folien selbst aus diesen Bausteinen – Claude liefert nur die Inhalte, kein HTML. So bleibt jedes Paket sicher.

| Layout | Inhalt |
|--------|--------|
| `titel` | großer Titel + Untertitel |
| `stichpunkte` | Titel + 2–5 Punkte (erscheinen nacheinander) |
| `begriff` | Fachbegriff groß + Definition |
| `ablauf` | 3–6 Schritte mit Pfeilen (z. B. Prozess, Zyklus) |
| `vergleich` | 2 Spalten (z. B. Fotosynthese vs. Zellatmung) |
| `formel` | Formel/Gleichung + Erklärung der Teile |
| `zahl` | eine wichtige Zahl groß + Bedeutung |
| `merke` | „Merke:“-Kasten |
| `quiz` | kurze Zwischenfrage im Video (Antwort nach 5 Sekunden) |

### 4.2 Fragetypen

| `typ` | Beschreibung | Bewertung |
|-------|--------------|-----------|
| `mc` | Multiple Choice, eine richtige Antwort | 1 Punkt |
| `mehrfach` | mehrere richtige Antworten | 1 Punkt; ½ bei genau einem Fehler (eine richtige fehlt **oder** eine falsche zu viel), sonst 0 |
| `wahrfalsch` | Richtig/Falsch | 1 Punkt |
| `lueckentext` | Lücken mit erlaubten Schreibweisen | 1 Punkt pro Lücke |
| `zuordnen` | Begriffe ↔ Definitionen | 1 Punkt; ½ wenn mind. die Hälfte der Paare stimmt, sonst 0 |
| `reihenfolge` | Schritte ordnen | 1 Punkt |
| `zahl` | Rechenergebnis mit Toleranz und Einheit | 1 Punkt |
| `freitext` | offene Antwort mit Musterlösung + Bewertungspunkten | 0–3 Punkte |

**Freitext ohne KI bewerten:** Die App prüft, welche Bewertungspunkte (Schlüsselwörter + Synonyme) in der Antwort vorkommen, und schlägt Punkte vor. Danach zeigt sie die Musterlösung und du bestätigst oder korrigierst („passt“ / „½ Punkt weniger“ / „½ Punkt mehr“).

### 4.3 Prüfung beim Import

Die App prüft jedes Paket beim Öffnen: richtiges Format, alle IDs vorhanden, keine leeren Fragen. Fehlerhafte Pakete werden mit verständlicher Meldung abgelehnt. Inhalte aus dem Paket werden nur als Text angezeigt, nie als Code ausgeführt.

Zwei Stufen (Details: SKILL.md Abschnitt 4): **Fehler** (Formatregeln → Paket wird abgelehnt) und **Hinweise** (Mengen- und Stilregeln, z. B. nur 7 Karten → Paket wird trotzdem geöffnet). Grenzen: jeder Text max. 2000 Zeichen (`ausfuehrlich` max. 4000), Datei max. 5 MB.

---

## 5. Teil 2: Die Lern-App (kostenlos)

### 5.1 Bildschirme

```
Start
 ├─ Lernpaket öffnen  (Datei wählen, reinziehen; ab Phase 6 auch Link aufs eigene Repo)
 ├─ Meine Pakete      (Liste, Fortschritt pro Paket)
 └─ Paket
      ├─ Zusammenfassung (Länge umschaltbar, Merke-Kästen, Quellen)
      ├─ Karteikarten (fällige Karten, umdrehen/wischen)
      ├─ Videos       (pro Unterthema)
      ├─ Üben         (adaptiv)
      ├─ Test         (Prüfungsmodi)
      ├─ Fortschritt  (Stärken / Schwächen, Notenverlauf)
      └─ Fehlerheft
Einstellungen: Notenschlüssel, Stimme & Tempo, Backup
```

**Handy:** Tab-Leiste unten (Lesen · Karten · Videos · Üben · Test). Fortschritt und Fehlerheft im Menü.

### 5.2 Video-Player

- Folien werden aus den Layouts gezeichnet, Stichpunkte erscheinen passend zum Sprechertext.
- Stimme: Vorlese-Stimme des Browsers (gratis, deutsch), Tempo 0,75×–1,5×.
- Steuerung: Play/Pause, vor/zurück pro Folie, Untertitel an/aus.
- Zwischenfragen (`quiz`-Folie) pausieren kurz.
- Nach dem Video: Knopf **„Fragen zu diesem Unterthema üben“**.
- Video gilt als „gesehen“, wenn mind. 80 % der Folien gelaufen sind.
- Einschränkung: Videos laufen nur in der App, kein MP4-Download.

### 5.3 Zusammenfassung

- Pro Unterthema, Umschalter kurz / normal / ausführlich.
- Fachbegriffe aus dem Feld `begriffe` hervorgehoben, „Merke“-Kästen, Quelle unter jedem Abschnitt.
- Knöpfe darunter: „Video ansehen“ · „Karten lernen“ · „Fragen üben“.
- Drucken / als PDF speichern (über die Druckfunktion des Browsers).

### 5.4 Karteikarten (Leitner-System)

| Fach | Nächste Wiederholung |
|------|----------------------|
| 1 | sofort / gleicher Tag |
| 2 | nach 1 Tag |
| 3 | nach 3 Tagen |
| 4 | nach 7 Tagen |
| 5 | nach 14 Tagen |

- „Gewusst“ → ein Fach weiter, „Nicht gewusst“ → zurück in Fach 1.
- Startseite zeigt: „Heute fällig: 12 Karten“.
- Auswahl: alle Unterthemen oder nur eines. (Eigene Karten anlegen/bearbeiten: verschoben, siehe Abschnitt 11.)
- Export als CSV für Anki.

### 5.5 Übungsmodus – adaptiver Algorithmus

Jede Frage hat `gewicht` (Start 1,0) und `serie` (richtig hintereinander).

1. Pool = alle nicht gemeisterten Übungsfragen (`nurTest: false`) – ganzes Paket oder ein Unterthema.
2. Nächste Frage wird **gewichtet zufällig** gezogen. Die gerade gestellte Frage ist 2 Züge gesperrt.
3. Auswertung sofort mit Erklärung + Quelle:
   - **Richtig:** `gewicht × 0,4`, `serie + 1`
   - **Falsch:** `gewicht × 2 + 1`, `serie = 0`, kommt spätestens nach 3 anderen Fragen wieder, landet im Fehlerheft
4. **Gemeistert** = 2× hintereinander richtig (war sie schon einmal falsch: 3×) → verlässt den Pool.
5. Pool leer → Rundenbericht (Trefferquote, schwierigste Fragen) und Knopf **„Neue Runde“**: setzt „gemeistert“ zurück, Gewichte und Fehlerheft bleiben.

- **Teilpunkte:** Bei Fragen mit Teilpunkten (`mehrfach`, `zuordnen`, `lueckentext`, `freitext`) zählt nur die **volle Punktzahl** als richtig, alles darunter als falsch.
- „Gemeistert“ wird gespeichert und gilt auch nach dem Neuladen.
- **Fehlerheft:** alle jemals falsch beantworteten Fragen aus Üben **und** Tests. Einträge bleiben; inzwischen gemeisterte bekommen den Hinweis „inzwischen gemeistert“.

Fortschrittsbalken: gemeistert / alle. Knopf **„Nur meine Schwächen üben“** (nur rote Unterthemen).

---

## 6. Test & Benotung – österreichisches Schulsystem

- Fragen mit `nurTest: true` – die kommen im Übungsmodus **nie** vor. Reichen sie nicht, werden Übungsfragen ergänzt, die zuletzt am längsten nicht dran waren.
- Gleichmäßig über alle Unterthemen, gemischte Fragetypen.
- Keine Erklärungen während des Tests, optional Zeitlimit.
- Danach: Note, Punkte, alle Fragen mit Lösung und Erklärung.
- **Freitext im Test:** Nach dem Abgeben kommt zuerst die Selbstbewertung (Punktevorschlag + Musterlösung, bestätigen/korrigieren), erst danach wird die Note angezeigt.

### 6.1 Notenskala (§ 14 LBVO)

| Note | Bezeichnung | Bedeutung (vereinfacht) |
|------|-------------|-------------------------|
| 1 | Sehr gut | weit über das Wesentliche hinaus, eigenständig |
| 2 | Gut | über das Wesentliche hinaus |
| 3 | Befriedigend | Wesentliches zur Gänze |
| 4 | Genügend | Wesentliches überwiegend |
| 5 | Nicht genügend | negativ |

Das Gesetz legt **keine fixen Prozentgrenzen** fest. Vorlagen:

| Vorlage | Sehr gut | Gut | Befriedigend | Genügend | Nicht genügend |
|---------|----------|-----|--------------|----------|----------------|
| **Standard (Schularbeit)** – Voreinstellung | ab 89 % | ab 76 % | ab 63 % | ab 50 % | unter 50 % |
| **Mathematik-Empfehlung** | ab 85 % | ab 75 % | ab 60 % | ab 50 % | unter 50 % |
| **Matura-Modus (SRDP)** | Punktegrenzen eines Prüfungstermins (z. B. AHS Mathe Jänner 2026: 32 / 27 / 22 / 17 von 36 Punkten) | | | | |
| **Eigener Schlüssel** | frei eingeben, z. B. den deiner Lehrkraft | | | | |

- **Matura-Punktegrenzen** werden in Prozent der Höchstpunkte umgerechnet (z. B. 17 von 36 = 47,2 %), damit sie zu jedem Test passen, egal wie viele Punkte er hat.
- **Wo gilt der Schlüssel?** Voreinstellung für alle Pakete in den Einstellungen; pro Paket änderbar (z. B. Mathe-Paket mit Mathe-Schlüssel).

Ergebnis z. B.: *„Befriedigend (3) – 68 %. Noch 8 % bis Gut.“* Bei einer 5: *„Negativ – diese Unterthemen fehlen für ein Genügend: …“*

### 6.2 Prüfungsmodi

| Modus | Was passiert |
|-------|--------------|
| **Schularbeit-Simulation** | 15–20 Fragen, Zeitlimit (z. B. 50 Min), Note mit gewähltem Schlüssel |
| **Kurztest / Stundenwiederholung** | 5–10 Fragen, 10–20 Min |
| **Matura schriftlich** | Teil 1 (Grundkompetenzen) + Teil 2 (vernetzte Aufgaben), Punkte wie bei der SRDP |
| **Mündliche Prüfung** (Phase 5) | App liest Fragen vor, du antwortest laut oder schriftlich, dann Musterlösung + Selbstbewertung |
| **Kompensations-/Wiederholungsprüfung** | Test nur aus den Unterthemen, die zuletzt negativ waren |

### 6.3 Schultypen

Schultyp und Stufe stehen im Lernpaket (Claude passt Sprache und Schwierigkeit daran an): Volksschule, Mittelschule („Standard“ / „Standard AHS“), AHS Unter-/Oberstufe, BHS (HTL, HAK, HLW, BAfEP …), BMS, Polytechnische Schule, Berufsschule/Lehre (LAP), Berufsreifeprüfung.

---

## 7. Auswertung „Was kann ich?“

Pro Unterthema ein Wert 0–100 %:

```
Beherrschung = 0,6 × letzter Test + 0,3 × Übungs-Trefferquote (letzte 20 Antworten)
             + 0,1 × Karteikarten-Wissen (Anteil der Karten in Fach 3–5)
```
(Fehlt ein Teil, werden die anderen hochgerechnet.)

| Wert | Anzeige | Empfehlung |
|------|---------|------------|
| ≥ Grenze „Gut“ (Standard 76 %) | grün – „sitzt“ | nur wiederholen |
| ≥ Grenze „Genügend“ (50 %) | gelb – „positiv, aber wackelig“ | Zusammenfassung lesen + gezielt üben |
| darunter | rot – „negativ“ | Video ansehen → Zusammenfassung → Karten → Übungsrunde nur zu diesem Unterthema |

Dazu: Notenverlauf aller Tests als Kurve.

---

## 8. Technik (alles kostenlos)

| Bereich | Lösung |
|---------|--------|
| Lern-App | HTML + CSS + JavaScript-Module, **kein Server**. Läuft über GitHub Pages oder einen lokalen Server – **nicht per Doppelklick** (ES-Module brauchen http/https) |
| Offline / installierbar | PWA (Service Worker + Manifest) |
| Speichern | IndexedDB im Browser (Pakete + Fortschritt) |
| Stimme | Web Speech API (`speechSynthesis`) |
| Spracheingabe (mündl. Prüfung) | `SpeechRecognition`, wo verfügbar – sonst tippen |
| Hosting | GitHub Pages / Netlify (gratis). Weitergegeben werden die Pakete, nicht die App |
| Lernpakete verteilen | Datei per WhatsApp/Teams/E-Mail, oder ab Phase 6 als Link auf ein Paket im Ordner `pakete/` desselben Repos (nur gleiche Adresse wie die App, keine fremden Seiten) |
| Backup / Gerät wechseln | Fortschritt als Datei exportieren/importieren |

**Gespeicherter Fortschritt:**
```
pro Paket:
uebungsstand    { frageId, gewicht, serie, gemeistert, richtig, falsch, zuletzt }   // zuletzt = Zeitpunkt der letzten Antwort
antworten       { frageId, richtig, zeitpunkt }          // für Trefferquote, nur die letzten 500
fehlerheft      { frageId, anzahl, zuletzt, ueben, test } // jede falsche Antwort aus Üben und Test
tests           { datum, modus, punkte, max, note, proUnterthema{} }
karten          { karteId, fach, faelligAm }
videos          { videoId, gesehen }
notenschluessel                                          // optional, überschreibt den globalen

global:
einstellungen   { notenschluessel, stimme, tempo }
```

---

## 9. Teilen & Rechtliches

- **Lizenz** der App: z. B. MIT – jeder darf sie nutzen und verändern.
- Fortschritt bleibt auf dem Gerät der jeweiligen Person, niemand sieht die Daten der anderen.
- **Urheberrecht:** Pakete aus eigenen Mitschriften frei teilbar. Pakete aus Schulbüchern oder Unterlagen von Lehrkräften nur in der eigenen Klasse teilen, nicht öffentlich ins Internet stellen.

---

## 10. Entscheidungen

1. **Pakete erstellen:** im Claude-Chat bzw. in Claude Code mit dem Skill `lernpaket-erstellen` (`.claude/skills/lernpaket-erstellen/SKILL.md`). Keine eigene Ersteller-Website (vorerst).
2. **Zielgruppe:** alle Schultypen über das Feld `schultyp`; zuerst getestet mit MS, AHS, BHS.
3. **Freitext-Fragen:** ja, höchstens 1–2 pro Unterthema, Bewertung über Bewertungspunkte + Bestätigung.
4. **Paketgröße:** Standard 10 Fragen pro Unterthema, davon 3 nur für den Test; 8–15 Karteikarten pro Unterthema.

Geklärt am 26. 11. 2026 (Rückfragen vor Phase 1) – zusätzlich zu den Änderungen direkt in den Abschnitten 4–8:

5. **Paket-ID:** Pflichtfeld `id` im Paket; gleiche `id` = gleiches Paket. Beim Ersetzen bleibt der Fortschritt zu Fragen, Karten und Videos, deren IDs es weiter gibt; der Rest wird verworfen.
6. **Adressen (Hash-Router)** mit `/` getrennt, weil IDs `-` enthalten dürfen: `#/start`, `#/paket/<id>`, `#/paket/<id>/zusammenfassung` usw.
7. **Quellenangaben** pro Frage, Karte und Zusammenfassung sind optional („wenn bekannt“) – SKILL.md ist verbindlich.
8. **Code-Namen** auf Deutsch (paket, frage, karte, unterthema …), passend zum Paketformat.
9. **Verschoben:** mündliche Prüfung → Phase 5 (braucht die Vorlese-Funktion); Paket per Link → Phase 6; eigene Karteikarten → Abschnitt 11.

Geklärt am 26. 11. 2026 (zweite Runde vor Phase 1):

10. **Beispielpaket** `beispiele/zellatmung.lernpaket.json`: aus allgemeinem Schulwissen (AHS 10. Stufe) in eigenen Worten geschrieben. Einzige Quelle: „Beispielpaket – eigene Zusammenstellung“ (klar als Demo markiert), damit die Quellenanzeige testbar ist.
11. **HTML/Markdown in Texten:** eindeutige HTML-Tags (z. B. `<b>`, `<br>`, `<script …>`) = **Fehler**; Markdown-Muster (`**fett**`, `# Titel`, `[Link](…)`) = **Hinweis**. Grund: Erkennung nur per Faustregel, Mathe-Texte wie `x < 5` oder `2 * 3` dürfen nicht abgelehnt werden; die App zeigt ohnehin nur Text an.
12. **Pflichtfelder in Unterobjekten:** alles aus den Beispielen in SKILL.md Abschnitt 3 ist Pflicht, außer den ausdrücklich optionalen Feldern `ersteller`, `quelle`/`stelle`, `begriffe`, `teil`, `untertitel`, `einheit`. Listen dürfen nie leer sein (außer `quellen` und `begriffe`). Optionale Texte dürfen, wenn vorhanden, ebenfalls nicht leer sein.
13. **Erlaubte Werte:** unbekannter `schultyp` / `pruefungsart` oder `schulstufe` außerhalb 1–13 (ganze Zahl) = Fehler. `teil` mit anderem Wert als `"1"`/`"2"` = Fehler; `teil` bei `pruefungsart` ≠ `Matura` = Hinweis.
14. **Fragenanzahl:** Hinweis bei weniger als 8 oder mehr als 15 Fragen pro Unterthema, und wenn ein Unterthema weniger als 5 Übungsfragen (`nurTest: false`) hat.
15. **Unbekannte Felder** (z. B. Tippfehler `begrife`): Hinweis „Feld wird ignoriert“.
16. **Code-Namen:** Datei- und Funktionsnamen genau wie in `CLAUDE.md` und `ANLEITUNG.md` (z. B. `validate.js`, `validatePaket`); alles andere (Variablen, Felder, Meldungen) auf Deutsch.
17. **Technik-Kleinigkeiten:** `package.json` nur mit `"type": "module"` (keine Pakete), damit `node --test` ES-Module ab Node 20 lädt. `quiz.richtig` bei Folien ist eine Zahl, `richtig` bei `mc`/`mehrfach` eine Liste. Doppelte `richtig`-Indizes, doppelte `zuordnen`-Seiten und doppelte `reihenfolge`-Schritte = Fehler. Die 5-MB-Grenze prüft eine eigene Funktion am Dateitext; `validatePaket(obj)` prüft das Objekt.

**Noch offen – vor der jeweiligen Phase klären:**
- **Phase 4:** Speicher für einen laufenden Test (Neuladen → Test geht weiter) fehlt noch in Abschnitt 8. (Fehlerheft und „zuletzt dran“ sind seit Phase 3 eingetragen.)
- **Phase 4:** Kompensationsprüfung „zuletzt negativ“ = letzter Test pro Unterthema unter der Genügend-Grenze oder rote Beherrschung (Abschnitt 7)? Matura-Schlüssel: Punktegrenzen + Höchstpunkte selbst eingeben oder feste Vorlagen? Lückentext mit 1 Punkt pro Lücke gewichtet lange Lückentexte stark – gewollt?
- **Phase 5:** Mündliche Prüfung – nur Freitext-Fragen (haben eine Musterlösung) oder auch MC & Co. mit vorgelesenen Optionen?
- **Phase 6:** Link-Beispiel nennt `pakete/`, das Beispielpaket liegt in `beispiele/` – beide Ordner erlauben oder Beispiel kopieren?

**Verbindliche Quelle für das Paketformat ist `SKILL.md`.** Das Beispiel in Abschnitt 4 ist nur zur Veranschaulichung.

---

## 11. Später möglich

Podcast · eigene Karteikarten anlegen/bearbeiten · Lernplan mit Ferien nach Bundesland · Streak & Tagesziel · Mindmap · Matura mündlich (Themenpool) · mehrere Pakete zu einem Fach zusammenfassen · Lerngruppen-Rangliste.

---

## 12. Umsetzung in Phasen

| Phase | Inhalt |
|-------|--------|
| 1 – Format & Prüfung | Prüfprogramm (`validate.js`, `tools/pruefen.js`), Beispielpaket, Tests |
| 2 – Gerüst & Lesen | Paket öffnen/speichern, Zusammenfassung, Karteikarten |
| 3 – Üben | Adaptiver Übungsmodus, alle Fragetypen, Freitext-Bewertung, Fehlerheft |
| 4 – Test & Auswertung | Prüfungsmodi (ohne mündliche Prüfung), Notenschlüssel, Auswertung pro Unterthema, Notenverlauf |
| 5 – Videos | Folien-Layouts, Video-Player mit Stimme, Zwischenfragen, mündliche Prüfung |
| 6 – Feinschliff | Offline-App (PWA), Backup, Paket per Link aus dem eigenen Repo, Barrierefreiheit, Handy-Optimierung, README, GitHub Pages |

Jede Phase ist für sich nutzbar und wird getestet, bevor die nächste beginnt.
