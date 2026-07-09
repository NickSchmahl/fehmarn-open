# #109 — Teilnehmerliste & Admin-Übersicht auf Team-Meldungen umstellen

**Datum:** 2026-07-08
**Ticket:** #109 (Folge des Team-Anmelde-Umbaus, abhängig von #106)
**Branch:** `feat/109-uebersicht-team-meldungen`

## Problem

Die öffentliche Teilnehmerliste und die Admin-Übersicht flachen heute jede Meldung
auf Spielerebene ab: Ein Team mit 5 Spielern erscheint als 5 einzelne Zeilen (jeweils
mit wiederholtem Teamnamen). Das Frontend rekonstruiert die Teams anschließend
clientseitig aus dieser flachen Liste — gekeyt am Teamnamen-**String**
(`gruppiereNachTeam` / `gruppiereAdminNachTeam`).

Konsequenzen:

1. **Kriterium 3 des Tickets nicht erfüllt** — die Meldungsgrenze steckt nicht im DTO.
2. **Fragil:** Zwei Teams mit gleichem Namen in derselben Disziplin verschmelzen zu
   einem Block.
3. **Admin-UX inkonsistent:** `anwesend` / `abgemeldet` hängen am `Anmeldung`-Objekt
   (also pro Meldung), aber das Template rendert **pro Spieler** einen Anwesend-Schalter
   und Abmelden-Button. Ein Klick auf Spieler 1 schaltet faktisch das ganze Team;
   Team-Aktionen feuern denselben Request N-fach (`ids = [5,5,5,…]`).

Das Datenmodell (`Anmeldung 1→n Spieler`, eine `id` pro Meldung) trägt die Gruppierung
bereits — nur die Übersichts-Endpunkte werfen sie weg.

## Lösung

Die Gruppierung wandert vom Frontend ins Backend. Die Response-DTOs tragen die
Meldungsgrenze verschachtelt (`Meldung → Spieler[]`), das Frontend rendert sie direkt.
Das erfüllt Kriterium 3, behebt die String-Fragilität und macht den Admin-Status sauber
pro Meldung bedienbar.

### 1. DTOs

```
// Öffentlich — ohne Radikal-ID
TeilnehmerUebersichtResponse(List<DisziplinGruppe> disziplinen)
  DisziplinGruppe(Disziplin disziplin, int anzahl /* Meldungen */, List<MeldungEintrag> meldungen)
  MeldungEintrag(String teamName /* nullable */, List<SpielerEintrag> spieler)
  SpielerEintrag(String vorname, String nachname)

// Admin — Status pro Meldung, Radikal-ID pro Spieler
AdminUebersichtResponse(List<DisziplinGruppe> disziplinen)
  DisziplinGruppe(Disziplin disziplin, int anzahl /* aktive Meldungen */, List<MeldungEintrag> meldungen)
  MeldungEintrag(Long id, String teamName, boolean anwesend, boolean abgemeldet, List<SpielerEintrag> spieler)
  SpielerEintrag(String vorname, String nachname, String radikalId)
```

`id` / `anwesend` / `abgemeldet` sitzen jetzt auf Meldungsebene (dort, wo sie im
Datenmodell auch leben). Radikal-ID bleibt pro Spieler und ausschließlich im Admin-DTO.

### 2. Service (`AnmeldungService`)

- `sortierteSpielerMitAnmeldung` und der Record `SpielerMitAnmeldung` entfallen.
- Stattdessen je Disziplin die Meldungen abbilden:
  - Spieler **innerhalb** einer Meldung nach Nachname, dann Vorname sortiert.
  - Meldungen **innerhalb** einer Disziplin nach Sortierschlüssel: Teamname, bei
    teamlosen Meldungen der Name des (einzigen) Spielers.
- **Zählung `anzahl` = Anzahl Meldungen** — konsistent für öffentlich **und** Admin.
  - Öffentlich: `findByAbgemeldetFalse` filtert bereits, also alle Meldungen der Gruppe.
  - Admin: nur nicht-abgemeldete Meldungen zählen; abgemeldete bleiben in der Liste.
- `gruppiereNachDisziplin` (TreeMap, Enum-Reihenfolge) bleibt.

### 3. Frontend (`teilnehmer.ts` / `teilnehmer.html`)

- `gruppiereNachTeam` / `gruppiereAdminNachTeam` und die zugehörigen Roh-Typen
  (`TeamGruppe`, `AdminTeamGruppe` als clientseitige Rekonstruktion) entfallen — die
  Gruppen kommen fertig vom Backend. Die TS-Interfaces spiegeln die neuen DTOs.
- Admin-Aktionen `abmelden` / `reaktivieren` / `toggleAnwesenheit` arbeiten auf
  `meldung.id`. Die `team*`-Batch-Methoden (`forkJoin` über `ids[]`) fallen weg — es
  gibt genau **eine** ID pro Meldung.
- **Template Admin:** pro Meldungs-Block **ein** Anwesend-Schalter + **ein**
  Abmelden/Reaktivieren; darunter die Spieler als Namensliste inkl. Radikal-ID.
  Suche matcht Spielername **oder** Teamname innerhalb der Meldung.
- **Template öffentlich:** Teamname + Spielernamen der Meldung (join). Zählungen
  (Section-Count, Chips) zeigen Meldungen; „Alle" = Summe aller Meldungen.

### 4. Tests

**Backend (Service-Test):**
- Beide Endpunkte liefern je Team-Meldung die vollständige, verschachtelte Spielerliste.
- Zwei gleichnamige Teams in derselben Disziplin bleiben getrennte Meldungen.
- Admin-`anzahl` zählt Meldungen (nicht Spieler); abgemeldete Meldungen bleiben in der
  Admin-Liste, zählen aber nicht in `anzahl`.
- Öffentliche Übersicht enthält keine Radikal-ID.
- Ggf. Web-/Controller-Test an die neue JSON-Struktur anpassen.

**Frontend (`teilnehmer.spec.ts`):**
- Team mit 5 Spielern wird mit allen 5 Namen unter einem Teamnamen dargestellt.
- Admin-Toggle feuert genau **einen** Request pro Meldung.
- Dynamische Änderungen über echte Button-/Toggle-Klicks im DOM testen (nicht per
  direktem Methodenaufruf).

## Scope

Cross-Stack: 2 DTOs, `AnmeldungService`, Frontend-Typen/Component/Template, Tests.
Sichtbare Änderung der Admin-Interaktion (Steuerung pro Meldung statt pro Spieler).
Ein PR für Ticket #109.

## Nicht in Scope

- Kein Ersatz-Flag (in #106 verworfen; bei Triple Mix ist die 4. Person informell
  die Ersatzperson).
- Keine Änderung an den Admin-Endpunkten selbst (`/anmeldung/{id}/abmelden` etc.) —
  sie arbeiten schon auf Anmeldungs-Ebene, passen also unverändert.
