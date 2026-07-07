package de.dart.fehmarnopen.repository;

import de.dart.fehmarnopen.entity.Anmeldung;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnmeldungRepository extends JpaRepository<Anmeldung, Long> {

    @EntityGraph(attributePaths = "spieler")
    List<Anmeldung> findByAbgemeldetFalse();

    @EntityGraph(attributePaths = "spieler")
    List<Anmeldung> findAllBy();
}
