package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.dart.fehmarnopen.exception.UngueltigeAnmeldungException;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Fachliche Tests je öffentlicher Methode in eigener {@link Nested}-Klasse (Konvention siehe
 * ADR 0012). Regel (#167): Personennamen erlauben nur Buchstaben (inkl. Umlaute), einzelne
 * Leerzeichen und den Bindestrich zwischen zwei Buchstaben.
 */
class SpielernameValidierungServiceTest {

    private final SpielernameValidierungService spielernameValidierungService = new SpielernameValidierungService();

    @Nested
    class NormalisiereUndPruefeTest {

        @Test
        void doppelnameMitBindestrichIstErlaubt() {
            assertThatCode(() -> spielernameValidierungService.normalisiereUndPruefe("Anna-Lena", "Vorname"))
                    .doesNotThrowAnyException();
        }

        @Test
        void umlautMitBindestrichIstErlaubt() {
            assertThatCode(() -> spielernameValidierungService.normalisiereUndPruefe("Müller-Schmidt", "Nachname"))
                    .doesNotThrowAnyException();
        }

        @Test
        void umlautUndScharfesSIstErlaubt() {
            assertThatCode(() -> spielernameValidierungService.normalisiereUndPruefe("Weiß", "Nachname"))
                    .doesNotThrowAnyException();
        }

        @Test
        void mehrereWoerterMitLeerzeichenSindErlaubt() {
            assertThatCode(() -> spielernameValidierungService.normalisiereUndPruefe("Anna Lena", "Vorname"))
                    .doesNotThrowAnyException();
        }

        @Test
        void sonderzeichenWirdAbgelehnt() {
            assertThatThrownBy(() -> spielernameValidierungService.normalisiereUndPruefe("Ann@", "Vorname"))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void zifferWirdAbgelehnt() {
            assertThatThrownBy(() -> spielernameValidierungService.normalisiereUndPruefe("Anna1", "Vorname"))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void apostrophWirdAbgelehnt() {
            assertThatThrownBy(() -> spielernameValidierungService.normalisiereUndPruefe("O'Brien", "Nachname"))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void punktWirdAbgelehnt() {
            assertThatThrownBy(() -> spielernameValidierungService.normalisiereUndPruefe("Anna.", "Vorname"))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void doppelterBindestrichWirdAbgelehnt() {
            assertThatThrownBy(() -> spielernameValidierungService.normalisiereUndPruefe("Anna--Lena", "Vorname"))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void fuehrenderBindestrichWirdAbgelehnt() {
            assertThatThrownBy(() -> spielernameValidierungService.normalisiereUndPruefe("-Anna", "Vorname"))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void abschliessenderBindestrichWirdAbgelehnt() {
            assertThatThrownBy(() -> spielernameValidierungService.normalisiereUndPruefe("Anna-", "Vorname"))
                    .isInstanceOf(UngueltigeAnmeldungException.class);
        }

        @Test
        void randLeerzeichenWerdenNormalisiertUndNameBleibtGueltig() {
            assertThat(spielernameValidierungService.normalisiereUndPruefe("  Anna-Lena  ", "Vorname"))
                    .isEqualTo("Anna-Lena");
        }

        @Test
        void leererNameGreiftPflichtpruefungStattZeichenregel() {
            // Leere Eingabe wird nicht als Zeichensatz-Fehler behandelt – die Pflichtprüfung
            // (@NotBlank auf dem DTO) greift getrennt. Der Service reicht den leeren Wert durch.
            assertThat(spielernameValidierungService.normalisiereUndPruefe("   ", "Vorname"))
                    .isEmpty();
        }
    }

    @Nested
    class NormalisiereTest {

        private final SpielernameValidierungService service = new SpielernameValidierungService();

        @Test
        void entferntRandLeerzeichenUndFasstZusammen() {
            assertThat(service.normalisiere("  Anna   Lena ")).isEqualTo("Anna Lena");
        }

        @Test
        void nullErgibtLeerenString() {
            assertThat(service.normalisiere(null)).isEmpty();
        }

        @Test
        void prueftDenZeichensatzNicht() {
            // normalisiere() wirft nicht bei Sonderzeichen – die Zeichensatzprüfung bleibt normalisiereUndPruefe.
            assertThat(service.normalisiere("Anna1")).isEqualTo("Anna1");
        }
    }
}
