# Features

Ein Dokument je Fachbereich – beschreibt **was** die Software kann, den fachlichen
Ablauf und die beteiligten Bausteine (ohne Code zu duplizieren). Bei Änderungen an
einem Feature wird das passende Dokument im selben PR aktualisiert.

| Dokument | Bereich | Zielgruppe |
|----------|---------|------------|
| [teilnehmer.md](teilnehmer.md) | Öffentlicher Flow: Anmeldung, Teilnehmerliste, Flyer | Turnier-Teilnehmer |
| [admin.md](admin.md) | Admin-Bereich: Teilnehmerverwaltung, Anwesenheit, Anmeldeschluss, Flyer-Upload, Export, QR | Organisatoren |
| [auth-security.md](auth-security.md) | Login, JWT, geschützte Routen, Security-Konfiguration | Querschnitt |
| [mail-benachrichtigungen.md](mail-benachrichtigungen.md) | ❌ Entfernt (#113) – ehemals asynchroner Mailversand | Historie |

## Fachlicher Gesamtüberblick

```
Teilnehmer                                  Admin
   │                                          │
   ├─ Anmeldung (Disziplinen wählen) ─────────┤
   │                                          │
   │                                          ├─ Login (JWT)
   ├─ Öffentliche Teilnehmerliste ◄───────────┤  Teilnehmerverwaltung / manuelle Abmeldung
   │   (Disziplin-Filter)                     │  Anwesenheit am Turniertag
   └─ Flyer-Ansicht ◄──────────────────────── ┤  Anmeldeschluss setzen/sperren
                                              │  Flyer-Upload · Excel-Export · QR-Code
```

## Disziplinen (fachliche Konstante)

| Disziplin | Typ | Preis |
|-----------|-----|-------|
| Herreneinzel | Einzel | 10 €/Person |
| Dameneinzel | Einzel | 10 €/Person |
| Herrendoppel | Doppel | 10 €/Person |
| Mixed-Doppel | Doppel | 10 €/Person |
| Triple Mix | Triple | 10 €/Person |
| Teamwettbewerb | Team | 10 €/Person |

Bezahlung ausschließlich vor Ort, keine Online-Zahlung.

> Feature-↔Ticket-Zuordnung: siehe [tickets/historie.md](../tickets/historie.md).
