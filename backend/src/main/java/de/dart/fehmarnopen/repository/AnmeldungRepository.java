package de.dart.fehmarnopen.repository;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnmeldungRepository extends JpaRepository<Anmeldung, Long> {

    @EntityGraph(attributePaths = "spieler")
    List<Anmeldung> findByAbgemeldetFalse();

    @EntityGraph(attributePaths = "spieler")
    List<Anmeldung> findAllBy();

    /** Aktive (nicht abgemeldete) Anmeldungen einer Disziplin – für die Teamname-Eindeutigkeit (#152). */
    List<Anmeldung> findByDisziplinAndAbgemeldetFalse(Disziplin disziplin);
}
