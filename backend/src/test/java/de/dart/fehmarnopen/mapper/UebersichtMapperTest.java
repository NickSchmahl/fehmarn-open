package de.dart.fehmarnopen.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import java.util.List;
import org.junit.jupiter.api.Test;

class UebersichtMapperTest {

    private final UebersichtMapper uebersichtMapper = new UebersichtMapper();

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
    void oeffentlich_zeigtAlleSpielerEinerMeldungGruppiert() {
        Anmeldung doppel = anmeldung(
                Disziplin.HERRENDOPPEL, "Team A", spielerEntity("Anna", "Schmidt"), spielerEntity("Bea", "Adam"));

        TeilnehmerUebersichtResponse result = uebersichtMapper.zuOeffentlicheUebersicht(List.of(doppel));

        assertThat(result.disziplinen()).hasSize(1);
        assertThat(result.disziplinen().get(0).anzahl()).isEqualTo(1); // eine Meldung
        assertThat(result.disziplinen().get(0).meldungen()).hasSize(1);
        TeilnehmerUebersichtResponse.MeldungEintrag meldung =
                result.disziplinen().get(0).meldungen().get(0);
        assertThat(meldung.teamName()).isEqualTo("Team A");
        assertThat(meldung.spieler())
                .extracting(TeilnehmerUebersichtResponse.SpielerEintrag::nachname)
                .containsExactly("Adam", "Schmidt"); // innerhalb der Meldung nach Nachname sortiert
    }

    @Test
    void oeffentlich_zaehltMeldungenNichtSpieler() {
        List<Anmeldung> zweiTeams = List.of(
                anmeldung(
                        Disziplin.HERRENDOPPEL,
                        "Team A",
                        spielerEntity("Anna", "Schmidt"),
                        spielerEntity("Bea", "Adam")),
                anmeldung(
                        Disziplin.HERRENDOPPEL,
                        "Team B",
                        spielerEntity("Cara", "Berg"),
                        spielerEntity("Dora", "Cornelius")));

        TeilnehmerUebersichtResponse result = uebersichtMapper.zuOeffentlicheUebersicht(zweiTeams);

        assertThat(result.disziplinen().get(0).anzahl()).isEqualTo(2); // zwei Meldungen, vier Spieler
    }

    @Test
    void oeffentlich_haeltGleichnamigeTeamsGetrennt() {
        List<Anmeldung> gleichnamig = List.of(
                anmeldung(Disziplin.HERRENDOPPEL, "Falcons", spielerEntity("Anna", "Schmidt")),
                anmeldung(Disziplin.HERRENDOPPEL, "Falcons", spielerEntity("Bea", "Adam")));

        TeilnehmerUebersichtResponse result = uebersichtMapper.zuOeffentlicheUebersicht(gleichnamig);

        assertThat(result.disziplinen().get(0).meldungen()).hasSize(2); // nicht verschmolzen
    }

    @Test
    void oeffentlich_gruppiertInEnumReihenfolgeUndReichtTeamNameDurch() {
        List<Anmeldung> gemischt = List.of(
                anmeldung(Disziplin.HERRENDOPPEL, "Team A", spielerEntity("Anna", "Schmidt")),
                anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Bert", "Adam")));

        TeilnehmerUebersichtResponse result = uebersichtMapper.zuOeffentlicheUebersicht(gemischt);

        assertThat(result.disziplinen())
                .extracting(TeilnehmerUebersichtResponse.DisziplinGruppe::disziplin)
                .containsExactly(Disziplin.HERRENEINZEL, Disziplin.HERRENDOPPEL);
        assertThat(result.disziplinen().get(1).meldungen().get(0).teamName()).isEqualTo("Team A");
    }

    @Test
    void oeffentlich_ohneAnmeldungen_liefertLeereListe() {
        assertThat(uebersichtMapper.zuOeffentlicheUebersicht(List.of()).disziplinen())
                .isEmpty();
    }

    @Test
    void admin_zaehltNurAktiveMeldungenAberZeigtAbgemeldete() {
        Anmeldung aktiv = anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Anna", "Schmidt"));
        Anmeldung abgemeldet = anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Bert", "Adam"));
        abgemeldet.setAbgemeldet(true);

        AdminUebersichtResponse result = uebersichtMapper.zuAdminUebersicht(List.of(aktiv, abgemeldet));

        AdminUebersichtResponse.DisziplinGruppe gruppe = result.disziplinen().get(0);
        assertThat(gruppe.meldungen()).hasSize(2); // beide sichtbar
        assertThat(gruppe.anzahl()).isEqualTo(1); // nur aktive Meldungen gezaehlt
    }

    @Test
    void admin_liefertVolleFelderJeMeldung() {
        Spieler ersterSpieler = spielerEntity("Anna", "Schmidt");
        ersterSpieler.setRadikalId("AS-1");
        Anmeldung anmeldung = anmeldung(Disziplin.HERRENDOPPEL, "Team A", ersterSpieler, spielerEntity("Bea", "Adam"));
        anmeldung.setId(5L);
        anmeldung.setAnwesend(true);

        AdminUebersichtResponse.MeldungEintrag meldung = uebersichtMapper
                .zuAdminUebersicht(List.of(anmeldung))
                .disziplinen()
                .get(0)
                .meldungen()
                .get(0);

        assertThat(meldung.id()).isEqualTo(5L);
        assertThat(meldung.teamName()).isEqualTo("Team A");
        assertThat(meldung.anwesend()).isTrue();
        assertThat(meldung.abgemeldet()).isFalse();
        assertThat(meldung.spieler()).hasSize(2);
        assertThat(meldung.spieler().get(0).nachname()).isEqualTo("Adam"); // nach Nachname sortiert
        assertThat(meldung.spieler().get(1).radikalId()).isEqualTo("AS-1");
    }
}
