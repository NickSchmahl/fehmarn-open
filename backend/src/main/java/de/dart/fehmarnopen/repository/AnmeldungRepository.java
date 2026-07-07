package de.dart.fehmarnopen.repository;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Teilnehmer;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnmeldungRepository extends JpaRepository<Anmeldung, Long> {

    List<Anmeldung> findByTeilnehmer(Teilnehmer teilnehmer);

    @EntityGraph(attributePaths = "teilnehmer")
    List<Anmeldung> findByAbgemeldetFalse();

    @EntityGraph(attributePaths = "teilnehmer")
    List<Anmeldung> findAllBy();

    boolean existsByTeilnehmerAndDisziplin(Teilnehmer teilnehmer, Disziplin disziplin);
}
