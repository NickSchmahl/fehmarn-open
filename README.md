# Fehmarn Open – Turnier-Anmeldetool

Webanwendung zur Verwaltung von Anmeldungen für das jährliche Fehmarn Open Dart-Turnier, das an Radical-Geräten ausgetragen wird. Das Tool ersetzt die bisherige manuelle Verwaltung per Excel und E-Mail.

## Funktionsumfang

**Für Teilnehmer**
- Online-Anmeldung für eine oder mehrere Disziplinen
- Bestätigungsmail mit persönlichem Abmeldelink
- Selbständige Abmeldung per Link
- Einsicht in die aktuelle Teilnehmerliste
- Ansicht des Turnier-Flyers

**Für Admins**
- Geschützter Admin-Bereich mit Login
- Verwaltung und manuelle Abmeldung von Teilnehmern
- Anwesenheitskontrolle am Turniertag
- Anmeldeschluss manuell sperren oder Datum setzen
- Flyer hochladen
- Excel-Export aller Anmeldungen
- QR-Code für den Anmeldelink generieren

## Disziplinen

| Disziplin | Typ | Preis |
|---|---|---|
| Herreneinzel | Einzel | 10 € / Person |
| Dameneinzel | Einzel | 10 € / Person |
| Herrendoppel | Doppel | 10 € / Person |
| Mixed-Doppel | Doppel | 10 € / Person |
| Triple Mix | Triple | 10 € / Person |
| Teamwettbewerb | Team | 10 € / Person |

Bezahlung erfolgt ausschließlich vor Ort. Keine Online-Zahlung.

## Tech Stack

| Bereich | Technologie |
|---|---|
| Backend | Java, Spring Boot 4 |
| Frontend | Angular 21 (Standalone Components) |
| Datenbank | SQLite via Spring Data JPA / Hibernate |
| Auth | Spring Security, JWT |
| Mail | Spring Mail + externer SMTP-Service |

## Projektstruktur

```
/
├── backend/        # Spring Boot 4 Anwendung
├── frontend/       # Angular 21 Anwendung
├── AGENTS.md       # Projektkontext für KI-Assistenten
└── README.md
```

## Lokale Entwicklung

Voraussetzungen und Setup-Anleitung folgen mit Projektaufbau.