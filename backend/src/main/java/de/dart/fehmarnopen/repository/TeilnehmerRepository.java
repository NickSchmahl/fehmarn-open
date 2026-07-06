package de.dart.fehmarnopen.repository;

import de.dart.fehmarnopen.entity.Teilnehmer;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeilnehmerRepository extends JpaRepository<Teilnehmer, Long> {

    Optional<Teilnehmer> findByRadicalId(String radicalId);
}
