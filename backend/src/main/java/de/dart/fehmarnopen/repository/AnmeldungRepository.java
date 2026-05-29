package de.dart.fehmarnopen.repository;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Teilnehmer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnmeldungRepository extends JpaRepository<Anmeldung, Long> {

    List<Anmeldung> findByTeilnehmer(Teilnehmer teilnehmer);

    Optional<Anmeldung> findByAbmeldetoken(String abmeldetoken);

    boolean existsByTeilnehmerAndDisziplin(Teilnehmer teilnehmer, Disziplin disziplin);
}
