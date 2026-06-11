package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.DisziplinGruppe;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.TeilnehmerEintrag;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Teilnehmer;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import de.dart.fehmarnopen.repository.TeilnehmerRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnmeldungService {

    private final AnmeldungRepository anmeldungRepository;
    private final TeilnehmerRepository teilnehmerRepository;

    @Transactional
    public List<Anmeldung> anmeldenMitTeilnehmer(AnmeldungRequest request) {
        Teilnehmer teilnehmer = new Teilnehmer();
        teilnehmer.setVorname(request.vorname());
        teilnehmer.setNachname(request.nachname());
        teilnehmer.setEmail(request.email());
        teilnehmer.setRadicalId(request.radicalId());
        teilnehmerRepository.save(teilnehmer);

        return request.disziplinen().stream()
                .map(d -> anmelden(teilnehmer, d.disziplin(), d.teamName()))
                .toList();
    }

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

    @Transactional(readOnly = true)
    public TeilnehmerUebersichtResponse oeffentlicheUebersicht() {
        Comparator<Anmeldung> nachName = Comparator.comparing(
                        (Anmeldung a) -> a.getTeilnehmer().getNachname())
                .thenComparing(a -> a.getTeilnehmer().getVorname());

        // TreeMap nach Disziplin-Enum sortiert die Gruppen automatisch in deklarierter Reihenfolge.
        Map<Disziplin, List<Anmeldung>> proDisziplin = anmeldungRepository.findByAbgemeldetFalse().stream()
                .collect(Collectors.groupingBy(Anmeldung::getDisziplin, TreeMap::new, Collectors.toList()));

        List<DisziplinGruppe> gruppen = proDisziplin.entrySet().stream()
                .map(entry -> {
                    List<TeilnehmerEintrag> teilnehmer = entry.getValue().stream()
                            .sorted(nachName)
                            .map(a -> new TeilnehmerEintrag(
                                    a.getTeilnehmer().getVorname(),
                                    a.getTeilnehmer().getNachname(),
                                    a.getTeamName()))
                            .toList();
                    return new DisziplinGruppe(entry.getKey(), teilnehmer.size(), teilnehmer);
                })
                .toList();

        return new TeilnehmerUebersichtResponse(gruppen);
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
