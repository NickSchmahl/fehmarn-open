package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.exception.DoppelterTeamnameException;
import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Prüft und normalisiert Teamnamen (#152): Trim + interne Mehrfach-Leerzeichen zusammenfassen,
 * höchstens 20 Zeichen, eindeutig je Disziplin (case-insensitiv, nur gegen aktive Anmeldungen).
 *
 * <p>Die Eindeutigkeit ist eine fachliche Konfliktprüfung und liegt bewusst hier im Service statt in
 * einem Bean-Validation-Constraint (siehe ADR 0011): 409-Semantik, deckt auch die Reaktivierung ab
 * und vergleicht umlaut-korrekt in Java (SQLites {@code UPPER} kann nur ASCII).
 */
@Component
@RequiredArgsConstructor
public class TeamnameValidierungService {

    private static final int MAX_LAENGE = 20;

    private final AnmeldungRepository anmeldungRepository;

    /**
     * Normalisiert einen Teamnamen: führende/abschließende Leerzeichen entfernen und interne
     * Mehrfach-Whitespaces zu einem einzelnen Leerzeichen zusammenfassen. Leere bzw. reine
     * Whitespace-Eingaben (auch {@code null}) ergeben {@code null}.
     */
    public String normalisiere(String teamName) {
        if (teamName == null) {
            return null;
        }
        String normalisiert = teamName.strip().replaceAll("\\s+", " ");
        return normalisiert.isEmpty() ? null : normalisiert;
    }

    /**
     * Normalisiert den Teamnamen und prüft Länge sowie Eindeutigkeit je Disziplin. Gibt den
     * normalisierten Namen zurück, der so gespeichert werden soll – oder {@code null}, wenn kein
     * Teamname angegeben wurde (dann findet keine Prüfung statt, z. B. bei Einzel/U18).
     *
     * @param ausschlussId Anmeldung, die beim Eindeutigkeitsvergleich ignoriert wird (die eigene bei
     *     Reaktivierung); {@code null} bei Neuanlage.
     */
    public String normalisiereUndPruefe(Disziplin disziplin, String teamName, Long ausschlussId) {
        String normalisiert = normalisiere(teamName);
        if (normalisiert == null) {
            return null;
        }
        pruefeLaenge(normalisiert);
        pruefeEindeutig(disziplin, normalisiert, ausschlussId);
        return normalisiert;
    }

    private void pruefeLaenge(String normalisiert) {
        if (normalisiert.length() > MAX_LAENGE) {
            throw new UngueltigeAnmeldungException("Teamname darf höchstens " + MAX_LAENGE + " Zeichen haben");
        }
    }

    private void pruefeEindeutig(Disziplin disziplin, String normalisiert, Long ausschlussId) {
        // Case-insensitiv über CASE_INSENSITIVE_ORDER (wie UebersichtMapper): umlaut-korrekt und
        // spotbugs-sauber, anders als equalsIgnoreCase (IMPROPER_UNICODE).
        boolean kollision = anmeldungRepository.findByDisziplinAndAbgemeldetFalse(disziplin).stream()
                .filter(anmeldung -> ausschlussId == null || !ausschlussId.equals(anmeldung.getId()))
                .map(Anmeldung::getTeamName)
                .filter(Objects::nonNull)
                .anyMatch(vorhandenerName -> String.CASE_INSENSITIVE_ORDER.compare(vorhandenerName, normalisiert) == 0);
        if (kollision) {
            throw new DoppelterTeamnameException(disziplin, normalisiert);
        }
    }
}
