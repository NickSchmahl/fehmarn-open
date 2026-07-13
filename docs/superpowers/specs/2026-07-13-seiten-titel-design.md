# Design: Seiten-Titel überarbeiten (Ticket #187)

**Quelle:** Nick (2026-07-13). Bezug: [GitHub-Issue #187](https://github.com/NickSchmahl/fehmarn-open/issues/187).

## Problem

Der Browser-Tab-Titel zeigt auf allen Seiten den unveränderten Angular-CLI-Default
`FehmarnopenFrontend` ([index.html:5](../../../frontend/src/index.html)). Es gibt weder
Nutzung des Angular `Title`-Service noch `title`-Angaben in den Routen
([app.routes.ts](../../../frontend/src/app/app.routes.ts)). Zusätzlich existiert ein
ungenutztes `title`-Signal in [app.ts:15](../../../frontend/src/app/app.ts).

## Titel-Schema

Basis: `12. Fehmarn Open 2027` (bestehendes Event-Branding, siehe
[flyer-zeitplan.ts:77](../../../frontend/src/app/shared/flyer-zeitplan.ts)).
Pro Unterseite: `12. Fehmarn Open 2027 – <Seitenname>`. Die Flyer-Seite (= Startseite)
bekommt keinen Suffix, da sie die Basis-/Landingpage ist.

| Route | Titel |
|---|---|
| `flyer` (Ziel von `''` und `**`) | `12. Fehmarn Open 2027` |
| `anmeldung` | `12. Fehmarn Open 2027 – Anmeldung` |
| `teilnehmer` | `12. Fehmarn Open 2027 – Teilnehmer` |
| `impressum` | `12. Fehmarn Open 2027 – Impressum` |
| `datenschutz` | `12. Fehmarn Open 2027 – Datenschutz` |
| `admin/login` | `12. Fehmarn Open 2027 – Admin-Login` |

## Technischer Ansatz

Statisches `title`-Property direkt an jedem Route-Eintrag in
[app.routes.ts](../../../frontend/src/app/app.routes.ts). Das ist Angular-Router-Boardmittel
(seit v14): Angulars Standard-`TitleStrategy` setzt `document.title` automatisch bei jeder
Navigation anhand des `title`-Werts der aktiven Route — kein manueller `Title`-Service-Code in
den einzelnen Komponenten nötig, da keine dynamischen (datenabhängigen) Titel gefordert sind.

`index.html` bekommt als statischen Basis-`<title>` ebenfalls `12. Fehmarn Open 2027`
(greift kurz beim initialen Laden, bevor der Router den route-spezifischen Titel setzt).

Das ungenutzte `title`-Signal in [app.ts:15](../../../frontend/src/app/app.ts) wird entfernt,
da es durch die Router-Titel-Lösung obsolet ist und nirgends gerendert wurde.

## Tests

Ein Test, der pro Route prüft, dass ein `title` gesetzt ist (z. B. auf `routes`-Array iterieren)
und/oder ein Router-Navigation-Test, der nach Navigation zu je einer Route den erwarteten
`document.title`-Wert verifiziert.

## Out of Scope

- Eine Route/Seite für „Admin-Übersicht" existiert aktuell nicht (nur `admin/login`) und wird
  hier nicht neu angelegt — nur bestehende Routen bekommen Titel.
- Keine dynamischen Titel (z. B. mit Team- oder Spielernamen) — nicht gefordert.
