package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.DisziplinAnmeldung;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.TeamlimitErreichtException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TeamlimitServiceTest {

    @Mock
    private AnmeldungRepository anmeldungRepository;

    @InjectMocks
    private TeamlimitService teamlimitService;

    private void aktiveTeams(long anzahl) {
        when(anmeldungRepository.countByDisziplinAndAbgemeldetFalse(Disziplin.TEAMWETTBEWERB))
                .thenReturn(anzahl);
    }

    private static DisziplinAnmeldung meldung(Disziplin disziplin) {
        List<SpielerRequest> spieler = List.of(new SpielerRequest("Max", "Mustermann", "MM01011990", null, null));
        return new DisziplinAnmeldung(disziplin, disziplin == Disziplin.TEAMWETTBEWERB ? "Team" : null, spieler);
    }

    private static AnmeldungRequest requestMitTeams(int teams) {
        return new AnmeldungRequest(Collections.nCopies(teams, meldung(Disziplin.TEAMWETTBEWERB)));
    }

    @Test
    void maxTeamsIst96() {
        assertThat(teamlimitService.maxTeams()).isEqualTo(96);
    }

    @Nested
    class IstAusgebuchtTest {

        @Test
        void unterDemLimitNichtAusgebucht() {
            aktiveTeams(95);
            assertThat(teamlimitService.istAusgebucht()).isFalse();
        }

        @Test
        void amLimitAusgebucht() {
            aktiveTeams(96);
            assertThat(teamlimitService.istAusgebucht()).isTrue();
        }

        @Test
        void ueberDemLimitAusgebucht() {
            // Der Admin darf per Reaktivierung überziehen – dann ist ebenfalls ausgebucht.
            aktiveTeams(97);
            assertThat(teamlimitService.istAusgebucht()).isTrue();
        }
    }

    @Nested
    class PruefePlatzFuerTest {

        @Test
        void requestOhneTeamwettbewerbWirdNichtGeprueft() {
            AnmeldungRequest request = new AnmeldungRequest(List.of(meldung(Disziplin.HERRENEINZEL)));

            assertThatCode(() -> teamlimitService.pruefePlatzFuer(request)).doesNotThrowAnyException();
            verifyNoInteractions(anmeldungRepository);
        }

        @Test
        void letzterFreierPlatzWirdVergeben() {
            aktiveTeams(95);

            assertThatCode(() -> teamlimitService.pruefePlatzFuer(requestMitTeams(1)))
                    .doesNotThrowAnyException();
        }

        @Test
        void amLimitWirdAbgelehnt() {
            aktiveTeams(96);

            assertThatThrownBy(() -> teamlimitService.pruefePlatzFuer(requestMitTeams(1)))
                    .isInstanceOf(TeamlimitErreichtException.class)
                    .hasMessageContaining("96");
        }

        @Test
        void zweiTeamsBeiEinemFreienPlatzWerdenKomplettAbgelehnt() {
            // Keine Teil-Anmeldung: entweder alle Teams des Requests passen rein oder keines.
            aktiveTeams(95);

            assertThatThrownBy(() -> teamlimitService.pruefePlatzFuer(requestMitTeams(2)))
                    .isInstanceOf(TeamlimitErreichtException.class);
        }

        @Test
        void zweiTeamsBeiZweiFreienPlaetzenPassen() {
            aktiveTeams(94);

            assertThatCode(() -> teamlimitService.pruefePlatzFuer(requestMitTeams(2)))
                    .doesNotThrowAnyException();
        }
    }
}
