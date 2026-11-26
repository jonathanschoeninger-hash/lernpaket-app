---
name: lernpaket-erstellen
description: Erstellt aus Lernmaterial (PDF, Word, Text, Fotos, Mitschriften) ein Lernpaket (.lernpaket.json) mit Zusammenfassung, Karteikarten, Erklärvideos und Prüfungsfragen für die Lernpaket-App, österreichisches Schulsystem. Nutzen bei "Lernpaket", "mach daraus ein Paket", "Fragen für die Lern-App".
---

# Lernpaket erstellen

Du machst aus dem Material des Nutzers **eine** Datei `<thema>.lernpaket.json` im Format unten. Die Lern-App liest nur dieses Format. Jeder Fehler (siehe Abschnitt 4) lässt den Import scheitern.

## 1. Angaben klären
Diese Angaben brauchst du. Fehlt eine, frag **einmal** gesammelt nach. Wenn niemand antwortet, nimm die Standardwerte.

| Angabe | Standard |
|--------|----------|
| Fach, Thema | aus dem Material ableiten |
| Schultyp | `AHS` (erlaubt: `VS`, `MS`, `AHS`, `BHS`, `BMS`, `PTS`, `BS`, `BRP`) |
| Schulstufe | `9` (1–13) |
| Prüfungsart | `Schularbeit` (erlaubt: `Schularbeit`, `Test`, `Matura`, `Muendlich`, `LAP`, `Sonstiges`) |
| Ersteller-Name | weglassen |

## 2. Inhaltliche Regeln
- **Nur Inhalte aus dem Material.** Nichts erfinden. Wenn das Material zu einem Punkt nichts hergibt, lass ihn weg.
- **Österreichisches Deutsch:** Jänner, heuer, Schularbeit, Matura, Prozent.
- Sprache und Schwierigkeit passend zu Schultyp und Stufe. Bei VS und MS: kurze Sätze, einfache Wörter.
- 2–8 Unterthemen. Pro Unterthema:
  - **Zusammenfassung:** `kurz` (1–2 Sätze), `normal` (4–8 Sätze), `ausfuehrlich` (8–20 Sätze), 2–5 `merke`-Punkte
  - **8–15 Karteikarten:** Vorderseite eine klare Frage oder ein Begriff, Rückseite kurz
  - **1 Video** mit 3–8 Folien. Erste Folie `titel`, letzte Folie `merke` oder `quiz`. Sprechertext 1–4 Sätze pro Folie, gesprochen gut verständlich (keine Klammern, keine Abkürzungen, Formeln ausgeschrieben)
  - **10 Fragen** (Standard), davon **3 mit `nurTest: true`**. Mindestens 3 verschiedene Fragetypen pro Unterthema. Schwierigkeit gemischt (1 leicht, 2 mittel, 3 schwer)
- Multiple Choice: genau 4 Optionen, falsche Optionen plausibel, ähnliche Länge wie die richtige, kein „alle oben genannten“.
- Jede Frage hat eine `erklaerung` (1–3 Sätze, warum die Lösung stimmt).
- Jede Frage, Karte und Zusammenfassung hat eine `quelle` (Datei-ID + Stelle wie „S. 4“ oder „Min. 3:20“), wenn bekannt.
- Freitext: höchstens 1–2 pro Unterthema. Die `bewertungspunkte` müssen so formuliert sein, dass man sie über Schlüsselwörter erkennt.
- Bei `pruefungsart: "Matura"` und Mathematik: bei jeder Frage `teil` = `"1"` (Grundkompetenz) oder `"2"` (vernetzt) setzen.

## 3. Format (verbindlich)

### IDs
Alle `id`-Werte: nur `a-z`, `0-9`, `-`, `_`, 1–40 Zeichen, innerhalb ihrer Liste eindeutig. Schema: Unterthemen `u1, u2 …`, Karten `k1 …`, Videos `v1 …`, Fragen `f1 …`, Quellen `q1 …`.

Das Paket selbst hat ebenfalls eine `id` (gleiches Muster), Schema `<fach>-<thema>-<schultyp><stufe>`, z. B. `bio-zellatmung-ahs10`. Daran erkennt die App ein Paket wieder: Eine **überarbeitete Fassung** desselben Pakets **behält dieselbe `id`** (sonst geht der Lernfortschritt verloren). Ein neues Paket bekommt eine neue `id`.

