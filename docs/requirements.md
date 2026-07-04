# Anforderungen (Requirements)

> **Nick:** Hier deine aufgenommenen Anforderungen einfügen (oder Datei/Link
> dazulegen). Sobald sie hier liegen, gleiche ich sie mit dem Ist-Zustand ab und
> leite fehlende Punkte als Tickets in `docs/backlog.md` ab.

## Ist-Zustand (gegen den **Code** verifiziert, Stand 2026-07-04)

> ⚠️ **Korrektur gegenüber früherer Version:** Der vorige Stand übernahm die
> README-Angaben ungeprüft und markierte alles als fertig. Nach Abgleich mit dem
> Backend-Code (Endpunkte + Services) stimmt das nicht. `[x]` = im Code vorhanden,
> `[ ]` = **fehlt trotz README**, `[~]` = teilweise. Details:
> [features/teilnehmer.md](features/teilnehmer.md), [features/admin.md](features/admin.md).

**Teilnehmer**
- [x] Online-Anmeldung für eine/mehrere Disziplinen
- [x] Öffentliche Teilnehmerliste
- [x] Flyer-Ansicht (statisch)
- [~] Bestätigungsmail bei Anmeldung — Code vorhanden, **wird deaktiviert** (Trigger kappen, siehe unten)
- 🚫 ~~Selbst-Abmeldung per Link~~ — **gestrichen**, wird nicht gebaut (Teil-Code bleibt liegen)

**Admin**
- [x] Login (JWT)
- [x] Teilnehmerverwaltung + manuelle Abmeldung (+ Reaktivieren)
- [x] Anwesenheitskontrolle
- 🚫 ~~Anmeldeschluss sperren / Datum setzen~~ — **soll raus** (`TurnierConfig` = overengineered, toter Code)
- [ ] **Flyer-Upload** — kein Endpunkt (**erforderlich vor Testabnahme**)
- [ ] **QR-Code für Anmeldelink** — kein Code (gewünscht)
- [ ] Excel-Export — kein Code (**verschoben**, nicht vor Testabnahme)

## Soll-Zustand / Scope (Stand 2026-07-04, siehe [ADR 0008](adr/0008-scope-reduktion-testabnahme.md))

Nick hat den Scope neu bewertet. Maßgeblich ist jetzt Folgendes – **nicht** mehr die
alten README-/„fertig"-Angaben:

| Thema | Entscheidung | Vor Testabnahme? |
|-------|--------------|------------------|
| Flyer-Upload | **umsetzen** | ✅ ja |
| QR-Code Anmeldelink | umsetzen | ⭕ gewünscht, nicht zwingend |
| Excel-Export | verschoben | ❌ nein |
| Selbst-Abmeldung | **gestrichen** (Code liegen lassen) | – |
| E-Mail-Versand | **ruht** – Bestätigungsmail-Trigger kappen, Code behalten | – |
| Anmeldeschluss / `TurnierConfig` | **entfernen** (overengineered) | – |

Tickets dazu: [tickets/quality-roadmap.md](tickets/quality-roadmap.md), Abschnitt A + Cleanup.

_(Weitere fachliche Anforderungen aus Nicks Requirements-Dokument hier ergänzen,
sobald verfügbar.)_
