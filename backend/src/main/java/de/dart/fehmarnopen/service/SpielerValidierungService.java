package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Prüft die fachlichen Regeln einer Team-Anmeldung je Disziplin: erlaubte Spielerzahl (inkl.
 * Ersatzspieler) und die Radikal-ID-Regel je Spieler (Radikal ID ODER Initialen + Geburtsdatum).
 * Verstöße führen zu einer {@link UngueltigeAnmeldungException} (HTTP 400).
 */
@Component
public class SpielerValidierungService {

    /** Eingabedaten eines einzelnen Spielers einer Meldung. */
    public record SpielerDaten(
            String vorname,
            String nachname,
            String radicalId,
            String initialen,
            LocalDate geburtsdatum,
            boolean istErsatz) {}

    public void validiere(Disziplin disziplin, List<SpielerDaten> spieler) {
        long regulaere = spieler.stream().filter(s -> !s.istErsatz()).count();
        long ersatz = spieler.stream().filter(SpielerDaten::istErsatz).count();

        switch (disziplin) {
            case HERRENEINZEL, DAMENEINZEL -> pruefeAnzahl(disziplin, regulaere, ersatz, 1, 1, 0);
            case HERRENDOPPEL, DAMENDOPPEL -> pruefeAnzahl(disziplin, regulaere, ersatz, 2, 2, 0);
            case TRIPLE_MIX -> pruefeAnzahl(disziplin, regulaere, ersatz, 3, 3, 1);
            case TEAMWETTBEWERB -> pruefeAnzahl(disziplin, regulaere, ersatz, 4, 6, 0);
        }

        spieler.forEach(this::pruefeRadikalId);
    }

    private void pruefeAnzahl(Disziplin disziplin, long regulaere, long ersatz, int min, int max, int maxErsatz) {
        if (regulaere < min || regulaere > max) {
            throw new UngueltigeAnmeldungException(fehler(disziplin, min, max, maxErsatz));
        }
        if (ersatz > maxErsatz) {
            throw new UngueltigeAnmeldungException(fehler(disziplin, min, max, maxErsatz));
        }
    }

    private String fehler(Disziplin disziplin, int min, int max, int maxErsatz) {
        String basis = min == max
                ? "%s benötigt genau %d Spieler".formatted(disziplin.getLabel(), min)
                : "%s benötigt %d bis %d Spieler".formatted(disziplin.getLabel(), min, max);
        return maxErsatz > 0 ? basis + " (max. %d Ersatzspieler)".formatted(maxErsatz) : basis;
    }

    private void pruefeRadikalId(SpielerDaten spieler) {
        boolean hatId = spieler.radicalId() != null && !spieler.radicalId().isBlank();
        boolean hatAbleitung =
                spieler.initialen() != null && !spieler.initialen().isBlank() && spieler.geburtsdatum() != null;
        if (!hatId && !hatAbleitung) {
            throw new UngueltigeAnmeldungException(
                    "Bitte Radikal ID angeben – oder Initialen und Geburtsdatum, damit eine erstellt werden kann.");
        }
    }
}
