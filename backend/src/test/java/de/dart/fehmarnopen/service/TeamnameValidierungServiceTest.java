package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.DoppelterTeamnameException;
import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Fachliche Tests je öffentlicher Methode in eigener {@link Nested}-Klasse (Konvention siehe
 * ADR 0012): die Klasse heißt nach der Methode ({@code NormalisiereTest}), die Testmethoden bleiben
 * kurz und beschreiben nur noch das Verhalten.
 */
@ExtendWith(MockitoExtension.class)
class TeamnameValidierungServiceTest {

    @Mock
    private AnmeldungRepository anmeldungRepository;

    @InjectMocks
    private TeamnameValidierungService teamnameValidierungService;

    private Anmeldung anmeldungMitTeamname(Long id, String teamName) {
        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setId(id);
        anmeldung.setDisziplin(Disziplin.HERRENDOPPEL);
        anmeldung.setTeamName(teamName);
        return anmeldung;
    }

    @Nested
    class NormalisiereTest {

        @Test
        void entferntRandLeerzeichen() {
            assertThat(teamnameValidierungService.normalisiere("  Team  ")).isEqualTo("Team");
        }

        @Test
        void fasstInterneWhitespacesZusammen() {
            assertThat(teamnameValidierungService.normalisiere("a   b\tc")).isEqualTo("a b c");
        }

        @Test
        void leerErgibtNull() {
            assertThat(teamnameValidierungService.normalisiere("   ")).isNull();
        }

        @Test
        void nullErgibtNull() {
            assertThat(teamnameValidierungService.normalisiere(null)).isNull();
        }
    }

    @Nested
    class NormalisiereUndPruefeTest {

        @Test
        void genau20ZeichenIstGueltig() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                    .thenReturn(List.of());
            String zwanzig = "12345678901234567890";

            assertThat(teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, zwanzig, null))
                    .isEqualTo(zwanzig);
        }

        @Test
        void ueber20ZeichenWirdAbgelehnt() {
            assertThatThrownBy(() -> teamnameValidierungService.normalisiereUndPruefe(
                            Disziplin.HERRENDOPPEL, "123456789012345678901", null))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void laengeGiltNachNormalisierung() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                    .thenReturn(List.of());
            // Roh 25 Zeichen (> 20), nach Zusammenfassen der Leerzeichen aber nur "aaaaa aaaaa aaaaa" = 17.
            String rohZuLang = "aaaaa     aaaaa     aaaaa";

            assertThatCode(() ->
                            teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, rohZuLang, null))
                    .doesNotThrowAnyException();
        }

        @Test
        void gleicherNameGleicheDisziplinWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                    .thenReturn(List.of(anmeldungMitTeamname(1L, "Die Bullseye Boys")));

            assertThatThrownBy(() -> teamnameValidierungService.normalisiereUndPruefe(
                            Disziplin.HERRENDOPPEL, "Die Bullseye Boys", null))
                    .isInstanceOf(DoppelterTeamnameException.class);
        }

        @Test
        void gleicherNameCaseInsensitivInklUmlautWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                    .thenReturn(List.of(anmeldungMitTeamname(1L, "Bär")));

            assertThatThrownBy(
                            () -> teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, "BÄR", null))
                    .isInstanceOf(DoppelterTeamnameException.class);
        }

        @Test
        void gleicherNameNachNormalisierungWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                    .thenReturn(List.of(anmeldungMitTeamname(1L, "Team Eins")));

            assertThatThrownBy(() -> teamnameValidierungService.normalisiereUndPruefe(
                            Disziplin.HERRENDOPPEL, "  team   eins ", null))
                    .isInstanceOf(DoppelterTeamnameException.class);
        }

        @Test
        void gleicherNameAndereDisziplinIstErlaubt() {
            // Es wird nur die eigene Disziplin abgefragt – dort kein Treffer.
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.DAMENDOPPEL))
                    .thenReturn(List.of());

            assertThatCode(() -> teamnameValidierungService.normalisiereUndPruefe(
                            Disziplin.DAMENDOPPEL, "Die Bullseye Boys", null))
                    .doesNotThrowAnyException();
        }

        @Test
        void ausschlussIdIgnoriertEigeneAnmeldung() {
            // Nur die eigene (id=1) trägt den Namen – mit ausschlussId=1 keine Kollision (Reaktivierung).
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                    .thenReturn(List.of(anmeldungMitTeamname(1L, "Team")));

            assertThatCode(() -> teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, "Team", 1L))
                    .doesNotThrowAnyException();
        }

        @Test
        void ohneTeamnameErgibtNullOhneAbfrage() {
            assertThat(teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENEINZEL, null, null))
                    .isNull();
        }

        @Test
        void buchstabenZiffernLeerzeichenSindErlaubt() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                    .thenReturn(List.of());

            assertThatCode(() -> teamnameValidierungService.normalisiereUndPruefe(
                            Disziplin.HERRENDOPPEL, "München 42", null))
                    .doesNotThrowAnyException();
        }

        @Test
        void punktWirdAbgelehnt() {
            assertThatThrownBy(() ->
                            teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, "Team.", null))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void ampersandWirdAbgelehnt() {
            assertThatThrownBy(
                            () -> teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, "a&b", null))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void apostrophWirdAbgelehnt() {
            assertThatThrownBy(() ->
                            teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, "O'Brien", null))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void bindestrichBeimTeamnamenWirdAbgelehnt() {
            // Abgrenzung zum Personennamen: dort ist der Bindestrich erlaubt, beim Teamnamen nicht.
            assertThatThrownBy(() ->
                            teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, "Team-Eins", null))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void zeichensatzGiltNachNormalisierung() {
            // Rand-Leerzeichen werden zwar normalisiert, das Sonderzeichen bleibt und wird abgelehnt.
            assertThatThrownBy(() ->
                            teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, "  Team.  ", null))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }
    }
}
