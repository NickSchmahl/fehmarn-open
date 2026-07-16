package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.DisziplinAnmeldung;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.DoppelterSpielerException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Prüft die Spieler-Eindeutigkeit in Einzel-Disziplinen (#170): innerhalb derselben Einzel-Disziplin ist
 * eine Meldung eine Dublette, wenn die normalisierte Kombination Vorname+Nachname (case-insensitiv) ODER
 * die Radikal ID bereits vorkommt – geprüft gegen die aktiven Anmeldungen der Disziplin UND die übrigen
 * Einträge desselben Requests. Für Team-Disziplinen sichert der Teamname die Eindeutigkeit
 * ({@link TeamnameValidierungService}); dort greift diese Prüfung nicht.
 *
 * <p>Fachliche Konfliktprüfung im Service (ADR 0011): 409-Semantik, umlaut-korrekter Vergleich in Java über
 * {@link String#CASE_INSENSITIVE_ORDER}.
 */
@Component
@RequiredArgsConstructor
public class DoppelteSpielerService {

    private final AnmeldungRepository anmeldungRepository;
    private final SpielernameValidierungService spielernameValidierungService;

    /** Prüft alle Einzel-Meldungen eines Anmeldevorgangs gegen den aktiven Bestand und untereinander. */
    public void pruefe(AnmeldungRequest request) {
        Map<Disziplin, Bestand> bestandJeDisziplin = new EnumMap<>(Disziplin.class);
        Map<Disziplin, Integer> meldungIndexJeDisziplin = new EnumMap<>(Disziplin.class);
        for (DisziplinAnmeldung eingabe : request.disziplinen()) {
            Disziplin disziplin = eingabe.disziplin();
            if (!disziplin.istEinzel()) {
                continue;
            }
            Bestand bestand = bestandJeDisziplin.computeIfAbsent(disziplin, this::ladeAktivenBestand);
            int meldungIndex = meldungIndexJeDisziplin.getOrDefault(disziplin, -1) + 1;
            meldungIndexJeDisziplin.put(disziplin, meldungIndex);
            for (SpielerRequest spieler : eingabe.spieler()) {
                pruefeUndMerke(
                        disziplin, meldungIndex, spieler.vorname(), spieler.nachname(), spieler.radikalId(), bestand);
            }
        }
    }

    /** Prüft die Spieler einer zu reaktivierenden Einzel-Anmeldung gegen den übrigen aktiven Bestand. */
    public void pruefeReaktivierung(Anmeldung anmeldung) {
        Disziplin disziplin = anmeldung.getDisziplin();
        if (!disziplin.istEinzel()) {
            return;
        }
        Bestand bestand = ladeAktivenBestand(disziplin, anmeldung.getId());
        for (Spieler spieler : anmeldung.getSpieler()) {
            pruefeUndMerke(disziplin, 0, spieler.getVorname(), spieler.getNachname(), spieler.getRadikalId(), bestand);
        }
    }

    private Bestand ladeAktivenBestand(Disziplin disziplin) {
        return ladeAktivenBestand(disziplin, null);
    }

    private Bestand ladeAktivenBestand(Disziplin disziplin, Long ausschlussId) {
        Bestand bestand = new Bestand();
        for (Anmeldung anmeldung : anmeldungRepository.findByDisziplinAndAbgemeldetFalse(disziplin)) {
            if (ausschlussId != null && ausschlussId.equals(anmeldung.getId())) {
                continue;
            }
            for (Spieler spieler : anmeldung.getSpieler()) {
                bestand.namen.add(namensschluessel(spieler.getVorname(), spieler.getNachname()));
                if (hatRadikalId(spieler.getRadikalId())) {
                    bestand.radikalIds.add(spieler.getRadikalId());
                }
            }
        }
        return bestand;
    }

    private void pruefeUndMerke(
            Disziplin disziplin, int meldungIndex, String vorname, String nachname, String radikalId, Bestand bestand) {
        String vornameNorm = spielernameValidierungService.normalisiere(vorname);
        String nachnameNorm = spielernameValidierungService.normalisiere(nachname);
        if (!bestand.namen.add(namensschluessel(vornameNorm, nachnameNorm))) {
            throw new DoppelterSpielerException(
                    disziplin,
                    meldungIndex,
                    "%s %s ist in dieser Disziplin bereits gemeldet.".formatted(vornameNorm, nachnameNorm));
        }
        if (hatRadikalId(radikalId) && !bestand.radikalIds.add(radikalId)) {
            throw new DoppelterSpielerException(
                    disziplin,
                    meldungIndex,
                    "Diese Person ist in dieser Disziplin bereits gemeldet (Radikal ID %s).".formatted(radikalId));
        }
    }

    private static String namensschluessel(String vorname, String nachname) {
        // Ein Schlüssel aus beiden Namen; der Vergleich erfolgt case-insensitiv über die TreeSet-Ordnung.
        return vorname + " " + nachname;
    }

    private static boolean hatRadikalId(String radikalId) {
        return radikalId != null && !radikalId.isBlank();
    }

    /** Case-insensitiver Namens-Bestand (umlaut-korrekt via CASE_INSENSITIVE_ORDER) plus exakte Radikal-IDs. */
    private static final class Bestand {
        private final Set<String> namen = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        private final Set<String> radikalIds = new HashSet<>();
    }
}
