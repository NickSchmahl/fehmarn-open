package de.dart.fehmarnopen.repository;

import static org.assertj.core.api.Assertions.assertThat;

import de.dart.fehmarnopen.entity.Teilnehmer;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class TeilnehmerRepositoryTest {

    @Autowired
    private TeilnehmerRepository teilnehmerRepository;

    @BeforeEach
    void setUp() {
        Teilnehmer teilnehmer = new Teilnehmer();
        teilnehmer.setVorname("Max");
        teilnehmer.setNachname("Mustermann");
        teilnehmer.setRadicalId("RAD-001");
        teilnehmer.setInitialen("MM");
        teilnehmerRepository.save(teilnehmer);
    }

    @Test
    void findByRadicalId_sollTeilnehmerZurueckgeben() {
        Optional<Teilnehmer> result = teilnehmerRepository.findByRadicalId("RAD-001");

        assertThat(result).isPresent();
        assertThat(result.get().getVorname()).isEqualTo("Max");
    }

    @Test
    void findByRadicalId_unbekannteId_sollLeerSein() {
        Optional<Teilnehmer> result = teilnehmerRepository.findByRadicalId("RAD-999");

        assertThat(result).isEmpty();
    }

    @Test
    void save_sollAngemeldetAmAutomatischSetzen() {
        Optional<Teilnehmer> result = teilnehmerRepository.findByRadicalId("RAD-001");

        assertThat(result).isPresent();
        assertThat(result.get().getAngemeldetAm()).isNotNull();
    }
}
