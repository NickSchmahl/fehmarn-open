package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.dto.AdminUebersichtResponse;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.dto.TeilnehmerUebersichtResponse;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.DoppelterTeamnameException;
import de.dart.fehmarnopen.exception.NichtGefundenException;
import de.dart.fehmarnopen.mapper.UebersichtMapper;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnmeldungService {

    private final AnmeldungRepository anmeldungRepository;
    private final SpielerValidierungService spielerValidierungService;
    private final TeamnameValidierungService teamnameValidierungService;
    private final UebersichtMapper uebersichtMapper;
    private final AnmeldeschlussService anmeldeschlussService;

    @Transactional
    public List<Anmeldung> anmelden(AnmeldungRequest request) {
        anmeldeschlussService.pruefeAnmeldungOffen();
        pruefeKeineDoppeltenTeamnamenImRequest(request);
        return request.disziplinen().stream().map(this::anmeldenFuerDisziplin).toList();
    }

    private Anmeldung anmeldenFuerDisziplin(AnmeldungRequest.DisziplinAnmeldung eingabe) {
        List<Spieler> spieler = eingabe.spieler().stream().map(this::zuSpieler).toList();
        spielerValidierungService.validiere(eingabe.disziplin(), spieler);
        String teamName =
                teamnameValidierungService.normalisiereUndPruefe(eingabe.disziplin(), eingabe.teamName(), null);

        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setDisziplin(eingabe.disziplin());
        anmeldung.setTeamName(teamName);
        anmeldung.setSpieler(spieler);

        return anmeldungRepository.save(anmeldung);
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
        return uebersichtMapper.zuOeffentlicheUebersicht(anmeldungRepository.findByAbgemeldetFalse());
    }

    @Transactional(readOnly = true)
    public AdminUebersichtResponse adminUebersicht() {
        return uebersichtMapper.zuAdminUebersicht(anmeldungRepository.findAllBy());
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
        // Beim Reaktivieren erneut auf Teamname-Dubletten prüfen: der Name könnte inzwischen von einer
        // anderen aktiven Anmeldung der Disziplin belegt sein (eigene ID ausgeschlossen).
        teamnameValidierungService.normalisiereUndPruefe(
                anmeldung.getDisziplin(), anmeldung.getTeamName(), anmeldungId);
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

    private void pruefeKeineDoppeltenTeamnamenImRequest(AnmeldungRequest request) {
        Map<Disziplin, List<String>> gesehenJeDisziplin = new EnumMap<>(Disziplin.class);
        for (AnmeldungRequest.DisziplinAnmeldung eingabe : request.disziplinen()) {
            String normalisiert = teamnameValidierungService.normalisiere(eingabe.teamName());
            if (normalisiert == null) {
                continue; // Einzel/U18 ohne Teamname – nichts zu prüfen.
            }
            List<String> bereitsGesehen =
                    gesehenJeDisziplin.computeIfAbsent(eingabe.disziplin(), d -> new ArrayList<>());
            boolean kollision = bereitsGesehen.stream()
                    .anyMatch(vorhanden -> String.CASE_INSENSITIVE_ORDER.compare(vorhanden, normalisiert) == 0);
            if (kollision) {
                throw new DoppelterTeamnameException(eingabe.disziplin(), normalisiert);
            }
            bereitsGesehen.add(normalisiert);
        }
    }
}
