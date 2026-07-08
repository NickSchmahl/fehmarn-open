package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.DisziplinGruppe;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.TeilnehmerEintrag;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.DoppelteAnmeldungException;
import de.dart.fehmarnopen.exception.NichtGefundenException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnmeldungService {

    private final AnmeldungRepository anmeldungRepository;
    private final SpielerValidierungService spielerValidierungService;

    @Transactional
    public List<Anmeldung> anmelden(AnmeldungRequest request) {
        pruefeKeineDoppeltenDisziplinen(request);
        return request.disziplinen().stream().map(this::anmeldenFuerDisziplin).toList();
    }

    private Anmeldung anmeldenFuerDisziplin(AnmeldungRequest.DisziplinAnmeldung eingabe) {
        List<Spieler> spieler = eingabe.spieler().stream().map(this::zuSpieler).toList();
        spielerValidierungService.validiere(eingabe.disziplin(), spieler);

        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setDisziplin(eingabe.disziplin());
        anmeldung.setTeamName(eingabe.teamName());
        anmeldung.setSpieler(spieler);

        return anmeldungRepository.save(anmeldung);
    }

    private void pruefeKeineDoppeltenDisziplinen(AnmeldungRequest request) {
        Set<Disziplin> gesehen = EnumSet.noneOf(Disziplin.class);
        for (AnmeldungRequest.DisziplinAnmeldung eingabe : request.disziplinen()) {
            if (!gesehen.add(eingabe.disziplin())) {
                throw new DoppelteAnmeldungException(eingabe.disziplin().name());
            }
        }
    }

    private Spieler zuSpieler(SpielerRequest request) {
        Spieler spieler = new Spieler();
        spieler.setVorname(request.vorname());
        spieler.setNachname(request.nachname());
        spieler.setRadicalId(request.radicalId());
        spieler.setInitialen(request.initialen());
        spieler.setGeburtsdatum(request.geburtsdatum());
        return spieler;
    }

    @Transactional(readOnly = true)
    public TeilnehmerUebersichtResponse oeffentlicheUebersicht() {
        List<DisziplinGruppe> gruppen =
                gruppiereNachDisziplin(anmeldungRepository.findByAbgemeldetFalse()).entrySet().stream()
                        .map(gruppe -> {
                            List<TeilnehmerEintrag> teilnehmer = sortierteSpielerMitAnmeldung(gruppe.getValue())
                                    .map(paar -> new TeilnehmerEintrag(
                                            paar.spieler().getVorname(),
                                            paar.spieler().getNachname(),
                                            paar.anmeldung().getTeamName()))
                                    .toList();
                            return new DisziplinGruppe(gruppe.getKey(), teilnehmer.size(), teilnehmer);
                        })
                        .toList();

        return new TeilnehmerUebersichtResponse(gruppen);
    }

    @Transactional(readOnly = true)
    public AdminUebersichtResponse adminUebersicht() {
        List<AdminUebersichtResponse.DisziplinGruppe> gruppen =
                gruppiereNachDisziplin(anmeldungRepository.findAllBy()).entrySet().stream()
                        .map(gruppe -> {
                            List<AdminUebersichtResponse.AdminEintrag> teilnehmer = sortierteSpielerMitAnmeldung(
                                            gruppe.getValue())
                                    .map(paar -> toAdminEintrag(paar.anmeldung(), paar.spieler()))
                                    .toList();
                            int aktiveSpieler = gruppe.getValue().stream()
                                    .filter(anmeldung -> !anmeldung.isAbgemeldet())
                                    .mapToInt(
                                            anmeldung -> anmeldung.getSpieler().size())
                                    .sum();
                            return new AdminUebersichtResponse.DisziplinGruppe(
                                    gruppe.getKey(), aktiveSpieler, teilnehmer);
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

    private AdminUebersichtResponse.AdminEintrag toAdminEintrag(Anmeldung anmeldung, Spieler spieler) {
        return new AdminUebersichtResponse.AdminEintrag(
                anmeldung.getId(),
                spieler.getVorname(),
                spieler.getNachname(),
                spieler.getRadicalId(),
                anmeldung.getTeamName(),
                anmeldung.isAnwesend(),
                anmeldung.isAbgemeldet());
    }

    /** Alle (Anmeldung, Spieler)-Paare einer Gruppe, nach Spieler-Nachname (dann Vorname) sortiert. */
    private Stream<SpielerMitAnmeldung> sortierteSpielerMitAnmeldung(List<Anmeldung> anmeldungen) {
        return anmeldungen.stream()
                .flatMap(anmeldung ->
                        anmeldung.getSpieler().stream().map(spieler -> new SpielerMitAnmeldung(anmeldung, spieler)))
                .sorted(Comparator.comparing(
                                (SpielerMitAnmeldung paar) -> paar.spieler().getNachname())
                        .thenComparing(paar -> paar.spieler().getVorname()));
    }

    private record SpielerMitAnmeldung(Anmeldung anmeldung, Spieler spieler) {}

    /** Gruppiert Anmeldungen nach Disziplin; TreeMap sortiert die Gruppen in Enum-Reihenfolge. */
    private Map<Disziplin, List<Anmeldung>> gruppiereNachDisziplin(List<Anmeldung> anmeldungen) {
        return anmeldungen.stream()
                .collect(Collectors.groupingBy(Anmeldung::getDisziplin, TreeMap::new, Collectors.toList()));
    }
}
