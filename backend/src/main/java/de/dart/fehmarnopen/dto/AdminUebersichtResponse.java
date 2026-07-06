package de.dart.fehmarnopen.dto;

import de.dart.fehmarnopen.entity.Disziplin;
import java.util.List;

/**
 * Admin-Teilnehmerübersicht, gruppiert nach Disziplin. Enthält im Gegensatz zur öffentlichen
 * Übersicht alle Felder (inkl. E-Mail, Radikal-ID) sowie Verwaltungs-Status (anwesend, abgemeldet)
 * und die Anmeldung-ID als Ziel der Admin-Aktionen. Abgemeldete bleiben enthalten.
 */
public record AdminUebersichtResponse(List<DisziplinGruppe> disziplinen) {

    public record DisziplinGruppe(Disziplin disziplin, int anzahl, List<AdminEintrag> teilnehmer) {}

    public record AdminEintrag(
            Long id,
            String vorname,
            String nachname,
            String email,
            String radicalId,
            String teamName,
            boolean anwesend,
            boolean abgemeldet) {}
}
