package de.dart.fehmarnopen.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@TestConfiguration
public class TestSecurityConfig {

    @Bean
    public SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
        // CSRF bewusst deaktiviert – aus denselben Gründen wie in SecurityConfig:
        // Die API ist zustandslos, kennt keine Cookies und keine HTTP-Session, das
        // JWT wird ausschließlich über den Authorization-Header übertragen.
        // Zusätzlich ist diese @TestConfiguration reiner Testcode und wird nie
        // ausgeliefert. CodeQL (java/spring-disabled-csrf-protection) meldet das
        // trotzdem – False Positive.
        http.csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
