# Feature: Mail-Benachrichtigungen

Asynchroner Mailversand bei An- und Abmeldung.

> **Status 2026-07-04:** ⏸️ **Ruht.** Per [ADR 0008](../adr/0008-scope-reduktion-testabnahme.md)
> wird der **aktive Trigger gekappt** – bei Anmeldung wird **keine Mail mehr versendet**.
> Der Mail-Code (unten) **bleibt vorerst erhalten**, damit das Feature später ohne
> Neubau reaktivierbar ist. Der folgende Ablauf beschreibt den (derzeit inaktiven)
> Mechanismus.

## Ablauf

```
AnmeldungService  ──► ApplicationEventPublisher.publishEvent(AnmeldungBestaetigtEvent)
                                     │  (async, entkoppelt von der HTTP-Antwort)
                                     ▼
                          MailEventListener  ──►  MailService  ──►  SMTP
```

Analog für Abmeldung: `AbmeldungBestaetigtEvent`.

## Bausteine

| Baustein | Datei | Aufgabe |
|----------|-------|---------|
| Events | `event/AnmeldungBestaetigtEvent`, `event/AbmeldungBestaetigtEvent` | fachliches Signal |
| Listener | `mail/MailEventListener` | reagiert async auf Events, ruft MailService |
| Versand | `mail/MailService` | baut & sendet Mail (Thymeleaf-Template) |
| Async-Setup | `config/AsyncConfig` | Thread-Pool für asynchrone Verarbeitung |
| Konfiguration | `config/MailProperties` + `application.yaml` | Host, Port, From, an/aus |

## Eigenschaften

- **Asynchron** über Application Events – die HTTP-Antwort wartet **nicht** auf den
  SMTP-Server (siehe [ADR 0003](../adr/0003-async-mail-events.md)).
- **Bestätigungsmail** enthielt den persönlichen **Abmeldelink** (`abmeldetoken`).
  Da die Selbst-Abmeldung gestrichen ist und der Versand ruht, ist der Link
  gegenstandslos (siehe [teilnehmer.md](teilnehmer.md)).
- **Lokal**: Mailpit (`compose.yaml`, SMTP :1025, Web-UI :8025).
- **Schaltbar**: `MAIL_ENABLED` (Default true), `MAIL_FROM`, `MAIL_HOST/PORT/...`.
- Templating via Thymeleaf (`spring-boot-starter-thymeleaf`).

## Getestet durch

`MailServiceTest` (Versandlogik). Empfehlung (Roadmap): Integrationstest mit
GreenMail, der den **kompletten** Weg Event → Listener → SMTP prüft, inkl. dass der
Abmeldelink korrekt im Mailtext steht.

## Deaktivierung (aktuelle Aufgabe)

Ticket `Q-RM-2`: Trigger kappen, sodass bei Anmeldung **keine** Mail mehr rausgeht.
Umsetzungsvarianten (zu entscheiden bei Umsetzung):
- Mail-Event-Listener per Flag deaktivieren (z.B. `MAIL_ENABLED=false` konsequent
  auswerten / Listener bedingt registrieren), **oder**
- das Event bei Anmeldung nicht mehr feuern.

Wichtig: `MailService`, `MailEventListener`, Events und Templates **bleiben im Code**
(reaktivierbar). Keine Löschung.

## Hinweise (für spätere Reaktivierung)

- Fehler beim Mailversand dürfen die Anmeldung selbst **nicht** fehlschlagen lassen
  (Entkopplung) – bei Änderungen darauf achten (Fehlerbehandlung im Listener/async).
- Bounces/Zustellfehler werden nicht zurückgemeldet (kein Feedback-Kanal).

Zugehörige Tickets: [tickets/historie.md](../tickets/historie.md) (#13, #22);
Deaktivierung: `Q-RM-2` in [quality-roadmap.md](../tickets/quality-roadmap.md).
