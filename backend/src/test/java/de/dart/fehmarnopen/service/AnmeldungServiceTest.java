package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.DisziplinAnmeldung;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.AnmeldungGesperrtException;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.exception.DoppelterTeamnameException;
import de.dart.fehmarnopen.exception.NichtGefundenException;
import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import de.dart.fehmarnopen.mapper.UebersichtMapper;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
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

    // Blackbox: die Validierungsregeln selbst sind in SpielerValidierungServiceTest abgedeckt.
    @Mock
    private SpielerValidierungService spielerValidierungService;

    // Blackbox: die Teamname-Regeln selbst sind in TeamnameValidierungServiceTest abgedeckt.
    @Mock
    private TeamnameValidierungService teamnameValidierungService;

    // Blackbox: die Namensregeln selbst sind in SpielernameValidierungServiceTest abgedeckt.
    @Mock
    private SpielernameValidierungService spielernameValidierungService;

    // Blackbox: die Gruppier-/Sortierlogik ist in UebersichtMapperTest abgedeckt.
    @Mock
    private UebersichtMapper uebersichtMapper;

    // Blackbox: die Stichtags-Logik selbst ist in AnmeldeschlussServiceTest abgedeckt.
    @Mock
    private AnmeldeschlussService anmeldeschlussService;

    @InjectMocks
    private AnmeldungService anmeldungService;

    @BeforeEach
    void spielernamenDurchreichen() {
        // Der Namensservice reicht im Normalfall den (normalisierten) Namen durch; lenient, weil
        // nicht jeder Test eine Anmeldung anlegt.
        lenient()
                .when(spielernameValidierungService.normalisiereUndPruefe(any(), any()))
                .thenAnswer(inv -> inv.getArgument(0));
    }

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
    void anmelden_mitTeamDisziplin_setztNormalisiertenTeamNameUndAlleSpieler() {
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // Der Validierungsservice liefert den normalisierten Namen zurück, der gespeichert wird.
        when(teamnameValidierungService.normalisiereUndPruefe(
                        eq(Disziplin.HERRENDOPPEL), eq(" Die  Bullseye Boys "), isNull()))
                .thenReturn("Die Bullseye Boys");
        AnmeldungRequest request = new AnmeldungRequest(List.of(new DisziplinAnmeldung(
                Disziplin.HERRENDOPPEL, " Die  Bullseye Boys ", List.of(spieler("Max", "M"), spieler("Tim", "T")))));

        List<Anmeldung> result = anmeldungService.anmelden(request);

        assertThat(result.get(0).getTeamName()).isEqualTo("Die Bullseye Boys");
        assertThat(result.get(0).getSpieler()).hasSize(2);
    }

    @Test
    void anmelden_beiTeamnameDublette_speichertNichts() {
        when(teamnameValidierungService.normalisiereUndPruefe(eq(Disziplin.HERRENDOPPEL), any(), isNull()))
                .thenThrow(new DoppelterTeamnameException(Disziplin.HERRENDOPPEL, "Team"));
        AnmeldungRequest request = new AnmeldungRequest(List.of(new DisziplinAnmeldung(
                Disziplin.HERRENDOPPEL, "Team", List.of(spieler("Max", "M"), spieler("Tim", "T")))));

        assertThatThrownBy(() -> anmeldungService.anmelden(request)).isInstanceOf(DoppelterTeamnameException.class);

        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void reaktivieren_beiTeamnameKonflikt_wirftUndSpeichertNicht() {
        Anmeldung anmeldung = anmeldung(Disziplin.HERRENDOPPEL, "Team", spielerEntity("Max", "M"));
        anmeldung.setAbgemeldet(true);
        when(anmeldungRepository.findById(7L)).thenReturn(Optional.of(anmeldung));
        when(teamnameValidierungService.normalisiereUndPruefe(eq(Disziplin.HERRENDOPPEL), eq("Team"), eq(7L)))
                .thenThrow(new DoppelterTeamnameException(Disziplin.HERRENDOPPEL, "Team"));

        assertThatThrownBy(() -> anmeldungService.reaktivieren(7L)).isInstanceOf(DoppelterTeamnameException.class);

        assertThat(anmeldung.isAbgemeldet()).isTrue();
        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void anmelden_beiUngueltigemSpielernamen_speichertNichts() {
        when(spielernameValidierungService.normalisiereUndPruefe(eq("Anna1"), any()))
                .thenThrow(new UngueltigeAnmeldungException(
                        "Vorname darf nur Buchstaben, Leerzeichen und Bindestrich enthalten"));
        AnmeldungRequest request = new AnmeldungRequest(
                List.of(new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Anna1", "Schmidt")))));

        assertThatThrownBy(() -> anmeldungService.anmelden(request)).isInstanceOf(UngueltigeAnmeldungException.class);

        verify(anmeldungRepository, never()).save(any());
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
    void oeffentlicheUebersicht_reichtAktiveAnmeldungenAnMapperDurch() {
        List<Anmeldung> aktive = List.of(anmeldung(Disziplin.HERRENDOPPEL, "Team A", spielerEntity("Anna", "Schmidt")));
        TeilnehmerUebersichtResponse erwartet = new TeilnehmerUebersichtResponse(List.of());
        when(anmeldungRepository.findByAbgemeldetFalse()).thenReturn(aktive);
        when(uebersichtMapper.zuOeffentlicheUebersicht(aktive)).thenReturn(erwartet);

        TeilnehmerUebersichtResponse result = anmeldungService.oeffentlicheUebersicht();

        assertThat(result).isSameAs(erwartet);
        verify(uebersichtMapper).zuOeffentlicheUebersicht(aktive);
    }

    @Test
    void adminUebersicht_reichtAlleAnmeldungenAnMapperDurch() {
        List<Anmeldung> alle = List.of(anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Anna", "Schmidt")));
        AdminUebersichtResponse erwartet = new AdminUebersichtResponse(List.of());
        when(anmeldungRepository.findAllBy()).thenReturn(alle);
        when(uebersichtMapper.zuAdminUebersicht(alle)).thenReturn(erwartet);

        AdminUebersichtResponse result = anmeldungService.adminUebersicht();

        assertThat(result).isSameAs(erwartet);
        verify(uebersichtMapper).zuAdminUebersicht(alle);
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

    @Test
    void anmelden_wennAnmeldungGesperrt_wirftUndSpeichertNichts() {
        doThrow(new AnmeldungGesperrtException("28.02.2027"))
                .when(anmeldeschlussService)
                .pruefeAnmeldungOffen();
        AnmeldungRequest request = new AnmeldungRequest(
                List.of(new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M")))));

        assertThatThrownBy(() -> anmeldungService.anmelden(request)).isInstanceOf(AnmeldungGesperrtException.class);

        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void anmelden_wennAnmeldungOffen_speichertNormal() {
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        AnmeldungRequest request = new AnmeldungRequest(
                List.of(new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M")))));

        List<Anmeldung> result = anmeldungService.anmelden(request);

        assertThat(result).hasSize(1);
        verify(anmeldeschlussService).pruefeAnmeldungOffen();
    }
}
