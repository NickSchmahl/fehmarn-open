package de.dart.fehmarnopen.config;

import de.dart.fehmarnopen.auth.JwtAuthFilter;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        // CSRF bewusst deaktiviert: Die API ist zustandslos und kennt keine Cookies
        // und keine HTTP-Session. Das JWT liegt im localStorage und wird vom
        // Angular-Interceptor manuell als "Authorization: Bearer ..."-Header gesetzt
        // (siehe JwtAuthFilter, das ausschließlich diesen Header auswertet).
        // Ein Browser hängt diesen Header nicht automatisch an fremde Requests an,
        // deshalb ist CSRF hier nicht ausnutzbar. CodeQL
        // (java/spring-disabled-csrf-protection) meldet das trotzdem – False Positive.
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        auth -> auth.requestMatchers(HttpMethod.POST, "/api/auth/login")
                                .permitAll()
                                .requestMatchers(HttpMethod.POST, "/api/anmeldung")
                                .permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/anmeldung/status")
                                .permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/teilnehmer")
                                .permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/flyer")
                                .permitAll()
                                .requestMatchers("/api/admin/**")
                                .hasRole("ADMIN")
                                .anyRequest()
                                .permitAll() // statische Frontend-Dateien + SPA-Routen
                        )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        // Keine Cookies, keine Session – der Client sendet das JWT als normalen
        // Authorization-Header. Credentials-Modus wird daher nicht benötigt.
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
