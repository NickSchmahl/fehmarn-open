package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Teilnehmer;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnmeldungService {

    private final AnmeldungRepository anmeldungRepository;

    @Transactional
    public Anmeldung anmelden(Teilnehmer teilnehmer, Disziplin disziplin, String teamName) {
        if (anmeldungRepository.existsByTeilnehmerAndDisziplin(teilnehmer, disziplin)) {
            throw new DoppelteAnmeldungException(disziplin.name());
        }

        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setTeilnehmer(teilnehmer);
        anmeldung.setDisziplin(disziplin);
        anmeldung.setTeamName(teamName);

        return anmeldungRepository.save(anmeldung);
    }

    @Transactional(readOnly = true)
    public List<Anmeldung> findeAnmeldungenFuerTeilnehmer(Teilnehmer teilnehmer) {
        return anmeldungRepository.findByTeilnehmer(teilnehmer);
    }

    @Transactional(readOnly = true)
    public Optional<Anmeldung> findeByAbmeldetoken(String abmeldetoken) {
        return anmeldungRepository.findByAbmeldetoken(abmeldetoken);
    }

    @Transactional
    public void abmelden(String abmeldetoken) {
        anmeldungRepository.findByAbmeldetoken(abmeldetoken).ifPresent(anmeldung -> {
            anmeldung.setAbgemeldet(true);
            anmeldung.setAbgemeldetAm(LocalDateTime.now());
            anmeldungRepository.save(anmeldung);
        });
    }
}
