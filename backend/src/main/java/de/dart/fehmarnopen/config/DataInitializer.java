package de.dart.fehmarnopen.config;

import de.dart.fehmarnopen.entity.AdminUser;
import de.dart.fehmarnopen.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String @NonNull ... args) {
        if (adminUserRepository.count() == 0) {
            AdminUser admin = new AdminUser();
            admin.setBenutzername("admin");
            admin.setPasswortHash(passwordEncoder.encode("admin123"));
            adminUserRepository.save(admin);
            System.out.println("Initial-Admin angelegt: admin / admin123");
        }
    }
}
