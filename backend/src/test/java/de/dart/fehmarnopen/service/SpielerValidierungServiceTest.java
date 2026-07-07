package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class SpielerValidierungServiceTest {

    private final SpielerValidierungService validierung = new SpielerValidierungService();

    /** Spieler mit gültiger Radikal ID. */
    private SpielerValidierungService.SpielerDaten mitId(boolean istErsatz) {
        return new SpielerValidierungService.SpielerDaten("Max", "Mustermann", "MM-12345", null, null, istErsatz);
    }

    private List<SpielerValidierungService.SpielerDaten> spielerMitId(int anzahl) {
        return IntStream.range(0, anzahl).mapToObj(i -> mitId(false)).toList();
    }

    @Test
    void herreneinzel_mitGenauEinemSpieler_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.HERRENEINZEL, spielerMitId(1)))
                .doesNotThrowAnyException();
    }

    @Test
    void herreneinzel_mitZweiSpielern_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.HERRENEINZEL, spielerMitId(2)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void herrendoppel_mitGenauZweiSpielern_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.HERRENDOPPEL, spielerMitId(2)))
                .doesNotThrowAnyException();
    }

    @Test
    void herrendoppel_mitEinemSpieler_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.HERRENDOPPEL, spielerMitId(1)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void tripleMix_mitDreiRegulaerenSpielern_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.TRIPLE_MIX, spielerMitId(3)))
                .doesNotThrowAnyException();
    }

    @Test
    void tripleMix_mitDreiRegulaerenUndEinemErsatz_istGueltig() {
        List<SpielerValidierungService.SpielerDaten> spieler =
                List.of(mitId(false), mitId(false), mitId(false), mitId(true));
        assertThatCode(() -> validierung.validiere(Disziplin.TRIPLE_MIX, spieler))
                .doesNotThrowAnyException();
    }

    @Test
    void tripleMix_mitZweiErsatzspielern_istUngueltig() {
        List<SpielerValidierungService.SpielerDaten> spieler =
                List.of(mitId(false), mitId(false), mitId(false), mitId(true), mitId(true));
        assertThatThrownBy(() -> validierung.validiere(Disziplin.TRIPLE_MIX, spieler))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void teamwettbewerb_mitVierSpielern_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.TEAMWETTBEWERB, spielerMitId(4)))
                .doesNotThrowAnyException();
    }

    @Test
    void teamwettbewerb_mitSechsSpielern_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.TEAMWETTBEWERB, spielerMitId(6)))
                .doesNotThrowAnyException();
    }

    @Test
    void teamwettbewerb_mitDreiSpielern_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.TEAMWETTBEWERB, spielerMitId(3)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void teamwettbewerb_mitSiebenSpielern_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.TEAMWETTBEWERB, spielerMitId(7)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void spielerMitInitialenUndGeburtsdatum_ohneRadikalId_istGueltig() {
        SpielerValidierungService.SpielerDaten ohneId = new SpielerValidierungService.SpielerDaten(
                "Max", "Mustermann", null, "MM", LocalDate.of(1990, 1, 1), false);
        assertThatCode(() -> validierung.validiere(Disziplin.HERRENEINZEL, List.of(ohneId)))
                .doesNotThrowAnyException();
    }

    @Test
    void spielerOhneRadikalIdUndOhneGeburtsdaten_istUngueltig() {
        SpielerValidierungService.SpielerDaten leer =
                new SpielerValidierungService.SpielerDaten("Max", "Mustermann", null, null, null, false);
        assertThatThrownBy(() -> validierung.validiere(Disziplin.HERRENEINZEL, List.of(leer)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void spielerMitInitialenAberOhneGeburtsdatum_istUngueltig() {
        SpielerValidierungService.SpielerDaten nurInitialen =
                new SpielerValidierungService.SpielerDaten("Max", "Mustermann", null, "MM", null, false);
        assertThatThrownBy(() -> validierung.validiere(Disziplin.HERRENEINZEL, List.of(nurInitialen)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }
}
