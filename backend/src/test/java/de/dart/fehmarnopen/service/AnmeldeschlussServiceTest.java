package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.dart.fehmarnopen.config.AnmeldungProperties;
import de.dart.fehmarnopen.exception.AnmeldungGesperrtException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class AnmeldeschlussServiceTest {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    private static final LocalDate SCHLUSS = LocalDate.of(2027, 2, 28);

    /** Baut den Service mit fester Deadline und einer auf den Zeitpunkt fixierten Uhr. */
    private AnmeldeschlussService serviceUm(LocalDateTime zeitpunktBerlin) {
        AnmeldungProperties properties = new AnmeldungProperties();
        properties.setAnmeldeschluss(SCHLUSS);
        Clock fixeUhr = Clock.fixed(zeitpunktBerlin.atZone(BERLIN).toInstant(), BERLIN);
        return new AnmeldeschlussService(properties, fixeUhr);
    }

    @Nested
    class AnmeldungOffenTest {

        @Test
        void vorDemStichtagIstOffen() {
            assertThat(serviceUm(LocalDateTime.of(2027, 2, 1, 12, 0)).anmeldungOffen())
                    .isTrue();
        }

        @Test
        void amStichtagFruehIstOffen() {
            assertThat(serviceUm(LocalDateTime.of(2027, 2, 28, 0, 0)).anmeldungOffen())
                    .isTrue();
        }

        @Test
        void amStichtagSpaetIstOffen() {
            assertThat(serviceUm(LocalDateTime.of(2027, 2, 28, 23, 59)).anmeldungOffen())
                    .isTrue();
        }

        @Test
        void abFolgetagMitternachtIstZu() {
            assertThat(serviceUm(LocalDateTime.of(2027, 3, 1, 0, 0)).anmeldungOffen())
                    .isFalse();
        }
    }

    @Nested
    class PruefeAnmeldungOffenTest {

        @Test
        void wennOffenWirftNicht() {
            assertThatCode(() ->
                            serviceUm(LocalDateTime.of(2027, 2, 28, 23, 59)).pruefeAnmeldungOffen())
                    .doesNotThrowAnyException();
        }

        @Test
        void wennZuWirftMitDatumInDerMeldung() {
            assertThatThrownBy(
                            () -> serviceUm(LocalDateTime.of(2027, 3, 1, 0, 0)).pruefeAnmeldungOffen())
                    .isInstanceOf(AnmeldungGesperrtException.class)
                    .hasMessageContaining("28.02.2027");
        }
    }
}
