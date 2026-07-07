package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Teilnehmer;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.exception.NichtGefundenException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import de.dart.fehmarnopen.repository.TeilnehmerRepository;
import java.time.LocalDateTime;
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

    @Mock
    private TeilnehmerRepository teilnehmerRepository;

    @InjectMocks
    private AnmeldungService anmeldungService;

    private Teilnehmer teilnehmer;

    @BeforeEach
    void setUp() {
        teilnehmer = new Teilnehmer();
        teilnehmer.setVorname("Max");
        teilnehmer.setNachname("Mustermann");
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

    private Teilnehmer teilnehmer(String vorname, String nachname) {
        Teilnehmer t = new Teilnehmer();
        t.setVorname(vorname);
        t.setNachname(nachname);
        return t;
    }

    private Anmeldung anmeldung(Teilnehmer t, Disziplin disziplin, String teamName) {
        Anmeldung a = new Anmeldung();
        a.setTeilnehmer(t);
        a.setDisziplin(disziplin);
        a.setTeamName(teamName);
        return a;
    }

    @Test
    void oeffentlicheUebersicht_sollNachDisziplinInEnumReihenfolgeGruppieren() {
        when(anmeldungRepository.findByAbgemeldetFalse())
                .thenReturn(List.of(
                        anmeldung(teilnehmer("Anna", "Schmidt"), Disziplin.HERRENDOPPEL, "Team A"),
                        anmeldung(teilnehmer("Bert", "Adam"), Disziplin.HERRENEINZEL, null)));

        TeilnehmerUebersichtResponse result = anmeldungService.oeffentlicheUebersicht();

        assertThat(result.disziplinen())
                .extracting(TeilnehmerUebersichtResponse.DisziplinGruppe::disziplin)
                .containsExactly(Disziplin.HERRENEINZEL, Disziplin.HERRENDOPPEL);
    }

    @Test
    void oeffentlicheUebersicht_sollAnzahlProDisziplinSetzen() {
        when(anmeldungRepository.findByAbgemeldetFalse())
                .thenReturn(List.of(
                        anmeldung(teilnehmer("Anna", "Schmidt"), Disziplin.HERRENEINZEL, null),
                        anmeldung(teilnehmer("Bert", "Adam"), Disziplin.HERRENEINZEL, null)));

        TeilnehmerUebersichtResponse result = anmeldungService.oeffentlicheUebersicht();

        assertThat(result.disziplinen()).hasSize(1);
        assertThat(result.disziplinen().get(0).anzahl()).isEqualTo(2);
        assertThat(result.disziplinen().get(0).teilnehmer()).hasSize(2);
    }

    @Test
    void oeffentlicheUebersicht_sollTeilnehmerNachNachnameSortieren() {
        when(anmeldungRepository.findByAbgemeldetFalse())
                .thenReturn(List.of(
                        anmeldung(teilnehmer("Anna", "Schmidt"), Disziplin.HERRENEINZEL, null),
                        anmeldung(teilnehmer("Bert", "Adam"), Disziplin.HERRENEINZEL, null)));

        TeilnehmerUebersichtResponse result = anmeldungService.oeffentlicheUebersicht();

        assertThat(result.disziplinen().get(0).teilnehmer())
                .extracting(TeilnehmerUebersichtResponse.TeilnehmerEintrag::nachname)
                .containsExactly("Adam", "Schmidt");
    }

    @Test
    void oeffentlicheUebersicht_sollTeamNameDurchreichen() {
        when(anmeldungRepository.findByAbgemeldetFalse())
                .thenReturn(
                        List.of(anmeldung(teilnehmer("Anna", "Schmidt"), Disziplin.HERRENDOPPEL, "Die Bullseye Boys")));

        TeilnehmerUebersichtResponse result = anmeldungService.oeffentlicheUebersicht();

        assertThat(result.disziplinen().get(0).teilnehmer().get(0).teamName()).isEqualTo("Die Bullseye Boys");
    }

    @Test
    void oeffentlicheUebersicht_ohneAnmeldungen_sollLeereListeZurueckgeben() {
        when(anmeldungRepository.findByAbgemeldetFalse()).thenReturn(List.of());

        TeilnehmerUebersichtResponse result = anmeldungService.oeffentlicheUebersicht();

        assertThat(result.disziplinen()).isEmpty();
    }

    @Test
    void adminUebersicht_sollAbgemeldeteEnthaltenAberNurAktiveZaehlen() {
        Anmeldung aktiv = anmeldung(teilnehmer("Anna", "Schmidt"), Disziplin.HERRENEINZEL, null);
        Anmeldung abgemeldet = anmeldung(teilnehmer("Bert", "Adam"), Disziplin.HERRENEINZEL, null);
        abgemeldet.setAbgemeldet(true);
        when(anmeldungRepository.findAllBy()).thenReturn(List.of(aktiv, abgemeldet));

        AdminUebersichtResponse result = anmeldungService.adminUebersicht();

        assertThat(result.disziplinen()).hasSize(1);
        AdminUebersichtResponse.DisziplinGruppe gruppe = result.disziplinen().get(0);
        assertThat(gruppe.teilnehmer()).hasSize(2); // beide sichtbar
        assertThat(gruppe.anzahl()).isEqualTo(1); // nur aktive gezaehlt
    }

    @Test
    void adminUebersicht_sollVolleFelderLiefern() {
        Teilnehmer t = teilnehmer("Anna", "Schmidt");
        t.setRadicalId("AS-1");
        Anmeldung a = anmeldung(t, Disziplin.HERRENDOPPEL, "Team A");
        a.setId(5L);
        a.setAnwesend(true);
        when(anmeldungRepository.findAllBy()).thenReturn(List.of(a));

        AdminUebersichtResponse.AdminEintrag eintrag = anmeldungService
                .adminUebersicht()
                .disziplinen()
                .get(0)
                .teilnehmer()
                .get(0);

        assertThat(eintrag.id()).isEqualTo(5L);
        assertThat(eintrag.radicalId()).isEqualTo("AS-1");
        assertThat(eintrag.teamName()).isEqualTo("Team A");
        assertThat(eintrag.anwesend()).isTrue();
        assertThat(eintrag.abgemeldet()).isFalse();
    }

    @Test
    void abmeldenPerId_sollAbgemeldetSetzen() {
        Anmeldung a = anmeldung(teilnehmer("Max", "Mustermann"), Disziplin.HERRENEINZEL, null);
        a.setAbgemeldet(false);
        when(anmeldungRepository.findById(7L)).thenReturn(Optional.of(a));
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        anmeldungService.abmelden(7L);

        assertThat(a.isAbgemeldet()).isTrue();
        assertThat(a.getAbgemeldetAm()).isNotNull();
    }

    @Test
    void abmeldenPerId_unbekannteId_sollWerfen() {
        when(anmeldungRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> anmeldungService.abmelden(99L)).isInstanceOf(NichtGefundenException.class);
        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void reaktivieren_sollAbmeldungZuruecknehmen() {
        Anmeldung a = new Anmeldung();
        a.setAbgemeldet(true);
        a.setAbgemeldetAm(LocalDateTime.now());
        when(anmeldungRepository.findById(7L)).thenReturn(Optional.of(a));
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        anmeldungService.reaktivieren(7L);

        assertThat(a.isAbgemeldet()).isFalse();
        assertThat(a.getAbgemeldetAm()).isNull();
    }

    @Test
    void setAnwesenheit_sollAnwesendSetzen() {
        Anmeldung a = new Anmeldung();
        when(anmeldungRepository.findById(7L)).thenReturn(Optional.of(a));
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        anmeldungService.setAnwesenheit(7L, true);

        assertThat(a.isAnwesend()).isTrue();
    }

    @Test
    void setAnwesenheit_unbekannteId_sollWerfen() {
        when(anmeldungRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> anmeldungService.setAnwesenheit(99L, true)).isInstanceOf(NichtGefundenException.class);
        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void anmeldenMitTeilnehmer_sollTeilnehmerUndAnmeldungenAnlegen() {
        when(teilnehmerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(anmeldungRepository.existsByTeilnehmerAndDisziplin(any(), any())).thenReturn(false);
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AnmeldungRequest request = new AnmeldungRequest(
                "Anna",
                "Schmidt",
                "AS-1",
                List.of(new AnmeldungRequest.DisziplinAnmeldung(Disziplin.HERRENDOPPEL, "Team A")));

        List<Anmeldung> result = anmeldungService.anmeldenMitTeilnehmer(request);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDisziplin()).isEqualTo(Disziplin.HERRENDOPPEL);
        assertThat(result.get(0).getTeamName()).isEqualTo("Team A");
        verify(teilnehmerRepository).save(any(Teilnehmer.class));
    }
}
