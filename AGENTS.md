# AGENTS.md – Dart-Turnier Anmeldetool

## Projektübersicht

Dieses Projekt ist eine Webanwendung zur Verwaltung von Anmeldungen für ein jährliches Dart-Turnier, das an Radical-Geräten ausgetragen wird. Die Anwendung ersetzt die bisherige manuelle Verwaltung per Excel und E-Mail.

Das Tool richtet sich an zwei Nutzergruppen:
- **Teilnehmer** – melden sich online für Disziplinen an und können sich selbst wieder abmelden
- **Admins** – verwalten Anmeldungen, kontrollieren Anwesenheiten am Turniertag und exportieren Daten

## Tech Stack

| Bereich     | Technologie                          |
|-------------|--------------------------------------|
| Backend     | Java, Spring Boot 4                  |
| Frontend    | Angular 21 (Standalone Components)   |
| Datenbank   | SQLite via Spring Data JPA/Hibernate |
| Auth        | Spring Security, JWT                 |
| Mail        | Spring Mail + externer SMTP-Service  |
| Hosting     | Teil des Projekts (noch zu klären)   |

## Projektstruktur

```
/
├── backend/        # Spring Boot 4 Anwendung
│   ├── src/
│   └── pom.xml
├── frontend/       # Angular 21 Anwendung
│   ├── src/
│   └── package.json
└── AGENTS.md
```

## Fachliche Struktur

### Drei Bereiche der Anwendung

1. **Anmeldemaske** – Öffentlich zugänglich; Teilnehmer tragen persönliche Daten ein und wählen Disziplinen
2. **Teilnehmerliste** – Öffentliche Übersicht aller Angemeldeten pro Disziplin
3. **Flyer-Seite** – Anzeige des aktuellen Turnier-Flyers

### Disziplinen

| Disziplin         | Typ      | Preis            | Besonderheit                        |
|-------------------|----------|------------------|--------------------------------------|
| Herreneinzel      | Einzel   | 10 € / Person    | –                                    |
| Dameneinzel       | Einzel   | 10 € / Person    | –                                    |
| Herrendoppel      | Doppel   | 10 € / Person    | Teamname-Feld                        |
| Mixed-Doppel      | Doppel   | 10 € / Person    | Teamname-Feld                        |
| Triple Mix        | Triple   | 10 € / Person    | Teamname-Feld, min. 2 Herren + 1 Dame |
| Teamwettbewerb    | Team     | 10 € / Person    | Teamname-Feld, min. 4 Spieler        |

### Radical ID

- Teilnehmer mit bestehender Radical ID geben diese als Pflichtfeld ein
- Neue Teilnehmer ohne Radical ID geben ihre Initialen ein (z. B. `FL-XX-XX`)
- Admins legen für neue Teilnehmer manuell eine Radical ID an

### Anmeldeschluss

- Admins können die Anmeldemaske sperren (manuell oder per konfiguriertem Datum)
- Nach dem Sperren sind keine neuen Anmeldungen mehr möglich

### Abmeldung

- Nach erfolgreicher Anmeldung erhalten Teilnehmer eine Bestätigungsmail mit einem persönlichen Abmeldelink
- Admins können Teilnehmer auch manuell abmelden

### Anwesenheitskontrolle

- Admins können am Turniertag Teilnehmer als anwesend markieren (Abhaken)
- Zugänglich nur für eingeloggte Admins

### Bezahlung

- Findet ausschließlich vor Ort statt
- Keine Online-Zahlungsintegration

## Admin-Bereich

- Login per JWT-gesichertem Endpunkt
- Admin-Accounts werden manuell per Skript angelegt (kein Self-Registration)
- Funktionen: Teilnehmerliste einsehen, Anwesenheit abhaken, Anmeldungen sperren, Excel-Export

## Konventionen

- **Sprache:** Deutsch (Code-Kommentare, Commit-Messages, Issues, Dokumentation)
- **API-Stil:** REST
- **Branch-Strategie:** noch zu definieren
- **Commit-Format:** noch zu definieren

## Offene Punkte (TBD)

- [ ] Team-Anmeldung: Wie meldet man sich an, wenn der Partner noch unbekannt ist? (Optionen: "suche noch Partner" / Teamnamen eingeben / Team beitreten)
- [ ] Hosting-Details und Domain
- [ ] SMTP-Provider (z. B. Resend oder Mailgun)
- [ ] Anmeldeschluss: manuell sperren oder festes Datum konfigurierbar?
- [ ] Excel-Export: welche Felder, welches Format?
- [ ] Maximale Teilnehmerzahl pro Disziplin (vorerst kein Limit)
