package de.dart.fehmarnopen.auth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(SECRET, EXPIRATION_MS);

    private static final String SECRET = "test-secret-key-which-is-long-enough-for-hmac-sha256";
    private static final long EXPIRATION_MS = 3_600_000L; // 1 Stunde


    @Test
    void generateToken_shouldContainUsername() {
        String token = jwtService.generateToken("alice");

        assertThat(jwtService.extractUsername(token)).isEqualTo("alice");
    }

    @Test
    void generateToken_shouldBeValid() {
        String token = jwtService.generateToken("alice");

        assertThat(jwtService.isValid(token)).isTrue();
    }

    @Test
    void expiredToken_shouldBeInvalid() {
        JwtService shortLivedService = new JwtService(SECRET, -1L); // sofort abgelaufen
        String token = shortLivedService.generateToken("alice");

        assertThat(shortLivedService.isValid(token)).isFalse();
    }

    @Test
    void tamperedToken_shouldBeInvalid() {
        String token = jwtService.generateToken("alice");
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThat(jwtService.isValid(tampered)).isFalse();
    }

    @Test
    void generateToken_shouldSetExpiration() {
        String token = jwtService.generateToken("alice");

        assertThat(jwtService.extractExpiration(token)).isInTheFuture();
    }
}
