package de.dart.fehmarnopen.dto;

import de.dart.fehmarnopen.entity.Disziplin;
import java.util.List;

/**
 * Öffentliche Teilnehmerübersicht, gruppiert nach Disziplin. Enthält bewusst keine sensiblen Felder
 * (Radikal-ID, Abmeldetoken).
 */
public record TeilnehmerUebersichtResponse(List<DisziplinGruppe> disziplinen) {

    public record DisziplinGruppe(Disziplin disziplin, int anzahl, List<TeilnehmerEintrag> teilnehmer) {}

    public record TeilnehmerEintrag(String vorname, String nachname, String teamName) {}
}
