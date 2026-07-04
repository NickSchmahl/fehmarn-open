# ADR 0003 – Asynchroner Mailversand über Application Events

**Status:** Akzeptiert · **Datum:** aus Code rekonstruiert (#13, #22)

## Kontext
Bei An-/Abmeldung soll eine Bestätigungsmail rausgehen. SMTP-Versand kann langsam
sein oder fehlschlagen; die HTTP-Antwort an den Teilnehmer soll davon unabhängig sein.

## Entscheidung
Fachliche Vorgänge feuern **Application Events** (`AnmeldungBestaetigtEvent`,
`AbmeldungBestaetigtEvent`). Ein `@Async`-Listener (`MailEventListener`) versendet die
Mail entkoppelt über `MailService`. Thread-Pool in `AsyncConfig`.

## Konsequenzen
- HTTP-Antwort wartet nicht auf SMTP → bessere Latenz und Robustheit.
- Mailfehler dürfen den Vorgang nicht rückgängig machen – Fehlerbehandlung liegt im
  async Pfad (bei Änderungen beachten).
- Testbar in zwei Stufen: Versandlogik (`MailServiceTest`) und – empfohlen – der
  ganze Weg via GreenMail-Integrationstest.

## Alternativen
- Synchroner Versand im Request: einfacher, aber koppelt Antwortzeit an den SMTP-Server.
