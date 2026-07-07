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
    private final SpielerValidierungService spielerValidierung;

    @Transactional
    public List<Anmeldung> anmelden(AnmeldungRequest request) {
        pruefeKeineDoppeltenDisziplinen(request);
        return request.disziplinen().stream().map(this::anmeldenFuerDisziplin).toList();
    }

    private Anmeldung anmeldenFuerDisziplin(AnmeldungRequest.DisziplinAnmeldung eingabe) {
        spielerValidierung.validiere(eingabe.disziplin(), zuSpielerDaten(eingabe.spieler()));

        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setDisziplin(eingabe.disziplin());
        anmeldung.setTeamName(eingabe.teamName());
        anmeldung.setSpieler(eingabe.spieler().stream().map(this::zuSpieler).toList());

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

    private List<SpielerValidierungService.SpielerDaten> zuSpielerDaten(List<SpielerRequest> spieler) {
        return spieler.stream()
                .map(s -> new SpielerValidierungService.SpielerDaten(
                        s.vorname(), s.nachname(), s.radicalId(), s.initialen(), s.geburtsdatum(), s.istErsatz()))
                .toList();
    }

    private Spieler zuSpieler(SpielerRequest request) {
        Spieler spieler = new Spieler();
        spieler.setVorname(request.vorname());
        spieler.setNachname(request.nachname());
        spieler.setRadicalId(request.radicalId());
        spieler.setInitialen(request.initialen());
        spieler.setGeburtsdatum(request.geburtsdatum());
        spieler.setIstErsatz(request.istErsatz());
        return spieler;
    }

    @Transactional(readOnly = true)
    public TeilnehmerUebersichtResponse oeffentlicheUebersicht() {
        List<DisziplinGruppe> gruppen =
                gruppiereNachDisziplin(anmeldungRepository.findByAbgemeldetFalse()).entrySet().stream()
                        .map(entry -> {
                            List<TeilnehmerEintrag> teilnehmer = spielerStroem(entry.getValue())
                                    .map(sp -> new TeilnehmerEintrag(
                                            sp.spieler().getVorname(),
                                            sp.spieler().getNachname(),
                                            sp.anmeldung().getTeamName()))
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
                            List<AdminUebersichtResponse.AdminEintrag> teilnehmer = spielerStroem(entry.getValue())
                                    .map(sp -> toAdminEintrag(sp.anmeldung(), sp.spieler()))
                                    .toList();
                            int aktive = entry.getValue().stream()
                                    .filter(a -> !a.isAbgemeldet())
                                    .mapToInt(a -> a.getSpieler().size())
                                    .sum();
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

    private AdminUebersichtResponse.AdminEintrag toAdminEintrag(Anmeldung a, Spieler s) {
        return new AdminUebersichtResponse.AdminEintrag(
                a.getId(),
                s.getVorname(),
                s.getNachname(),
                s.getRadicalId(),
                a.getTeamName(),
                a.isAnwesend(),
                a.isAbgemeldet());
    }

    /** Alle (Anmeldung, Spieler)-Paare einer Gruppe, nach Spieler-Nachname sortiert. */
    private Stream<AnmeldungSpieler> spielerStroem(List<Anmeldung> anmeldungen) {
        return anmeldungen.stream()
                .flatMap(a -> a.getSpieler().stream().map(s -> new AnmeldungSpieler(a, s)))
                .sorted(Comparator.comparing(
                                (AnmeldungSpieler sp) -> sp.spieler().getNachname())
                        .thenComparing(sp -> sp.spieler().getVorname()));
    }

    private record AnmeldungSpieler(Anmeldung anmeldung, Spieler spieler) {}

    /** Gruppiert Anmeldungen nach Disziplin; TreeMap sortiert die Gruppen in Enum-Reihenfolge. */
    private Map<Disziplin, List<Anmeldung>> gruppiereNachDisziplin(List<Anmeldung> anmeldungen) {
        return anmeldungen.stream()
                .collect(Collectors.groupingBy(Anmeldung::getDisziplin, TreeMap::new, Collectors.toList()));
    }
}
