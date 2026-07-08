package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.DisziplinGruppe;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse.MeldungEintrag;
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
        spieler.setRadikalId(request.radikalId());
        spieler.setInitialen(request.initialen());
        spieler.setGeburtsdatum(request.geburtsdatum());
        return spieler;
    }

    @Transactional(readOnly = true)
    public TeilnehmerUebersichtResponse oeffentlicheUebersicht() {
        List<DisziplinGruppe> gruppen =
                gruppiereNachDisziplin(anmeldungRepository.findByAbgemeldetFalse()).entrySet().stream()
                        .map(gruppe -> {
                            List<MeldungEintrag> meldungen = sortierteMeldungen(gruppe.getValue())
                                    .map(anmeldung ->
                                            new MeldungEintrag(anmeldung.getTeamName(), oeffentlicheSpieler(anmeldung)))
                                    .toList();
                            return new DisziplinGruppe(gruppe.getKey(), meldungen.size(), meldungen);
                        })
                        .toList();

        return new TeilnehmerUebersichtResponse(gruppen);
    }

    @Transactional(readOnly = true)
    public AdminUebersichtResponse adminUebersicht() {
        List<AdminUebersichtResponse.DisziplinGruppe> gruppen =
                gruppiereNachDisziplin(anmeldungRepository.findAllBy()).entrySet().stream()
                        .map(gruppe -> {
                            List<AdminUebersichtResponse.MeldungEintrag> meldungen = sortierteMeldungen(
                                            gruppe.getValue())
                                    .map(this::toAdminMeldung)
                                    .toList();
                            int aktiveMeldungen = (int) gruppe.getValue().stream()
                                    .filter(anmeldung -> !anmeldung.isAbgemeldet())
                                    .count();
                            return new AdminUebersichtResponse.DisziplinGruppe(
                                    gruppe.getKey(), aktiveMeldungen, meldungen);
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

    private AdminUebersichtResponse.MeldungEintrag toAdminMeldung(Anmeldung anmeldung) {
        List<AdminUebersichtResponse.SpielerEintrag> spieler = anmeldung.getSpieler().stream()
                .sorted(spielerReihenfolge())
                .map(einzelspieler -> new AdminUebersichtResponse.SpielerEintrag(
                        einzelspieler.getVorname(), einzelspieler.getNachname(), einzelspieler.getRadikalId()))
                .toList();
        return new AdminUebersichtResponse.MeldungEintrag(
                anmeldung.getId(), anmeldung.getTeamName(), anmeldung.isAnwesend(), anmeldung.isAbgemeldet(), spieler);
    }

    private List<TeilnehmerUebersichtResponse.SpielerEintrag> oeffentlicheSpieler(Anmeldung anmeldung) {
        return anmeldung.getSpieler().stream()
                .sorted(spielerReihenfolge())
                .map(einzelspieler -> new TeilnehmerUebersichtResponse.SpielerEintrag(
                        einzelspieler.getVorname(), einzelspieler.getNachname()))
                .toList();
    }

    /** Spieler einer Meldung nach Nachname, dann Vorname. */
    private Comparator<Spieler> spielerReihenfolge() {
        return Comparator.comparing(Spieler::getNachname).thenComparing(Spieler::getVorname);
    }

    /**
     * Meldungen einer Disziplin sortiert: nach Teamname (case-insensitive); teamlose Meldungen nach dem
     * Namen ihres (einzigen) Spielers. So bleiben gleichnamige Teams als getrennte Meldungen erhalten.
     */
    private Stream<Anmeldung> sortierteMeldungen(List<Anmeldung> anmeldungen) {
        return anmeldungen.stream()
                .sorted(Comparator.comparing(this::sortierSchluessel, String.CASE_INSENSITIVE_ORDER));
    }

    private String sortierSchluessel(Anmeldung anmeldung) {
        String teamName = anmeldung.getTeamName();
        if (teamName != null && !teamName.isBlank()) {
            return teamName;
        }
        return anmeldung.getSpieler().stream()
                .min(spielerReihenfolge())
                .map(spieler -> spieler.getNachname() + " " + spieler.getVorname())
                .orElse("");
    }

    /** Gruppiert Anmeldungen nach Disziplin; TreeMap sortiert die Gruppen in Enum-Reihenfolge. */
    private Map<Disziplin, List<Anmeldung>> gruppiereNachDisziplin(List<Anmeldung> anmeldungen) {
        return anmeldungen.stream()
                .collect(Collectors.groupingBy(Anmeldung::getDisziplin, TreeMap::new, Collectors.toList()));
    }
}
