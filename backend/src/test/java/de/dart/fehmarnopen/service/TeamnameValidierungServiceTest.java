package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.DoppelterTeamnameException;
import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TeamnameValidierungServiceTest {

    @Mock
    private de.dart.fehmarnopen.repository.AnmeldungRepository anmeldungRepository;

    @InjectMocks
    private TeamnameValidierungService teamnameValidierungService;

    private Anmeldung anmeldungMitTeamname(Long id, String teamName) {
        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setId(id);
        anmeldung.setDisziplin(Disziplin.HERRENDOPPEL);
        anmeldung.setTeamName(teamName);
        return anmeldung;
    }

    // ── Normalisierung ─────────────────────────────────────────────────────────

    @Test
    void normalisiere_entferntRandLeerzeichen() {
        assertThat(teamnameValidierungService.normalisiere("  Team  ")).isEqualTo("Team");
    }

    @Test
    void normalisiere_fasstInterneWhitespacesZusammen() {
        assertThat(teamnameValidierungService.normalisiere("a   b\tc")).isEqualTo("a b c");
    }

    @Test
    void normalisiere_leerOderNull_ergibtNull() {
        assertThat(teamnameValidierungService.normalisiere("   ")).isNull();
        assertThat(teamnameValidierungService.normalisiere(null)).isNull();
    }

    // ── Länge ──────────────────────────────────────────────────────────────────

    @Test
    void pruefe_genau20Zeichen_istGueltig() {
        when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                .thenReturn(List.of());
        String zwanzig = "12345678901234567890";

        String ergebnis = teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, zwanzig, null);

        assertThat(ergebnis).isEqualTo(zwanzig);
    }

    @Test
    void pruefe_21Zeichen_wirdAbgelehnt() {
        assertThatThrownBy(() -> teamnameValidierungService.normalisiereUndPruefe(
                        Disziplin.HERRENDOPPEL, "123456789012345678901", null))
                .isInstanceOf(UngueltigeAnmeldungException.class);
    }

    @Test
    void pruefe_laengeGiltNachNormalisierung() {
        when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                .thenReturn(List.of());
        // Roh 25 Zeichen (> 20), aber nach Zusammenfassen der Leerzeichen nur "aaaaa aaaaa aaaaa" = 17.
        String rohZuLang = "aaaaa     aaaaa     aaaaa";

        assertThatCode(() -> teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, rohZuLang, null))
                .doesNotThrowAnyException();
    }

    // ── Eindeutigkeit ───────────────────────────────────────────────────────────

    @Test
    void pruefe_gleicherNameInDerselbenDisziplin_wirftDoppelterTeamname() {
        when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                .thenReturn(List.of(anmeldungMitTeamname(1L, "Die Bullseye Boys")));

        assertThatThrownBy(() -> teamnameValidierungService.normalisiereUndPruefe(
                        Disziplin.HERRENDOPPEL, "Die Bullseye Boys", null))
                .isInstanceOf(DoppelterTeamnameException.class);
    }

    @Test
    void pruefe_gleicherNameCaseInsensitiv_inklUmlaut_wirft() {
        when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                .thenReturn(List.of(anmeldungMitTeamname(1L, "Bär")));

        assertThatThrownBy(() -> teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, "BÄR", null))
                .isInstanceOf(DoppelterTeamnameException.class);
    }

    @Test
    void pruefe_gleicherNameNachNormalisierung_wirft() {
        when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                .thenReturn(List.of(anmeldungMitTeamname(1L, "Team Eins")));

        assertThatThrownBy(() -> teamnameValidierungService.normalisiereUndPruefe(
                        Disziplin.HERRENDOPPEL, "  team   eins ", null))
                .isInstanceOf(DoppelterTeamnameException.class);
    }

    @Test
    void pruefe_gleicherNameAndereDisziplin_istGueltig() {
        // Es wird nur die eigene Disziplin abgefragt – dort kein Treffer.
        when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.DAMENDOPPEL))
                .thenReturn(List.of());

        assertThatCode(() -> teamnameValidierungService.normalisiereUndPruefe(
                        Disziplin.DAMENDOPPEL, "Die Bullseye Boys", null))
                .doesNotThrowAnyException();
    }

    @Test
    void pruefe_ausschlussId_ignoriertEigeneAnmeldung() {
        // Nur die eigene (id=1) trägt den Namen – mit ausschlussId=1 keine Kollision (Reaktivierung).
        when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENDOPPEL))
                .thenReturn(List.of(anmeldungMitTeamname(1L, "Team")));

        assertThatCode(() -> teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENDOPPEL, "Team", 1L))
                .doesNotThrowAnyException();
    }

    @Test
    void pruefe_ohneTeamname_ergibtNullUndFragtNichtAb() {
        assertThat(teamnameValidierungService.normalisiereUndPruefe(Disziplin.HERRENEINZEL, null, null))
                .isNull();
    }
}
