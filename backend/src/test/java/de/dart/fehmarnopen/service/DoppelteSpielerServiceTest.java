package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.DisziplinAnmeldung;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.DoppelterSpielerException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DoppelteSpielerServiceTest {

    @Mock
    private AnmeldungRepository anmeldungRepository;

    // Realer Namensservice: seine Normalisierung ist Teil des Vergleichs und in eigenem Test abgedeckt.
    private final SpielernameValidierungService spielernameValidierungService = new SpielernameValidierungService();

    private DoppelteSpielerService service() {
        return new DoppelteSpielerService(anmeldungRepository, spielernameValidierungService);
    }

    private SpielerRequest spieler(String vorname, String nachname, String radikalId) {
        return new SpielerRequest(vorname, nachname, radikalId, null, null);
    }

    private DisziplinAnmeldung einzel(Disziplin disziplin, SpielerRequest spieler) {
        return new DisziplinAnmeldung(disziplin, null, List.of(spieler));
    }

    private AnmeldungRequest request(DisziplinAnmeldung... eintraege) {
        return new AnmeldungRequest(List.of(eintraege));
    }

    private Anmeldung aktiveAnmeldung(Long id, Disziplin disziplin, String vorname, String nachname, String radikalId) {
        Spieler spieler = new Spieler();
        spieler.setVorname(vorname);
        spieler.setNachname(nachname);
        spieler.setRadikalId(radikalId);
        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setId(id);
        anmeldung.setDisziplin(disziplin);
        anmeldung.setSpieler(List.of(spieler));
        return anmeldung;
    }

    @Nested
    class PruefeTest {

        @Test
        void gleicherNameWieAktiverBestandWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(
                            List.of(aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990")));

            assertThatThrownBy(() -> service()
                            .pruefe(request(
                                    einzel(Disziplin.HERRENEINZEL, spieler("Max", "Mustermann", "BB02021992")))))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void gleicherNameCaseInsensitivInklUmlautWirft() {
            // Umlaut case-insensitiv: "Bärbel Meier" == "BÄRBEL MEIER" (ä/Ä korrekt über CASE_INSENSITIVE_ORDER).
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.DAMENEINZEL))
                    .thenReturn(List.of(aktiveAnmeldung(1L, Disziplin.DAMENEINZEL, "Bärbel", "Meier", "AA01011990")));

            assertThatThrownBy(() ->
                            service().pruefe(request(einzel(Disziplin.DAMENEINZEL, spieler("BÄRBEL", "MEIER", null)))))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void gleicherVornameAberAndererNachnameIstOk() {
            // Nur Vor- UND Nachname zusammen bilden die Dublette – gleicher Vorname allein reicht nicht.
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(
                            List.of(aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990")));

            assertThatCode(() -> service()
                            .pruefe(request(einzel(Disziplin.HERRENEINZEL, spieler("Max", "Schmidt", "BB02021992")))))
                    .doesNotThrowAnyException();
        }

        @Test
        void gleicheRadikalIdWieBestandWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(
                            List.of(aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990")));

            assertThatThrownBy(() -> service()
                            .pruefe(request(einzel(Disziplin.HERRENEINZEL, spieler("Tom", "Test", "AA01011990")))))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void andereDisziplinGleicherSpielerIstErlaubt() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.DAMENEINZEL))
                    .thenReturn(List.of());

            assertThatCode(() -> service()
                            .pruefe(request(einzel(Disziplin.DAMENEINZEL, spieler("Max", "Mustermann", "AA01011990")))))
                    .doesNotThrowAnyException();
        }

        @Test
        void dubletteNamensGleichImSelbenRequestWirftMitMeldungIndex1() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of());

            assertThatThrownBy(() -> service()
                            .pruefe(request(
                                    einzel(Disziplin.HERRENEINZEL, spieler("Max", "Mustermann", "AA01011990")),
                                    einzel(Disziplin.HERRENEINZEL, spieler("max", "mustermann", "BB02021992")))))
                    .isInstanceOfSatisfying(DoppelterSpielerException.class, ex -> {
                        assertThat(ex.getDisziplin()).isEqualTo(Disziplin.HERRENEINZEL);
                        assertThat(ex.getMeldungIndex()).isEqualTo(1);
                    });
        }

        @Test
        void dubletteRadikalIdImSelbenRequestWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of());

            assertThatThrownBy(() -> service()
                            .pruefe(request(
                                    einzel(Disziplin.HERRENEINZEL, spieler("Max", "Mustermann", "AA01011990")),
                                    einzel(Disziplin.HERRENEINZEL, spieler("Tom", "Test", "AA01011990")))))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void verschiedeneSpielerSindOk() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(
                            List.of(aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990")));

            assertThatCode(() -> service()
                            .pruefe(request(
                                    einzel(Disziplin.HERRENEINZEL, spieler("Tom", "Test", "BB02021992")),
                                    einzel(Disziplin.HERRENEINZEL, spieler("Uwe", "Ulf", "CC03031993")))))
                    .doesNotThrowAnyException();
        }

        @Test
        void ohneRadikalIdKeinRadikalKonflikt() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of());

            // Beide ohne Radikal ID, verschiedene Namen → ok (kein null-gleich-null-Konflikt).
            assertThatCode(() -> service()
                            .pruefe(request(
                                    einzel(Disziplin.HERRENEINZEL, spieler("Max", "Mustermann", null)),
                                    einzel(Disziplin.HERRENEINZEL, spieler("Tom", "Test", null)))))
                    .doesNotThrowAnyException();
        }

        @Test
        void teamDisziplinWirdIgnoriert() {
            // HERRENDOPPEL ist keine Einzel-Disziplin → keine DB-Abfrage, keine Prüfung hier.
            assertThatCode(() -> service()
                            .pruefe(request(new DisziplinAnmeldung(
                                    Disziplin.HERRENDOPPEL,
                                    "Team",
                                    List.of(spieler("Max", "M", "AA01011990"), spieler("Max", "M", "AA01011990"))))))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    class PruefeReaktivierungTest {

        @Test
        void nameInzwischenBelegtWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(
                            List.of(aktiveAnmeldung(2L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "BB02021992")));
            Anmeldung eigene = aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990");

            assertThatThrownBy(() -> service().pruefeReaktivierung(eigene))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void eigeneAnmeldungWirdAusgeschlossen() {
            // Nur die eigene (id=1) trägt den Namen → mit Ausschluss keine Kollision.
            Anmeldung eigene = aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990");
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of(eigene));

            assertThatCode(() -> service().pruefeReaktivierung(eigene)).doesNotThrowAnyException();
        }

        @Test
        void teamDisziplinWirdIgnoriert() {
            Anmeldung eigene = aktiveAnmeldung(1L, Disziplin.HERRENDOPPEL, "Max", "Mustermann", "AA01011990");
            assertThatCode(() -> service().pruefeReaktivierung(eigene)).doesNotThrowAnyException();
        }
    }
}
