package de.dart.fehmarnopen.db;

import static org.assertj.core.api.Assertions.assertThat;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.entity.TurnierConfig;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

/**
 * Sicherheitsnetz für das von Liquibase verwaltete Schema (Issue #117). Da Hibernate auf SQLite nicht
 * mit {@code ddl-auto: validate} gegen das Schema prüfen kann (Long-@Id erwartet BIGINT, SQLite braucht
 * für autoincrement aber INTEGER-PK; siehe ADR 0009), belegt dieser Round-Trip-Test stattdessen, dass
 * die Liquibase-Baseline zu jedem Entity-Mapping passt: Persistieren + Zurücklesen aller Felder. Fehlt
 * für eine Entity-Änderung die passende Migration, schlägt dieser Test fehl.
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class SchemaMigrationTest {

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void anmeldungMitSpieler_persistiertUndLiestAlleFelderZurueck() {
        Spieler spieler = new Spieler();
        spieler.setVorname("Max");
        spieler.setNachname("Mustermann");
        spieler.setRadikalId("MM-1");
        spieler.setInitialen("MM");
        spieler.setGeburtsdatum(java.time.LocalDate.of(1990, 1, 2));

        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setDisziplin(Disziplin.TRIPLE_MIX);
        anmeldung.setTeamName("Team A");
        anmeldung.setSpieler(List.of(spieler));
        anmeldung.setAnwesend(true);

        Long id = entityManager.persistAndGetId(anmeldung, Long.class);
        entityManager.flush();
        entityManager.clear();

        Anmeldung geladen = entityManager.find(Anmeldung.class, id);
        assertThat(geladen.getId()).isNotNull();
        assertThat(geladen.getDisziplin()).isEqualTo(Disziplin.TRIPLE_MIX);
        assertThat(geladen.getTeamName()).isEqualTo("Team A");
        assertThat(geladen.isAnwesend()).isTrue();
        assertThat(geladen.getSpieler()).hasSize(1);
        assertThat(geladen.getSpieler().get(0).getRadikalId()).isEqualTo("MM-1");
        assertThat(geladen.getSpieler().get(0).getGeburtsdatum()).isEqualTo(java.time.LocalDate.of(1990, 1, 2));
    }

    @Test
    void turnierConfig_persistiertUndLiestAlleFelderZurueck() {
        TurnierConfig config = new TurnierConfig();
        config.setAnmeldungGesperrt(true);
        config.setAnmeldeschlussDatum(LocalDateTime.of(2026, 8, 1, 18, 0));

        Long id = entityManager.persistAndGetId(config, Long.class);
        entityManager.flush();
        entityManager.clear();

        TurnierConfig geladen = entityManager.find(TurnierConfig.class, id);
        assertThat(geladen.getId()).isNotNull();
        assertThat(geladen.isAnmeldungGesperrt()).isTrue();
        assertThat(geladen.getAnmeldeschlussDatum()).isEqualTo(LocalDateTime.of(2026, 8, 1, 18, 0));
    }
}
