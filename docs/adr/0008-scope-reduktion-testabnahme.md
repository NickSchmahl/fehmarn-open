# ADR 0008 – Scope-Reduktion vor der ersten Testabnahme

**Status:** Akzeptiert · **Datum:** 2026-07-04 · Entscheider: Nick

## Kontext
Beim Doku-Abgleich fiel auf, dass README/`requirements.md` mehrere Features als
„fertig" führten, die im Code fehlen (siehe [features/admin.md](../features/admin.md)).
Statt alle nachzubauen, hat Nick die Anforderungen neu bewertet: Einiges ist für den
aktuellen Zweck **overengineered** und soll nicht (jetzt) umgesetzt werden.

## Entscheidung

| Feature | Entscheidung | Umgang mit vorhandenem Code |
|---------|--------------|------------------------------|
| **Selbst-Abmeldung (Teilnehmer)** | **Gestrichen** – wird nicht gebaut | Teil-Code (`abmelden(token)`, `abmeldetoken`, Repo-Query) **vorerst liegen lassen**, nur als „nicht mehr vorgesehen" dokumentiert |
| **E-Mail-Versand** | **Ruht** → **inzwischen per #113 vollständig entfernt** | Ursprünglich nur Trigger kappen (Code behalten); mit #113 wurde der gesamte Mail-Layer (`MailService`, Listener, Events, `AsyncConfig`) inkl. `email`-Feld und Mailpit **gelöscht** |
| **Anmeldeschluss / `TurnierConfig`** | **Raus** – overengineered | Als Cleanup-TODO zum **Entfernen** vormerken (`TurnierConfig`, ungenutzte Felder/Exception) |
| **Excel-Export** | **Verschoben** – nicht vor Testabnahme | (kein Code vorhanden) |
| **Flyer-Upload** | **Bleibt/erforderlich** – vor Testabnahme umsetzen | (neu zu bauen) |
| **QR-Code für Anmeldelink** | **Gewünscht** – wird noch gemacht | (neu zu bauen, evtl. rein clientseitig) |

## Begründung
Fokus auf das, was die erste echte Testabnahme wirklich braucht: funktionierende
Anmeldung + öffentliche Liste + Flyer, dazu QR-Code als Komfort. Abmeldung, Mail und
Anmeldeschluss bringen für den aktuellen Ablauf mehr Komplexität als Nutzen.

## Konsequenzen
- `requirements.md`, `features/*` und die Ticket-Listen spiegeln diesen Scope.
- „Liegen lassen" (Abmelde-Code) vs. „raus" (Anmeldeschluss) ist bewusst
  unterschiedlich: Ersteres kostet nichts und stört nicht, Letzteres ist toter
  Ballast im Datenmodell.
- Mail wurde mit #113 vollständig entfernt (Code ist **weg**); eine Reaktivierung
  wäre daher ein Neubau, kein Wieder-Anschalten.
- Vor Reaktivierung/Ausbau dieser Themen: neuer ADR, der diesen hier ergänzt.
