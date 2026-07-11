package de.dart.fehmarnopen.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Stellt eine injizierbare Uhr bereit, damit zeitabhängige Logik in Tests deterministisch prüfbar ist. */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
