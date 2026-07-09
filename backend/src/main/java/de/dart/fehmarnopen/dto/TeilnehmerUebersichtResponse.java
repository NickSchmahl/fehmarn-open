package de.dart.fehmarnopen.dto;

import de.dart.fehmarnopen.entity.Disziplin;
import java.util.List;

/**
 * Öffentliche Teilnehmerübersicht, gruppiert nach Disziplin und darunter je Meldung. Enthält
 * bewusst keine sensiblen Felder (Radikal-ID). {@code anzahl} zählt die Meldungen der Disziplin.
 */
public record TeilnehmerUebersichtResponse(List<DisziplinGruppe> disziplinen) {

    public record DisziplinGruppe(Disziplin disziplin, int anzahl, List<MeldungEintrag> meldungen) {}

    /** Eine Meldung (Team bzw. Einzelperson). {@code teamName} ist bei Einzeldisziplinen leer. */
    public record MeldungEintrag(String teamName, List<SpielerEintrag> spieler) {}

    public record SpielerEintrag(String vorname, String nachname) {}
}
