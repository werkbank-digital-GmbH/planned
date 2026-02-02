# /gardener

Wartungs-Command für die Memory Bank. Führe einmal pro Woche oder nach großen Meilensteinen aus.

## Aufgaben

### 1. activeContext.md aufräumen

- Verschiebe erledigte Aufgaben in `progress.md`
- Lösche veraltete "Recent Changes"
- Halte nur den aktuellen Fokus

### 2. progress.md konsolidieren

- Archiviere Einträge älter als 2 Wochen
- Behalte nur die letzten 10-15 Einträge
- Fasse ähnliche Commits zusammen

### 3. systemPatterns.md validieren

- Prüfe ob die dokumentierten Patterns noch dem Code entsprechen
- Markiere veraltete Patterns
- Schlage Updates vor

### 4. decisionLog.md prüfen

- Gibt es undokumentierte wichtige Entscheidungen?
- Sind die Begründungen noch aktuell?

## Output

```
🧹 Memory Bank Wartung

## activeContext.md
- [X] Erledigte Aufgaben verschoben
- [X] Veraltete Einträge gelöscht

## progress.md
- [X] [N] Einträge archiviert
- [X] Zusammenfassung erstellt

## systemPatterns.md
- [ ] Pattern X ist veraltet → Update vorgeschlagen
- [X] Alle anderen Patterns aktuell

## decisionLog.md
- [ ] Entscheidung Y fehlt → Hinzugefügt

Wartung abgeschlossen.
```
