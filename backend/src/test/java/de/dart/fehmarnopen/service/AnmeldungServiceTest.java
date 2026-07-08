package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.DisziplinAnmeldung;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.exception.NichtGefundenException;
import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnmeldungServiceTest {

    @Mock
    private AnmeldungRepository anmeldungRepository;

    // Blackbox: die Validierungsregeln selbst sind in SpielerValidierungServiceTest abgedeckt.
    @Mock
    private SpielerValidierungService spielerValidierungService;

    @InjectMocks
    private AnmeldungService anmeldungService;

    private SpielerRequest spieler(String vorname, String nachname) {
        return new SpielerRequest(vorname, nachname, "RAD-1", null, null);
    }

    private Spieler spielerEntity(String vorname, String nachname) {
        Spieler spieler = new Spieler();
        spieler.setVorname(vorname);
        spieler.setNachname(nachname);
        spieler.setRadikalId("RAD-1");
        return spieler;
    }

    private Anmeldung anmeldung(Disziplin disziplin, String teamName, Spieler... spieler) {
        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setDisziplin(disziplin);
        anmeldung.setTeamName(teamName);
        anmeldung.setSpieler(List.of(spieler));
        return anmeldung;
    }

    @Test
    void anmelden_mitGueltigerEinzelmeldung_validiertUndSpeichertSpieler() {
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        AnmeldungRequest request = new AnmeldungRequest(
                List.of(new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "Mustermann")))));

        List<Anmeldung> result = anmeldungService.anmelden(request);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSpieler().get(0).getNachname()).isEqualTo("Mustermann");
        verify(spielerValidierungService).validiere(eq(Disziplin.HERRENEINZEL), anyList());
        verify(anmeldungRepository).save(any(Anmeldung.class));
    }

    @Test
    void anmelden_mitTeamDisziplin_setztTeamNameUndAlleSpieler() {
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        AnmeldungRequest request = new AnmeldungRequest(List.of(new DisziplinAnmeldung(
                Disziplin.HERRENDOPPEL, "Die Bullseye Boys", List.of(spieler("Max", "M"), spieler("Tim", "T")))));

        List<Anmeldung> result = anmeldungService.anmelden(request);

        assertThat(result.get(0).getTeamName()).isEqualTo("Die Bullseye Boys");
        assertThat(result.get(0).getSpieler()).hasSize(2);
    }

    @Test
    void anmelden_mehrereDisziplinen_speichertAlle() {
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        AnmeldungRequest request = new AnmeldungRequest(List.of(
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M"))),
                new DisziplinAnmeldung(
                        Disziplin.HERRENDOPPEL, "Team", List.of(spieler("Max", "M"), spieler("Tim", "T")))));

        List<Anmeldung> result = anmeldungService.anmelden(request);

        assertThat(result).hasSize(2);
        verify(anmeldungRepository, times(2)).save(any(Anmeldung.class));
    }

    @Test
    void anmelden_beiDoppelterDisziplinImRequest_wirftDoppelteAnmeldung() {
        AnmeldungRequest request = new AnmeldungRequest(List.of(
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M"))),
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Tim", "T")))));

        assertThatThrownBy(() -> anmeldungService.anmelden(request))
                .isInstanceOf(DoppelteAnmeldungException.class)
                .hasMessageContaining("HERRENEINZEL");

        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void anmelden_wennValidierungWirft_speichertNichts() {
        doThrow(new UngueltigeAnmeldungException("zu viele Spieler"))
                .when(spielerValidierungService)
                .validiere(eq(Disziplin.HERRENEINZEL), anyList());
        AnmeldungRequest request = new AnmeldungRequest(List.of(new DisziplinAnmeldung(
                Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M"), spieler("Tim", "T")))));

        assertThatThrownBy(() -> anmeldungService.anmelden(request)).isInstanceOf(UngueltigeAnmeldungException.class);

        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void oeffentlicheUebersicht_zeigtAlleSpielerJeMeldung() {
        Anmeldung doppel = anmeldung(
                Disziplin.HERRENDOPPEL, "Team A", spielerEntity("Anna", "Schmidt"), spielerEntity("Bea", "Adam"));
        when(anmeldungRepository.findByAbgemeldetFalse()).thenReturn(List.of(doppel));

        TeilnehmerUebersichtResponse result = anmeldungService.oeffentlicheUebersicht();

        assertThat(result.disziplinen()).hasSize(1);
        assertThat(result.disziplinen().get(0).anzahl()).isEqualTo(2);
        assertThat(result.disziplinen().get(0).teilnehmer())
                .extracting(TeilnehmerUebersichtResponse.TeilnehmerEintrag::nachname)
                .containsExactly("Adam", "Schmidt"); // nach Nachname sortiert
    }

    @Test
    void oeffentlicheUebersicht_gruppiertInEnumReihenfolgeUndReichtTeamNameDurch() {
        when(anmeldungRepository.findByAbgemeldetFalse())
                .thenReturn(List.of(
                        anmeldung(Disziplin.HERRENDOPPEL, "Team A", spielerEntity("Anna", "Schmidt")),
                        anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Bert", "Adam"))));

        TeilnehmerUebersichtResponse result = anmeldungService.oeffentlicheUebersicht();

        assertThat(result.disziplinen())
                .extracting(TeilnehmerUebersichtResponse.DisziplinGruppe::disziplin)
                .containsExactly(Disziplin.HERRENEINZEL, Disziplin.HERRENDOPPEL);
        assertThat(result.disziplinen().get(1).teilnehmer().get(0).teamName()).isEqualTo("Team A");
    }

    @Test
    void oeffentlicheUebersicht_ohneAnmeldungen_sollLeereListeZurueckgeben() {
        when(anmeldungRepository.findByAbgemeldetFalse()).thenReturn(List.of());

        assertThat(anmeldungService.oeffentlicheUebersicht().disziplinen()).isEmpty();
    }

    @Test
    void adminUebersicht_zaehltNurAktiveSpielerAberZeigtAbgemeldete() {
        Anmeldung aktiv = anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Anna", "Schmidt"));
        Anmeldung abgemeldet = anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Bert", "Adam"));
        abgemeldet.setAbgemeldet(true);
        when(anmeldungRepository.findAllBy()).thenReturn(List.of(aktiv, abgemeldet));

        AdminUebersichtResponse result = anmeldungService.adminUebersicht();

        AdminUebersichtResponse.DisziplinGruppe gruppe = result.disziplinen().get(0);
        assertThat(gruppe.teilnehmer()).hasSize(2); // beide sichtbar
        assertThat(gruppe.anzahl()).isEqualTo(1); // nur aktive Spieler gezaehlt
    }

    @Test
    void adminUebersicht_liefertVolleFelderJeSpieler() {
        Spieler spieler = spielerEntity("Anna", "Schmidt");
        spieler.setRadikalId("AS-1");
        Anmeldung anmeldung = anmeldung(Disziplin.HERRENDOPPEL, "Team A", spieler);
        anmeldung.setId(5L);
        anmeldung.setAnwesend(true);
        when(anmeldungRepository.findAllBy()).thenReturn(List.of(anmeldung));

        AdminUebersichtResponse.AdminEintrag eintrag = anmeldungService
                .adminUebersicht()
                .disziplinen()
                .get(0)
                .teilnehmer()
                .get(0);

        assertThat(eintrag.id()).isEqualTo(5L);
        assertThat(eintrag.radikalId()).isEqualTo("AS-1");
        assertThat(eintrag.teamName()).isEqualTo("Team A");
        assertThat(eintrag.anwesend()).isTrue();
        assertThat(eintrag.abgemeldet()).isFalse();
    }

    @Test
    void abmelden_sollAbgemeldetSetzen() {
        Anmeldung anmeldung = anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Max", "M"));
        when(anmeldungRepository.findById(7L)).thenReturn(Optional.of(anmeldung));
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        anmeldungService.abmelden(7L);

        assertThat(anmeldung.isAbgemeldet()).isTrue();
        assertThat(anmeldung.getAbgemeldetAm()).isNotNull();
    }

    @Test
    void abmelden_unbekannteId_sollWerfen() {
        when(anmeldungRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> anmeldungService.abmelden(99L)).isInstanceOf(NichtGefundenException.class);
        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void reaktivieren_sollAbmeldungZuruecknehmen() {
        Anmeldung anmeldung = anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Max", "M"));
        anmeldung.setAbgemeldet(true);
        anmeldung.setAbgemeldetAm(LocalDateTime.now());
        when(anmeldungRepository.findById(7L)).thenReturn(Optional.of(anmeldung));
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        anmeldungService.reaktivieren(7L);

        assertThat(anmeldung.isAbgemeldet()).isFalse();
        assertThat(anmeldung.getAbgemeldetAm()).isNull();
    }

    @Test
    void setAnwesenheit_sollAnwesendSetzen() {
        Anmeldung anmeldung = anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Max", "M"));
        when(anmeldungRepository.findById(7L)).thenReturn(Optional.of(anmeldung));
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        anmeldungService.setAnwesenheit(7L, true);

        assertThat(anmeldung.isAnwesend()).isTrue();
    }

    @Test
    void setAnwesenheit_unbekannteId_sollWerfen() {
        when(anmeldungRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> anmeldungService.setAnwesenheit(99L, true)).isInstanceOf(NichtGefundenException.class);
        verify(anmeldungRepository, never()).save(any());
    }
}
