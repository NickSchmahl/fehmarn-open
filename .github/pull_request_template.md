<!--
  PR-Vorlage für fehmarn-open.
  Die "Closes #<nr>"-Zeile ist Pflicht, damit das Ticket beim Merge automatisch schliesst.
  Nur die englischen Keywords (Closes/Fixes/Resolves + #<nr>) lösen Auto-Close aus –
  deutsche Formulierungen wie "Schliesst #107" schliessen KEIN Issue.
  Auto-Close greift zudem nur, wenn der PR gegen base `main` gemergt wird.
-->

## Was & warum

<!-- Kurz: was ändert dieser PR und warum? -->

Closes #

## Tests

<!-- Wie verifiziert? Backend: ./mvnw spotless:apply + ./mvnw verify.
     Frontend (frontend/): npm run lint + npm test + npm run format:check. -->

## Checkliste

- [ ] `Closes #<nr>` gesetzt (englisches Keyword, base `main`) – deutsche Prosa schliesst kein Issue
- [ ] Quality-Gate lokal grün (Backend `spotless:apply` + `verify`; Frontend `lint` + `test` + `format:check`)
- [ ] Tests angepasst/ergänzt
- [ ] `docs/` aktualisiert, falls Architektur/Entscheidung betroffen
