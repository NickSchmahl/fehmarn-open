package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.config.AnmeldungProperties;
import de.dart.fehmarnopen.exception.AnmeldungGesperrtException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Kapselt die Anmeldeschluss-Logik: bis wann Anmeldungen erlaubt sind (Server-Config, siehe ADR 0013). */
@Service
@RequiredArgsConstructor
public class AnmeldeschlussService {

    /** Das Turnier findet auf Fehmarn statt; der Stichtag gilt in deutscher Zeit. */
    private static final ZoneId ZONE = ZoneId.of("Europe/Berlin");

    private static final DateTimeFormatter DATUM_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final AnmeldungProperties anmeldungProperties;
    private final Clock clock;

    public LocalDate anmeldeschluss() {
        return anmeldungProperties.getAnmeldeschluss();
    }

    /** Offen, solange die aktuelle Zeit vor Beginn des Folgetags des Anmeldeschlusses liegt (inkl. Tagesende). */
    public boolean anmeldungOffen() {
        ZonedDateTime jetzt = clock.instant().atZone(ZONE);
        ZonedDateTime schlussEnde = anmeldeschluss().plusDays(1).atStartOfDay(ZONE);
        return jetzt.isBefore(schlussEnde);
    }

    public void pruefeAnmeldungOffen() {
        if (!anmeldungOffen()) {
            throw new AnmeldungGesperrtException(anmeldeschluss().format(DATUM_FORMAT));
        }
    }
}
