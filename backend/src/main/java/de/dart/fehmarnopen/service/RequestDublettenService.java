package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.DoppelteRadikalIdException;
import de.dart.fehmarnopen.exception.DoppelterTeamnameException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Prüft Dubletten <em>innerhalb eines Requests</em>: derselbe Teamname zweimal in derselben
 * Disziplin (#152) und dieselbe Radikal ID zweimal in derselben Team-Disziplin (#170). Dubletten
 * gegen bereits gespeicherte Anmeldungen prüfen {@link TeamnameValidierungService} und
 * {@link DoppelteSpielerService}.
 */
@Component
@RequiredArgsConstructor
public class RequestDublettenService {

    private final TeamnameValidierungService teamnameValidierungService;

    public void pruefe(AnmeldungRequest request) {
        pruefeKeineDoppeltenTeamnamen(request);
        pruefeKeineDoppeltenRadikalIds(request);
    }

    private void pruefeKeineDoppeltenTeamnamen(AnmeldungRequest request) {
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

    private void pruefeKeineDoppeltenRadikalIds(AnmeldungRequest request) {
        Map<Disziplin, Set<String>> gesehenJeDisziplin = new EnumMap<>(Disziplin.class);
        for (AnmeldungRequest.DisziplinAnmeldung eingabe : request.disziplinen()) {
            if (eingabe.disziplin().istEinzel()) {
                continue; // Einzel-Radikal-Dubletten prüft der DoppelteSpielerService (#170).
            }
            Set<String> bereitsGesehen =
                    gesehenJeDisziplin.computeIfAbsent(eingabe.disziplin(), disziplin -> new HashSet<>());
            for (SpielerRequest spielerRequest : eingabe.spieler()) {
                String radikalId = spielerRequest.radikalId();
                if (radikalId == null || radikalId.isBlank()) {
                    continue; // Ohne Radikal ID kein zuverlässiger Schlüssel – hier nicht prüfen.
                }
                if (!bereitsGesehen.add(radikalId)) {
                    throw new DoppelteRadikalIdException(radikalId);
                }
            }
        }
    }
}