### Gesamtaufbau
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
  "quellen": [ { "id": "q1", "name": "Skript Zellatmung.pdf" } ],
  "unterthemen": [ { "id": "u1", "name": "Glykolyse" } ],
  "zusammenfassung": [ ],
  "karten": [ ],
  "videos": [ ],
  "fragen": [ ]
}
```
`ersteller` ist optional. Alle anderen Felder sind Pflicht. Listen dürfen nicht leer sein (Ausnahme: `quellen`). `erstellt` ist ein gültiges Datum im Format `JJJJ-MM-TT`.

Erlaubte Werte: `schultyp` aus `VS`, `MS`, `AHS`, `BHS`, `BMS`, `PTS`, `BS`, `BRP`; `pruefungsart` aus `Schularbeit`, `Test`, `Matura`, `Muendlich`, `LAP`, `Sonstiges`; `schulstufe` ganze Zahl 1–13. Andere Werte sind Fehler.

**Pflichtfelder überall:** Jedes Feld, das in den Beispielen dieses Abschnitts vorkommt, ist Pflicht – außer den ausdrücklich optionalen: `ersteller`, `quelle` (und darin `stelle`), `begriffe`, `teil`, `untertitel`, `einheit`. Keine Liste darf leer sein (Ausnahmen: `quellen`, `begriffe`). Felder, die hier nicht beschrieben sind, ignoriert die App (Hinweis).

`quelle` ist bei Zusammenfassungen, Karten und Fragen **optional** (nur wenn bekannt). Wenn vorhanden, muss `quelle.id` in `quellen` existieren; `stelle` darf fehlen.

### Grenzen
- Kein Text darf leer sein (nur Leerzeichen zählt als leer) – auch optionale Texte nicht, wenn sie vorhanden sind.
- Kein HTML in Texten (z. B. `<b>`, `<br>`) – das ist ein Fehler. Auch kein Markdown (`**fett**`, `# Titel`, `[Link](…)`) – das ergibt einen Hinweis.
- Jeder Text höchstens **2000 Zeichen** – Ausnahme `ausfuehrlich`: höchstens **4000 Zeichen**.
- Die ganze Datei höchstens **5 MB**.

### Zusammenfassung
```json
{ "unterthema": "u1", "kurz": "…", "normal": "…", "ausfuehrlich": "…",
  "merke": ["…", "…"], "begriffe": ["Glykolyse", "Pyruvat"],
  "quelle": { "id": "q1", "stelle": "S. 2–4" } }
```
Genau ein Eintrag pro Unterthema. Absätze im Text mit `\n\n` trennen. Kein Markdown, kein HTML.
`begriffe` ist optional: 0–10 Fachbegriffe, die **wörtlich** in `kurz`, `normal` oder `ausfuehrlich` vorkommen. Die App hebt sie in der Zusammenfassung hervor – das ersetzt Fettdruck.

### Karteikarte
```json
{ "id": "k1", "unterthema": "u1", "vorne": "Glykolyse – Ort?", "hinten": "Zellplasma",
  "quelle": { "id": "q1", "stelle": "S. 3" } }
```

### Video
```json
{ "id": "v1", "unterthema": "u1", "titel": "Was passiert bei der Glykolyse?", "folien": [ … ] }
```
Jede Folie hat `layout` und `sprechertext`, dazu je nach Layout:

| `layout` | Felder |
|----------|--------|
| `titel` | `titel`, `untertitel` (optional) |
| `stichpunkte` | `titel`, `punkte` (2–5 Texte) |
| `begriff` | `begriff`, `definition` |
| `ablauf` | `titel`, `schritte` (3–6 Texte) |
| `vergleich` | `titel`, `links` {`ueberschrift`, `punkte`[]}, `rechts` {`ueberschrift`, `punkte`[]} |
| `formel` | `formel` (Klartext, z. B. "C6H12O6 + 6 O2 → 6 CO2 + 6 H2O"), `teile` [{`zeichen`, `bedeutung`}] |
| `zahl` | `zahl` (Text), `einheit` (optional), `bedeutung` |
| `merke` | `text` |
| `quiz` | `frage`, `optionen` (2–4), `richtig` (**eine Zahl**, Index ab 0 – anders als bei Fragen keine Liste) |

### Frage – gemeinsame Felder
```json
{ "id": "f1", "unterthema": "u1", "typ": "mc", "schwierigkeit": 2,
  "frage": "Wo findet die Glykolyse statt?",
  "erklaerung": "…", "quelle": { "id": "q1", "stelle": "S. 3" },
  "nurTest": false, "teil": "1" }
```
`teil` nur bei Matura, Wert `"1"` oder `"2"` (als Text). `schwierigkeit`: 1, 2 oder 3. `nurTest`: `true` oder `false` (Pflicht).

Indizes in `richtig` dürfen nicht doppelt vorkommen. Bei `zuordnen` darf kein `links` und kein `rechts` doppelt vorkommen, bei `reihenfolge` kein Schritt.

### Frage – Felder je `typ`

