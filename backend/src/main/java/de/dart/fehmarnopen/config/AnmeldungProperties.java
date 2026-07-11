package de.dart.fehmarnopen.config;

import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Fachliche Anmeldung-Konfiguration (Server-Config, per ENV überschreibbar). Siehe ADR 0013. */
@Getter
@Setter
@ConfigurationProperties(prefix = "fehmarnopen.anmeldung")
@Component
public class AnmeldungProperties {

    /**
     * Letzter Tag, an dem Online-Anmeldungen möglich sind (inklusive, Ende des Tages Europe/Berlin).
     * Default in application.yaml: 2027-02-28.
     */
    private LocalDate anmeldeschluss;
}
