# /memo

Du bereitest das Gedächtnis für die nächste Session vor.

## Analyse

1. **Analysiere die bisherige Konversation:**
   - Was wurde besprochen?
   - Welche Aufgaben wurden erledigt?
   - Welche Entscheidungen wurden getroffen?
   - Was sind die nächsten Schritte?

2. **Prüfe Git-Status:**
   - Gibt es neue Commits seit dem letzten Memo?
   - Gibt es uncommitted Changes?

## Update-Sequenz

### 1. Aktualisiere `.agent/memory/activeContext.md`

Struktur:
```markdown
# Active Context

## Aktueller Stand ([Datum])

### Abgeschlossene Aufgaben
- [Was wurde erledigt]

### Laufende Arbeiten
- [Was ist in Arbeit]

### Nächste Schritte
- [ ] [Schritt 1]
- [ ] [Schritt 2]

## Wichtige Entscheidungen
- [Falls neue Entscheidungen getroffen wurden]
```

### 2. Aktualisiere `.agent/memory/progress.md`

- Füge neue abgeschlossene Aufgaben hinzu
- Dokumentiere neue Commits
- Aktualisiere offene Punkte

### 3. Optional: `.agent/memory/decisionLog.md`

Nur wenn wichtige Architektur-Entscheidungen getroffen wurden.

### 4. Optional: `.agent/memory/systemPatterns.md`

Nur wenn neue Patterns etabliert wurden.

## Output

Zeige vor dem Speichern:

```
📝 Memory Bank Update

Änderungen an activeContext.md:
- [Was sich ändert]

Änderungen an progress.md:
- [Was hinzugefügt wird]

Soll ich diese Änderungen speichern? (Antworte mit "ja" oder zeige den Diff)
```

Nach Bestätigung:

```
✅ Memory Bank aktualisiert

Geänderte Dateien:
- activeContext.md: [Zusammenfassung]
- progress.md: [Zusammenfassung]

Session-Stand gespeichert. Nächste Session kann mit /boot starten.
```