| `typ` | Zusatzfelder | Beispiel |
|-------|--------------|----------|
| `mc` | `optionen` (genau 4), `richtig` (Liste mit genau 1 Index) | `"richtig": [0]` |
| `mehrfach` | `optionen` (4–6), `richtig` (Liste mit 2+ Indizes) | `"richtig": [0, 2]` |
| `wahrfalsch` | `richtig` (true/false); `frage` ist eine Aussage | `"richtig": false` |
| `lueckentext` | `text` mit Platzhaltern `{{1}}`, `{{2}}` …, `luecken` (Liste: pro Lücke eine Liste erlaubter Antworten) | `"text": "Die Glykolyse findet im {{1}} statt.", "luecken": [["Zellplasma", "Cytoplasma"]]` |
| `zuordnen` | `paare` (3–6 × {`links`, `rechts`}) | `{"links": "Glykolyse", "rechts": "Zellplasma"}` |
| `reihenfolge` | `schritte` (3–6, in **richtiger** Reihenfolge) | |
| `zahl` | `loesung` (Zahl), `toleranz` (Zahl ≥ 0), `einheit` (optional) | `"loesung": 38, "toleranz": 0` |
| `freitext` | `musterloesung`, `maxPunkte` (1–3), `bewertungspunkte` (Liste {`text`, `woerter`[]}) | siehe unten |

Lückentext: Jeder Platzhalter `{{1}}` bis `{{n}}` kommt im `text` **genau einmal** vor, `n` = Anzahl `luecken`.

Freitext-Beispiel:
```json
{ "id": "f9", "unterthema": "u1", "typ": "freitext", "schwierigkeit": 3,
  "frage": "Erkläre, warum die Glykolyse auch ohne Sauerstoff ablaufen kann.",
  "musterloesung": "Die Glykolyse braucht keinen Sauerstoff, weil …",
  "maxPunkte": 2,
  "bewertungspunkte": [
    { "text": "nennt, dass kein O2 verbraucht wird", "woerter": ["ohne sauerstoff", "kein sauerstoff", "anaerob"] },
    { "text": "nennt NAD+-Regeneration durch Gärung", "woerter": ["gärung", "nad", "regeneration"] }
  ],
  "erklaerung": "…", "quelle": { "id": "q1", "stelle": "S. 5" }, "nurTest": true }
```
`woerter` klein geschrieben, ohne Satzzeichen. Pro Bewertungspunkt 2–5 Varianten bzw. Synonyme. Anzahl `bewertungspunkte` = `maxPunkte`.

## 4. Prüfen vor der Ausgabe
Die Prüfung kennt zwei Stufen:
- **Fehler** – alles aus Abschnitt 3 und die Checkliste unten. Ein Paket mit Fehlern lehnt die App ab.
- **Hinweise** – die Mengen- und Stilregeln aus Abschnitt 2 und die Empfehlungen in Abschnitt 3: Anzahl Unterthemen (2–8), Karten (8–15), Fragen (8–15, davon mind. 5 ohne `nurTest`), Videos (1) und Folien (3–8) pro Unterthema, mindestens 3 Fragetypen pro Unterthema, Markdown in Texten, unbekannte Felder, `teil` bei einem Paket, das keine Matura ist, höchstens 2 Freitext pro Unterthema, erste Folie `titel` und letzte `merke`/`quiz`, 2–5 `merke`-Punkte, 2–5 klein geschriebene `woerter` pro Bewertungspunkt, `begriffe`, die nicht im Text vorkommen. Das Paket gilt trotzdem als OK – Hinweise aber möglichst beheben.

- Wenn du Code ausführen kannst und `tools/pruefen.js` existiert: `node tools/pruefen.js <datei>` ausführen und alle Fehler beheben.
- Sonst prüfe selbst:
  - [ ] gültiges JSON (keine Kommentare, keine Kommas am Ende)
  - [ ] alle Pflichtfelder vorhanden, `format` = `"lernpaket"`, `version` = 1
  - [ ] Paket-`id` vorhanden – bei einer Überarbeitung **unverändert**
  - [ ] alle IDs eindeutig und im erlaubten Muster
  - [ ] jedes `unterthema` und jede `quelle.id` verweist auf einen existierenden Eintrag
  - [ ] Indizes in `richtig` liegen innerhalb von `optionen`
  - [ ] Anzahl `{{n}}` im Lückentext = Anzahl `luecken`
  - [ ] pro Unterthema genau eine Zusammenfassung, mind. ein Video, mind. 3 Fragen mit `nurTest: true`
  - [ ] kein Text leer oder über 2000 Zeichen (`ausfuehrlich`: 4000), Datei unter 5 MB
  - [ ] kein HTML, kein Markdown in Texten

## 5. Ausgabe
- Datei `<thema-in-kleinbuchstaben-mit-bindestrichen>.lernpaket.json` speichern und dem Nutzer schicken.
- Dazu 3–5 Zeilen: Anzahl Unterthemen, Karten, Videos, Fragen (davon nur Test), und Stellen, an denen das Material dünn war.
- Auf Wunsch nachbessern („mehr schwere Fragen zu u2“, „Video zu u1 kürzer“) und die **ganze** Datei neu ausgeben.
