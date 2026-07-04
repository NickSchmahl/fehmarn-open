# ADR 0002 – JWT stateless statt Server-Sessions

**Status:** Akzeptiert · **Datum:** aus Code rekonstruiert (#7, #8)

## Kontext
Der Admin-Bereich braucht Authentifizierung. Frontend ist eine Angular-SPA, Backend
ein REST-Service.

## Entscheidung
Authentifizierung über **JWT**, kein Server-Session-State
(`SessionCreationPolicy.STATELESS`). Nach Login schickt der Client den Token als
`Authorization: Bearer`. `JWT_SECRET` ist Pflicht-Env-Var.

## Konsequenzen
- Passt zum SPA + REST-Modell, horizontal skalierbar (kein Session-Sticky nötig).
- Kein serverseitiges Invalidieren einzelner Tokens (nur über kurze Ablaufzeit,
  `JWT_EXPIRATION_MS`, Default 1 h). Kein Refresh-Token.
- Security-Regeln müssen in `SecurityConfig` gepflegt und in `SecurityFilterChainTest`
  getestet werden.

## Alternativen
- Klassische Server-Sessions: einfacher zu invalidieren, aber Session-State und
  CSRF-Handling; passt schlechter zum SPA-Ansatz.
