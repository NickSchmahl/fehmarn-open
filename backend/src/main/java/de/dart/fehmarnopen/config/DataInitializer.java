package de.dart.fehmarnopen.config;

import de.dart.fehmarnopen.entity.AdminUser;
import de.dart.fehmarnopen.repository.AdminUserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminProperties adminProperties;
    private final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Override
    public void run(String @NonNull ... args) {
        List<AdminProperties.Account> accounts = adminProperties.getAccounts();

        if (accounts == null || accounts.isEmpty()) {
            throw new IllegalStateException("Keine Admin-Accounts konfiguriert.");
        }

        for (AdminProperties.Account account : accounts) {
            if (!StringUtils.hasText(account.getPassword())) {
                throw new IllegalStateException("Kein Passwort für Admin '" + account.getUsername() + "' gesetzt.");
            }

            if (adminUserRepository.existsByBenutzername(account.getUsername())) {
                log.info("Admin '{}' existiert bereits – wird übersprungen.", account.getUsername());
                continue;
            }

            AdminUser admin = new AdminUser();
            admin.setBenutzername(account.getUsername());
            admin.setPasswortHash(passwordEncoder.encode(account.getPassword()));
            adminUserRepository.save(admin);
            log.info("Admin '{}' wurde angelegt.", account.getUsername());
        }
    }
}
