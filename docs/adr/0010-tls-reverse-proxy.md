# ADR 0010 – HTTPS/TLS über Reverse Proxy (Caddy)

**Status:** Akzeptiert · **Datum:** 2026-07-09 · **Ticket:** #119

## Kontext

Die App lief bisher **nur über HTTP**: das Spring-Boot-JAR direkt auf dem Server (test
`:8081`, prod `:8080`), ohne TLS. Über die Leitung gehen der **JWT-Login des Admin-Bereichs**
(Token im Klartext abgreifbar → Session-Übernahme) und **personenbezogene Daten** aus der
Anmeldung (Namen, Radikal ID) – DSGVO-relevant (vgl. #105). Vor dem produktiven Go-Live ist
HTTPS Pflicht: gültiges Zertifikat, HTTP→HTTPS-Redirect und automatische Erneuerung.

## Entscheidung

TLS wird **nicht** in Spring terminiert, sondern von einem vorgelagerten **Reverse Proxy
(Caddy)** übernommen. Caddy proxied auf die unveränderten lokalen Spring-Ports.

- **Caddy statt nginx + certbot:** Caddy bringt automatische Let's-Encrypt-Zertifikate,
  HTTP→HTTPS-Redirect und Auto-Renewal out of the box – minimale Config
  ([`deploy/Caddyfile`](../../deploy/Caddyfile)), kein separater certbot/Cron. nginx+certbot
  gäbe mehr Kontrolle, aber deutlich mehr Handarbeit; für zwei Domains überdimensioniert.
- **Spring bleibt intern:** Bindung nur an `127.0.0.1` (`SERVER_ADDRESS=127.0.0.1`), von außen
  ist ausschließlich Caddy über 80/443 erreichbar. `server.forward-headers-strategy: framework`
  lässt Spring Scheme/Host aus den `X-Forwarded-*`-Headern übernehmen → korrekte absolute
  `https://`-URLs und Redirects.
- **Zwei Domains, ein Server:** `fehmarn-open.de` → `:8080` (prod),
  `test.fehmarn-open.de` → `:8081` (test).
- **Config als Default folgenlos:** `application.yaml` setzt `server.address` mit Default
  `0.0.0.0` – lokales Dev/CI-Verhalten bleibt unverändert; nur der Server überschreibt via Env.

## Konsequenzen

- **HTTPS erzwungen**, Zertifikate erneuern sich selbst; Port 80 bleibt für die
  HTTP-01-Challenge offen. Runbook: [deployment.md → „HTTPS/TLS via Caddy"](../deployment.md).
- **Blockiert von der Domain:** Let's Encrypt braucht auflösende A-Records; ohne DNS kein Zert.
  Repo-seitig (Caddyfile, Spring-Config, Runbook) vollständig vorbereitet, der Server-Rollout
  (Caddy installieren, DNS, Env, Firewall) erfolgt manuell.
- **HSTS bewusst zuletzt:** Der `Strict-Transport-Security`-Header ist im Caddyfile
  auskommentiert und wird erst nach verifiziertem HTTPS aktiviert (klebrig – sperrt bei
  kaputtem TLS für `max-age` aus).
- **CI unberührt:** Der interne Healthcheck (`http://localhost:<port>`) läuft am Proxy vorbei
  direkt auf den lokalen Port und bleibt korrekt.
- **CORS als Absicherung:** Frontend kommt same-origin aus dem JAR; `CORS_ALLOWED_ORIGINS` wird
  dennoch auf die `https://`-Domain gesetzt.

## Alternativen

- **nginx + certbot:** Mehr Kontrolle, mehr Handarbeit (Server-Block, certbot-Renewal-Timer).
  Verworfen zugunsten der einfacheren Caddy-Automatik.
- **TLS direkt in Spring Boot (`server.ssl`):** Zertifikat-Handling (Keystore, Renewal) landet
  in der App; kein einfaches Let's-Encrypt-Auto-Renewal. Verworfen.
