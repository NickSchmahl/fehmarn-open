package de.dart.fehmarnopen.repository;

import static org.assertj.core.api.Assertions.assertThat;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AnmeldungRepositoryTest {

    @Autowired
    private AnmeldungRepository anmeldungRepository;

    private Spieler spieler(String vorname, String nachname) {
        Spieler s = new Spieler();
        s.setVorname(vorname);
        s.setNachname(nachname);
        s.setRadicalId(vorname.charAt(0) + "" + nachname.charAt(0) + "-1");
        return s;
    }

    private Anmeldung anmeldung(Disziplin disziplin, boolean abgemeldet, Spieler... spieler) {
        Anmeldung a = new Anmeldung();
        a.setDisziplin(disziplin);
        a.setAbgemeldet(abgemeldet);
        a.setSpieler(List.of(spieler));
        return a;
    }

    @Test
    void save_persistiertSpielerUndSetztAngemeldetAm() {
        Anmeldung anmeldung =
                anmeldung(Disziplin.HERRENDOPPEL, false, spieler("Max", "Mustermann"), spieler("Tim", "Test"));

        Anmeldung gespeichert = anmeldungRepository.saveAndFlush(anmeldung);

        assertThat(gespeichert.getId()).isNotNull();
        assertThat(gespeichert.getAngemeldetAm()).isNotNull();
        assertThat(gespeichert.getSpieler()).hasSize(2);
        assertThat(gespeichert.getSpieler())
                .allSatisfy(s -> assertThat(s.getId()).isNotNull());
    }

    @Test
    void findByAbgemeldetFalse_sollNurAktiveAnmeldungenZurueckgeben() {
        anmeldungRepository.save(anmeldung(Disziplin.HERRENEINZEL, false, spieler("Max", "Mustermann")));
        anmeldungRepository.save(anmeldung(Disziplin.HERRENDOPPEL, true, spieler("Tim", "Test")));

        List<Anmeldung> result = anmeldungRepository.findByAbgemeldetFalse();

        assertThat(result).extracting(Anmeldung::getDisziplin).containsExactly(Disziplin.HERRENEINZEL);
    }

    @Test
    void findAllBy_sollAlleAnmeldungenInklusiveAbgemeldeteZurueckgeben() {
        anmeldungRepository.save(anmeldung(Disziplin.HERRENEINZEL, false, spieler("Max", "Mustermann")));
        anmeldungRepository.save(anmeldung(Disziplin.HERRENDOPPEL, true, spieler("Tim", "Test")));

        List<Anmeldung> result = anmeldungRepository.findAllBy();

        assertThat(result)
                .extracting(Anmeldung::getDisziplin)
                .containsExactlyInAnyOrder(Disziplin.HERRENEINZEL, Disziplin.HERRENDOPPEL);
    }
}
