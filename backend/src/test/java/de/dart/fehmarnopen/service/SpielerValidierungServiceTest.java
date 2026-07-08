package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class SpielerValidierungServiceTest {

    private final SpielerValidierungService validierung = new SpielerValidierungService();

    private Spieler spielerMitId() {
        Spieler spieler = new Spieler();
        spieler.setVorname("Max");
        spieler.setNachname("Mustermann");
        spieler.setRadikalId("MM-12345");
        return spieler;
    }

    private List<Spieler> spieler(int anzahl) {
        return IntStream.range(0, anzahl).mapToObj(i -> spielerMitId()).toList();
    }

    @Test
    void herreneinzel_mitGenauEinemSpieler_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.HERRENEINZEL, spieler(1)))
                .doesNotThrowAnyException();
    }

    @Test
    void herreneinzel_mitZweiSpielern_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.HERRENEINZEL, spieler(2)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void herrendoppel_mitGenauZweiSpielern_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.HERRENDOPPEL, spieler(2)))
                .doesNotThrowAnyException();
    }

    @Test
    void herrendoppel_mitEinemSpieler_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.HERRENDOPPEL, spieler(1)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void tripleMix_mitDreiSpielern_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.TRIPLE_MIX, spieler(3)))
                .doesNotThrowAnyException();
    }

    @Test
    void tripleMix_mitVierSpielern_istGueltig() {
        // Die vierte Person ist fachlich die Ersatzperson – ohne eigenes Flag im Datenmodell.
        assertThatCode(() -> validierung.validiere(Disziplin.TRIPLE_MIX, spieler(4)))
                .doesNotThrowAnyException();
    }

    @Test
    void tripleMix_mitZweiSpielern_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.TRIPLE_MIX, spieler(2)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void tripleMix_mitFuenfSpielern_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.TRIPLE_MIX, spieler(5)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void teamwettbewerb_mitVierSpielern_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.TEAMWETTBEWERB, spieler(4)))
                .doesNotThrowAnyException();
    }

    @Test
    void teamwettbewerb_mitSechsSpielern_istGueltig() {
        assertThatCode(() -> validierung.validiere(Disziplin.TEAMWETTBEWERB, spieler(6)))
                .doesNotThrowAnyException();
    }

    @Test
    void teamwettbewerb_mitDreiSpielern_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.TEAMWETTBEWERB, spieler(3)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void teamwettbewerb_mitSiebenSpielern_istUngueltig() {
        assertThatThrownBy(() -> validierung.validiere(Disziplin.TEAMWETTBEWERB, spieler(7)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void spielerMitInitialenUndGeburtsdatum_ohneRadikalId_istGueltig() {
        Spieler ohneId = new Spieler();
        ohneId.setVorname("Max");
        ohneId.setNachname("Mustermann");
        ohneId.setInitialen("MM");
        ohneId.setGeburtsdatum(LocalDate.of(1990, 1, 1));

        assertThatCode(() -> validierung.validiere(Disziplin.HERRENEINZEL, List.of(ohneId)))
                .doesNotThrowAnyException();
    }

    @Test
    void spielerOhneRadikalIdUndOhneGeburtsdaten_istUngueltig() {
        Spieler leer = new Spieler();
        leer.setVorname("Max");
        leer.setNachname("Mustermann");

        assertThatThrownBy(() -> validierung.validiere(Disziplin.HERRENEINZEL, List.of(leer)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void spielerMitInitialenAberOhneGeburtsdatum_istUngueltig() {
        Spieler nurInitialen = new Spieler();
        nurInitialen.setVorname("Max");
        nurInitialen.setNachname("Mustermann");
        nurInitialen.setInitialen("MM");

        assertThatThrownBy(() -> validierung.validiere(Disziplin.HERRENEINZEL, List.of(nurInitialen)))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }
}
