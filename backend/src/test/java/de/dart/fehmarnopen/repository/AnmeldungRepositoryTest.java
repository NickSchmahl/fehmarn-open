package de.dart.fehmarnopen.repository;

import static org.assertj.core.api.Assertions.assertThat;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Teilnehmer;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
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

    @Autowired
    private TeilnehmerRepository teilnehmerRepository;

    private Teilnehmer teilnehmer;

    @BeforeEach
    void setUp() {
        teilnehmer = new Teilnehmer();
        teilnehmer.setVorname("Max");
        teilnehmer.setNachname("Mustermann");
        teilnehmer.setEmail("max@example.com");
        teilnehmerRepository.save(teilnehmer);
    }

    @Test
    void findByTeilnehmer_sollAlleAnmeldungenZurueckgeben() {
        Anmeldung a1 = new Anmeldung();
        a1.setTeilnehmer(teilnehmer);
        a1.setDisziplin(Disziplin.HERRENEINZEL);
        anmeldungRepository.save(a1);

        Anmeldung a2 = new Anmeldung();
        a2.setTeilnehmer(teilnehmer);
        a2.setDisziplin(Disziplin.HERRENDOPPEL);
        anmeldungRepository.save(a2);

        List<Anmeldung> result = anmeldungRepository.findByTeilnehmer(teilnehmer);

        assertThat(result).hasSize(2);
        assertThat(result)
                .extracting(Anmeldung::getDisziplin)
                .containsExactlyInAnyOrder(Disziplin.HERRENEINZEL, Disziplin.HERRENDOPPEL);
    }

    @Test
    void findByAbmeldetoken_sollAnmeldungZurueckgeben() {
        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setTeilnehmer(teilnehmer);
        anmeldung.setDisziplin(Disziplin.DAMENEINZEL);
        anmeldungRepository.save(anmeldung);

        String token = anmeldung.getAbmeldetoken();
        Optional<Anmeldung> result = anmeldungRepository.findByAbmeldetoken(token);

        assertThat(result).isPresent();
        assertThat(result.get().getDisziplin()).isEqualTo(Disziplin.DAMENEINZEL);
    }

    @Test
    void findByAbmeldetoken_unbekannterToken_sollLeerSein() {
        Optional<Anmeldung> result = anmeldungRepository.findByAbmeldetoken("nicht-existent");

        assertThat(result).isEmpty();
    }

    @Test
    void existsByTeilnehmerAndDisziplin_beiVorhandenerAnmeldung_sollTrueZurueckgeben() {
        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setTeilnehmer(teilnehmer);
        anmeldung.setDisziplin(Disziplin.MIXED_DOPPEL);
        anmeldungRepository.save(anmeldung);

        boolean exists = anmeldungRepository.existsByTeilnehmerAndDisziplin(teilnehmer, Disziplin.MIXED_DOPPEL);

        assertThat(exists).isTrue();
    }

    @Test
    void existsByTeilnehmerAndDisziplin_beiFehlenderAnmeldung_sollFalseZurueckgeben() {
        boolean exists = anmeldungRepository.existsByTeilnehmerAndDisziplin(teilnehmer, Disziplin.TEAMWETTBEWERB);

        assertThat(exists).isFalse();
    }

    @Test
    void findByAbgemeldetFalse_sollNurAktiveAnmeldungenZurueckgeben() {
        Anmeldung aktiv = new Anmeldung();
        aktiv.setTeilnehmer(teilnehmer);
        aktiv.setDisziplin(Disziplin.HERRENEINZEL);
        anmeldungRepository.save(aktiv);

        Anmeldung abgemeldet = new Anmeldung();
        abgemeldet.setTeilnehmer(teilnehmer);
        abgemeldet.setDisziplin(Disziplin.HERRENDOPPEL);
        abgemeldet.setAbgemeldet(true);
        anmeldungRepository.save(abgemeldet);

        List<Anmeldung> result = anmeldungRepository.findByAbgemeldetFalse();

        assertThat(result).extracting(Anmeldung::getDisziplin).containsExactly(Disziplin.HERRENEINZEL);
    }

    @Test
    void findAllBy_sollAlleAnmeldungenInklusiveAbgemeldeteZurueckgeben() {
        Anmeldung aktiv = new Anmeldung();
        aktiv.setTeilnehmer(teilnehmer);
        aktiv.setDisziplin(Disziplin.HERRENEINZEL);
        anmeldungRepository.save(aktiv);

        Anmeldung abgemeldet = new Anmeldung();
        abgemeldet.setTeilnehmer(teilnehmer);
        abgemeldet.setDisziplin(Disziplin.HERRENDOPPEL);
        abgemeldet.setAbgemeldet(true);
        anmeldungRepository.save(abgemeldet);

        List<Anmeldung> result = anmeldungRepository.findAllBy();

        assertThat(result)
                .extracting(Anmeldung::getDisziplin)
                .containsExactlyInAnyOrder(Disziplin.HERRENEINZEL, Disziplin.HERRENDOPPEL);
    }

    @Test
    void save_sollAbmeldetokenAutomatischSetzen() {
        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setTeilnehmer(teilnehmer);
        anmeldung.setDisziplin(Disziplin.TRIPLE_MIX);
        anmeldungRepository.save(anmeldung);

        assertThat(anmeldung.getAbmeldetoken()).isNotBlank();
    }
}
