package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Prüft und normalisiert Personennamen (Vorname/Nachname, #167): Trim + interne Mehrfach-Leerzeichen
 * zusammenfassen und den Zeichensatz begrenzen. Erlaubt sind Buchstaben (inkl. Umlaute ä/ö/ü/ß),
 * einzelne Leerzeichen und der Bindestrich für Doppelnamen – Letzterer nur zwischen zwei Buchstaben
 * (also nicht führend, abschließend oder doppelt). Ziffern und alle übrigen Sonderzeichen führen zu
 * einer {@link UngueltigeAnmeldungException} (HTTP 400).
 *
 * <p>Anders als beim Teamnamen ({@link TeamnameValidierungService}) ist der Bindestrich hier erlaubt
 * und Ziffern sind verboten – echte Namen wie „Anna-Lena" brauchen ihn, „Team 42" gibt es bei
 * Personennamen nicht.
 */
@Component
public class SpielernameValidierungService {

    // Wörter aus Buchstaben, getrennt durch je genau ein Leerzeichen oder einen Bindestrich. Das
    // schließt führende/abschließende sowie doppelte Trennzeichen aus (z. B. „-Anna", „Anna--Lena").
    private static final Pattern ERLAUBTES_MUSTER = Pattern.compile("^\\p{L}+([ -]\\p{L}+)*$");

    /**
     * Normalisiert den Namen (Trim + Whitespace-Zusammenfassung) und prüft den Zeichensatz. Gibt den
     * normalisierten Namen zurück, der so gespeichert werden soll. Eine leere bzw. reine
     * Whitespace-Eingabe wird durchgereicht (Ergebnis {@code ""}) – die Pflichtprüfung (@NotBlank auf
     * dem DTO) greift getrennt und soll nicht als Zeichensatz-Fehler erscheinen.
     *
     * @param feldbezeichnung „Vorname" bzw. „Nachname" für eine sprechende Fehlermeldung.
     */
    public String normalisiereUndPruefe(String name, String feldbezeichnung) {
        String normalisiert = name == null ? "" : name.strip().replaceAll("\\s+", " ");
        if (normalisiert.isEmpty()) {
            return normalisiert;
        }
        if (!ERLAUBTES_MUSTER.matcher(normalisiert).matches()) {
            throw new UngueltigeAnmeldungException(feldbezeichnung
                    + ": bitte einen gültigen Namen eingeben (z. B. „Anna“, „Anna Lena“ oder „Anna-Lena“)");
        }
        return normalisiert;
    }
}
