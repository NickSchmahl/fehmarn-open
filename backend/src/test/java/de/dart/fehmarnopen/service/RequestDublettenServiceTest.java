package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.DisziplinAnmeldung;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.DoppelteRadikalIdException;
import de.dart.fehmarnopen.exception.DoppelterTeamnameException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Dubletten innerhalb eines Requests (#152, #170) – Prüfungen gegen die DB liegen woanders. */
@ExtendWith(MockitoExtension.class)
class RequestDublettenServiceTest {

    // Blackbox: die Normalisierungsregeln selbst sind in TeamnameValidierungServiceTest abgedeckt.
    @Mock
    private TeamnameValidierungService teamnameValidierungService;

    @InjectMocks
    private RequestDublettenService requestDublettenService;

    @BeforeEach
    void teamnamenDurchreichen() {
        lenient()
                .when(teamnameValidierungService.normalisiere(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private static SpielerRequest spieler(String vorname, String radikalId) {
        return new SpielerRequest(vorname, "Mustermann", radikalId, null, null);
    }

    private static DisziplinAnmeldung doppel(String teamName, String... radikalIds) {
        List<SpielerRequest> spieler =
                List.of(radikalIds).stream().map(id -> spieler("S" + id, id)).toList();
        return new DisziplinAnmeldung(Disziplin.HERRENDOPPEL, teamName, spieler);
    }

    @Test
    void zweiTeamsMitGleichemNamenInDerselbenDisziplin_wirft() {
        AnmeldungRequest request =
                new AnmeldungRequest(List.of(doppel("Die Bären", "R1", "R2"), doppel("die bären", "R3", "R4")));

        assertThatThrownBy(() -> requestDublettenService.pruefe(request))
                .isInstanceOf(DoppelterTeamnameException.class);
    }

    @Test
    void gleicherTeamnameInVerschiedenenDisziplinen_istErlaubt() {
        AnmeldungRequest request = new AnmeldungRequest(List.of(
                doppel("Die Bären", "R1", "R2"),
                new DisziplinAnmeldung(
                        Disziplin.DAMENDOPPEL, "Die Bären", List.of(spieler("A", "R3"), spieler("B", "R4")))));

        assertThatCode(() -> requestDublettenService.pruefe(request)).doesNotThrowAnyException();
    }

    @Test
    void meldungenOhneTeamname_werdenIgnoriert() {
        AnmeldungRequest request = new AnmeldungRequest(List.of(
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("A", "R1"))),
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("B", "R2")))));

        assertThatCode(() -> requestDublettenService.pruefe(request)).doesNotThrowAnyException();
    }

    @Test
    void gleicheRadikalIdZweimalInDerselbenTeamDisziplin_wirft() {
        AnmeldungRequest request = new AnmeldungRequest(List.of(doppel("Team", "R1", "R1")));

        assertThatThrownBy(() -> requestDublettenService.pruefe(request))
                .isInstanceOf(DoppelteRadikalIdException.class);
    }

    @Test
    void gleicheRadikalIdInEinzelDisziplin_wirftHierNicht() {
        // Einzel-Dubletten prüft der DoppelteSpielerService gegen den Datenbestand (#170).
        AnmeldungRequest request = new AnmeldungRequest(List.of(
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("A", "R1"))),
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("A", "R1")))));

        assertThatCode(() -> requestDublettenService.pruefe(request)).doesNotThrowAnyException();
    }

    @Test
    void spielerOhneRadikalId_werdenUebersprungen() {
        AnmeldungRequest request = new AnmeldungRequest(List.of(new DisziplinAnmeldung(
                Disziplin.HERRENDOPPEL, "Team", List.of(spieler("A", null), spieler("B", "  ")))));

        assertThatCode(() -> requestDublettenService.pruefe(request)).doesNotThrowAnyException();
    }
}
