package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Prüft die fachlichen Regeln einer Team-Anmeldung je Disziplin: erlaubte Spielerzahl und die
 * Radikal-ID-Regel je Spieler (Radikal ID ODER Initialen + Geburtsdatum). Verstöße führen zu
 * einer {@link UngueltigeAnmeldungException} (HTTP 400).
 */
@Component
public class SpielerValidierungService {

    public void validiere(Disziplin disziplin, List<Spieler> spieler) {
        int anzahlSpieler = spieler.size();
        switch (disziplin) {
            case HERRENEINZEL, DAMENEINZEL -> pruefeSpielerzahl(disziplin, anzahlSpieler, 1, 1);
            case HERRENDOPPEL, DAMENDOPPEL -> pruefeSpielerzahl(disziplin, anzahlSpieler, 2, 2);
            case TRIPLE_MIX -> pruefeSpielerzahl(disziplin, anzahlSpieler, 3, 4);
            case TEAMWETTBEWERB -> pruefeSpielerzahl(disziplin, anzahlSpieler, 4, 6);
        }

        spieler.forEach(this::pruefeRadikalId);
    }

    private void pruefeSpielerzahl(Disziplin disziplin, int anzahlSpieler, int minimaleSpieler, int maximaleSpieler) {
        if (anzahlSpieler < minimaleSpieler || anzahlSpieler > maximaleSpieler) {
            throw new UngueltigeAnmeldungException(erzeugeFehlernachricht(disziplin, minimaleSpieler, maximaleSpieler));
        }
    }

    private String erzeugeFehlernachricht(Disziplin disziplin, int minimaleSpieler, int maximaleSpieler) {
        if (minimaleSpieler == maximaleSpieler) {
            return "%s benötigt genau %d Spieler".formatted(disziplin.getLabel(), minimaleSpieler);
        }
        return "%s benötigt %d bis %d Spieler".formatted(disziplin.getLabel(), minimaleSpieler, maximaleSpieler);
    }

    private void pruefeRadikalId(Spieler spieler) {
        boolean hatId =
                spieler.getRadikalId() != null && !spieler.getRadikalId().isBlank();
        boolean hatAbleitung = spieler.getInitialen() != null
                && !spieler.getInitialen().isBlank()
                && spieler.getGeburtsdatum() != null;
        if (!hatId && !hatAbleitung) {
            throw new UngueltigeAnmeldungException(
                    "Bitte Radikal ID angeben – oder Initialen und Geburtsdatum, damit eine erstellt werden kann.");
        }
    }
}
