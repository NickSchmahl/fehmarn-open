# Design: env-Config versioniert ausrollen + Secrets injizieren

- **Issue:** #143
- **Baut auf:** #139 (teilt sich den Deploy-Job in `ci.yml`)
- **Datum:** 2026-07-09

## Problem

Die systemd-Units brauchen Laufzeit-Config (`SERVER_ADDRESS`, `CORS_ALLOWED_ORIGINS`)
**und** Secrets (`JWT_SECRET`, `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD` – alle ohne Default
in `application.yaml`, also Pflicht). Nicht-geheime Config soll versioniert und automatisch
ausgerollt werden; Secrets dürfen **nicht** ins Git.

## Entscheidungen (mit Nick abgestimmt)

| Frage | Entscheidung |
|-------|--------------|
| Config vs. Secrets | Zwei `EnvironmentFile` je Unit: `config.env` (versioniert) + `secrets.env` (injiziert). |
| Secrets-Quelle | Aus **GitHub Secrets**, beim Deploy nach `secrets.env` geschrieben. |
| Secrets-Trennung | **Pro Umgebung getrennt** – 6 Secrets `TEST_/PROD_` × 3. |
| Scope | Eigenes Ticket (#143), stapelt auf #139. |
| config.env-Inhalt | Nur `SERVER_ADDRESS` + `CORS_ALLOWED_ORIGINS` (Usernames/`JWT_EXPIRATION_MS` haben Defaults → YAGNI). |

## Umsetzung

### Repo
- `deploy/env/prod.env`, `deploy/env/test.env` – nur nicht-geheime Werte.

### Deploy-Job (`ci.yml`)
1. scp `deploy/env/<env>.env` → `/tmp/<env>.env` (`strip_components: 2`).
2. Step-`env:` löst die umgebungsrichtigen Secrets auf
   (`… == 'prod' && secrets.PROD_… || secrets.TEST_…`), `envs:` gibt sie ins Remote-Skript.
3. Im Skript vor `systemctl restart`:
   - `install -m 640 … config.env`.
   - Leere-Secret-Guard (fehlendes Secret bricht ab, statt die App still zu killen).
   - `umask 077`, Werte per `printf` (literal, kein `echo` ins Log) nach `secrets.env`,
     dann `chown fehmarnopen` + `chmod 600`.

### systemd-Units (Bootstrap, manuell)
Beide Units laden `config.env` + `secrets.env` via zwei `EnvironmentFile=`-Zeilen.
Vollständige Unit-Dateien werden **nicht** versioniert (Bootstrap-TODO), nur dokumentiert.

### Doku
`docs/deployment.md` Schritt 4 auf das config/secrets-Modell umgestellt: Tabelle,
die zwei `EnvironmentFile`-Zeilen, die 6 anzulegenden GitHub Secrets.

## Sicherheit
- Keine Secrets im Repo (`secrets.env` wird nur auf dem Server erzeugt).
- Keine Secrets im Log (GitHub maskiert; `printf` statt `echo`; kein `set -x`).
- `secrets.env` `chmod 600`, `fehmarnopen`-eigen.
- test/prod-Secrets getrennt → Test-Leak kompromittiert prod nicht.

## Manuelle Voraussetzungen (nach Merge)
1. 6 GitHub Secrets anlegen (`TEST_/PROD_` × `JWT_SECRET`, `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD`).
2. In beiden Units die zwei `EnvironmentFile=`-Zeilen ergänzen, `daemon-reload`.

## Bewusst NICHT im Scope (YAGNI)
- Vollständige systemd-Unit-Dateien versionieren.
- Usernames/`JWT_EXPIRATION_MS` in `config.env` (Defaults reichen).
