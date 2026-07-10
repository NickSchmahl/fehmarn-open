# Teststrategie

Ziel: Verhalten absichern, Regressionen verhindern, Refactorings (auch durch den
KI-Agenten) gefahrlos ermöglichen. Tests sind die wichtigste Vertrauensschicht.

## Testpyramide

```
        ╱ E2E ╲          wenige, kritische Flows (Anmeldung, Login) – Roadmap (Playwright)
      ╱─────────╲
    ╱ Integration ╲      @WebMvcTest, @DataJpaTest, Security-Tests
  ╱─────────────────╲
 ╱     Unit-Tests     ╲   Service-/Validierungslogik, reine Funktionen, Guards/Interceptors
```

Schwerpunkt auf **Unit + Integration**. E2E bewusst sparsam (teuer, langsam, brüchig).

## Backend – was auf welcher Ebene testen

| Baustein | Testart | Werkzeug | Beispiel im Repo |
|----------|---------|----------|------------------|
| `service/` (Kernlogik) | Unit | JUnit 5 + Mockito | `AnmeldungServiceTest` |
| `controller/` (REST) | Slice-Integration | `@WebMvcTest` + `MockMvc` | `AnmeldungControllerTest`, `AdminTeilnehmerControllerTest` |
| `repository/` | Slice-Integration | `@DataJpaTest` | `AnmeldungRepositoryTest`, `TeilnehmerRepositoryTest` |
| `auth/` (JWT, Filter) | Unit + Slice | JUnit + security-test | `JwtServiceTest`, `AuthControllerTest` |
| Security-Regeln (welche Route ist geschützt?) | Integration | `spring-security-test` | `SecurityFilterChainTest` |
| `exception/` (Fehler→HTTP) | Unit/Slice | MockMvc | `GlobalExceptionHandlerTest` |
| SPA-Fallback-Routing | Slice | MockMvc | `SpaFallbackControllerTest` |

**Konventionen Backend**
- Testklasse `XyzTest` neben der Produktivklasse im selben Package.
- **Fachliche Tests** (Service-Kernlogik): je Methode-unter-Test eine `@Nested`-Klasse, benannt
  nach der Methode (`NormalisiereTest`), mit kurzen Verhaltens-Testnamen darin – siehe
  [ADR 0012](../adr/0012-nested-tests-fachlogik.md), Referenz `TeamnameValidierungServiceTest`.
- **Arrange–Act–Assert**, ein logischer Assert-Block pro Testfall.
- Deterministisch: Zeit über `Clock`-Bean injizierbar machen, kein `LocalDateTime.now()`
  hart im Code (Roadmap-Punkt, falls noch vorhanden).
- Kein Netz, keine echte DB-Datei in Tests – SQLite in-memory bzw. `@DataJpaTest`-Setup.
- Nebenläufigkeit (SQLITE_BUSY, Pool=1) mind. einen Regressionstest, da fachlich heikel
  (siehe [ADR 0001](../adr/0001-sqlite-pool-1.md)).

## Frontend – was auf welcher Ebene testen

| Baustein | Testfokus | Beispiel im Repo |
|----------|-----------|------------------|
| `pages/*` Komponenten | Rendering, User-Interaktion, Formularvalidierung | `anmeldung.component.spec.ts`, `login.component.spec.ts` |
| `auth/guard` | Zugriffslogik (redirect bei fehlendem Token) | `auth.guard.spec.ts` |
| `auth/interceptor` | Token wird angehängt | `auth.interceptor.spec.ts` |
| `core/interceptors` | HTTP-Fehler → Toast/Meldung | `global-http-error.interceptor.spec.ts` |
| `core/services` | Toast-/Fehler-Service-Verhalten | `toast.service.spec.ts`, `error-notification.service.spec.ts` |

**Konventionen Frontend**
- Jest (`jest-preset-angular`), `*.spec.ts` neben der Datei.
- `HttpTestingController` für HTTP statt echter Requests.
- Interaktion bevorzugt über DOM-Rollen/Text testen (Nutzersicht), nicht über
  interne Implementierungsdetails. (Angular Testing Library als Option auf der Roadmap.)
- Kein `fakeAsync`-Missbrauch; `async/await` + `whenStable` wo möglich.

## Was fehlt / Roadmap

- **E2E-Smoke-Tests** für die zwei kritischsten Flows (öffentliche Anmeldung,
  Admin-Login) mit Playwright – gegen einen hochgefahrenen Stack in CI.
- **Coverage-Gates** scharf schalten – siehe [coverage.md](coverage.md).
- **Contract-Konsistenz** Front-/Backend-DTOs: aktuell manuell. Perspektivisch
  OpenAPI-Generierung erwägen (eigener ADR, falls verfolgt).

Umsetzungstickets: [tickets/quality-roadmap.md](../tickets/quality-roadmap.md).
