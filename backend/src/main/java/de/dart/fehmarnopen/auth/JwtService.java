package de.dart.fehmarnopen.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

// final: entkraeftet CT_CONSTRUCTOR_THROW (kein bösartiger Subtyp mit Finalizer
// moeglich). Kein Proxy noetig - JwtService hat kein @Transactional/@Async o.ae.
@Service
public final class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey secretKey;
    private final long expirationMs;

    @Autowired
    public JwtService(JwtProperties jwtProperties) {
        this.secretKey = buildKey(jwtProperties.getSecret());
        this.expirationMs = jwtProperties.getExpirationMs();
    }

    // Zweiter Konstruktor für Unit-Tests (kein Spring-Kontext nötig)
    JwtService(String secret, long expirationMs) {
        this.secretKey = buildKey(secret);
        this.expirationMs = expirationMs;
    }

    public String generateToken(String username) {
        var now = new Date();
        var expiration = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(expiration)
                .signWith(secretKey)
                .compact();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public Date extractExpiration(String token) {
        return parseClaims(token).getExpiration();
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException e) {
            log.debug("Ungültiger JWT: {}", e.getMessage());
            return false;
        } catch (IllegalArgumentException e) {
            log.debug("JWT leer oder null: {}", e.getMessage());
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private static SecretKey buildKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET ist nicht gesetzt. " + "Bitte die Umgebungsvariable JWT_SECRET setzen.");
        }
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET ist zu kurz – mindestens 32 Zeichen erforderlich (HMAC-SHA256).");
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
