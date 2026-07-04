# Feature: Authentifizierung & Security

Querschnittsthema: schützt den Admin-Bereich, lässt den öffentlichen Bereich frei.

> Status verifiziert am 2026-07-04 gegen den Code.

## Login-Flow

```
POST /api/auth/login  { benutzername, passwort }
   └─► AuthController → AuthenticationManager (prüft gegen AdminUser)
        └─► JwtService.generateToken(username)  →  { token }
Client speichert Token → sendet ihn als  Authorization: Bearer <token>
   └─► JwtAuthFilter validiert je Request → SecurityContext gesetzt
```

## Bausteine

| Baustein | Datei | Aufgabe |
|----------|-------|---------|
| Login-Endpunkt | `auth/AuthController` | `POST /api/auth/login`, gibt JWT zurück |
| Token-Erzeugung/-Prüfung | `auth/JwtService` | signieren, `extractUsername`, `isValid`, Ablauf |
| Request-Filter | `auth/JwtAuthFilter` | Bearer-Token je Request prüfen, Auth setzen |
| Security-Regeln | `config/SecurityConfig` | welche Route ist öffentlich/geschützt, CORS, stateless |
| Admin-Accounts | `config/DataInitializer` + `entity/AdminUser` | Accounts aus Env-Variablen anlegen |
| Konfiguration | `auth/JwtProperties`, `config/AdminProperties` | Secret, Ablaufzeit, Account-Daten |

## Wichtige Eigenschaften

- **Stateless**: keine Server-Session, `SessionCreationPolicy.STATELESS`
  (siehe [ADR 0002](../adr/0002-jwt-stateless.md)).
- **`JWT_SECRET` ist Pflicht-Env-Var** – ohne startet das Backend nicht.
- **Admin-Accounts über Env**: `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD` (Pflicht),
  `ADMIN_*_USERNAME` (optional). Passwörter werden als Hash gehalten (`passwortHash`).
- **Öffentlich** (kein Token): `POST /api/anmeldung`, `GET /api/teilnehmer`,
  SPA-Routen, `POST /api/auth/login`.
- **Geschützt**: alles unter `/api/admin/**`.

## Getestet durch

`AuthControllerTest`, `JwtServiceTest`, `SecurityFilterChainTest`,
`SpaFallbackControllerTest` (+ `TestSecurityConfig` als Test-Setup).
Die Security-Regeln (welche Route geschützt ist) sind damit **explizit** abgesichert –
gut, weil Fehlkonfiguration hier besonders teuer wäre.

## Hinweise für Weiterentwicklung

- Bei neuen Routen: Security-Regel in `SecurityConfig` **und** einen Test in
  `SecurityFilterChainTest` ergänzen (Route geschützt/öffentlich wie beabsichtigt).
- Token-Ablauf (`JWT_EXPIRATION_MS`, Default 1 h) bewusst wählen; kein Refresh-Token-
  Mechanismus vorhanden.

Zugehörige Tickets: [tickets/historie.md](../tickets/historie.md) (#4, #7, #8, #9, #10, #34, #35, #42).
