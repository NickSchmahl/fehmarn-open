package de.dart.fehmarnopen.auth;

import de.dart.fehmarnopen.repository.AdminUserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AdminUserRepository adminUserRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AdminUserRepository adminUserRepository,
                          JwtService jwtService,
                          PasswordEncoder passwordEncoder) {
        this.adminUserRepository = adminUserRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        // Bewusst keine Unterscheidung zwischen "User nicht gefunden"
        // und "falsches Passwort" – verhindert User-Enumeration
        return adminUserRepository.findByBenutzername(request.getUsername())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPassword()))
                .map(user -> {
                    String token = jwtService.generateToken(user.getUsername());
                    return ResponseEntity.ok(new LoginResponse(token));
                })
                .orElse(ResponseEntity.status(401).build());
    }
}
