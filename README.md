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

### Voraussetzungen

- Java 21+
- Maven
- Node.js 20+
- Angular CLI (`npm install -g @angular/cli`)

---

### Backend

#### Admin-Accounts

Beim ersten Start werden automatisch ein oder mehrere Admin-Accounts angelegt.
Die Anzahl der Accounts ist flexibel – für jeden Account werden zwei Umgebungsvariablen benötigt.

#### Umgebungsvariablen

| Variable              | Pflicht | Default  | Beschreibung                    |
|-----------------------|---------|----------|---------------------------------|
| `ADMIN_1_USERNAME`    | ❌ nein | `admin1` | Benutzername des ersten Admins  |
| `ADMIN_1_PASSWORD`    | ✅ ja   | –        | Passwort des ersten Admins      |
| `ADMIN_2_USERNAME`    | ❌ nein | `admin2` | Benutzername des zweiten Admins |
| `ADMIN_2_PASSWORD`    | ✅ ja   | –        | Passwort des zweiten Admins     |

> Weitere Accounts können durch Erweiterung der `application.yaml` hinzugefügt werden.

#### Start

```bash
# Einzelner Admin
export ADMIN_1_PASSWORD=sicheresPasswort123
./mvnw spring-boot:run

# Mehrere Admins
export ADMIN_1_USERNAME=alice
export ADMIN_1_PASSWORD=sicheresPasswort123
export ADMIN_2_USERNAME=bob
export ADMIN_2_PASSWORD=nochSichereres456
./mvnw spring-boot:run
```

> ⚠️ Die Anwendung startet **nicht**, wenn für einen konfigurierten Account kein Passwort gesetzt ist.
> Wird ein Benutzername bereits in der Datenbank gefunden, wird er übersprungen (idempotent).

Das Backend läuft anschließend auf `http://localhost:8080`.  
Die SQLite-Datenbank (`fehmarnopen.db`) wird beim ersten Start automatisch angelegt.

---

### Frontend starten

```bash
cd frontend
npm install
ng serve
```

Das Frontend läuft anschließend auf `http://localhost:4200`.  
API-Requests an `/api/...` werden automatisch an das Backend weitergeleitet (Proxy-Config).

---

### Hinweise

- Backend muss laufen bevor das Frontend API-Calls macht
- `ADMIN_PASSWORD` ist eine Pflichtangabe – das Backend startet nicht ohne diese Variable
- Der Admin-User wird beim ersten Start automatisch angelegt, bei weiteren Starts übersprungen