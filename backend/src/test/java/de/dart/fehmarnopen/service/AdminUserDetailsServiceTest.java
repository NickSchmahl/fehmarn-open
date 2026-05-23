package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.entity.AdminUser;
import de.dart.fehmarnopen.repository.AdminUserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserDetailsServiceTest {

    @Mock
    private AdminUserRepository adminUserRepository;

    @InjectMocks
    private AdminUserDetailsService userDetailsService;

    @Test
    void loadUserByUsername_findetBenutzer() {
        AdminUser admin = new AdminUser();
        admin.setBenutzername("admin");
        admin.setPasswortHash("hashed");

        when(adminUserRepository.findByBenutzername("admin"))
                .thenReturn(Optional.of(admin));

        UserDetails result = userDetailsService.loadUserByUsername("admin");

        assertThat(result.getUsername()).isEqualTo("admin");
    }

    @Test
    void loadUserByUsername_wirftExceptionWennNichtGefunden() {
        when(adminUserRepository.findByBenutzername("unbekannt"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("unbekannt"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("unbekannt");
    }
}