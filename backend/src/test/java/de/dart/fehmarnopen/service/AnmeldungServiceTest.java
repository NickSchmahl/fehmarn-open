package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Teilnehmer;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnmeldungServiceTest {

    @Mock
    private AnmeldungRepository anmeldungRepository;

    @InjectMocks
    private AnmeldungService anmeldungService;

    private Teilnehmer teilnehmer;

    @BeforeEach
    void setUp() {
        teilnehmer = new Teilnehmer();
        teilnehmer.setVorname("Max");
        teilnehmer.setNachname("Mustermann");
        teilnehmer.setEmail("max@example.com");
    }

    @Test
    void anmelden_sollAnmeldungSpeichern() {
        when(anmeldungRepository.existsByTeilnehmerAndDisziplin(teilnehmer, Disziplin.HERRENEINZEL))
                .thenReturn(false);
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Anmeldung result = anmeldungService.anmelden(teilnehmer, Disziplin.HERRENEINZEL, null);

        assertThat(result.getTeilnehmer()).isEqualTo(teilnehmer);
        assertThat(result.getDisziplin()).isEqualTo(Disziplin.HERRENEINZEL);
        verify(anmeldungRepository).save(any(Anmeldung.class));
    }

    @Test
    void anmelden_mitTeamName_sollTeamNameSetzen() {
        when(anmeldungRepository.existsByTeilnehmerAndDisziplin(teilnehmer, Disziplin.TEAMWETTBEWERB))
                .thenReturn(false);
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Anmeldung result = anmeldungService.anmelden(teilnehmer, Disziplin.TEAMWETTBEWERB, "Team Fehmarn");

        assertThat(result.getTeamName()).isEqualTo("Team Fehmarn");
    }

    @Test
    void anmelden_beiDoppelterAnmeldung_sollExceptionWerfen() {
        when(anmeldungRepository.existsByTeilnehmerAndDisziplin(teilnehmer, Disziplin.HERRENEINZEL))
                .thenReturn(true);

        assertThatThrownBy(() -> anmeldungService.anmelden(teilnehmer, Disziplin.HERRENEINZEL, null))
                .isInstanceOf(DoppelteAnmeldungException.class)
                .hasMessageContaining("HERRENEINZEL");

        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void findeAnmeldungenFuerTeilnehmer_sollRepositoryDelegieren() {
        Anmeldung a1 = new Anmeldung();
        Anmeldung a2 = new Anmeldung();
        when(anmeldungRepository.findByTeilnehmer(teilnehmer)).thenReturn(List.of(a1, a2));

        List<Anmeldung> result = anmeldungService.findeAnmeldungenFuerTeilnehmer(teilnehmer);

        assertThat(result).hasSize(2);
    }

    @Test
    void findeByAbmeldetoken_sollAnmeldungZurueckgeben() {
        Anmeldung anmeldung = new Anmeldung();
        when(anmeldungRepository.findByAbmeldetoken("token-123")).thenReturn(Optional.of(anmeldung));

        Optional<Anmeldung> result = anmeldungService.findeByAbmeldetoken("token-123");

        assertThat(result).isPresent();
    }

    @Test
    void findeByAbmeldetoken_unbekannterToken_sollLeerSein() {
        when(anmeldungRepository.findByAbmeldetoken("unbekannt")).thenReturn(Optional.empty());

        Optional<Anmeldung> result = anmeldungService.findeByAbmeldetoken("unbekannt");

        assertThat(result).isEmpty();
    }

    @Test
    void abmelden_sollAbgemeldetAufTrueSetzen() {
        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setAbgemeldet(false);
        when(anmeldungRepository.findByAbmeldetoken("token-abc")).thenReturn(Optional.of(anmeldung));
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        anmeldungService.abmelden("token-abc");

        assertThat(anmeldung.isAbgemeldet()).isTrue();
        assertThat(anmeldung.getAbgemeldetAm()).isNotNull();
        verify(anmeldungRepository).save(anmeldung);
    }

    @Test
    void abmelden_mitUnbekanntemToken_sollNichtsSpeichern() {
        when(anmeldungRepository.findByAbmeldetoken("unbekannt")).thenReturn(Optional.empty());

        anmeldungService.abmelden("unbekannt");

        verify(anmeldungRepository, never()).save(any());
    }
}
