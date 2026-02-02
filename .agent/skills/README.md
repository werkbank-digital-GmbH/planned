# Skills Directory

Skills sind portable Module, die dem Agenten prozedurales Wissen geben.

## Struktur

Jeder Skill ist eine Markdown-Datei mit:
1. **YAML-Frontmatter**: Metadaten (`name`, `description`)
2. **Markdown-Body**: Instruktionen, Regeln, Workflow

## Verfügbare Skills

| Skill | Beschreibung |
|-------|--------------|
| `tdd-architect.md` | Test-Driven Development enforcer |
| `code-review.md` | Code Review Checkliste |

## Verwendung

Skills werden bei Bedarf "hydriert" (in den Kontext geladen).

Beispiel:
> "Aktiviere den TDD-Architect Skill für diese Aufgabe."
