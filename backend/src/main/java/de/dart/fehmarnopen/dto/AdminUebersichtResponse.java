package de.dart.fehmarnopen.dto;

import de.dart.fehmarnopen.entity.Disziplin;
import java.time.LocalDate;
import java.util.List;

/**
 * Admin-Teilnehmerübersicht, gruppiert nach Disziplin und darunter je Meldung. Enthält im
 * Gegensatz zur öffentlichen Übersicht die Radikal-ID je Spieler sowie den Verwaltungs-Status
 * (anwesend, abgemeldet) und die Anmeldung-ID je Meldung als Ziel der Admin-Aktionen. Abgemeldete
 * Meldungen bleiben enthalten; {@code anzahl} zählt nur die aktiven (nicht abgemeldeten) Meldungen.
 */
public record AdminUebersichtResponse(List<DisziplinGruppe> disziplinen) {

    public record DisziplinGruppe(Disziplin disziplin, int anzahl, List<MeldungEintrag> meldungen) {}

    /**
     * Eine Meldung mit ihren Spielern. Status und {@code id} liegen auf Meldungsebene – Admin-Aktionen
     * (anwesend/abmelden/reaktivieren) wirken damit auf die ganze Meldung, nicht auf einzelne Spieler.
     */
    public record MeldungEintrag(
            Long id, String teamName, boolean anwesend, boolean abgemeldet, List<SpielerEintrag> spieler) {}

    public record SpielerEintrag(
            String vorname, String nachname, String radikalId, String initialen, LocalDate geburtsdatum) {}
}
