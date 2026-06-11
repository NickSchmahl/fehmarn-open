package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.DisziplinGruppe;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.TeilnehmerEintrag;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Teilnehmer;
import de.dart.fehmarnopen.event.AbmeldungBestaetigtEvent;
import de.dart.fehmarnopen.event.AnmeldungBestaetigtEvent;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.exception.NichtGefundenException;
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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnmeldungService {

    private final AnmeldungRepository anmeldungRepository;
    private final TeilnehmerRepository teilnehmerRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public List<Anmeldung> anmeldenMitTeilnehmer(AnmeldungRequest request) {
        Teilnehmer teilnehmer = new Teilnehmer();
        teilnehmer.setVorname(request.vorname());
        teilnehmer.setNachname(request.nachname());
        teilnehmer.setEmail(request.email());
        teilnehmer.setRadicalId(request.radicalId());
        teilnehmerRepository.save(teilnehmer);

        List<Anmeldung> anmeldungen = request.disziplinen().stream()
                .map(d -> anmelden(teilnehmer, d.disziplin(), d.teamName()))
                .toList();

        List<AnmeldungBestaetigtEvent.Position> positionen = anmeldungen.stream()
                .map(a -> new AnmeldungBestaetigtEvent.Position(a.getDisziplin(), a.getTeamName()))
                .toList();
        eventPublisher.publishEvent(new AnmeldungBestaetigtEvent(
                teilnehmer.getEmail(), teilnehmer.getVorname(), teilnehmer.getNachname(), positionen));

        return anmeldungen;
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
        List<DisziplinGruppe> gruppen =
                gruppiereNachDisziplin(anmeldungRepository.findByAbgemeldetFalse()).entrySet().stream()
                        .map(entry -> {
                            List<TeilnehmerEintrag> teilnehmer = entry.getValue().stream()
                                    .sorted(nachName())
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

    @Transactional(readOnly = true)
    public AdminUebersichtResponse adminUebersicht() {
        List<AdminUebersichtResponse.DisziplinGruppe> gruppen =
                gruppiereNachDisziplin(anmeldungRepository.findAllBy()).entrySet().stream()
                        .map(entry -> {
                            List<AdminUebersichtResponse.AdminEintrag> teilnehmer = entry.getValue().stream()
                                    .sorted(nachName())
                                    .map(this::toAdminEintrag)
                                    .toList();
                            int aktive = (int) entry.getValue().stream()
                                    .filter(a -> !a.isAbgemeldet())
                                    .count();
                            return new AdminUebersichtResponse.DisziplinGruppe(entry.getKey(), aktive, teilnehmer);
                        })
                        .toList();

        return new AdminUebersichtResponse(gruppen);
    }

    @Transactional
    public void abmelden(Long anmeldungId) {
        Anmeldung anmeldung = findeOderWirf(anmeldungId);
        anmeldung.setAbgemeldet(true);
        anmeldung.setAbgemeldetAm(LocalDateTime.now());
        anmeldungRepository.save(anmeldung);
        publiziereAbmeldung(anmeldung);
    }

    @Transactional
    public void reaktivieren(Long anmeldungId) {
        Anmeldung anmeldung = findeOderWirf(anmeldungId);
        anmeldung.setAbgemeldet(false);
        anmeldung.setAbgemeldetAm(null);
        anmeldungRepository.save(anmeldung);
    }

    @Transactional
    public void setAnwesenheit(Long anmeldungId, boolean anwesend) {
        Anmeldung anmeldung = findeOderWirf(anmeldungId);
        anmeldung.setAnwesend(anwesend);
        anmeldungRepository.save(anmeldung);
    }

    private Anmeldung findeOderWirf(Long anmeldungId) {
        return anmeldungRepository
                .findById(anmeldungId)
                .orElseThrow(() -> new NichtGefundenException("Anmeldung nicht gefunden: " + anmeldungId));
    }

    private AdminUebersichtResponse.AdminEintrag toAdminEintrag(Anmeldung a) {
        Teilnehmer t = a.getTeilnehmer();
        return new AdminUebersichtResponse.AdminEintrag(
                a.getId(),
                t.getVorname(),
                t.getNachname(),
                t.getEmail(),
                t.getRadicalId(),
                a.getTeamName(),
                a.isAnwesend(),
                a.isAbgemeldet());
    }

    private Comparator<Anmeldung> nachName() {
        return Comparator.comparing((Anmeldung a) -> a.getTeilnehmer().getNachname())
                .thenComparing(a -> a.getTeilnehmer().getVorname());
    }

    /** Gruppiert Anmeldungen nach Disziplin; TreeMap sortiert die Gruppen in Enum-Reihenfolge. */
    private Map<Disziplin, List<Anmeldung>> gruppiereNachDisziplin(List<Anmeldung> anmeldungen) {
        return anmeldungen.stream()
                .collect(Collectors.groupingBy(Anmeldung::getDisziplin, TreeMap::new, Collectors.toList()));
    }

    @Transactional
    public void abmelden(String abmeldetoken) {
        anmeldungRepository.findByAbmeldetoken(abmeldetoken).ifPresent(anmeldung -> {
            anmeldung.setAbgemeldet(true);
            anmeldung.setAbgemeldetAm(LocalDateTime.now());
            anmeldungRepository.save(anmeldung);
            publiziereAbmeldung(anmeldung);
        });
    }

    private void publiziereAbmeldung(Anmeldung anmeldung) {
        Teilnehmer t = anmeldung.getTeilnehmer();
        eventPublisher.publishEvent(new AbmeldungBestaetigtEvent(
                t.getEmail(), t.getVorname(), t.getNachname(), anmeldung.getDisziplin(), anmeldung.getTeamName()));
    }
}
