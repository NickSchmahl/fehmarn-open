# Tickets

> **Quelle der Wahrheit für umsetzbare Tickets sind die GitHub-Issues**
> (`NickSchmahl/fehmarn-open`). `docs/` hält die Strategie und verweist auf Issue-Nummern.
> Entschieden am 2026-07-04.

| Dokument | Zweck |
|----------|-------|
| [quality-roadmap.md](quality-roadmap.md) | Übersicht der Qualitäts-Härtung mit Verweisen auf GitHub-Issues #44–#55 |
| [historie.md](historie.md) | Rückblick: die aus der Git-Historie erkennbaren Issues #1–#42 und ihr Ergebnis |

Kurzfristige, gemischte Aufgaben stehen im [backlog.md](../backlog.md).

## Verhältnis der Ebenen

- **GitHub-Issues** = umsetzbare Tickets (Quelle der Wahrheit, koppeln an PRs via `Closes #NN`).
- **docs/quality/** = das *Warum/Wie* (Strategie, Regeln), ändert sich selten.
- **docs/tickets/quality-roadmap.md** = schlanke Übersicht + Verweis auf Issues.
- **docs/tickets/historie.md** = Nachschlagewerk, was schon passiert ist.

## Aktueller Stand

- **Qualitäts-Härtung** (Big-Bang): Sammelticket **#55**, Einzeltickets **#44–#54**.
- Durch [ADR 0008](../adr/0008-scope-reduktion-testabnahme.md) obsolet und geschlossen
  (`wontfix`): #16, #17 (Anmeldeschluss), #18, #20 (Abmeldung). #43 (Mail) obsolet durch #113 (Mail entfernt).
